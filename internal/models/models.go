package models

import "time"

// FileInfo represents a file or directory in the file system
type FileInfo struct {
	Name    string    `json:"name"`
	Path    string    `json:"path"`
	IsDir   bool      `json:"isDir"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"modTime"`
	Ext     string    `json:"ext"`
}

// Config represents user configuration and favorites
type Config struct {
	ID        uint   `gorm:"primaryKey"`
	Key       string `gorm:"uniqueIndex"` // e.g., "favorite_dirs", "custom_paths"
	ValueJSON string // JSON encoded string of values
}

// Thumbnail represents a cached image thumbnail
type Thumbnail struct {
	Path         string `gorm:"primaryKey"`
	ModTime      int64  // Unix timestamp of file modification time to invalidate cache
	LastAccessed int64  // Unix timestamp of last cache hit
	Data         []byte // The resized JPEG byte array
}

// ImageHash stores perceptual hashes for similar-image detection
type ImageHash struct {
	Path       string `gorm:"primaryKey"`
	FolderPath string `gorm:"index"`
	PHash      uint64
	DHash      uint64
	FileSize   int64
	ModTime    int64
	IndexedAt  int64
}

// SimilarPair stores a pair of similar images within a folder scope
type SimilarPair struct {
	FolderPath string `gorm:"primaryKey"`
	PathA      string `gorm:"primaryKey"`
	PathB      string `gorm:"primaryKey"`
	Distance   int
	Threshold  int
}

// SimilarFolderState tracks the indexed state of a folder for incremental updates
type SimilarFolderState struct {
	FolderPath        string `gorm:"primaryKey"`
	IncludeSubfolders bool
	Threshold         int
	MaxFileMtime      int64
	IndexedAt         int64
}

// Tag represents a global file tag created by the user
type Tag struct {
	ID        string `json:"id" gorm:"primaryKey"`
	Name      string `json:"name"`
	Type      string `json:"type"`      // Optional category/type, e.g. "作者"
	ColorHex  string `json:"colorHex"`  // Derived from Name hash
	SortOrder int    `json:"sortOrder"` // For global user-defined sorting
}

// FileTag represents the mapping of a file path to a Tag
type FileTag struct {
	Path  string `json:"path" gorm:"primaryKey;index"` // The full path of the file
	TagID string `json:"tagId" gorm:"primaryKey"`      // The Tag ID
}

// Remark represents a single user remark for a file
type Remark struct {
	Path    string `json:"path" gorm:"primaryKey"`
	Content string `json:"content"`
}

// Favorite represents a favorited file or directory
type Favorite struct {
	Path  string `json:"path" gorm:"primaryKey"`
	IsDir bool   `json:"isDir"`
}
