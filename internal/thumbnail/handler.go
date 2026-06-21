package thumbnail

import (
	"bytes"
	"file-manager/internal/database"
	"file-manager/internal/models"
	"image"
	_ "image/gif"
	"image/png"
	_ "golang.org/x/image/webp"
	"net/http"
	"os"
	"fmt"

	"github.com/nfnt/resize"
)

// Handler serves image thumbnails
type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Println("[Thumbnail/File Handler] Received request:", r.URL.String())
	
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
		fmt.Println("[Thumbnail Handler] Stat error or is dir:", err, path)
		http.Error(w, "file not found or is dir", http.StatusNotFound)
		return
	}

	modTime := info.ModTime().Unix()

	// Check DB cache
	thumb, err := database.GetThumbnail(path)
	if err == nil && thumb != nil && thumb.ModTime == modTime {
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(thumb.Data)
		return
	}

	// Generate Thumbnail
	file, err := os.Open(path)
	if err != nil {
		fmt.Println("[Thumbnail Handler] File open error:", err)
		http.Error(w, "cannot open file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	select {
	case <-r.Context().Done():
		return // Client disconnected
	default:
	}

	img, _, err := image.Decode(file)
	if err != nil {
		fmt.Println("[Thumbnail Handler] Decode error for path", path, ":", err)
		http.Error(w, "cannot decode image", http.StatusInternalServerError)
		return
	}

	select {
	case <-r.Context().Done():
		return // Client disconnected
	default:
	}

	// Resize to 128x128 max preserving aspect ratio (Bilinear for extreme speed)
	m := resize.Thumbnail(128, 128, img, resize.Bilinear)

	var buf bytes.Buffer
	err = png.Encode(&buf, m)
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

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(data)
}
