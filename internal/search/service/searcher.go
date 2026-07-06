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

	_ "golang.org/x/image/webp"

	"super_folder/internal/database"
	"super_folder/internal/models"
	"super_folder/internal/privacy"
	"super_folder/internal/search/usn"
)

type Searcher struct {
	engines map[string]*usn.Engine
	stopCh  chan struct{}
	server  *http.Server
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
	if s.server != nil {
		_ = s.server.Close()
	}
	_ = os.Remove(PortFilePath())
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

	portFile := PortFilePath()
	os.MkdirAll(filepath.Dir(portFile), 0777)
	os.WriteFile(portFile, []byte(fmt.Sprintf("%d", SearchPort)), 0666)
	defer os.Remove(portFile)

	s.server = &http.Server{Handler: mux}
	if err := s.server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Printf("HTTP server error: %v", err)
	}
}

type SearchRequest struct {
	Keyword           string   `json:"keyword"`
	IsRegex           bool     `json:"isRegex"`
	CaseSensitive     bool     `json:"caseSensitive"`
	OnlyFiles         bool     `json:"onlyFiles"`
	OnlyFolders       bool     `json:"onlyFolders"`
	TypeNegated       bool     `json:"typeNegated"`
	IncludeNegated    bool     `json:"includeNegated"`
	SizeNegated       bool     `json:"sizeNegated"`
	TimeNegated       bool     `json:"timeNegated"`
	ImageShapeNegated bool     `json:"imageShapeNegated"`
	Extensions        []string `json:"extensions"`
	Tags              []string `json:"tags"`
	TagLogic          string   `json:"tagLogic"`
	Remarks           []string `json:"remarks"`
	MaxDepth          int      `json:"maxDepth"`
	RootPath          string   `json:"rootPath"`
	RootPaths         []string `json:"rootPaths"`
	Limit             int      `json:"limit"`
	MinSize           *int64   `json:"minSize"`
	MaxSize           *int64   `json:"maxSize"`
	MinTime           *int64   `json:"minTime"`
	MaxTime           *int64   `json:"maxTime"`
	ImageShape        string   `json:"imageShape"`
	PrivacyMode       string   `json:"privacyMode"`
	IncludeStrings    []string `json:"includeStrings"`
	FolderPaths       []string `json:"folderPaths"`
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

func resolveTagIDGroups(tags []string, includeProtected bool) ([][]string, error) {
	groups := make([][]string, 0, len(tags))
	for _, t := range tags {
		var ids []string
		var err error
		if strings.HasSuffix(t, ":*") && len(t) > 2 {
			ids, err = database.GetTagIDsByType(t[:len(t)-2])
		} else {
			ids, err = database.GetTagIDsByNames([]string{t})
		}
		if err != nil {
			return nil, err
		}
		if !includeProtected {
			var visibleIDs []string
			if err := database.DB.Model(&models.Tag{}).Where("id IN ? AND is_protected = ?", ids, false).Pluck("id", &visibleIDs).Error; err != nil {
				return nil, err
			}
			ids = visibleIDs
		}
		if len(ids) == 0 {
			return nil, nil
		}
		groups = append(groups, ids)
	}
	return groups, nil
}

func flattenTagIDGroups(groups [][]string) []string {
	idSet := make(map[string]struct{})
	for _, group := range groups {
		for _, id := range group {
			idSet[id] = struct{}{}
		}
	}
	ids := make([]string, 0, len(idSet))
	for id := range idSet {
		ids = append(ids, id)
	}
	return ids
}

func intersectPathSets(groups []map[string]struct{}) []string {
	if len(groups) == 0 {
		return nil
	}
	result := make([]string, 0, len(groups[0]))
	for path := range groups[0] {
		matched := true
		for i := 1; i < len(groups); i++ {
			if _, ok := groups[i][path]; !ok {
				matched = false
				break
			}
		}
		if matched {
			result = append(result, path)
		}
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
	includeProtected := req.PrivacyMode == privacy.ModePrivacy
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
		tagGroups, err := resolveTagIDGroups(req.Tags, includeProtected)
		if err != nil {
			log.Printf("Failed to resolve tag IDs: %v", err)
			return nil
		}
		if len(tagGroups) == 0 {
			return nil
		}

		var paths []string
		if req.TagLogic == "AND" {
			pathSets := make([]map[string]struct{}, 0, len(tagGroups))
			for _, tagIDs := range tagGroups {
				var groupPaths []string
				if err := database.DB.Table("file_tags").
					Select("distinct path").
					Where("tag_id IN ?", tagIDs).
					Pluck("path", &groupPaths).Error; err != nil {
					log.Printf("Failed to search tag paths: %v", err)
					return nil
				}
				pathSet := make(map[string]struct{}, len(groupPaths))
				for _, path := range groupPaths {
					pathSet[path] = struct{}{}
				}
				pathSets = append(pathSets, pathSet)
			}
			paths = intersectPathSets(pathSets)
		} else {
			tagIDs := flattenTagIDGroups(tagGroups)
			if err := database.DB.Table("file_tags").
				Select("distinct path").
				Where("tag_id IN ?", tagIDs).
				Pluck("path", &paths).Error; err != nil {
				log.Printf("Failed to search tag paths: %v", err)
				return nil
			}
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

			if req.OnlyFiles {
				wantFolder := req.TypeNegated
				if isFolder != wantFolder {
					continue
				}
			}
			if req.OnlyFolders {
				wantFolder := !req.TypeNegated
				if isFolder != wantFolder {
					continue
				}
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

			if len(req.IncludeStrings) > 0 {
				includeMatched := false
				checkName := name
				if !req.CaseSensitive {
					checkName = strings.ToLower(checkName)
				}
				for _, s := range req.IncludeStrings {
					matchStr := s
					if !req.CaseSensitive {
						matchStr = strings.ToLower(matchStr)
					}
					if strings.Contains(checkName, matchStr) {
						includeMatched = true
						break
					}
				}
				if req.IncludeNegated {
					if includeMatched {
						continue
					}
				} else {
					if !includeMatched {
						continue
					}
				}
			}

			if len(req.FolderPaths) > 0 {
				fpMatched := false
				fullPathLower := strings.ToLower(fullPath)
				for _, fp := range req.FolderPaths {
					if strings.HasPrefix(fullPathLower, strings.ToLower(fp)) {
						fpMatched = true
						break
					}
				}
				if !fpMatched {
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

			if !matchesSizeTime(fullPath, req.MinSize, req.MaxSize, req.MinTime, req.MaxTime) == req.SizeNegated {
				continue
			}

			if hasRemarkFilter && !remarkPaths[strings.ToLower(fullPath)] {
				continue
			}

			if !matchesImageShape(fullPath, req.ImageShape) == req.ImageShapeNegated {
				continue
			}

			if !includeProtected {
				hidden, err := privacy.IsPathHiddenInPublic(fullPath)
				if err != nil || hidden {
					continue
				}
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

			if req.OnlyFiles {
				wantFolder := req.TypeNegated
				if node.IsFolder != wantFolder {
					continue
				}
			}
			if req.OnlyFolders {
				wantFolder := !req.TypeNegated
				if node.IsFolder != wantFolder {
					continue
				}
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

			if len(req.IncludeStrings) > 0 {
				includeMatched := false
				checkName := node.Name
				if !req.CaseSensitive {
					checkName = strings.ToLower(checkName)
				}
				for _, s := range req.IncludeStrings {
					matchStr := s
					if !req.CaseSensitive {
						matchStr = strings.ToLower(matchStr)
					}
					if strings.Contains(checkName, matchStr) {
						includeMatched = true
						break
					}
				}
				if req.IncludeNegated {
					if includeMatched {
						continue
					}
				} else {
					if !includeMatched {
						continue
					}
				}
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

			if len(req.FolderPaths) > 0 {
				fpMatched := false
				fullPathLower := strings.ToLower(fullPath)
				for _, fp := range req.FolderPaths {
					if strings.HasPrefix(fullPathLower, strings.ToLower(fp)) {
						fpMatched = true
						break
					}
				}
				if !fpMatched {
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

			if !matchesSizeTime(fullPath, req.MinSize, req.MaxSize, req.MinTime, req.MaxTime) == req.SizeNegated {
				continue
			}

			if hasRemarkFilter && !remarkPaths[strings.ToLower(fullPath)] {
				continue
			}

			if !matchesImageShape(fullPath, req.ImageShape) == req.ImageShapeNegated {
				continue
			}

			if !includeProtected {
				hidden, err := privacy.IsPathHiddenInPublic(fullPath)
				if err != nil || hidden {
					continue
				}
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
