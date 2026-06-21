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

// Generate color hash function limited to nice colors
const generateColorFromName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    '#F87171', '#FB923C', '#FBBF24', '#34D399', '#38BDF8', '#818CF8', '#A78BFA', '#F472B6', '#FB7185',
    '#2DD4BF', '#4ADE80', '#60A5FA', '#C084FC', '#F43F5E', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899'
  ]
  const index = Math.abs(hash) % colors.length
  return colors[index]
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
    const colorHex = generateColorFromName(name)
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
    // Optimistic update
    const map = new Map(get().globalTags.map(t => [t.id, t]))
    const newTags = orderedIds.map((id, i) => {
        const t = map.get(id)!
        return new models.Tag({...t, sortOrder: i})
    })
    set({ globalTags: newTags })
    
    await UpdateTagsOrder(orderedIds)
  }
}))
