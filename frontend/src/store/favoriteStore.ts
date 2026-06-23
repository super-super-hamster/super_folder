import { create } from 'zustand'
import { GetFavoritePaths, ToggleFavorite } from '../../wailsjs/go/main/App'

interface FavoriteState {
  favorites: Set<string>
  fetchFavorites: () => Promise<void>
  toggleFavorite: (path: string, isDir: boolean) => Promise<void>
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: new Set(),
  
  fetchFavorites: async () => {
    try {
      const paths = await GetFavoritePaths()
      set({ favorites: new Set(paths || []) })
    } catch (e) {
      console.error('Failed to fetch favorites', e)
    }
  },

  toggleFavorite: async (path: string, isDir: boolean) => {
    try {
      await ToggleFavorite(path, isDir)
      const current = get().favorites
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      set({ favorites: next })
    } catch (e) {
      console.error('Failed to toggle favorite', e)
    }
  }
}))
