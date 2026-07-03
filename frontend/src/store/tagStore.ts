import { create } from 'zustand'
import { models } from '../../wailsjs/go/models'
import { GetGlobalTags, CreateTag, DeleteTag, UpdateTagsOrder, UpdateTag } from '../../wailsjs/go/main/App'

interface TagState {
  globalTags: models.Tag[]
  loading: boolean
  tagRefreshKey: number
  triggerTagRefresh: () => void
  fetchGlobalTags: () => Promise<void>
  createTag: (name: string, type?: string) => Promise<models.Tag>
  deleteTag: (id: string) => Promise<void>
  updateTag: (tag: models.Tag) => Promise<void>
  reorderTags: (orderedIds: string[]) => Promise<void>
}

export const generateColorFromName = (name: string): string => {
  let hash = 2166136261
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  const unsignedHash = hash >>> 0
  const hue = unsignedHash % 360
  const saturation = 58 + ((unsignedHash >>> 8) % 17)
  const lightness = 48 + ((unsignedHash >>> 16) % 15)
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const useTagStore = create<TagState>((set, get) => ({
  globalTags: [],
  loading: false,
  tagRefreshKey: 0,
  triggerTagRefresh: () => set(state => ({ tagRefreshKey: state.tagRefreshKey + 1 })),

  fetchGlobalTags: async () => {
    set({ loading: true })
    try {
      const tags = await GetGlobalTags()
      set({ globalTags: tags || [] })
    } catch (e) {
      console.error("Failed to fetch global tags", e)
    } finally {
      set({ loading: false })
    }
  },

  createTag: async (name: string, type: string = '') => {
    const id = generateUUID()
    const colorHex = generateColorFromName(type ? `${type}:${name}` : name)
    const sortOrder = get().globalTags.length
    
    const newTag = new models.Tag({
        id,
        name,
        type,
        colorHex,
        sortOrder
    })

    await CreateTag(newTag)
    await get().fetchGlobalTags()
    return newTag
  },

  deleteTag: async (id: string) => {
    await DeleteTag(id)
    await get().fetchGlobalTags()
  },

  updateTag: async (tag: models.Tag) => {
    await UpdateTag(tag)
    await get().fetchGlobalTags()
  },

  reorderTags: async (orderedIds: string[]) => {
    const currentTags = get().globalTags
    const map = new Map(currentTags.map(t => [t.id, t]))
    const nextIds = orderedIds.filter(id => map.has(id))
    const newTags = nextIds.flatMap((id, i) => {
        const t = map.get(id)
        if (!t) return []
        return new models.Tag({...t, sortOrder: i})
    })
    set({ globalTags: newTags })
    
    await UpdateTagsOrder(nextIds)
  }
}))
