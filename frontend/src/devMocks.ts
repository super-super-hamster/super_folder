export function installDevMocks() {
  if (!(window as any).go) {
    (window as any).go = {
      main: {
        App: {
          GetLocalServerPort: async () => 0,
          GetFileTags: async () => [],
          AddTagToFile: async () => {},
          RemoveTagFromFile: async () => {},
          ReadDir: async () => [],
          GetTagsForFiles: async () => ({}),
          GetDrives: async () => [],
          GetDriveUsage: async () => ({}),
          GetSimilarImageThresholds: async () => ({ '极度相似': 5, '高度相似': 12, '部分相似': 20 }),
          FindSimilarImageGroups: async () => [],
          GetSimilarImageGroups: async () => [],
          CheckSimilarImagesNeedReindex: async () => true,
          GetSimilarImageState: async () => null
        }
      }
    }
  }

  if (!(window as any).runtime) {
    (window as any).runtime = {
      EventsOnMultiple: () => {},
      EventsOff: () => {},
      EventsOn: () => {},
      BrowserOpenURL: () => {}
    }
  }
}
