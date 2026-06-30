package similarity

import (
	"math/bits"
	"os"
	"path/filepath"
	"sort"
	"super_folder/internal/database"
	"super_folder/internal/models"
	"time"
)

type Progress struct {
	Stage   string
	Current int
	Total   int
}

func FindSimilarGroups(folderPath string, includeSubfolders bool, threshold int, onProgress func(p Progress)) ([][]string, error) {
	files, err := collectImageFiles(folderPath, includeSubfolders)
	if err != nil {
		return nil, err
	}

	hashes := make([]models.ImageHash, 0, len(files))
	for i, path := range files {
		hash, err := ComputeHash(path)
		if err != nil {
			continue
		}
		hash.FolderPath = folderPath
		hashes = append(hashes, *hash)
		if onProgress != nil {
			onProgress(Progress{Stage: "hashing", Current: i + 1, Total: len(files)})
		}
	}

	if len(hashes) < 2 {
		if err := persistResults(folderPath, includeSubfolders, threshold, hashes, nil); err != nil {
			return nil, err
		}
		return nil, nil
	}

	pairs := make([]models.SimilarPair, 0)
	totalPairs := len(hashes) * (len(hashes) - 1) / 2
	processed := 0

	useMax := threshold <= 5 // 极度相似 uses max(pHash, dHash)

	for i := 0; i < len(hashes); i++ {
		for j := i + 1; j < len(hashes); j++ {
			dist := hashDistance(hashes[i].PHash, hashes[i].DHash, hashes[j].PHash, hashes[j].DHash, useMax)
			if dist <= threshold {
				a, b := hashes[i].Path, hashes[j].Path
				if a > b {
					a, b = b, a
				}
				pairs = append(pairs, models.SimilarPair{
					FolderPath: folderPath,
					PathA:      a,
					PathB:      b,
					Distance:   dist,
					Threshold:  threshold,
				})
			}
			processed++
			if onProgress != nil && processed%1000 == 0 {
				onProgress(Progress{Stage: "comparing", Current: processed, Total: totalPairs})
			}
		}
	}

	if onProgress != nil {
		onProgress(Progress{Stage: "comparing", Current: totalPairs, Total: totalPairs})
	}

	if err := persistResults(folderPath, includeSubfolders, threshold, hashes, pairs); err != nil {
		return nil, err
	}

	groups := buildGroups(pairs)
	return groups, nil
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

func persistResults(folderPath string, includeSubfolders bool, threshold int, hashes []models.ImageHash, pairs []models.SimilarPair) error {
	if err := database.DeleteImageHashesByFolder(folderPath); err != nil {
		return err
	}
	if err := database.DeleteSimilarPairsByFolder(folderPath); err != nil {
		return err
	}
	if len(hashes) > 0 {
		if err := database.SaveImageHashes(hashes); err != nil {
			return err
		}
	}
	if len(pairs) > 0 {
		if err := database.SaveSimilarPairs(pairs); err != nil {
			return err
		}
	}

	var maxMtime int64
	for _, h := range hashes {
		if h.ModTime > maxMtime {
			maxMtime = h.ModTime
		}
	}

	return database.SaveSimilarFolderState(&models.SimilarFolderState{
		FolderPath:        folderPath,
		IncludeSubfolders: includeSubfolders,
		Threshold:         threshold,
		MaxFileMtime:      maxMtime,
		IndexedAt:         time.Now().UnixMilli(),
	})
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

func LoadSimilarGroups(folderPath string) ([][]string, error) {
	pairs, err := database.GetSimilarPairsByFolder(folderPath)
	if err != nil {
		return nil, err
	}
	return buildGroups(pairs), nil
}

func NeedsReindex(folderPath string, includeSubfolders bool, threshold int) (bool, error) {
	state, err := database.GetSimilarFolderState(folderPath)
	if err != nil {
		return false, err
	}
	if state == nil {
		return true, nil
	}
	if state.IncludeSubfolders != includeSubfolders || state.Threshold != threshold {
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

	return maxMtime > state.MaxFileMtime, nil
}
