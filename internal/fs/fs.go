package fs

import (
	"file-manager/internal/models"
	"os"
	"path/filepath"
)

// ReadDir returns the list of files and directories in the given path
func ReadDir(path string) ([]models.FileInfo, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var files []models.FileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue // Skip if we can't get info (e.g. permission denied)
		}

		fullPath := filepath.Join(path, entry.Name())
		files = append(files, models.FileInfo{
			Name:    entry.Name(),
			Path:    fullPath,
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
			Ext:     filepath.Ext(entry.Name()),
		})
	}

	return files, nil
}

// GetDrives returns the list of available drives on Windows (e.g. C:\, D:\)
func GetDrives() []string {
	var drives []string
	for _, drive := range "ABCDEFGHIJKLMNOPQRSTUVWXYZ" {
		path := string(drive) + ":\\"
		_, err := os.Stat(path)
		if err == nil {
			drives = append(drives, path)
		}
	}
	return drives
}

// GetDefaultPaths returns common Windows paths like Desktop, Documents, etc.
func GetDefaultPaths() map[string]string {
	userProfile := os.Getenv("USERPROFILE")
	return map[string]string{
		"Desktop":   filepath.Join(userProfile, "Desktop"),
		"Documents": filepath.Join(userProfile, "Documents"),
		"Downloads": filepath.Join(userProfile, "Downloads"),
		"Pictures":  filepath.Join(userProfile, "Pictures"),
		"Videos":    filepath.Join(userProfile, "Videos"),
		"Music":     filepath.Join(userProfile, "Music"),
	}
}
