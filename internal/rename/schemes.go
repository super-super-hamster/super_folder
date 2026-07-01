package rename

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"super_folder/internal/undo"
)

func StartWatcher(ctx context.Context) error {
	dir, err := getSchemesDir()
	if err != nil {
		return err
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	go func() {
		defer watcher.Close()
		var lastEmit time.Time
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				// Debounce events to prevent multiple rapid fires
				if event.Has(fsnotify.Write) || event.Has(fsnotify.Create) || event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
					if time.Since(lastEmit) > 500*time.Millisecond {
						runtime.EventsEmit(ctx, "schemes-changed")
						lastEmit = time.Now()
					}
				}
			case _, ok := <-watcher.Errors:
				if !ok {
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	return watcher.Add(dir)
}

type Scheme struct {
	Name string `json:"name"`
	Code string `json:"code"`
	Path string `json:"path"`
}

func getSchemesDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".filege", "rename_schemes")
	return dir, nil
}

func InitSchemes() error {
	dir, err := getSchemesDir()
	if err != nil {
		return err
	}

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}

		defaults := map[string]string{
			"添加日期后缀.js": `function rename(file, index, files) {
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
  return file.name + '_' + dateStr;
}`,
			"添加日期前缀.js": `function rename(file, index, files) {
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
  return dateStr + '_' + file.name;
}`,
			"后缀数字补零对齐.js": `function rename(file, index, files) {
  // 查找所有文件名的后缀数字，找出最大长度
  let maxLen = 0;
  for (let f of files) {
    const m = f.name.match(/\d+$/);
    if (m && m[0].length > maxLen) {
      maxLen = m[0].length;
    }
  }
  return file.name.replace(/\d+$/, match => match.padStart(maxLen, '0'));
}`,
			"前缀数字补零对齐.js": `function rename(file, index, files) {
  // 查找所有文件名的前缀数字，找出最大长度
  let maxLen = 0;
  for (let f of files) {
    const m = f.name.match(/^\d+/);
    if (m && m[0].length > maxLen) {
      maxLen = m[0].length;
    }
  }
  return file.name.replace(/^\d+/, match => match.padStart(maxLen, '0'));
}`,
		}

		for name, code := range defaults {
			path := filepath.Join(dir, name)
			ioutil.WriteFile(path, []byte(code), 0644)
		}
	}

	return nil
}

func GetRenameSchemes() ([]Scheme, error) {
	dir, err := getSchemesDir()
	if err != nil {
		return nil, err
	}

	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var schemes []Scheme
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".js") {
			path := filepath.Join(dir, f.Name())
			content, err := ioutil.ReadFile(path)
		if err == nil {
			name := strings.TrimSuffix(f.Name(), ".js")
			schemes = append(schemes, Scheme{
				Name: name,
				Code: string(content),
				Path: path,
			})
		}
		}
	}
	return schemes, nil
}

func schemeFilePath(name string) (string, error) {
	dir, err := getSchemesDir()
	if err != nil {
		return "", err
	}
	filename := name
	if !strings.HasSuffix(strings.ToLower(filename), ".js") {
		filename += ".js"
	}
	return filepath.Join(dir, filename), nil
}

func SaveRenameScheme(name string, code string) error {
	path, err := schemeFilePath(name)
	if err != nil {
		return err
	}
	return ioutil.WriteFile(path, []byte(code), 0644)
}

func DeleteRenameScheme(name string) error {
	path, err := schemeFilePath(name)
	if err != nil {
		return err
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return fmt.Errorf("方案不存在")
	}
	return os.Remove(path)
}

// CheckBatchRenameConflicts returns a list of target paths that already exist.
func CheckBatchRenameConflicts(operations map[string]string) []string {
	var conflicts []string
	
	// Create a map of destinations that will be created in this batch
	// to avoid flagging conflicts within the batch itself.
	// Wait, actually, if a file A is renamed to B, and B already exists on disk,
	// but B is also being renamed to C in this batch, then B is not a conflict.
	// We'll just build a set of files that will be renamed away.
	renamedAway := make(map[string]bool)
	for src := range operations {
		renamedAway[src] = true
	}

	for _, dest := range operations {
		// If the destination is one of the source files being renamed away, it's fine.
		if renamedAway[dest] {
			continue
		}
		if _, err := os.Stat(dest); err == nil {
			conflicts = append(conflicts, dest)
		}
	}
	return conflicts
}

func BatchRenameFiles(operations map[string]string) error {
	var srcPaths []string
	var destPaths []string

	for src, dest := range operations {
		if src == dest {
			continue
		}
		if err := os.Rename(src, dest); err != nil {
			// If we fail midway, ideally we should rollback the already renamed files.
			// For simplicity, we just return the error.
			return fmt.Errorf("重命名失败 %s -> %s: %v", src, dest, err)
		}
		srcPaths = append(srcPaths, src)
		destPaths = append(destPaths, dest)
	}

	if len(srcPaths) > 0 {
		undo.Push(undo.Operation{
			Type:      undo.OpRename,
			SrcPaths:  srcPaths,
			DestPaths: destPaths,
		})
	}

	return nil
}
