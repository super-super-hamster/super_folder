package similarity

import (
	"fmt"
	"image"
	"os"
	"path/filepath"
	"strings"
	"super_folder/internal/models"
	"time"

	"github.com/corona10/goimagehash"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

const maxHashDimension = 256

var imageExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true,
	".gif": true, ".webp": true, ".bmp": true,
}

func IsImage(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return imageExtensions[ext]
}

func ComputeHash(path string) (*models.ImageHash, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	img, _, err := image.Decode(f)
	if err != nil {
		return nil, err
	}

	img = resizeMaxDimension(img, maxHashDimension)

	phash, err := goimagehash.PerceptionHash(img)
	if err != nil {
		return nil, err
	}

	dhash, err := goimagehash.DifferenceHash(img)
	if err != nil {
		return nil, err
	}

	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	return &models.ImageHash{
		Path:      path,
		PHash:     fmt.Sprintf("%d", phash.GetHash()),
		DHash:     fmt.Sprintf("%d", dhash.GetHash()),
		FileSize:  info.Size(),
		ModTime:   info.ModTime().UnixMilli(),
		IndexedAt: time.Now().UnixMilli(),
	}, nil
}

func resizeMaxDimension(img image.Image, maxDim int) image.Image {
	bounds := img.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()
	if w <= maxDim && h <= maxDim {
		return img
	}

	scale := float64(maxDim) / float64(max(w, h))
	newW := int(float64(w) * scale)
	newH := int(float64(h) * scale)

	resized := image.NewRGBA(image.Rect(0, 0, newW, newH))
	draw.BiLinear.Scale(resized, resized.Bounds(), img, bounds, draw.Over, nil)
	return resized
}

