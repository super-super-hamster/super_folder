export function installDevMocks() {
  if (!(window as any).go) {
    (window as any).go = {
      main: {
        App: {
          GetLocalServerPort: async () => 0,
          GetFileTags: async () => [],
          AddTagToFile: async () => {},
          RemoveTagFromFile: async () => {},
          GetFileRemark: async () => '',
          SetFileRemark: async () => {},
          DeleteFileRemark: async () => {},
          ReadDir: async () => [],
          GetTagsForFiles: async () => ({}),
          GetDrives: async () => [],
          GetDriveUsage: async () => ({}),
          GetSimilarImageThresholds: async () => ({ '极度相似': 5, '高度相似': 5, '部分相似': 10 }),
          FindSimilarImageGroups: async () => [],
          GetSimilarImageGroups: async () => [],
          CheckSimilarImagesNeedReindex: async () => true,
          FindImagesSimilarTo: async () => [],
          CancelSimilarImageSearch: async () => {}
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
