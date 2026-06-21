package database

import (
	"file-manager/internal/models"
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() error {
	// Put DB in APPDATA
	appData := os.Getenv("APPDATA")
	if appData == "" {
		appData = os.TempDir()
	}
	dbDir := filepath.Join(appData, "file-manager")
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return err
	}
	dbPath := filepath.Join(dbDir, "config.db")

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return err
	}

	// Migrate the schema
	return DB.AutoMigrate(&models.Config{}, &models.Thumbnail{}, &models.Tag{}, &models.FileTag{})
}

func GetConfig(key string) (string, error) {
	var cfg models.Config
	err := DB.Where("key = ?", key).First(&cfg).Error
	if err != nil {
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
	return DB.Save(thumb).Error
}

// Tag Management

func GetGlobalTags() ([]models.Tag, error) {
	var tags []models.Tag
	err := DB.Distinct("tags.*").
		Joins("JOIN file_tags ON file_tags.tag_id = tags.id").
		Order("tags.sort_order asc").
		Find(&tags).Error
	return tags, err
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

func RemoveTagFromFile(path string, tagID string) error {
	return DB.Where("path = ? AND tag_id = ?", path, tagID).Delete(&models.FileTag{}).Error
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
