package undo

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"

	"super_folder/internal/models"
)

type OpType string

const (
	OpRename      OpType = "rename"
	OpMove        OpType = "move"
	OpCopy        OpType = "copy"
	OpAddTag      OpType = "add_tag"
	OpRemoveTag   OpType = "remove_tag"
	OpCreateFolder OpType = "create_folder"
)

type Operation struct {
	Type        OpType              `json:"type"`
	SrcPaths    []string            `json:"srcPaths"`
	DestPaths   []string            `json:"destPaths"`
	Paths       []string            `json:"paths"`
	TagIDs      []string            `json:"tagIDs"`
	PathTagIDs  map[string][]string `json:"pathTagIDs"`
	RemovedTags []models.Tag        `json:"removedTags"`
}

var (
	undoStack         []Operation
	redoStack         []Operation
	mutex             sync.Mutex
	maxStack          = 50
	addTagHandler     func(paths []string, tagIDs []string) error
	removeTagHandler  func(paths []string, tagIDs []string) error
	restoreTagHandler func(tags []models.Tag) error
)

func RegisterTagHandlers(add func(paths []string, tagIDs []string) error, remove func(paths []string, tagIDs []string) error, restore func(tags []models.Tag) error) {
	addTagHandler = add
	removeTagHandler = remove
	restoreTagHandler = restore
}

// Push adds a new operation to the undo stack and clears the redo stack.
func Push(op Operation) {
	mutex.Lock()
	defer mutex.Unlock()

	undoStack = append(undoStack, op)
	if len(undoStack) > maxStack {
		undoStack = undoStack[1:] // pop oldest
	}
	redoStack = nil // new operation invalidates redo stack
}

// Clear empties both stacks.
func Clear() {
	mutex.Lock()
	defer mutex.Unlock()
	undoStack = nil
	redoStack = nil
}

// Undo pops the latest operation, reverses it, and pushes to redo stack.
func Undo() (*Operation, error) {
	mutex.Lock()
	defer mutex.Unlock()

	if len(undoStack) == 0 {
		return nil, fmt.Errorf("没有可撤销的操作")
	}

	op := undoStack[len(undoStack)-1]
	undoStack = undoStack[:len(undoStack)-1]

	err := performInverse(op)
	if err != nil {
		undoStack = nil
		redoStack = nil
		return nil, fmt.Errorf("撤销失败，源文件可能已丢失或被占用: %v", err)
	}

	redoStack = append(redoStack, op)
	if len(redoStack) > maxStack {
		redoStack = redoStack[1:]
	}

	return &op, nil
}

// Redo pops the latest redo operation, re-applies it, and pushes to undo stack.
func Redo() (*Operation, error) {
	mutex.Lock()
	defer mutex.Unlock()

	if len(redoStack) == 0 {
		return nil, fmt.Errorf("没有可还原的操作")
	}

	op := redoStack[len(redoStack)-1]
	redoStack = redoStack[:len(redoStack)-1]

	err := performForward(op)
	if err != nil {
		undoStack = nil
		redoStack = nil
		return nil, fmt.Errorf("还原失败: %v", err)
	}

	undoStack = append(undoStack, op)
	if len(undoStack) > maxStack {
		undoStack = undoStack[1:]
	}

	return &op, nil
}

func performInverse(op Operation) error {
	switch op.Type {
	case OpRename, OpMove:
		for i, dest := range op.DestPaths {
			src := op.SrcPaths[i]
			if _, err := os.Stat(dest); os.IsNotExist(err) {
				return fmt.Errorf("路径 %s 不存在", dest)
			}
			if err := os.Rename(dest, src); err != nil {
				return err
			}
		}
	case OpCopy:
		for _, dest := range op.DestPaths {
			if _, err := os.Stat(dest); os.IsNotExist(err) {
				return fmt.Errorf("路径 %s 不存在", dest)
			}
			if err := os.RemoveAll(dest); err != nil {
				return err
			}
		}
	case OpCreateFolder:
		for _, dest := range op.DestPaths {
			if _, err := os.Stat(dest); os.IsNotExist(err) {
				return fmt.Errorf("路径 %s 不存在", dest)
			}
			if err := os.Remove(dest); err != nil {
				return err
			}
		}
	case OpAddTag:
		if removeTagHandler == nil {
			return fmt.Errorf("tag remove handler not registered")
		}
		return applyTagHandler(op, removeTagHandler)
	case OpRemoveTag:
		if addTagHandler == nil {
			return fmt.Errorf("tag add handler not registered")
		}
		if len(op.RemovedTags) > 0 {
			if restoreTagHandler == nil {
				return fmt.Errorf("tag restore handler not registered")
			}
			if err := restoreTagHandler(op.RemovedTags); err != nil {
				return err
			}
		}
		return applyTagHandler(op, addTagHandler)
	}
	return nil
}

func performForward(op Operation) error {
	switch op.Type {
	case OpRename, OpMove:
		for i, src := range op.SrcPaths {
			dest := op.DestPaths[i]
			if _, err := os.Stat(src); os.IsNotExist(err) {
				return fmt.Errorf("路径 %s 不存在", src)
			}
			if err := os.Rename(src, dest); err != nil {
				return err
			}
		}
	case OpCopy:
		for i, src := range op.SrcPaths {
			dest := op.DestPaths[i]
			if _, err := os.Stat(src); os.IsNotExist(err) {
				return fmt.Errorf("路径 %s 不存在", src)
			}
			if err := copyRecursive(src, dest); err != nil {
				return err
			}
		}
	case OpCreateFolder:
		for _, dest := range op.DestPaths {
			if err := os.MkdirAll(dest, 0755); err != nil {
				return err
			}
		}
	case OpAddTag:
		if addTagHandler == nil {
			return fmt.Errorf("tag add handler not registered")
		}
		return applyTagHandler(op, addTagHandler)
	case OpRemoveTag:
		if removeTagHandler == nil {
			return fmt.Errorf("tag remove handler not registered")
		}
		return applyTagHandler(op, removeTagHandler)
	}
	return nil
}

func applyTagHandler(op Operation, handler func(paths []string, tagIDs []string) error) error {
	if len(op.PathTagIDs) == 0 {
		return handler(op.Paths, op.TagIDs)
	}
	for path, tagIDs := range op.PathTagIDs {
		if len(tagIDs) == 0 {
			continue
		}
		if err := handler([]string{path}, tagIDs); err != nil {
			return err
		}
	}
	return nil
}

func copyRecursive(src, dest string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}
	if info.IsDir() {
		if err := os.MkdirAll(dest, info.Mode()); err != nil {
			return err
		}
		entries, err := os.ReadDir(src)
		if err != nil {
			return err
		}
		for _, entry := range entries {
			srcPath := filepath.Join(src, entry.Name())
			destPath := filepath.Join(dest, entry.Name())
			if err := copyRecursive(srcPath, destPath); err != nil {
				return err
			}
		}
		return nil
	}
	return copyFile(src, dest)
}

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	if err != nil {
		return err
	}
	return out.Close()
}
