package converter

import (
	"bytes"
	"encoding/binary"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/nfnt/resize"
	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
)

var imageExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".svg": true, ".ico": true,
}

var dataExtensions = map[string]bool{
	".csv": true, ".json": true,
}

// GetConvertibleFormats returns a list of extensions that ALL provided files can convert to
func GetConvertibleFormats(paths []string) []string {
	if len(paths) == 0 {
		return nil
	}

	var commonTargets map[string]bool

	for i, p := range paths {
		ext := strings.ToLower(filepath.Ext(p))
		targets := make(map[string]bool)

		if imageExtensions[ext] {
			for k := range imageExtensions {
				// Don't show original extension as a target, and we can't convert raster TO svg
				if k != ext && k != ".svg" && !(k == ".jpg" && ext == ".jpeg") && !(k == ".jpeg" && ext == ".jpg") {
					targets[k] = true
				}
			}
		} else if dataExtensions[ext] {
			for k := range dataExtensions {
				if k != ext {
					targets[k] = true
				}
			}
		}

		if i == 0 {
			commonTargets = targets
		} else {
			for k := range commonTargets {
				if !targets[k] {
					delete(commonTargets, k)
				}
			}
		}

		if len(commonTargets) == 0 {
			break
		}
	}

	var result []string
	for k := range commonTargets {
		result = append(result, k)
	}
	return result
}

// generateNewPath returns a path that doesn't conflict
func generateNewPath(dir, name, ext string) string {
	targetPath := filepath.Join(dir, name+ext)
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		return targetPath
	}

	for i := 1; ; i++ {
		targetPath = filepath.Join(dir, fmt.Sprintf("%s(%d)%s", name, i, ext))
		if _, err := os.Stat(targetPath); os.IsNotExist(err) {
			return targetPath
		}
	}
}

func ConvertFile(sourcePath string, targetExt string) (string, error) {
	ext := strings.ToLower(filepath.Ext(sourcePath))
	targetExt = strings.ToLower(targetExt)

	dir := filepath.Dir(sourcePath)
	name := strings.TrimSuffix(filepath.Base(sourcePath), filepath.Ext(sourcePath))
	targetPath := generateNewPath(dir, name, targetExt)

	if imageExtensions[ext] && imageExtensions[targetExt] {
		return targetPath, convertImage(sourcePath, targetPath, targetExt)
	} else if dataExtensions[ext] && dataExtensions[targetExt] {
		return targetPath, convertData(sourcePath, targetPath, ext, targetExt)
	}

	return "", errors.New("unsupported conversion")
}

func convertImage(src, dst, targetExt string) error {
	var img image.Image
	srcExt := strings.ToLower(filepath.Ext(src))

	if srcExt == ".svg" {
		var err error
		img, err = decodeSVG(src)
		if err != nil {
			return err
		}
	} else {
		inFile, err := os.Open(src)
		if err != nil {
			return err
		}
		defer inFile.Close()

		img, _, err = image.Decode(inFile)
		if err != nil {
			return err
		}
	}

	outFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer outFile.Close()

	switch targetExt {
	case ".png":
		return png.Encode(outFile, img)
	case ".jpg", ".jpeg":
		return jpeg.Encode(outFile, img, &jpeg.Options{Quality: 90})
	case ".gif":
		return gif.Encode(outFile, img, nil)
	case ".ico":
		return encodeICO(outFile, img)
	default:
		return errors.New("unsupported image target format")
	}
}

func decodeSVG(src string) (image.Image, error) {
	icon, err := oksvg.ReadIcon(src, oksvg.IgnoreErrorMode)
	if err != nil {
		return nil, err
	}
	w, h := int(icon.ViewBox.W), int(icon.ViewBox.H)
	if w == 0 || h == 0 {
		w, h = 512, 512
	}
	// Cap the size to prevent memory exhaustion
	if w > 2048 {
		w = 2048
	}
	if h > 2048 {
		h = 2048
	}

	img := image.NewRGBA(image.Rect(0, 0, w, h))
	scanner := rasterx.NewScannerGV(w, h, img, img.Bounds())
	raster := rasterx.NewDasher(w, h, scanner)
	icon.SetTarget(0, 0, float64(w), float64(h))
	icon.Draw(raster, 1.0)
	return img, nil
}

func encodeICO(w io.Writer, img image.Image) error {
	b := img.Bounds()
	width := b.Dx()
	height := b.Dy()

	// Windows limits ICO embedded PNGs to 256x256. 
	// If it's larger, Windows will crop it from the center.
	if width > 256 || height > 256 {
		img = resize.Thumbnail(256, 256, img, resize.Lanczos3)
		b = img.Bounds()
		width = b.Dx()
		height = b.Dy()
	}

	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, img); err != nil {
		return err
	}

	header := []byte{0, 0, 1, 0, 1, 0}
	w.Write(header)

	wByte := byte(width)
	if width >= 256 {
		wByte = 0
	}
	hByte := byte(height)
	if height >= 256 {
		hByte = 0
	}

	dir := make([]byte, 16)
	dir[0] = wByte
	dir[1] = hByte
	dir[2] = 0
	dir[3] = 0
	binary.LittleEndian.PutUint16(dir[4:6], 1)
	binary.LittleEndian.PutUint16(dir[6:8], 32)
	binary.LittleEndian.PutUint32(dir[8:12], uint32(pngBuf.Len()))
	binary.LittleEndian.PutUint32(dir[12:16], 22)
	w.Write(dir)

	_, err := w.Write(pngBuf.Bytes())
	return err
}

func convertData(src, dst, srcExt, targetExt string) error {
	inBytes, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	if srcExt == ".csv" && targetExt == ".json" {
		r := csv.NewReader(strings.NewReader(string(inBytes)))
		records, err := r.ReadAll()
		if err != nil || len(records) == 0 {
			return errors.New("invalid csv or empty")
		}

		headers := records[0]
		var list []map[string]string
		for _, row := range records[1:] {
			obj := make(map[string]string)
			for i, val := range row {
				if i < len(headers) {
					obj[headers[i]] = val
				}
			}
			list = append(list, obj)
		}

		outBytes, _ := json.MarshalIndent(list, "", "  ")
		return os.WriteFile(dst, outBytes, 0644)

	} else if srcExt == ".json" && targetExt == ".csv" {
		var list []map[string]interface{}
		if err := json.Unmarshal(inBytes, &list); err != nil {
			return errors.New("invalid json (must be array of objects)")
		}

		if len(list) == 0 {
			return os.WriteFile(dst, []byte(""), 0644)
		}

		// collect headers
		headerMap := make(map[string]bool)
		var headers []string
		for _, obj := range list {
			for k := range obj {
				if !headerMap[k] {
					headerMap[k] = true
					headers = append(headers, k)
				}
			}
		}

		outFile, err := os.Create(dst)
		if err != nil {
			return err
		}
		defer outFile.Close()

		w := csv.NewWriter(outFile)
		_ = w.Write(headers)

		for _, obj := range list {
			var row []string
			for _, h := range headers {
				if val, ok := obj[h]; ok {
					row = append(row, fmt.Sprintf("%v", val))
				} else {
					row = append(row, "")
				}
			}
			_ = w.Write(row)
		}
		w.Flush()
		return w.Error()
	}

	return errors.New("unsupported data conversion")
}

