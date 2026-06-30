package service

import (
	"encoding/json"
	"fmt"
	"image"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"super_folder/internal/database"
	"super_folder/internal/models"
	"super_folder/internal/search/usn"

	_ "golang.org/x/image/webp"
)

type Searcher struct {
	engines map[string]*usn.Engine
	stopCh  chan struct{}
}

func NewSearcher() *Searcher {
	return &Searcher{
		engines: make(map[string]*usn.Engine),
		stopCh:  make(chan struct{}),
	}
}

func (s *Searcher) Start() {
	if err := database.InitDB(); err != nil {
		log.Printf("Failed to initialize database: %v", err)
	}

	drives := []string{"C", "D", "E", "F", "G"}

	onRename := func(oldPath, newPath string) {
		err := database.DB.Model(&models.FileTag{}).
			Where("path = ?", oldPath).
			Update("path", newPath).Error
		if err != nil {
			log.Printf("Failed to update path in FileTag DB: %s -> %s, err: %v", oldPath, newPath, err)
		} else {
			log.Printf("Updated DB path for FileTag: %s -> %s", oldPath, newPath)
		}

		err2 := database.DB.Model(&models.Remark{}).
			Where("path = ?", oldPath).
			Update("path", newPath).Error
		if err2 != nil {
			log.Printf("Failed to update path in Remark DB: %s -> %s, err: %v", oldPath, newPath, err2)
		} else {
			log.Printf("Updated DB path for Remark: %s -> %s", oldPath, newPath)
		}
	}

	for _, d := range drives {
		e := usn.NewEngine(d, onRename)
		if err := e.Init(); err == nil {
			log.Printf("Successfully initialized USN Engine for drive %s", d)
			s.engines[d] = e
			e.StartListening(s.stopCh)
		} else {
			log.Printf("Skipping drive %s: %v", d, err)
		}
	}

	go s.serveHTTP()
}

func (s *Searcher) Stop() {
	close(s.stopCh)
	for _, e := range s.engines {
		e.Close()
	}
}

var SearchPort int

func (s *Searcher) serveHTTP() {
	mux := http.NewServeMux()
	mux.HandleFunc("/search", s.handleSearch)

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	SearchPort = listener.Addr().(*net.TCPAddr).Port
	log.Printf("Starting Search RPC Server on 127.0.0.1:%d...", SearchPort)

	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	portFile := filepath.Join(configDir, "super_folder", "search_port.txt")
	os.MkdirAll(filepath.Dir(portFile), 0777)
	os.WriteFile(portFile, []byte(fmt.Sprintf("%d", SearchPort)), 0666)

	if err := http.Serve(listener, mux); err != nil {
		log.Printf("HTTP server error: %v", err)
	}
}

type SearchRequest struct {
	Keyword         string   `json:"keyword"`
	IsRegex         bool     `json:"isRegex"`
	CaseSensitive   bool     `json:"caseSensitive"`
	OnlyFiles       bool     `json:"onlyFiles"`
	OnlyFolders     bool     `json:"onlyFolders"`
	ExcludedFolders []string `json:"excludedFolders"`
	Extensions      []string `json:"extensions"`
	Tags            []string `json:"tags"`
	TagLogic        string   `json:"tagLogic"`
	Remarks         []string `json:"remarks"`
	MaxDepth        int      `json:"maxDepth"`
	RootPath        string   `json:"rootPath"`
	RootPaths       []string `json:"rootPaths"`
	Limit           int      `json:"limit"`
	MinSize         *int64   `json:"minSize"`
	MaxSize         *int64   `json:"maxSize"`
	MinTime         *int64   `json:"minTime"`
	MaxTime         *int64   `json:"maxTime"`
	ImageShape      string   `json:"imageShape"`
}

type SearchResponse struct {
	Paths []string `json:"paths"`
}

func (s *Searcher) handleSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Limit == 0 {
		req.Limit = 1000
	}

	// Normalize: merge RootPath into RootPaths for unified handling
	if req.RootPath != "" && len(req.RootPaths) == 0 {
		req.RootPaths = []string{req.RootPath}
	}

	paths := s.executeSearch(&req)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SearchResponse{Paths: paths})
}

func matchesSizeTime(path string, minSize, maxSize, minTime, maxTime *int64) bool {
	if minSize == nil && maxSize == nil && minTime == nil && maxTime == nil {
		return true
	}
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	if !info.IsDir() {
		if minSize != nil && info.Size() < *minSize {
			return false
		}
		if maxSize != nil && info.Size() > *maxSize {
			return false
		}
	}
	mtime := info.ModTime().UnixMilli()
	if minTime != nil && mtime < *minTime {
		return false
	}
	if maxTime != nil && mtime > *maxTime {
		return false
	}
	return true
}

func matchingRemarkPaths(terms []string) map[string]bool {
	if len(terms) == 0 {
		return nil
	}
	var remarks []models.Remark
	query := database.DB
	for _, term := range terms {
		query = query.Where("content LIKE ?", "%"+term+"%")
	}
	query.Find(&remarks)
	result := make(map[string]bool, len(remarks))
	for _, r := range remarks {
		result[strings.ToLower(r.Path)] = true
	}
	return result
}

func matchesImageShape(path, shape string) bool {
	if shape == "" {
		return true
	}
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp":
	default:
		return false
	}

	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return false
	}
	if cfg.Width == 0 || cfg.Height == 0 {
		return false
	}

	ratio := float64(cfg.Width) / float64(cfg.Height)
	switch shape {
	case "square":
		return ratio >= 0.9 && ratio <= 1.1
	case "landscape":
		return ratio > 1.1
	case "portrait":
		return ratio < 0.9
	}
	return true
}

func (s *Searcher) executeSearch(req *SearchRequest) []string {
	var regex *regexp.Regexp
	if req.IsRegex && req.Keyword != "" {
		flag := ""
		if !req.CaseSensitive {
			flag = "(?i)"
		}
		re, err := regexp.Compile(flag + req.Keyword)
		if err == nil {
			regex = re
		}
	}

	remarkPaths := matchingRemarkPaths(req.Remarks)
	hasRemarkFilter := len(req.Remarks) > 0

	keyword := req.Keyword
	if !req.CaseSensitive && !req.IsRegex {
		keyword = strings.ToLower(keyword)
	}

	var validPathsWithTags []string
	hasTagFilter := len(req.Tags) > 0

	if hasTagFilter {
		var paths []string
		if req.TagLogic == "AND" {
			database.DB.Table("file_tags").
				Select("path").
				Where("tag_id IN ?", req.Tags).
				Group("path").
				Having("count(distinct tag_id) = ?", len(req.Tags)).
				Pluck("path", &paths)
		} else {
			database.DB.Table("file_tags").
				Select("distinct path").
				Where("tag_id IN ?", req.Tags).
				Pluck("path", &paths)
		}
		validPathsWithTags = paths
	}

	var results []string

	if hasTagFilter {
		for _, fullPath := range validPathsWithTags {
			if len(results) >= req.Limit {
				break
			}
			
			if len(fullPath) < 3 {
				continue
			}
			drive := strings.ToUpper(fullPath[0:1])
			_, exists := s.engines[drive]
			
			name := fullPath[strings.LastIndex(fullPath, `\`)+1:]
			isFolder := false
			
			if exists {
				// Fallback to name-based logic since full resolve is slow
			}

			if req.OnlyFiles && isFolder {
				continue
			}
			if req.OnlyFolders && !isFolder {
				continue
			}

			matched := false
			if req.Keyword == "" {
				matched = true
			} else if req.IsRegex && regex != nil {
				matched = regex.MatchString(name)
			} else {
				checkName := name
				if !req.CaseSensitive {
					checkName = strings.ToLower(checkName)
				}
				matched = strings.Contains(checkName, keyword)
			}
			if !matched {
				continue
			}

			if len(req.ExcludedFolders) > 0 {
				dir := filepath.Dir(fullPath)
				parts := strings.Split(dir, `\`)
				parentMatched := false
				for _, part := range parts {
					if part == "" || strings.HasSuffix(part, ":") {
						continue
					}
					
					pMatch := false
					for _, ef := range req.ExcludedFolders {
						if strings.EqualFold(part, ef) {
							pMatch = true
							break
						}
					}
					if pMatch {
						parentMatched = true
						break
					}
				}
				// Also check if the node itself is an excluded folder
				if !parentMatched && isFolder {
					for _, ef := range req.ExcludedFolders {
						if strings.EqualFold(name, ef) {
							parentMatched = true
							break
						}
					}
				}
				if parentMatched {
					continue
				}
			}

			if len(req.Extensions) > 0 {
				extMatched := false
				nameLower := strings.ToLower(name)
				for _, ext := range req.Extensions {
					if strings.HasSuffix(nameLower, strings.ToLower(ext)) {
						extMatched = true
						break
					}
				}
				if !extMatched {
					continue
				}
			}

			if !matchesSizeTime(fullPath, req.MinSize, req.MaxSize, req.MinTime, req.MaxTime) {
				continue
			}

			if hasRemarkFilter && !remarkPaths[strings.ToLower(fullPath)] {
				continue
			}

			if !matchesImageShape(fullPath, req.ImageShape) {
				continue
			}

			results = append(results, fullPath)
		}
		return results
	}

	for driveLetter, engine := range s.engines {
		if len(req.RootPaths) > 0 {
			driveRelevant := false
			for _, rp := range req.RootPaths {
				if strings.HasPrefix(strings.ToUpper(rp), driveLetter+":") {
					driveRelevant = true
					break
				}
			}
			if !driveRelevant {
				continue
			}
		}

		engine.Mu.RLock()
		for frn, node := range engine.Nodes {
			if len(results) >= req.Limit {
				break
			}

			if req.OnlyFiles && node.IsFolder {
				continue
			}
			if req.OnlyFolders && !node.IsFolder {
				continue
			}

			matched := false
			if req.Keyword == "" {
				matched = true
			} else if req.IsRegex && regex != nil {
				matched = regex.MatchString(node.Name)
			} else {
				name := node.Name
				if !req.CaseSensitive {
					name = strings.ToLower(name)
				}
				matched = strings.Contains(name, keyword)
			}

			if !matched {
				continue
			}

			if len(req.Extensions) > 0 && !node.IsFolder {
				extMatched := false
				nameLower := strings.ToLower(node.Name)
				for _, ext := range req.Extensions {
					if strings.HasSuffix(nameLower, strings.ToLower(ext)) {
						extMatched = true
						break
					}
				}
				if !extMatched {
					continue
				}
			}

			fullPath := engine.GetFullPathLocked(frn)

			if len(req.ExcludedFolders) > 0 {
				dir := filepath.Dir(fullPath)
				parts := strings.Split(dir, `\`)
				parentMatched := false
				for _, part := range parts {
					if part == "" || strings.HasSuffix(part, ":") {
						continue
					}
					
					pMatch := false
					for _, ef := range req.ExcludedFolders {
						if strings.EqualFold(part, ef) {
							pMatch = true
							break
						}
					}
					if pMatch {
						parentMatched = true
						break
					}
				}
				// Also check if the node itself is an excluded folder
				if !parentMatched && node.IsFolder {
					for _, ef := range req.ExcludedFolders {
						if strings.EqualFold(node.Name, ef) {
							parentMatched = true
							break
						}
					}
				}
				if parentMatched {
					continue
				}
			}

			if len(req.RootPaths) > 0 {
				pathMatched := false
				fullPathLower := strings.ToLower(fullPath)
				for _, rp := range req.RootPaths {
					rpLower := strings.ToLower(rp)
					if strings.HasPrefix(fullPathLower, rpLower) {
						if req.MaxDepth > 0 {
							relPath := strings.TrimPrefix(fullPathLower, rpLower)
							relPath = strings.TrimPrefix(relPath, `\`)
							depth := strings.Count(relPath, `\`) + 1
							if depth <= req.MaxDepth {
								pathMatched = true
								break
							}
						} else {
							pathMatched = true
							break
						}
					}
				}
				if !pathMatched {
					continue
				}
			}

			if !matchesSizeTime(fullPath, req.MinSize, req.MaxSize, req.MinTime, req.MaxTime) {
				continue
			}

			if hasRemarkFilter && !remarkPaths[strings.ToLower(fullPath)] {
				continue
			}

			if !matchesImageShape(fullPath, req.ImageShape) {
				continue
			}

			results = append(results, fullPath)
		}
		engine.Mu.RUnlock()

		if len(results) >= req.Limit {
			break
		}
	}

	return results
}

