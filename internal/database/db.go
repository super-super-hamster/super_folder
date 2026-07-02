package database

import (
	"super_folder/internal/models"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() error {
	programData := os.Getenv("ProgramData")
	if programData == "" {
		programData = `C:\ProgramData`
	}
	dbDir := filepath.Join(programData, "file-manager")
	if err := os.MkdirAll(dbDir, 0777); err != nil {
		return err
	}
	dbPath := filepath.Join(dbDir, "config.db")

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath+"?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)"), &gorm.Config{})
	if err != nil {
		return err
	}

	// Make sure WAL is applied
	DB.Exec("PRAGMA journal_mode=WAL;")

	// Schema migration: v2 drops legacy similar-image tables so they can be
	// recreated with the current primary-key definitions.
	schemaVersionStr, _ := GetConfig("db_schema_version")
	schemaVersion := 0
	if schemaVersionStr != "" {
		schemaVersion, _ = strconv.Atoi(schemaVersionStr)
	}
	if schemaVersion < 2 {
		DB.Exec("DROP TABLE IF EXISTS image_hashes;")
		DB.Exec("DROP TABLE IF EXISTS similar_pairs;")
		DB.Exec("DROP TABLE IF EXISTS similar_folder_states;")
		_ = SetConfig("db_schema_version", "2")
	}

	// Migrate the schema
	return DB.AutoMigrate(
		&models.Config{},
		&models.Thumbnail{},
		&models.Tag{},
		&models.FileTag{},
		&models.Remark{},
		&models.Favorite{},
		&models.ImageHash{},
		&models.SimilarPair{},
		&models.SimilarHashState{},
		&models.SimilarFolderState{},
	)
}

func GetConfig(key string) (string, error) {
	var cfg models.Config
	err := DB.Where("key = ?", key).First(&cfg).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return cfg.ValueJSON, nil
}

func SetConfig(key string, valueJSON string) error {
	var cfg models.Config
	result := DB.Where("key = ?", key).First(&cfg)
	if result.Error == gorm.ErrRecordNotFound {
		cfg = models.Config{Key: key, ValueJSON: valueJSON}
		return DB.Create(&cfg).Error
	}
	cfg.ValueJSON = valueJSON
	return DB.Save(&cfg).Error
}

func GetThumbnail(path string) (*models.Thumbnail, error) {
	var thumb models.Thumbnail
	err := DB.Where("path = ?", path).First(&thumb).Error
	if err != nil {
		return nil, err
	}
	return &thumb, nil
}

func SaveThumbnail(thumb *models.Thumbnail) error {
	thumb.LastAccessed = time.Now().UnixMilli()
	return DB.Save(thumb).Error
}

func TouchThumbnail(path string) error {
	return DB.Model(&models.Thumbnail{}).
		Where("path = ?", path).
		UpdateColumn("last_accessed", time.Now().UnixMilli()).Error
}

func GetThumbnailCacheSize() (int64, error) {
	var size int64
	err := DB.Table("thumbnails").Select("COALESCE(SUM(LENGTH(data) + LENGTH(path) + 8), 0)").Scan(&size).Error
	return size, err
}

func ClearThumbnailCache() error {
	if err := DB.Exec("DELETE FROM thumbnails").Error; err != nil {
		return err
	}
	return DB.Exec("VACUUM").Error
}

func AutoCleanThumbnailCache(limitMB int) error {
	limitBytes := int64(limitMB) * 1024 * 1024
	size, err := GetThumbnailCacheSize()
	if err != nil || size <= limitBytes {
		return err
	}

	// Delete least-recently-used 20% of thumbnails repeatedly until we're under limit
	for size > limitBytes {
		err = DB.Exec(`DELETE FROM thumbnails WHERE path IN (
			SELECT path FROM thumbnails ORDER BY last_accessed ASC NULLS FIRST LIMIT (MAX(100, (SELECT COUNT(*)/5 FROM thumbnails)))
		)`).Error
		if err != nil {
			return err
		}
		size, _ = GetThumbnailCacheSize()
	}
	return DB.Exec("VACUUM").Error
}

// Tag Management

func GetGlobalTags() ([]models.Tag, error) {
	var tags []models.Tag
	err := DB.Order("sort_order asc").Find(&tags).Error
	return tags, err
}

func GetTagUsageCounts() (map[string]int, error) {
	var results []struct {
		TagID string
		Count int
	}
	err := DB.Table("file_tags").Select("tag_id, count(*) as count").Group("tag_id").Scan(&results).Error
	if err != nil {
		return nil, err
	}
	counts := make(map[string]int)
	for _, r := range results {
		counts[r.TagID] = r.Count
	}
	return counts, nil
}

func GetTagIDsByNames(names []string) ([]string, error) {
	if len(names) == 0 {
		return nil, nil
	}
	var ids []string
	err := DB.Model(&models.Tag{}).Where("name IN ?", names).Pluck("id", &ids).Error
	return ids, err
}

func GetTagIDsByType(tagType string) ([]string, error) {
	var ids []string
	err := DB.Model(&models.Tag{}).Where("type = ?", tagType).Pluck("id", &ids).Error
	return ids, err
}

func CreateTag(tag *models.Tag) error {
	return DB.Create(tag).Error
}

func UpdateTag(tag *models.Tag) error {
	return DB.Save(tag).Error
}

func DeleteTag(tagID string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("tag_id = ?", tagID).Delete(&models.FileTag{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", tagID).Delete(&models.Tag{}).Error
	})
}

func UpdateTagsOrder(orderedIDs []string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		for i, id := range orderedIDs {
			if err := tx.Model(&models.Tag{}).Where("id = ?", id).Update("sort_order", i).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// FileTag Management

func GetTagsForFile(path string) ([]models.Tag, error) {
	var tags []models.Tag
	err := DB.Joins("JOIN file_tags ON file_tags.tag_id = tags.id").
		Where("file_tags.path = ?", path).
		Order("tags.sort_order asc").
		Find(&tags).Error
	return tags, err
}

func GetTagsForFiles(paths []string) (map[string][]models.Tag, error) {
	var fileTags []struct {
		Path string
		models.Tag
	}
	
	err := DB.Table("file_tags").
		Select("file_tags.path, tags.*").
		Joins("JOIN tags ON file_tags.tag_id = tags.id").
		Where("file_tags.path IN ?", paths).
		Order("tags.sort_order asc").
		Scan(&fileTags).Error

	if err != nil {
		return nil, err
	}

	result := make(map[string][]models.Tag)
	for _, ft := range fileTags {
		result[ft.Path] = append(result[ft.Path], ft.Tag)
	}
	return result, nil
}

func AddTagToFile(path string, tagID string) error {
	ft := models.FileTag{Path: path, TagID: tagID}
	// Use FirstOrCreate to avoid duplicates
	return DB.Where(models.FileTag{Path: path, TagID: tagID}).FirstOrCreate(&ft).Error
}

func AddTagToFiles(paths []string, tagID string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		for _, path := range paths {
			ft := models.FileTag{Path: path, TagID: tagID}
			if err := tx.Where(models.FileTag{Path: path, TagID: tagID}).FirstOrCreate(&ft).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func RemoveTagFromFile(path string, tagID string) error {
	return DB.Where("path = ? AND tag_id = ?", path, tagID).Delete(&models.FileTag{}).Error
}

func RemoveTagFromFiles(paths []string, tagIDs []string) error {
	return DB.Where("path IN ? AND tag_id IN ?", paths, tagIDs).Delete(&models.FileTag{}).Error
}

func SetTagsForFile(path string, tagIDs []string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		// Delete existing
		if err := tx.Where("path = ?", path).Delete(&models.FileTag{}).Error; err != nil {
			return err
		}
		// Add new
		for _, tagID := range tagIDs {
			if err := tx.Create(&models.FileTag{Path: path, TagID: tagID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func GetRemark(path string) (string, error) {
	var remark models.Remark
	err := DB.Where("path = ?", path).First(&remark).Error
	if err == gorm.ErrRecordNotFound {
		return "", nil // No remark found is not an error
	}
	if err != nil {
		return "", err
	}
	return remark.Content, nil
}

func SetRemark(path string, content string) error {
	var remark models.Remark
	result := DB.Where("path = ?", path).First(&remark)
	if result.Error == gorm.ErrRecordNotFound {
		remark = models.Remark{Path: path, Content: content}
		return DB.Create(&remark).Error
	}
	remark.Content = content
	return DB.Save(&remark).Error
}

func DeleteRemark(path string) error {
	return DB.Where("path = ?", path).Delete(&models.Remark{}).Error
}

// Favorite Management

func GetFavoritesList() ([]models.Favorite, error) {
	var favs []models.Favorite
	err := DB.Find(&favs).Error
	return favs, err
}

func AddFavorite(path string, isDir bool) error {
	fav := models.Favorite{Path: path, IsDir: isDir}
	return DB.Where(models.Favorite{Path: path}).FirstOrCreate(&fav).Error
}

func RemoveFavorite(path string) error {
	return DB.Where("path = ?", path).Delete(&models.Favorite{}).Error
}

func IsFavorite(path string) (bool, error) {
	var count int64
	err := DB.Model(&models.Favorite{}).Where("path = ?", path).Count(&count).Error
	return count > 0, err
}

// Similar Image Management

func SaveImageHashes(hashes []models.ImageHash) error {
	if len(hashes) == 0 {
		return nil
	}
	return DB.Save(&hashes).Error
}

func GetImageHashesByFolder(folderPath string) ([]models.ImageHash, error) {
	var hashes []models.ImageHash
	err := DB.Where("folder_path = ?", folderPath).Find(&hashes).Error
	return hashes, err
}

func DeleteImageHashesByFolder(folderPath string) error {
	return DB.Where("folder_path = ?", folderPath).Delete(&models.ImageHash{}).Error
}

func SaveSimilarPairs(pairs []models.SimilarPair) error {
	if len(pairs) == 0 {
		return nil
	}
	return DB.Save(&pairs).Error
}

func DeleteSimilarPairsByFolder(folderPath string, threshold int, useMax bool) error {
	return DB.Where("folder_path = ? AND threshold = ? AND use_max = ?", folderPath, threshold, useMax).Delete(&models.SimilarPair{}).Error
}

func GetSimilarPairsByFolder(folderPath string, threshold int, useMax bool) ([]models.SimilarPair, error) {
	var pairs []models.SimilarPair
	err := DB.Where("folder_path = ? AND threshold = ? AND use_max = ?", folderPath, threshold, useMax).Find(&pairs).Error
	return pairs, err
}

func GetSimilarHashState(folderPath string) (*models.SimilarHashState, error) {
	var state models.SimilarHashState
	err := DB.Where("folder_path = ?", folderPath).First(&state).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &state, nil
}

func SaveSimilarHashState(state *models.SimilarHashState) error {
	return DB.Save(state).Error
}

func GetSimilarFolderState(folderPath string, threshold int, useMax bool) (*models.SimilarFolderState, error) {
	var state models.SimilarFolderState
	err := DB.Where("folder_path = ? AND threshold = ? AND use_max = ?", folderPath, threshold, useMax).First(&state).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &state, nil
}

func SaveSimilarFolderState(state *models.SimilarFolderState) error {
	return DB.Save(state).Error
}


