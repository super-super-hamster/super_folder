package service

import (
	"os"
	"path/filepath"
)

func PortFilePath() string {
	programData := os.Getenv("ProgramData")
	if programData == "" {
		programData = `C:\ProgramData`
	}
	return filepath.Join(programData, "file-manager", "search_port.txt")
}
