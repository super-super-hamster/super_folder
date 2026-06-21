package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"file-manager/internal/converter"
	"file-manager/internal/database"
	"file-manager/internal/fs"
	"file-manager/internal/models"
	"sort"
	"strings"
	"net"
	"net/http"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	localHttpPort int
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// GetLocalServerPort returns the dynamic port assigned for the local file server
func (a *App) GetLocalServerPort() int {
	return a.localHttpPort
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/file", func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Query().Get("path")
			if path != "" {
				http.ServeFile(w, r, path)
			}
		})
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err == nil {
			a.localHttpPort = listener.Addr().(*net.TCPAddr).Port
			http.Serve(listener, mux)
		}
	}()

	if boundsStr, err := database.GetConfig("window_bounds"); err == nil && boundsStr != "" {
		var config struct {
			Width  int `json:"width"`
			Height int `json:"height"`
			X      int `json:"x"`
			Y      int `json:"y"`
		}
		if err := json.Unmarshal([]byte(boundsStr), &config); err == nil {
			if config.Width > 400 && config.Height > 300 {
				runtime.WindowSetSize(ctx, config.Width, config.Height)
				if config.X != 0 || config.Y != 0 {
					runtime.WindowSetPosition(ctx, config.X, config.Y)
				}
			}
		}
	}
}

// beforeClose is called right before the application closes
func (a *App) beforeClose(ctx context.Context) bool {
	width, height := runtime.WindowGetSize(ctx)
	x, y := runtime.WindowGetPosition(ctx)
	
	config := struct {
		Width  int `json:"width"`
		Height int `json:"height"`
		X      int `json:"x"`
		Y      int `json:"y"`
	}{
		Width:  width,
		Height: height,
		X:      x,
		Y:      y,
	}

	configBytes, _ := json.Marshal(config)
	_ = database.SetConfig("window_bounds", string(configBytes))

	return false
}

// Window control bindings

func (a *App) Minimize() {
	runtime.WindowMinimise(a.ctx)
}

func (a *App) Maximize() {
	runtime.WindowToggleMaximise(a.ctx)
}

func (a *App) Close() {
	runtime.Quit(a.ctx)
}

// File system bindings

func (a *App) ReadDir(path string) ([]models.FileInfo, error) {
	return fs.ReadDir(path)
}

func (a *App) GetDrives() []string {
	return fs.GetDrives()
}

func (a *App) GetDefaultPaths() map[string]string {
	return fs.GetDefaultPaths()
}

func (a *App) PasteFiles(operation string, srcPaths []string, destDir string) string {
	return fs.StartTask(a.ctx, operation, srcPaths, destDir)
}

func (a *App) CancelPaste(taskID string) {
	fs.CancelTask(taskID)
}

func (a *App) ResolvePasteConflict(taskID string, action string, applyToAll bool) {
	fs.ResolveTaskConflict(taskID, action, applyToAll)
}

func (a *App) RenameFile(oldPath string, newPath string, overwrite bool) (bool, error) {
	if !overwrite {
		if _, err := os.Stat(newPath); err == nil {
			return false, nil // false indicates conflict
		}
	} else {
		// On Windows, os.Rename fails if the destination exists. We must remove it first.
		_ = os.Remove(newPath)
	}
	err := os.Rename(oldPath, newPath)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (a *App) DeleteToRecycleBin(paths []string) error {
	return fs.DeleteToRecycleBin(paths)
}

func (a *App) PermanentDelete(paths []string) string {
	return fs.StartTask(a.ctx, "permanent_delete", paths, "")
}

func (a *App) CreateFolder(path string) error {
	return os.MkdirAll(path, 0755)
}

func (a *App) CreateFile(path string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	f.Close()
	return nil
}

// Database bindings

func (a *App) GetConfig(key string) (string, error) {
	return database.GetConfig(key)
}

func (a *App) SetConfig(key string, valueJSON string) error {
	return database.SetConfig(key, valueJSON)
}

// Tag bindings

func (a *App) GetGlobalTags() ([]models.Tag, error) {
	return database.GetGlobalTags()
}

func (a *App) CreateTag(tag models.Tag) error {
	return database.CreateTag(&tag)
}

func (a *App) UpdateTag(tag models.Tag) error {
	return database.UpdateTag(&tag)
}

func (a *App) DeleteTag(tagID string) error {
	return database.DeleteTag(tagID)
}

func (a *App) UpdateTagsOrder(orderedIDs []string) error {
	return database.UpdateTagsOrder(orderedIDs)
}

func (a *App) GetFileTags(path string) ([]models.Tag, error) {
	tags, err := database.GetTagsForFile(path)
	if err != nil {
		return nil, err
	}
	
	if len(tags) == 0 {
		adsTags, adsErr := fs.ReadTagsFromADS(path)
		if adsErr == nil && len(adsTags) > 0 {
			tagIDs := make([]string, len(adsTags))
			for i, t := range adsTags {
				_ = database.CreateTag(&t)
				tagIDs[i] = t.ID
			}
			_ = database.SetTagsForFile(path, tagIDs)
			return adsTags, nil
		}
	}

	return tags, nil
}

func (a *App) AddTagToFile(path string, tag models.Tag) error {
	err := database.AddTagToFile(path, tag.ID)
	if err != nil {
		return err
	}
	
	tags, _ := database.GetTagsForFile(path)
	_ = fs.WriteTagsToADS(path, tags)
	return nil
}

func (a *App) RemoveTagFromFile(path string, tagID string) error {
	err := database.RemoveTagFromFile(path, tagID)
	if err != nil {
		return err
	}

	tags, _ := database.GetTagsForFile(path)
	_ = fs.WriteTagsToADS(path, tags)
	return nil
}

func (a *App) GetTagsForFiles(paths []string) (map[string][]models.Tag, error) {
	return database.GetTagsForFiles(paths)
}

// GetRecentItems returns recent files and folders from Windows Recent folder
func (a *App) GetRecentItems() ([]models.FileInfo, error) {
	recentDir := filepath.Join(os.Getenv("APPDATA"), "Microsoft", "Windows", "Recent")
	
	entries, err := os.ReadDir(recentDir)
	if err != nil {
		return nil, err
	}

	type EntryWithTime struct {
		os.DirEntry
		ModTime int64
	}
	var lnkEntries []EntryWithTime
	for _, entry := range entries {
		if !entry.IsDir() && strings.ToLower(filepath.Ext(entry.Name())) == ".lnk" {
			info, err := entry.Info()
			if err == nil {
				lnkEntries = append(lnkEntries, EntryWithTime{entry, info.ModTime().UnixNano()})
			}
		}
	}

	sort.Slice(lnkEntries, func(i, j int) bool {
		return lnkEntries[i].ModTime > lnkEntries[j].ModTime
	})

	if len(lnkEntries) > 100 {
		lnkEntries = lnkEntries[:100]
	}

	ole.CoInitialize(0)
	defer ole.CoUninitialize()

	unknown, err := oleutil.CreateObject("WScript.Shell")
	if err != nil {
		return nil, err
	}
	shell, err := unknown.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		return nil, err
	}
	defer shell.Release()

	var result []models.FileInfo
	seen := make(map[string]bool)

	for _, entry := range lnkEntries {
		lnkPath := filepath.Join(recentDir, entry.Name())
		cs, err := oleutil.CallMethod(shell, "CreateShortcut", lnkPath)
		if err != nil || cs == nil {
			continue
		}
		shortcut := cs.ToIDispatch()
		
		targetPathVar, err := oleutil.GetProperty(shortcut, "TargetPath")
		if err != nil || targetPathVar.Value() == nil {
			shortcut.Release()
			continue
		}
		targetPath := targetPathVar.ToString()
		shortcut.Release()

		if targetPath == "" {
			continue
		}

		if seen[targetPath] {
			continue
		}
		seen[targetPath] = true

		targetInfo, err := os.Stat(targetPath)
		if err != nil {
			continue
		}

		lnkInfo, _ := entry.Info()
		modTime := lnkInfo.ModTime()

		result = append(result, models.FileInfo{
			Name:    targetInfo.Name(),
			Path:    targetPath,
			IsDir:   targetInfo.IsDir(),
			Size:    targetInfo.Size(),
			ModTime: modTime,
			Ext:     filepath.Ext(targetInfo.Name()),
		})
	}

	return result, nil
}

// Format Conversion bindings

func (a *App) GetConvertibleFormats(paths []string) []string {
	return converter.GetConvertibleFormats(paths)
}

func (a *App) ConvertFile(sourcePath string, targetExt string) (string, error) {
	return converter.ConvertFile(sourcePath, targetExt)
}
