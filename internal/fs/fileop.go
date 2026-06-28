package fs

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"super_folder/internal/undo"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ConflictResolution struct {
	Action     string // "rename", "overwrite", "skip"
	ApplyToAll bool
}

type FileTask struct {
	ID             string
	Operation      string // "copy", "cut"
	SrcPaths       []string
	DestDir        string
	TotalBytes     int64
	CopiedBytes    int64
	Ctx            context.Context
	Cancel         context.CancelFunc
	ConflictChan   chan ConflictResolution
	WailsCtx       context.Context
	GlobalConflict string // "rename", "overwrite", "skip" or ""
	TotalFiles     int
	ProcessedFiles int
	SuccessfulSrc  []string
	SuccessfulDest []string
}

var (
	taskMutex sync.Mutex
	tasks     = make(map[string]*FileTask)
)

// StartTask creates and starts a file operation task
func StartTask(wailsCtx context.Context, operation string, srcPaths []string, destDir string) string {
	taskID := uuid.New().String()
	ctx, cancel := context.WithCancel(context.Background())

	task := &FileTask{
		ID:           taskID,
		Operation:    operation,
		SrcPaths:     srcPaths,
		DestDir:      destDir,
		Ctx:          ctx,
		Cancel:       cancel,
		ConflictChan: make(chan ConflictResolution),
		WailsCtx:     wailsCtx,
	}

	taskMutex.Lock()
	tasks[taskID] = task
	taskMutex.Unlock()

	go task.Run()

	return taskID
}

func CancelTask(taskID string) {
	taskMutex.Lock()
	defer taskMutex.Unlock()
	if task, exists := tasks[taskID]; exists {
		task.Cancel()
	}
}

func ResolveTaskConflict(taskID string, action string, applyToAll bool) {
	taskMutex.Lock()
	defer taskMutex.Unlock()
	if task, exists := tasks[taskID]; exists {
		go func() {
			select {
			case task.ConflictChan <- ConflictResolution{Action: action, ApplyToAll: applyToAll}:
			case <-task.Ctx.Done():
			}
		}()
	}
}

func (t *FileTask) Run() {
	defer func() {
		taskMutex.Lock()
		delete(tasks, t.ID)
		taskMutex.Unlock()
		// Emit done event
		runtime.EventsEmit(t.WailsCtx, "paste:done", map[string]interface{}{
			"taskID":    t.ID,
			"operation": t.Operation,
		})
		
		if len(t.SuccessfulSrc) > 0 && t.Operation != "permanent_delete" {
			opType := undo.OpCopy
			if t.Operation == "cut" {
				opType = undo.OpMove
			}
			undo.Push(undo.Operation{
				Type:      opType,
				SrcPaths:  t.SuccessfulSrc,
				DestPaths: t.SuccessfulDest,
			})
		}
	}()

	// 1. Calculate total bytes
	for _, src := range t.SrcPaths {
		err := filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			t.TotalBytes += info.Size()
			t.TotalFiles++
			return nil
		})
		if err != nil {
			fmt.Println("Error calculating size:", err)
		}
	}

	// Emit initial progress
	t.emitProgress()

	// 2. Perform copy/move/delete
	for _, src := range t.SrcPaths {
		if t.Ctx.Err() != nil {
			break
		}
		
		srcInfo, err := os.Stat(src)
		if err != nil {
			continue
		}

		if t.Operation == "permanent_delete" {
			err = t.removeWithProgress(src)
			if err != nil && err != context.Canceled {
				fmt.Println("Error deleting", src, ":", err)
				runtime.EventsEmit(t.WailsCtx, "paste:error", map[string]interface{}{
					"taskID":  t.ID,
					"message": fmt.Sprintf("姘镐箙鍒犻櫎 '%s' 澶辫触: %v", filepath.Base(src), err),
				})
			}
			continue
		}
		
		destPath := filepath.Join(t.DestDir, srcInfo.Name())

		// If it's a cut and src is same as dest dir, skip
		if t.Operation == "cut" && filepath.Dir(src) == t.DestDir {
			continue
		}

		var finalDest string

		if t.Operation == "cut" {
			if _, err := os.Stat(destPath); os.IsNotExist(err) {
				renameErr := os.Rename(src, destPath)
				if renameErr == nil {
					var dirBytes int64
					var dirFiles int
					filepath.Walk(destPath, func(_ string, i os.FileInfo, e error) error {
						if e == nil {
							dirBytes += i.Size()
							dirFiles++
						}
						return nil
					})
					t.CopiedBytes += dirBytes
					t.ProcessedFiles += dirFiles
					t.SuccessfulSrc = append(t.SuccessfulSrc, src)
					t.SuccessfulDest = append(t.SuccessfulDest, destPath)
					t.emitProgress()
					continue
				}
			}
		}

		if srcInfo.IsDir() {
			finalDest, err = t.copyDir(src, destPath)
		} else {
			finalDest, err = t.copyFile(src, destPath)
		}

		if err != nil && err != context.Canceled {
			fmt.Println("Error processing", src, ":", err)
			runtime.EventsEmit(t.WailsCtx, "paste:error", map[string]interface{}{
				"taskID":  t.ID,
				"message": fmt.Sprintf("操作 '%s' 失败: %v", filepath.Base(src), err),
			})
			continue // Still continue with other files, but frontend might show a warning
		}
		
		// If cut, delete the original after successful copy
		if t.Operation == "cut" && err == nil && t.Ctx.Err() == nil {
			// Use os.Remove instead of os.RemoveAll to only delete if empty
			os.Remove(src)
		}

		if finalDest != "" && err == nil && t.Ctx.Err() == nil {
			t.SuccessfulSrc = append(t.SuccessfulSrc, src)
			t.SuccessfulDest = append(t.SuccessfulDest, finalDest)
		}
	}
}

func (t *FileTask) handleDeleteError(err error, path string) error {
	if err == nil { return nil }
	if t.Ctx.Err() != nil { return err }
	if t.GlobalConflict == "skip_all_deletes" { return nil }

	// Emit conflict event to frontend
	runtime.EventsEmit(t.WailsCtx, "paste:conflict", map[string]interface{}{
		"taskID": t.ID,
		"type":   "delete_error",
		"path":   path,
		"error":  err.Error(),
	})

	// Wait for resolution
	select {
	case <-t.Ctx.Done():
		return t.Ctx.Err()
	case res := <-t.ConflictChan:
		if res.ApplyToAll && res.Action == "skip" {
			t.GlobalConflict = "skip_all_deletes"
			return nil
		}
		if res.Action == "skip" {
			return nil
		}
		if res.Action == "abort" {
			t.Cancel()
			return fmt.Errorf("deletion aborted by user")
		}
		return err
	}
}

func (t *FileTask) removeWithProgress(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return t.handleDeleteError(err, path)
	}

	if !info.IsDir() {
		err := os.Remove(path)
		if err == nil {
			t.CopiedBytes += info.Size()
			t.ProcessedFiles++
			t.emitProgress()
		} else {
			return t.handleDeleteError(err, path)
		}
		return nil
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return t.handleDeleteError(err, path)
	}

	for _, entry := range entries {
		if t.Ctx.Err() != nil {
			return t.Ctx.Err()
		}
		childPath := filepath.Join(path, entry.Name())
		if err := t.removeWithProgress(childPath); err != nil {
			return err
		}
	}

	// Delete the directory itself
	err = os.Remove(path)
	if err == nil {
		t.ProcessedFiles++
		t.emitProgress()
	} else {
		// If directory deletion fails (e.g., because some children were skipped),
		// we just silently return nil to avoid bothering the user again. 
		// Or we can let handleDeleteError handle it. Let's handle it.
		// Wait, if a child was skipped, the directory is not empty.
		// If we use skip, we should return nil here.
		return t.handleDeleteError(err, path)
	}
	return nil
}

func (t *FileTask) emitProgress() {
	runtime.EventsEmit(t.WailsCtx, "paste:progress", map[string]interface{}{
		"taskID":         t.ID,
		"operation":      t.Operation,
		"totalBytes":     t.TotalBytes,
		"copiedBytes":    t.CopiedBytes,
		"totalFiles":     t.TotalFiles,
		"processedFiles": t.ProcessedFiles,
	})
}

// resolvePath checks if file exists, asks for resolution if needed, returns final path, or empty string to skip
func (t *FileTask) resolvePath(destPath string) string {
	if _, err := os.Stat(destPath); os.IsNotExist(err) {
		return destPath
	}

	// Conflict exists
	action := t.GlobalConflict
	if action == "" {
		// Ask frontend
		runtime.EventsEmit(t.WailsCtx, "paste:conflict", map[string]interface{}{
			"taskID":   t.ID,
			"destPath": destPath,
		})

		select {
		case <-t.Ctx.Done():
			return ""
		case res := <-t.ConflictChan:
			action = res.Action
			if res.ApplyToAll {
				t.GlobalConflict = action
			}
		}
	}

	if action == "skip" {
		return ""
	} else if action == "overwrite" {
		return destPath
	} else if action == "rename" {
		return generateUniqueName(destPath)
	}
	return ""
}

func generateUniqueName(path string) string {
	ext := filepath.Ext(path)
	base := strings.TrimSuffix(path, ext)
	counter := 1
	for {
		newPath := fmt.Sprintf("%s(%d)%s", base, counter, ext)
		_, err := os.Stat(newPath)
		if err != nil {
			if os.IsNotExist(err) {
				return newPath
			}
			// If we get an error other than NotExist (e.g., Permission Denied),
			// trying to loop further will just infinite loop. Break out and return.
			return fmt.Sprintf("%s_conflict_%d%s", base, time.Now().UnixNano()%10000, ext)
		}
		counter++
		if counter > 10000 {
			// Circuit breaker to prevent infinite loop under any unforeseen circumstances
			return fmt.Sprintf("%s_conflict_%d%s", base, time.Now().UnixNano()%10000, ext)
		}
	}
}

func (t *FileTask) copyDir(src string, dest string) (string, error) {
	dest = t.resolvePath(dest)
	if dest == "" {
		return "", nil
	}

	if err := os.MkdirAll(dest, 0755); err != nil {
		return "", err
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		return "", err
	}

	hasError := false

	for _, entry := range entries {
		if t.Ctx.Err() != nil {
			return "", t.Ctx.Err()
		}
		srcPath := filepath.Join(src, entry.Name())
		destPath := filepath.Join(dest, entry.Name())

		if entry.IsDir() {
			if _, err := t.copyDir(srcPath, destPath); err != nil {
				runtime.EventsEmit(t.WailsCtx, "paste:error", map[string]interface{}{
					"taskID":  t.ID,
					"message": fmt.Sprintf("目录 '%s' 处理失败: %v", entry.Name(), err),
				})
				hasError = true
				continue
			}
		} else {
			if _, err := t.copyFile(srcPath, destPath); err != nil {
				runtime.EventsEmit(t.WailsCtx, "paste:error", map[string]interface{}{
					"taskID":  t.ID,
					"message": fmt.Sprintf("文件 '%s' 处理失败: %v", entry.Name(), err),
				})
				hasError = true
				continue
			}
		}
	}

	if t.Operation == "cut" && !hasError {
		os.Remove(src)
	}

	return dest, nil
}

type progressReader struct {
	io.Reader
	task *FileTask
	lastEmit time.Time
}

func (pr *progressReader) Read(p []byte) (int, error) {
	if pr.task.Ctx.Err() != nil {
		return 0, pr.task.Ctx.Err()
	}
	n, err := pr.Reader.Read(p)
	if n > 0 {
		pr.task.CopiedBytes += int64(n)
		if time.Since(pr.lastEmit) > 50*time.Millisecond {
			pr.task.emitProgress()
			pr.lastEmit = time.Now()
		}
	}
	return n, err
}

func (t *FileTask) copyFile(src string, dest string) (string, error) {
	dest = t.resolvePath(dest)
	if dest == "" {
		return "", nil
	}

	srcFile, err := os.Open(src)
	if err != nil {
		return "", err
	}
	defer srcFile.Close()

	destFile, err := os.Create(dest)
	if err != nil {
		return "", err
	}

	pr := &progressReader{
		Reader: srcFile,
		task:   t,
		lastEmit: time.Now(),
	}

	_, err = io.Copy(destFile, pr)
	destFile.Close()
	srcFile.Close()

	if err != nil {
		os.Remove(dest)
		return "", err
	}

	if t.Operation == "cut" {
		os.Remove(src)
	}

	t.ProcessedFiles++
	t.emitProgress()
	return dest, nil
}

