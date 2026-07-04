package privacy

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/pbkdf2"
	"gorm.io/gorm"

	"super_folder/internal/database"
	"super_folder/internal/models"
)

const (
	ModePublic  = "public"
	ModePrivacy = "privacy"

	passwordConfigKey = "privacy_password"
	restoreConfigKey  = "privacy_restore_on_startup"
	lastModeConfigKey = "privacy_last_mode"
	PasswordLength    = 6
)

var passwordPattern = regexp.MustCompile(`^[A-Za-z0-9]+$`)

type storedPassword struct {
	Salt       string `json:"salt"`
	Hash       string `json:"hash"`
	Iterations int    `json:"iterations"`
}

func ValidatePassword(password string) error {
	if len(password) != PasswordLength {
		return fmt.Errorf("密码必须为 %d 位", PasswordLength)
	}
	if !passwordPattern.MatchString(password) {
		return errors.New("密码只能包含数字和字母")
	}
	return nil
}

func HasPassword() bool {
	value, _ := database.GetConfig(passwordConfigKey)
	return value != ""
}

func SetPassword(password string) error {
	if err := ValidatePassword(password); err != nil {
		return err
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return fmt.Errorf("generate salt: %w", err)
	}
	iterations := 120000
	hash := pbkdf2.Key([]byte(password), salt, iterations, 32, sha256.New)
	payload := storedPassword{
		Salt:       base64.StdEncoding.EncodeToString(salt),
		Hash:       base64.StdEncoding.EncodeToString(hash),
		Iterations: iterations,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return database.SetConfig(passwordConfigKey, string(data))
}

func VerifyPassword(password string) bool {
	value, err := database.GetConfig(passwordConfigKey)
	if err != nil || value == "" {
		return false
	}
	var payload storedPassword
	if err := json.Unmarshal([]byte(value), &payload); err != nil {
		return false
	}
	salt, err := base64.StdEncoding.DecodeString(payload.Salt)
	if err != nil {
		return false
	}
	want, err := base64.StdEncoding.DecodeString(payload.Hash)
	if err != nil {
		return false
	}
	if payload.Iterations <= 0 {
		payload.Iterations = 120000
	}
	got := pbkdf2.Key([]byte(password), salt, payload.Iterations, len(want), sha256.New)
	return subtle.ConstantTimeCompare(got, want) == 1
}

func RestoreOnStartup() bool {
	value, _ := database.GetConfig(restoreConfigKey)
	return value == "true"
}

func SetRestoreOnStartup(enabled bool) error {
	if enabled {
		return database.SetConfig(restoreConfigKey, "true")
	}
	return database.SetConfig(restoreConfigKey, "false")
}

func LastMode() string {
	value, _ := database.GetConfig(lastModeConfigKey)
	if value == ModePrivacy {
		return ModePrivacy
	}
	return ModePublic
}

func SetLastMode(mode string) error {
	if mode != ModePrivacy {
		mode = ModePublic
	}
	return database.SetConfig(lastModeConfigKey, mode)
}

func NormalizePath(path string) string {
	if path == "" {
		return ""
	}
	cleaned := filepath.Clean(path)
	return strings.ToLower(cleaned)
}

func PathAncestors(path string) []string {
	path = NormalizePath(path)
	if path == "" {
		return nil
	}
	parts := []string{path}
	for {
		next := NormalizePath(filepath.Dir(path))
		if next == path || next == "." || next == "" {
			break
		}
		parts = append(parts, next)
		if strings.HasSuffix(next, `:\`) || strings.HasSuffix(next, `:`) {
			break
		}
		path = next
	}
	return parts
}

func SetPathProtected(path string, isDir bool, protected bool) error {
	normalized := NormalizePath(path)
	if normalized == "" {
		return errors.New("路径不能为空")
	}
	if !protected {
		return database.DB.Where("path = ?", normalized).Delete(&models.ProtectedPath{}).Error
	}
	now := time.Now().UnixMilli()
	item := models.ProtectedPath{Path: normalized, IsDir: isDir, CreatedAt: now, UpdatedAt: now}
	return database.DB.Where(models.ProtectedPath{Path: normalized}).Assign(models.ProtectedPath{IsDir: isDir, UpdatedAt: now}).FirstOrCreate(&item).Error
}

func DirectProtectedPaths(paths []string) (map[string]bool, error) {
	result := make(map[string]bool, len(paths))
	if len(paths) == 0 {
		return result, nil
	}
	normalized := make([]string, 0, len(paths))
	lookup := make(map[string]string, len(paths))
	for _, path := range paths {
		n := NormalizePath(path)
		if n == "" {
			continue
		}
		normalized = append(normalized, n)
		lookup[n] = path
	}
	var protected []models.ProtectedPath
	if err := database.DB.Where("path IN ?", normalized).Find(&protected).Error; err != nil {
		return nil, err
	}
	for _, item := range protected {
		if original, ok := lookup[item.Path]; ok {
			result[original] = true
		}
	}
	return result, nil
}

func IsDirectPathProtected(path string) (bool, error) {
	var item models.ProtectedPath
	err := database.DB.Where("path = ?", NormalizePath(path)).First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return err == nil, err
}

func IsPathHiddenInPublic(path string) (bool, error) {
	ancestors := PathAncestors(path)
	if len(ancestors) == 0 {
		return false, nil
	}
	var count int64
	if err := database.DB.Model(&models.ProtectedPath{}).Where("path IN ?", ancestors).Count(&count).Error; err != nil {
		return false, err
	}
	if count > 0 {
		return true, nil
	}
	if err := database.DB.Table("file_tags").Joins("JOIN tags ON tags.id = file_tags.tag_id").Where("lower(file_tags.path) IN ? AND tags.is_protected = ?", ancestors, true).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func FilterVisibleFiles(files []models.FileInfo, includeProtectedState bool) ([]models.FileInfo, error) {
	if len(files) == 0 {
		return []models.FileInfo{}, nil
	}
	paths := make([]string, len(files))
	for i, file := range files {
		paths[i] = file.Path
	}
	direct, err := DirectProtectedPaths(paths)
	if err != nil {
		return nil, err
	}
	visible := make([]models.FileInfo, 0, len(files))
	for _, file := range files {
		if includeProtectedState {
			file.IsProtected = direct[file.Path]
			visible = append(visible, file)
			continue
		}
		hidden, err := IsPathHiddenInPublic(file.Path)
		if err != nil {
			return nil, err
		}
		if !hidden {
			visible = append(visible, file)
		}
	}
	return visible, nil
}

func FilterVisiblePaths(paths []string) ([]string, error) {
	visible := make([]string, 0, len(paths))
	for _, path := range paths {
		hidden, err := IsPathHiddenInPublic(path)
		if err != nil {
			return nil, err
		}
		if !hidden {
			visible = append(visible, path)
		}
	}
	return visible, nil
}

func SetTagProtected(tagID string, protected bool) error {
	return database.DB.Model(&models.Tag{}).Where("id = ?", tagID).Update("is_protected", protected).Error
}

func FilterVisibleTags(tags []models.Tag, privacyMode bool) []models.Tag {
	if privacyMode {
		return tags
	}
	visible := make([]models.Tag, 0, len(tags))
	for _, tag := range tags {
		if !tag.IsProtected {
			visible = append(visible, tag)
		}
	}
	return visible
}
