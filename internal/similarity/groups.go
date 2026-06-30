package similarity

import (
	"context"
	"image"
	"log"
	"math/bits"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"super_folder/internal/database"
	"super_folder/internal/models"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/sync/semaphore"
)

const hashMemoryBudget = 512 * 1024 * 1024 // 512MB

var hashSem = semaphore.NewWeighted(hashMemoryBudget)

var (
	currentSearchCtx    context.Context
	currentSearchCancel context.CancelFunc
	currentSearchID     int64
	searchMu            sync.Mutex
)

type Progress struct {
	Stage   string
	Current int
	Total   int
}

func BeginSearch() (context.Context, context.CancelFunc, int64) {
	searchMu.Lock()
	defer searchMu.Unlock()
	if currentSearchCancel != nil {
		currentSearchCancel()
	}
	currentSearchID++
	id := currentSearchID
	currentSearchCtx, currentSearchCancel = context.WithCancel(context.Background())
	return currentSearchCtx, currentSearchCancel, id
}

func CancelCurrentSearch() {
	searchMu.Lock()
	defer searchMu.Unlock()
	if currentSearchCancel != nil {
		currentSearchCancel()
		currentSearchCancel = nil
	}
}

func FindSimilarGroups(folderPath string, includeSubfolders bool, threshold int, useMax bool, onProgress func(p Progress)) ([][]string, error) {
	log.Printf("[similar] >>> FindSimilarGroups start folder=%s include=%v threshold=%d useMax=%v", folderPath, includeSubfolders, threshold, useMax)
	ctx, _, id := BeginSearch()
	defer func() {
		searchMu.Lock()
		if currentSearchID == id {
			if currentSearchCancel != nil {
				currentSearchCancel()
			}
			currentSearchCancel = nil
		}
		searchMu.Unlock()
	}()

	files, err := collectImageFiles(folderPath, includeSubfolders)
	if err != nil {
		return nil, err
	}

	hashes, err := ensureHashes(ctx, folderPath, includeSubfolders, files, onProgress)
	if err != nil {
		return nil, err
	}

	if len(hashes) < 2 {
		_ = database.DeleteSimilarPairsByFolder(folderPath, threshold, useMax)
		_ = database.SaveSimilarFolderState(&models.SimilarFolderState{
			FolderPath:        folderPath,
			Threshold:         threshold,
			UseMax:            useMax,
			IncludeSubfolders: includeSubfolders,
			IndexedAt:         time.Now().UnixMilli(),
		})
		return nil, nil
	}

	pairs, err := compareHashes(ctx, hashes, threshold, useMax, onProgress)
	if err != nil {
		return nil, err
	}

	if err := database.DeleteSimilarPairsByFolder(folderPath, threshold, useMax); err != nil {
		return nil, err
	}
	if err := database.SaveSimilarPairs(pairs); err != nil {
		return nil, err
	}
	if err := database.SaveSimilarFolderState(&models.SimilarFolderState{
		FolderPath:        folderPath,
		Threshold:         threshold,
		UseMax:            useMax,
		IncludeSubfolders: includeSubfolders,
		IndexedAt:         time.Now().UnixMilli(),
	}); err != nil {
		return nil, err
	}

	return buildGroups(pairs), nil
}

func buildHashes(ctx context.Context, folderPath string, files []string, onProgress func(p Progress)) ([]models.ImageHash, error) {
	existing, err := database.GetImageHashesByFolder(folderPath)
	if err != nil {
		return nil, err
	}

	existingMap := make(map[string]models.ImageHash, len(existing))
	for _, h := range existing {
		existingMap[h.Path] = h
	}

	var mu sync.Mutex
	hashes := make([]models.ImageHash, 0, len(files))
	var completed int32
	var errs []error
	var errMu sync.Mutex

	var wg sync.WaitGroup
	for _, path := range files {
		if err := ctx.Err(); err != nil {
			wg.Wait()
			return nil, err
		}

		info, err := os.Stat(path)
		if err != nil {
			continue
		}

		if old, ok := existingMap[path]; ok && old.ModTime == info.ModTime().UnixMilli() {
			mu.Lock()
			hashes = append(hashes, old)
			mu.Unlock()
			atomic.AddInt32(&completed, 1)
			if onProgress != nil {
				onProgress(Progress{Stage: "hashing", Current: int(atomic.LoadInt32(&completed)), Total: len(files)})
			}
			continue
		}

		weight, err := estimateDecodeMemory(path)
		if err != nil {
			continue
		}
		if weight > hashMemoryBudget {
			weight = hashMemoryBudget
		}

		if err := hashSem.Acquire(ctx, weight); err != nil {
			return nil, err
		}

		wg.Add(1)
		go func(p string, modTime int64) {
			defer wg.Done()
			defer hashSem.Release(weight)

			hash, err := ComputeHash(p)
			if err != nil {
				errMu.Lock()
				errs = append(errs, err)
				errMu.Unlock()
				return
			}
			hash.FolderPath = folderPath
			hash.ModTime = modTime

			mu.Lock()
			hashes = append(hashes, *hash)
			mu.Unlock()

			c := atomic.AddInt32(&completed, 1)
			if onProgress != nil {
				onProgress(Progress{Stage: "hashing", Current: int(c), Total: len(files)})
			}
		}(path, info.ModTime().UnixMilli())
	}

	wg.Wait()

	// Delete hashes for files that no longer exist
	fileSet := make(map[string]bool, len(files))
	for _, f := range files {
		fileSet[f] = true
	}
	var stale []string
	for path := range existingMap {
		if !fileSet[path] {
			stale = append(stale, path)
		}
	}
	if len(stale) > 0 {
		for _, path := range stale {
			_ = database.DB.Where("path = ?", path).Delete(&models.ImageHash{}).Error
		}
	}

	return hashes, nil
}

func ensureHashes(ctx context.Context, folderPath string, includeSubfolders bool, files []string, onProgress func(p Progress)) ([]models.ImageHash, error) {
	hashes, err := buildHashes(ctx, folderPath, files, onProgress)
	if err != nil {
		return nil, err
	}
	if err := database.SaveImageHashes(hashes); err != nil {
		return nil, err
	}
	var maxMtime int64
	for _, h := range hashes {
		if h.ModTime > maxMtime {
			maxMtime = h.ModTime
		}
	}
	if err := database.SaveSimilarHashState(&models.SimilarHashState{
		FolderPath:        folderPath,
		IncludeSubfolders: includeSubfolders,
		MaxFileMtime:      maxMtime,
		IndexedAt:         time.Now().UnixMilli(),
	}); err != nil {
		return nil, err
	}
	return hashes, nil
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
	// Plus the resized 256x256 output, negligible
	return int64(cfg.Width) * int64(cfg.Height) * 4, nil
}

func compareHashes(ctx context.Context, hashes []models.ImageHash, threshold int, useMax bool, onProgress func(p Progress)) ([]models.SimilarPair, error) {
	n := len(hashes)

	var mu sync.Mutex
	pairs := make([]models.SimilarPair, 0)
	var completed int32

	numWorkers := 4
	if n < numWorkers {
		numWorkers = n
	}
	chunkSize := (n + numWorkers - 1) / numWorkers

	var wg sync.WaitGroup
	for w := 0; w < numWorkers; w++ {
		start := w * chunkSize
		end := start + chunkSize
		if start >= n {
			break
		}
		if end > n {
			end = n
		}

		wg.Add(1)
		go func(s, e int) {
			defer wg.Done()
			localPairs := make([]models.SimilarPair, 0)

			for i := s; i < e; i++ {
				if err := ctx.Err(); err != nil {
					return
				}

				for j := i + 1; j < n; j++ {
					dist := hashDistance(parseHash(hashes[i].PHash), parseHash(hashes[i].DHash), parseHash(hashes[j].PHash), parseHash(hashes[j].DHash), useMax)
					if dist <= threshold {
						a, b := hashes[i].Path, hashes[j].Path
						if a > b {
							a, b = b, a
						}
					localPairs = append(localPairs, models.SimilarPair{
						FolderPath: hashes[i].FolderPath,
						PathA:      a,
						PathB:      b,
						Distance:   dist,
						Threshold:  threshold,
						UseMax:     useMax,
					})
					}
				}

				c := atomic.AddInt32(&completed, 1)
				if onProgress != nil {
					onProgress(Progress{Stage: "comparing", Current: int(c), Total: n})
				}
			}

			if len(localPairs) > 0 {
				mu.Lock()
				pairs = append(pairs, localPairs...)
				mu.Unlock()
			}
		}(start, end)
	}

	wg.Wait()
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	return pairs, nil
}

func collectImageFiles(folderPath string, includeSubfolders bool) ([]string, error) {
	var files []string
	maxDepth := 1
	if includeSubfolders {
		maxDepth = -1
	}

	var walkFn func(path string, depth int) error
	walkFn = func(path string, depth int) error {
		entries, err := os.ReadDir(path)
		if err != nil {
			return err
		}
		for _, entry := range entries {
			fullPath := filepath.Join(path, entry.Name())
			if entry.IsDir() {
				if includeSubfolders && (maxDepth < 0 || depth < maxDepth) {
					if err := walkFn(fullPath, depth+1); err != nil {
						return err
					}
				}
				continue
			}
			if IsImage(fullPath) {
				files = append(files, fullPath)
			}
		}
		return nil
	}

	if err := walkFn(folderPath, 1); err != nil {
		return nil, err
	}
	sort.Strings(files)
	return files, nil
}

func hashDistance(p1, d1, p2, d2 uint64, useMax bool) int {
	pdist := bits.OnesCount64(p1 ^ p2)
	ddist := bits.OnesCount64(d1 ^ d2)
	if useMax {
		if pdist > ddist {
			return pdist
		}
		return ddist
	}
	if pdist < ddist {
		return pdist
	}
	return ddist
}

func parseHash(s string) uint64 {
	v, _ := strconv.ParseUint(s, 10, 64)
	return v
}

func buildGroups(pairs []models.SimilarPair) [][]string {
	adj := make(map[string]map[string]bool)
	for _, p := range pairs {
		if adj[p.PathA] == nil {
			adj[p.PathA] = make(map[string]bool)
		}
		if adj[p.PathB] == nil {
			adj[p.PathB] = make(map[string]bool)
		}
		adj[p.PathA][p.PathB] = true
		adj[p.PathB][p.PathA] = true
	}

	visited := make(map[string]bool)
	var groups [][]string

	for start := range adj {
		if visited[start] {
			continue
		}
		group := []string{}
		queue := []string{start}
		visited[start] = true

		for len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]
			group = append(group, curr)

			for neighbor := range adj[curr] {
				if !visited[neighbor] {
					visited[neighbor] = true
					queue = append(queue, neighbor)
				}
			}
		}

		if len(group) > 1 {
			groups = append(groups, group)
		}
	}

	return groups
}

func LoadSimilarGroups(folderPath string, threshold int, useMax bool) ([][]string, error) {
	pairs, err := database.GetSimilarPairsByFolder(folderPath, threshold, useMax)
	if err != nil {
		return nil, err
	}
	return buildGroups(pairs), nil
}

func NeedsReindex(folderPath string, includeSubfolders bool, threshold int, useMax bool) (bool, error) {
	hashState, err := database.GetSimilarHashState(folderPath)
	if err != nil {
		return false, err
	}
	if hashState == nil {
		return true, nil
	}
	if hashState.IncludeSubfolders != includeSubfolders {
		return true, nil
	}

	files, err := collectImageFiles(folderPath, includeSubfolders)
	if err != nil {
		return false, err
	}

	var maxMtime int64
	for _, path := range files {
		info, err := os.Stat(path)
		if err != nil {
			continue
		}
		if info.ModTime().UnixMilli() > maxMtime {
			maxMtime = info.ModTime().UnixMilli()
		}
	}
	if maxMtime > hashState.MaxFileMtime {
		return true, nil
	}

	searchState, err := database.GetSimilarFolderState(folderPath, threshold, useMax)
	if err != nil {
		return false, err
	}
	if searchState == nil {
		return true, nil
	}
	if searchState.IncludeSubfolders != includeSubfolders {
		return true, nil
	}
	return false, nil
}

func FindImagesSimilarTo(queryPath string, folderPath string, includeSubfolders bool, threshold int, useMax bool) ([]string, error) {
	ctx, _, id := BeginSearch()
	defer func() {
		searchMu.Lock()
		if currentSearchID == id {
			if currentSearchCancel != nil {
				currentSearchCancel()
			}
			currentSearchCancel = nil
		}
		searchMu.Unlock()
	}()

	files, err := collectImageFiles(folderPath, includeSubfolders)
	if err != nil {
		return nil, err
	}

	hashes, err := ensureHashes(ctx, folderPath, includeSubfolders, files, nil)
	if err != nil {
		return nil, err
	}

	queryHash, err := ComputeHash(queryPath)
	if err != nil {
		return nil, err
	}

	type match struct {
		path     string
		distance int
	}
	var matches []match

	for _, h := range hashes {
		if h.Path == queryPath {
			continue
		}
		dist := hashDistance(parseHash(queryHash.PHash), parseHash(queryHash.DHash), parseHash(h.PHash), parseHash(h.DHash), useMax)
		if dist <= threshold {
			matches = append(matches, match{path: h.Path, distance: dist})
		}
	}

	sort.Slice(matches, func(i, j int) bool {
		return matches[i].distance < matches[j].distance
	})

	result := make([]string, len(matches))
	for i, m := range matches {
		result[i] = m.path
	}
	return result, nil
}
