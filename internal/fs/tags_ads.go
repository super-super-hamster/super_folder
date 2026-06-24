package fs

import (
	"encoding/json"
	"super_folder/internal/models"
	"os"
)

const adsStreamName = ":filege_tags"

// WriteTagsToADS writes the full list of tags to the file's NTFS Alternate Data Stream
func WriteTagsToADS(filePath string, tags []models.Tag) error {
	adsPath := filePath + adsStreamName
	
	if len(tags) == 0 {
		// If no tags, just remove the stream if it exists
		_ = os.Remove(adsPath)
		return nil
	}

	data, err := json.Marshal(tags)
	if err != nil {
		return err
	}

	return os.WriteFile(adsPath, data, 0644)
}

// ReadTagsFromADS reads tags from the file's NTFS Alternate Data Stream
func ReadTagsFromADS(filePath string) ([]models.Tag, error) {
	adsPath := filePath + adsStreamName

	data, err := os.ReadFile(adsPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // No tags stream
		}
		return nil, err
	}

	var tags []models.Tag
	if err := json.Unmarshal(data, &tags); err != nil {
		return nil, err
	}

	return tags, nil
}

