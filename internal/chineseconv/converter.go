package chineseconv

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/longbridgeapp/opencc"
	"golang.org/x/net/html"
)

type CustomPair struct {
	From string `json:"from"`
	To   string `json:"to"`
}

var BaseSchemes = map[string]string{
	"s2t":  "简体 → 繁体",
	"t2s":  "繁体 → 简体",
	"s2tw": "简体 → 台湾繁体",
	"tw2s": "台湾繁体 → 简体",
	"s2hk": "简体 → 香港繁体",
	"hk2s": "香港繁体 → 简体",
}

func TargetName(baseScheme string) string {
	switch baseScheme {
	case "s2t":
		return "繁体"
	case "t2s":
		return "简体"
	case "s2tw":
		return "台湾繁体"
	case "tw2s":
		return "简体"
	case "s2hk":
		return "香港繁体"
	case "hk2s":
		return "简体"
	default:
		return "转换"
	}
}

func OutputDirName(baseScheme string) string {
	return fmt.Sprintf("简繁转换_%s", TargetName(baseScheme))
}

func ConvertText(text string, baseScheme string, pairs []CustomPair) (string, error) {
	conv, err := opencc.New(baseScheme)
	if err != nil {
		return "", err
	}
	out, err := conv.Convert(text)
	if err != nil {
		return "", err
	}
	for _, p := range pairs {
		if p.From != "" {
			out = strings.ReplaceAll(out, p.From, p.To)
		}
	}
	return out, nil
}

func ConvertFile(srcPath string, baseScheme string, pairs []CustomPair) (string, error) {
	if _, ok := BaseSchemes[baseScheme]; !ok {
		return "", fmt.Errorf("unsupported base scheme: %s", baseScheme)
	}

	ext := strings.ToLower(filepath.Ext(srcPath))
	srcDir := filepath.Dir(srcPath)
	outDir := filepath.Join(srcDir, OutputDirName(baseScheme))

	baseName := strings.TrimSuffix(filepath.Base(srcPath), ext)
	suffix := TargetName(baseScheme)
	outName := fmt.Sprintf("%s_%s%s", baseName, suffix, ext)
	outPath := filepath.Join(outDir, outName)

	if err := os.MkdirAll(outDir, 0755); err != nil {
		return "", err
	}

	var err error
	if ext == ".epub" {
		err = convertEpub(srcPath, outPath, baseScheme, pairs)
	} else {
		err = convertTxt(srcPath, outPath, baseScheme, pairs)
	}
	if err != nil {
		return "", err
	}
	return outPath, nil
}

func convertTxt(srcPath, dstPath, baseScheme string, pairs []CustomPair) error {
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}
	out, err := ConvertText(string(data), baseScheme, pairs)
	if err != nil {
		return err
	}
	return os.WriteFile(dstPath, []byte(out), 0644)
}

func convertEpub(srcPath, dstPath, baseScheme string, pairs []CustomPair) error {
	r, err := zip.OpenReader(srcPath)
	if err != nil {
		return err
	}
	defer r.Close()

	outFile, err := os.Create(dstPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	zw := zip.NewWriter(outFile)
	defer zw.Close()

	conv, err := opencc.New(baseScheme)
	if err != nil {
		return err
	}

	for _, f := range r.File {
		rc, err := f.Open()
		if err != nil {
			return err
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return err
		}

		lowName := strings.ToLower(f.Name)
		if isHtmlEntry(lowName) {
			data = convertHtmlBytes(data, conv, pairs)
		}

		header := f.FileHeader
		header.Method = zip.Deflate
		w, err := zw.CreateHeader(&header)
		if err != nil {
			return err
		}
		if _, err := w.Write(data); err != nil {
			return err
		}
	}
	return nil
}

func isHtmlEntry(name string) bool {
	return strings.HasSuffix(name, ".html") ||
		strings.HasSuffix(name, ".htm") ||
		strings.HasSuffix(name, ".xhtml")
}

func convertHtmlBytes(data []byte, conv *opencc.OpenCC, pairs []CustomPair) []byte {
	doc, err := html.Parse(bytes.NewReader(data))
	if err != nil {
		return data
	}

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.TextNode {
			s := n.Data
			s, _ = conv.Convert(s)
			for _, p := range pairs {
				if p.From != "" {
					s = strings.ReplaceAll(s, p.From, p.To)
				}
			}
			n.Data = s
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	var buf bytes.Buffer
	if err := html.Render(&buf, doc); err != nil {
		return data
	}
	return buf.Bytes()
}
