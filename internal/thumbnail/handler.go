package thumbnail

import (
	"bytes"
	"super_folder/internal/database"
	"super_folder/internal/models"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	_ "golang.org/x/image/webp"
	"net/http"
	"os"
	"fmt"
	"runtime/debug"
	"sync/atomic"

	"github.com/nfnt/resize"
	"golang.org/x/sync/semaphore"
)

// Handler serves image thumbnails
type Handler struct{}

var activeDecoders int32

func NewHandler() *Handler {
	return &Handler{}
}

const (
	minComputeBudgetMB = 16
	maxComputeBudgetMB = 1024
	defaultComputeBudgetMB = 512
)

var computeBudgetMB int = defaultComputeBudgetMB
var maxThumbBudget int64 = int64(computeBudgetMB) * 1024 * 1024
var thumbSem = semaphore.NewWeighted(maxThumbBudget)

func GetBudgetLimitMB() int {
	return computeBudgetMB
}

func SetBudgetLimitMB(limitMB int) {
	if limitMB < minComputeBudgetMB {
		limitMB = minComputeBudgetMB
	}
	if limitMB > maxComputeBudgetMB {
		limitMB = maxComputeBudgetMB
	}
	newLimit := int64(limitMB) * 1024 * 1024
	diff := newLimit - maxThumbBudget
	if diff > 0 {
		thumbSem.Release(diff)
	}
	computeBudgetMB = limitMB
	maxThumbBudget = newLimit
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/file" {
		path := r.URL.Query().Get("path")
		if path == "" {
			http.Error(w, "missing path", http.StatusBadRequest)
			return
		}
		// Serve the raw file
		http.ServeFile(w, r, path)
		return
	}

	if r.URL.Path != "/thumb" {
		http.NotFound(w, r)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "missing path", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		http.Error(w, "file not found or is dir", http.StatusNotFound)
		return
	}

	modTime := info.ModTime().Unix()

	// Check DB cache
	thumb, err := database.GetThumbnail(path)
	if err == nil && thumb != nil && thumb.ModTime == modTime {
		_ = database.TouchThumbnail(path)
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(thumb.Data)
		return
	}

	// Estimate decode memory from image resolution (RGBA decoded image)
	weight, err := estimateDecodeMemory(path)
	if err != nil {
		weight = 100 * 1024
	}
	if weight < 100*1024 {
		weight = 100 * 1024 // Min 100KB cost
	}
	if weight > maxThumbBudget {
		weight = maxThumbBudget // Cap to max budget so it doesn't block forever
	}

	// Wait for an available decoding slot or client abort
	if err := thumbSem.Acquire(r.Context(), weight); err != nil {
		return // Client disconnected while waiting
	}
	atomic.AddInt32(&activeDecoders, 1)
	defer func() {
		thumbSem.Release(weight)
		if atomic.AddInt32(&activeDecoders, -1) == 0 {
			debug.FreeOSMemory()
		}
	}()

	// Generate Thumbnail
	file, err := os.Open(path)
	if err != nil {
		fmt.Println("[Thumbnail Handler] File open error:", err)
		http.Error(w, "cannot open file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	type decodeResult struct {
		img image.Image
		err error
	}
	resultCh := make(chan decodeResult, 1)

	go func() {
		img, _, err := image.Decode(file)
		resultCh <- decodeResult{img, err}
	}()

	var img image.Image
	select {
	case <-r.Context().Done():
		return // Client disconnected
	case res := <-resultCh:
		if res.err != nil {
			fmt.Println("[Thumbnail Handler] Decode error for path", path, ":", res.err)
			http.Error(w, "cannot decode image", http.StatusInternalServerError)
			return
		}
		img = res.img
	}

	// Resize to 128x128 max preserving aspect ratio (Bilinear for extreme speed)
	m := resize.Thumbnail(128, 128, img, resize.Bilinear)

	var buf bytes.Buffer
	err = jpeg.Encode(&buf, m, &jpeg.Options{Quality: 85})
	if err != nil {
		fmt.Println("[Thumbnail Handler] Encode error:", err)
		http.Error(w, "cannot encode thumbnail", http.StatusInternalServerError)
		return
	}

	data := buf.Bytes()

	// Save to DB
	_ = database.SaveThumbnail(&models.Thumbnail{
		Path:    path,
		ModTime: modTime,
		Data:    data,
	})

	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(data)
}

func estimateDecodeMemory(path string) (int64, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return 0, err
	}

	// RGBA decoded image: width * height * 4 bytes
	return int64(cfg.Width) * int64(cfg.Height) * 4, nil
}

