package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"super_folder/internal/chineseconv"
	"super_folder/internal/converter"
	"super_folder/internal/database"
	"super_folder/internal/fs"
	"super_folder/internal/models"
	"super_folder/internal/privacy"
	"super_folder/internal/rename"
	searchservice "super_folder/internal/search/service"
	"super_folder/internal/similarity"
	"super_folder/internal/terminal"
	"super_folder/internal/thumbnail"
	"super_folder/internal/undo"
	"super_folder/internal/winidentity"
)

func init() {
	undo.RegisterTagHandlers(
		func(paths []string, tagIDs []string) error {
			for _, path := range paths {
				for _, tagID := range tagIDs {
					if err := database.AddTagToFile(path, tagID); err != nil {
						return err
					}
				}
				if err := syncFileTagsToADS(path); err != nil {
					return err
				}
			}
			return nil
		},
		func(paths []string, tagIDs []string) error {
			for _, path := range paths {
				for _, tagID := range tagIDs {
					if err := database.RemoveTagFromFile(path, tagID); err != nil {
						return err
					}
				}
				if err := syncFileTagsToADS(path); err != nil {
					return err
				}
			}
			return nil
		},
	)
}

func syncFileTagsToADS(path string) error {
	tags, err := database.GetTagsForFile(path)
	if err != nil {
		return err
	}
	return fs.WriteTagsToADS(path, tags)
}

// App struct
type App struct {
	ctx            context.Context
	localHttpPort  int
	localAuthToken string
	termService    *terminal.TerminalService
	privacyMode    string
	resetVerified  bool
}

func generateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		localAuthToken: generateToken(),
		termService:    terminal.NewTerminalService(),
		privacyMode:    privacy.ModePublic,
	}
}

func (a *App) isPrivacyMode() bool {
	return a.privacyMode == privacy.ModePrivacy
}

func (a *App) filterFiles(files []models.FileInfo) ([]models.FileInfo, error) {
	return privacy.FilterVisibleFiles(files, a.isPrivacyMode())
}

func (a *App) ensurePublicCanAccess(path string) error {
	if a.isPrivacyMode() || path == "" || strings.Contains(path, "://") {
		return nil
	}
	hidden, err := privacy.IsPathHiddenInPublic(path)
	if err != nil {
		return err
	}
	if hidden {
		return fmt.Errorf("当前内容在公开模式下不可访问")
	}
	return nil
}

// GetLocalServerPort returns the dynamic port assigned for the local file server
func (a *App) GetLocalServerPort() int {
	return a.localHttpPort
}

// GetLocalAuthToken returns the token required to access local HTTP endpoints
func (a *App) GetLocalAuthToken() string {
	return a.localAuthToken
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.termService.SetContext(ctx)

	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/file", func(w http.ResponseWriter, r *http.Request) {
			token := r.URL.Query().Get("token")
			if token != a.localAuthToken {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			path := r.URL.Query().Get("path")
			if path != "" {
				if err := a.ensurePublicCanAccess(path); err != nil {
					http.Error(w, "Forbidden", http.StatusForbidden)
					return
				}
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
	rename.StartWatcher(ctx)
}

// beforeClose is called right before the application closes
func (a *App) beforeClose(ctx context.Context) bool {
	a.termService.Close()
	_ = privacy.SetLastMode(a.privacyMode)
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

// Dialog bindings

func (a *App) SelectDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件夹",
	})
	if err != nil {
		return "", err
	}
	return dir, nil
}

func (a *App) SelectFiles() ([]string, error) {
	files, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件",
		Filters: []runtime.FileFilter{
			{DisplayName: "文本/电子书", Pattern: "*.txt;*.epub"},
			{DisplayName: "所有文件", Pattern: "*.*"},
		},
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}

// File system bindings

func (a *App) ReadDir(path string) ([]models.FileInfo, error) {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return nil, err
	}
	files, err := fs.ReadDir(path)
	if err != nil {
		return nil, err
	}
	return a.filterFiles(files)
}

func (a *App) ReadDirChunked(path string, reqId string) ([]models.FileInfo, error) {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var firstChunk []models.FileInfo
	chunkSize := 50

	processEntry := func(entry os.DirEntry) *models.FileInfo {
		info, err := entry.Info()
		if err != nil {
			return nil
		}
		fullPath := filepath.Join(path, entry.Name())
		return &models.FileInfo{
			Name:    entry.Name(),
			Path:    fullPath,
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
			Ext:     filepath.Ext(entry.Name()),
		}
	}

	// Process first chunk synchronously
	for i := 0; i < len(entries) && i < chunkSize; i++ {
		if fi := processEntry(entries[i]); fi != nil {
			firstChunk = append(firstChunk, *fi)
		}
	}
	firstChunk, err = a.filterFiles(firstChunk)
	if err != nil {
		return nil, err
	}

	// Process the rest asynchronously
	if len(entries) > chunkSize {
		go func() {
			var currentChunk []models.FileInfo
			for i := chunkSize; i < len(entries); i++ {
				if fi := processEntry(entries[i]); fi != nil {
					currentChunk = append(currentChunk, *fi)
				}

				if len(currentChunk) >= 200 {
					filtered, err := a.filterFiles(currentChunk)
					if err != nil {
						runtime.EventsEmit(a.ctx, "directory:done:"+reqId, nil)
						return
					}
					runtime.EventsEmit(a.ctx, "directory:chunk:"+reqId, filtered)
					currentChunk = nil
					time.Sleep(5 * time.Millisecond)
				}
			}
			if len(currentChunk) > 0 {
				filtered, err := a.filterFiles(currentChunk)
				if err == nil {
					runtime.EventsEmit(a.ctx, "directory:chunk:"+reqId, filtered)
				}
			}
			runtime.EventsEmit(a.ctx, "directory:done:"+reqId, nil)
		}()
	} else {
		// Immediately done
		go func() {
			runtime.EventsEmit(a.ctx, "directory:done:"+reqId, nil)
		}()
	}

	return firstChunk, nil
}

func (a *App) GetDrives() []string {
	return fs.GetDrives()
}

func (a *App) GetRenameSchemes() ([]rename.Scheme, error) {
	return rename.GetRenameSchemes()
}

func (a *App) SaveRenameScheme(name string, code string) error {
	return rename.SaveRenameScheme(name, code)
}

func (a *App) DeleteRenameScheme(name string) error {
	return rename.DeleteRenameScheme(name)
}

func (a *App) CheckBatchRenameConflicts(operations map[string]string) []string {
	return rename.CheckBatchRenameConflicts(operations)
}

func (a *App) BatchRenameFiles(operations map[string]string) error {
	return rename.BatchRenameFiles(operations)
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
		if err := os.Remove(newPath); err != nil {
			return false, fmt.Errorf("failed to overwrite existing file: %w", err)
		}
	}
	err := os.Rename(oldPath, newPath)
	if err != nil {
		return false, err
	}

	undo.Push(undo.Operation{
		Type:      undo.OpRename,
		SrcPaths:  []string{oldPath},
		DestPaths: []string{newPath},
	})

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
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_EXCL, 0666)
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

func (a *App) GetPrivacyState() (models.PrivacyState, error) {
	return models.PrivacyState{
		Mode:                     a.privacyMode,
		HasPassword:              privacy.HasPassword(),
		RestorePrivacyOnStartup:  privacy.RestoreOnStartup(),
		ShouldPromptRestore:      privacy.RestoreOnStartup() && privacy.LastMode() == privacy.ModePrivacy && privacy.HasPassword() && !a.isPrivacyMode(),
		WindowsIdentityAvailable: winidentity.Available(),
	}, nil
}

func (a *App) SetupPrivacyPassword(password string, confirm string) (models.PrivacyState, error) {
	if privacy.HasPassword() && !a.resetVerified {
		return models.PrivacyState{}, fmt.Errorf("请先验证当前身份")
	}
	if password != confirm {
		return models.PrivacyState{}, fmt.Errorf("两次输入的密码不一致")
	}
	if err := privacy.SetPassword(password); err != nil {
		return models.PrivacyState{}, err
	}
	a.privacyMode = privacy.ModePrivacy
	a.resetVerified = false
	_ = privacy.SetLastMode(privacy.ModePrivacy)
	return a.GetPrivacyState()
}

func (a *App) UnlockPrivacyMode(password string) (models.PrivacyState, error) {
	if !privacy.HasPassword() {
		return models.PrivacyState{}, fmt.Errorf("请先设置隐私密码")
	}
	if !privacy.VerifyPassword(password) {
		return models.PrivacyState{}, fmt.Errorf("密码错误")
	}
	a.privacyMode = privacy.ModePrivacy
	a.resetVerified = false
	_ = privacy.SetLastMode(privacy.ModePrivacy)
	return a.GetPrivacyState()
}

func (a *App) LockPrivacyMode() (models.PrivacyState, error) {
	a.privacyMode = privacy.ModePublic
	a.resetVerified = false
	_ = privacy.SetLastMode(privacy.ModePublic)
	return a.GetPrivacyState()
}

func (a *App) SetRestorePrivacyModeOnStartup(enabled bool) (models.PrivacyState, error) {
	if err := privacy.SetRestoreOnStartup(enabled); err != nil {
		return models.PrivacyState{}, err
	}
	return a.GetPrivacyState()
}

func (a *App) GetProtectedPaths(paths []string) (map[string]bool, error) {
	if !a.isPrivacyMode() {
		return map[string]bool{}, nil
	}
	return privacy.DirectProtectedPaths(paths)
}

func (a *App) SetPathProtected(path string, isDir bool, protected bool) error {
	if !a.isPrivacyMode() {
		return fmt.Errorf("请先进入隐私模式")
	}
	return privacy.SetPathProtected(path, isDir, protected)
}

func (a *App) SetTagProtected(tagID string, protected bool) error {
	if !a.isPrivacyMode() {
		return fmt.Errorf("请先进入隐私模式")
	}
	return privacy.SetTagProtected(tagID, protected)
}

func (a *App) IsPathProtected(path string) (bool, error) {
	if !a.isPrivacyMode() {
		return false, nil
	}
	return privacy.IsDirectPathProtected(path)
}

func (a *App) CanAccessPath(path string) (bool, error) {
	if a.isPrivacyMode() {
		return true, nil
	}
	hidden, err := privacy.IsPathHiddenInPublic(path)
	if err != nil {
		return false, err
	}
	return !hidden, nil
}

func (a *App) VerifyWindowsIdentityForPrivacyReset() (bool, error) {
	a.resetVerified = false
	verified, err := winidentity.Verify()
	if err != nil {
		return false, err
	}
	a.resetVerified = verified
	return verified, nil
}

func (a *App) ResetPrivacyPassword(password string, confirm string) (models.PrivacyState, error) {
	if !a.resetVerified {
		return models.PrivacyState{}, fmt.Errorf("请先通过 Windows 身份验证")
	}
	return a.SetupPrivacyPassword(password, confirm)
}

// Tag bindings

func (a *App) GetGlobalTags() ([]models.Tag, error) {
	tags, err := database.GetGlobalTags()
	if err != nil {
		return nil, err
	}
	return privacy.FilterVisibleTags(tags, a.isPrivacyMode()), nil
}

func (a *App) CreateTag(tag models.Tag) error {
	return database.CreateTag(&tag)
}

func (a *App) UpdateTag(tag models.Tag) error {
	return database.UpdateTag(&tag)
}

// Undo/Redo bindings

func (a *App) UndoOperation() error {
	_, err := undo.Undo()
	return err
}

func (a *App) RedoOperation() error {
	_, err := undo.Redo()
	return err
}

func (a *App) ClearUndoStack() {
	undo.Clear()
}

func (a *App) DeleteTag(tagID string) error {
	return database.DeleteTag(tagID)
}

func (a *App) UpdateTagsOrder(orderedIDs []string) error {
	return database.UpdateTagsOrder(orderedIDs)
}

func (a *App) GetFileTags(path string) ([]models.Tag, error) {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return nil, err
	}
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

	return privacy.FilterVisibleTags(tags, a.isPrivacyMode()), nil
}

func (a *App) AddTagToFile(path string, tag models.Tag) error {
	return a.AddTagToFiles([]string{path}, tag)
}

func (a *App) AddTagToFiles(paths []string, tag models.Tag) error {
	if !a.isPrivacyMode() && tag.IsProtected {
		return fmt.Errorf("公开模式下不可使用受保护标签")
	}
	if len(paths) == 0 {
		return nil
	}

	err := database.AddTagToFiles(paths, tag.ID)
	if err != nil {
		return err
	}

	for _, path := range paths {
		if err := syncFileTagsToADS(path); err != nil {
			return err
		}
	}

	undo.Push(undo.Operation{
		Type:   undo.OpAddTag,
		Paths:  append([]string(nil), paths...),
		TagIDs: []string{tag.ID},
	})
	return nil
}

func (a *App) RemoveTagFromFile(path string, tagID string) error {
	return a.RemoveTagFromFiles([]string{path}, []string{tagID})
}

func (a *App) RemoveTagFromFiles(paths []string, tagIDs []string) error {
	if len(paths) == 0 || len(tagIDs) == 0 {
		return nil
	}

	existingTags, err := database.GetTagsForFiles(paths)
	if err != nil {
		return err
	}
	tagSet := make(map[string]struct{}, len(tagIDs))
	for _, tagID := range tagIDs {
		tagSet[tagID] = struct{}{}
	}
	pathTagIDs := make(map[string][]string)
	for _, path := range paths {
		for _, tag := range existingTags[path] {
			if _, ok := tagSet[tag.ID]; ok {
				pathTagIDs[path] = append(pathTagIDs[path], tag.ID)
			}
		}
	}
	if len(pathTagIDs) == 0 {
		return nil
	}

	err = database.RemoveTagFromFiles(paths, tagIDs)
	if err != nil {
		return err
	}

	for _, path := range paths {
		if err := syncFileTagsToADS(path); err != nil {
			return err
		}
	}

	undo.Push(undo.Operation{
		Type:       undo.OpRemoveTag,
		Paths:      append([]string(nil), paths...),
		TagIDs:     append([]string(nil), tagIDs...),
		PathTagIDs: pathTagIDs,
	})
	return nil
}

func (a *App) GetTagsForFiles(paths []string) (map[string][]models.Tag, error) {
	if !a.isPrivacyMode() {
		visiblePaths, err := privacy.FilterVisiblePaths(paths)
		if err != nil {
			return nil, err
		}
		paths = visiblePaths
	}
	result, err := database.GetTagsForFiles(paths)
	if err != nil {
		return nil, err
	}
	if a.isPrivacyMode() {
		return result, nil
	}
	for path, tags := range result {
		result[path] = privacy.FilterVisibleTags(tags, false)
	}
	return result, nil
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

	return a.filterFiles(result)
}

// Format Conversion bindings

func (a *App) GetConvertibleFormats(paths []string) []string {
	return converter.GetConvertibleFormats(paths)
}

func (a *App) ConvertFile(sourcePath string, targetExt string) (string, error) {
	return converter.ConvertFile(sourcePath, targetExt)
}

// Search bindings
func (a *App) SearchFiles(req map[string]interface{}) ([]models.FileInfo, error) {
	req["privacyMode"] = a.privacyMode
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	portFile := searchservice.PortFilePath()
	portBytes, err := os.ReadFile(portFile)
	if err != nil {
		return nil, fmt.Errorf("search service is not ready (cannot read port file)")
	}
	port := strings.TrimSpace(string(portBytes))
	if port == "" || port == "0" {
		return nil, fmt.Errorf("search service is not ready")
	}

	url := fmt.Sprintf("http://127.0.0.1:%s/search", port)
	resp, err := http.Post(url, "application/json", strings.NewReader(string(body)))
	if err != nil {
		_ = os.Remove(portFile)
		return nil, fmt.Errorf("search service is not ready: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("search service returned status %d", resp.StatusCode)
	}

	var result struct {
		Paths []string `json:"paths"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var fileInfos []models.FileInfo
	for _, p := range result.Paths {
		if !a.isPrivacyMode() {
			hidden, err := privacy.IsPathHiddenInPublic(p)
			if err != nil || hidden {
				continue
			}
		}
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		fileInfos = append(fileInfos, models.FileInfo{
			Name:    info.Name(),
			Path:    p,
			IsDir:   info.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
			Ext:     filepath.Ext(info.Name()),
		})
	}

	return a.filterFiles(fileInfos)
}

func (a *App) GetFileRemark(path string) (string, error) {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return "", err
	}
	return database.GetRemark(path)
}

func (a *App) SetFileRemark(path string, content string) error {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return err
	}
	return database.SetRemark(path, content)
}

func (a *App) DeleteFileRemark(path string) error {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return err
	}
	return database.DeleteRemark(path)
}

func (a *App) OpenFileWithDefault(path string) error {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return err
	}
	cmd := exec.Command("cmd", "/c", "start", "", path)
	return cmd.Start()
}

func (a *App) OpenInExplorer(path string) error {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return err
	}
	cmd := exec.Command("cmd", "/c", "start", "", "explorer", path)
	return cmd.Start()
}

func (a *App) OpenInTerminal(path string) error {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return err
	}
	cmd := exec.Command("cmd", "/c", "start", "powershell")
	cmd.Dir = path
	return cmd.Start()
}

func (a *App) GetThumbnailBudgetLimit() int {
	return thumbnail.GetBudgetLimitMB()
}

func (a *App) SetThumbnailBudgetLimit(limitMB int) {
	thumbnail.SetBudgetLimitMB(limitMB)
	similarity.SetHashMemoryBudgetMB(limitMB)
}

func (a *App) StartTerminal(dir string) error {
	if err := a.ensurePublicCanAccess(dir); err != nil {
		return err
	}
	return a.termService.Start(dir)
}

func (a *App) ReadFileText(path string) (string, error) {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return "", err
	}
	bytes, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func (a *App) WriteFileText(path string, content string) error {
	if err := a.ensurePublicCanAccess(path); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0644)
}

// Settings and Cache bindings

func (a *App) GetThumbnailCacheSize() (int64, error) {
	return database.GetThumbnailCacheSize()
}

func (a *App) ClearThumbnailCache() error {
	return database.ClearThumbnailCache()
}

func (a *App) AutoCleanThumbnailCache(limitMB int) error {
	return database.AutoCleanThumbnailCache(limitMB)
}

// Similar image bindings

func (a *App) FindSimilarImageGroups(folderPath string, includeSubfolders bool, threshold int, useMax bool) ([][]string, error) {
	return similarity.FindSimilarGroups(folderPath, includeSubfolders, threshold, useMax, func(p similarity.Progress) {
		runtime.EventsEmit(a.ctx, "similarity-progress", map[string]any{
			"stage":   p.Stage,
			"current": p.Current,
			"total":   p.Total,
		})
	})
}

func (a *App) FindImagesSimilarTo(queryPath string, folderPath string, includeSubfolders bool, threshold int, useMax bool) ([]string, error) {
	return similarity.FindImagesSimilarTo(queryPath, folderPath, includeSubfolders, threshold, useMax)
}

func (a *App) CancelSimilarImageSearch() {
	similarity.CancelCurrentSearch()
}

func (a *App) GetSimilarImageGroups(folderPath string, threshold int, useMax bool) ([][]string, error) {
	return similarity.LoadSimilarGroups(folderPath, threshold, useMax)
}

func (a *App) CheckSimilarImagesNeedReindex(folderPath string, includeSubfolders bool, threshold int, useMax bool) (bool, error) {
	return similarity.NeedsReindex(folderPath, includeSubfolders, threshold, useMax)
}

func (a *App) GetSimilarImageThresholds() map[string]int {
	return map[string]int{
		"极度相似": 5,
		"高度相似": 5,
		"部分相似": 10,
	}
}

func (a *App) GetTagUsageCounts() (map[string]int, error) {
	if !a.isPrivacyMode() {
		var rows []struct {
			TagID string
			Path  string
		}
		if err := database.DB.Table("file_tags").Select("file_tags.tag_id, file_tags.path").Joins("JOIN tags ON tags.id = file_tags.tag_id").Where("tags.is_protected = ?", false).Scan(&rows).Error; err != nil {
			return nil, err
		}
		counts := make(map[string]int)
		for _, row := range rows {
			hidden, err := privacy.IsPathHiddenInPublic(row.Path)
			if err != nil {
				return nil, err
			}
			if !hidden {
				counts[row.TagID]++
			}
		}
		return counts, nil
	}
	return database.GetTagUsageCounts()
}

// Favorites bindings

func (a *App) ToggleFavorite(path string, isDir bool) error {
	isFav, err := database.IsFavorite(path)
	if err != nil {
		return err
	}
	if isFav {
		return database.RemoveFavorite(path)
	}
	return database.AddFavorite(path, isDir)
}

func (a *App) GetFavoritePaths() ([]string, error) {
	favs, err := database.GetFavoritesList()
	if err != nil {
		return nil, err
	}
	var paths []string
	for _, f := range favs {
		paths = append(paths, f.Path)
	}
	if !a.isPrivacyMode() {
		return privacy.FilterVisiblePaths(paths)
	}
	return paths, nil
}

func (a *App) GetFavorites() ([]models.FileInfo, error) {
	favs, err := database.GetFavoritesList()
	if err != nil {
		return nil, err
	}
	var files []models.FileInfo
	for _, f := range favs {
		info, err := os.Stat(f.Path)
		if err != nil {
			continue // skip files that no longer exist
		}
		files = append(files, models.FileInfo{
			Name:    info.Name(),
			Path:    f.Path,
			IsDir:   info.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
			Ext:     filepath.Ext(info.Name()),
		})
	}
	return a.filterFiles(files)
}

func (a *App) ConvertChineseFiles(paths []string, baseScheme string, customPairs []chineseconv.CustomPair) ([]string, error) {
	var results []string
	for _, p := range paths {
		out, err := chineseconv.ConvertFile(p, baseScheme, customPairs)
		if err != nil {
			return nil, err
		}
		results = append(results, out)
	}
	return results, nil
}
