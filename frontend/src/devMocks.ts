export function installDevMocks() {
  if (!(window as any).go) {
    (window as any).go = {
      main: {
        App: {
          GetLocalServerPort: async () => 0,
          GetLocalAuthToken: async () => '',
          GetFileTags: async () => [],
          AddTagToFile: async () => {},
          RemoveTagFromFile: async () => {},
          GetFileRemark: async () => '',
          SetFileRemark: async () => {},
          DeleteFileRemark: async () => {},
          ReadDir: async () => [],
          ReadDirChunked: async () => [],
          GetTagsForFiles: async () => ({}),
          GetDrives: async () => ['C:\\', 'D:\\'],
          GetDriveUsage: async () => ({}),
          GetDefaultPaths: async () => ({
            Desktop: 'C:\\Users\\Mock\\Desktop',
            Pictures: 'C:\\Users\\Mock\\Pictures',
            Downloads: 'C:\\Users\\Mock\\Downloads',
            Documents: 'C:\\Users\\Mock\\Documents',
            Music: 'C:\\Users\\Mock\\Music',
            Videos: 'C:\\Users\\Mock\\Videos'
          }),
          GetGlobalTags: async () => [],
          GetFavoritePaths: async () => [],
          GetFavorites: async () => [],
          GetRecentItems: async () => [],
          SearchFiles: async () => [],
          GetConfig: async () => '',
          SetConfig: async () => {},
          GetThumbnailBudgetLimit: async () => 512,
          SetThumbnailBudgetLimit: async () => {},
          GetThumbnailCacheSize: async () => 0,
          ClearThumbnailCache: async () => {},
          AutoCleanThumbnailCache: async () => {},
          GetConvertibleFormats: async () => [],
          ConvertFile: async () => '',
          ReadFileText: async () => '',
          WriteFileText: async () => {},
          SelectDirectory: async () => '',
          CreateFolder: async () => {},
          CreateFile: async () => {},
          OpenFileWithDefault: async () => {},
          OpenInExplorer: async () => {},
          OpenInTerminal: async () => {},
          PasteFiles: async () => '',
          CancelPaste: async () => {},
          ResolvePasteConflict: async () => {},
          PermanentDelete: async () => '',
          DeleteToRecycleBin: async () => {},
          RenameFile: async () => true,
          GetRenameSchemes: async () => [],
          BatchRenameFiles: async () => {},
          CheckBatchRenameConflicts: async () => [],
          SaveRenameScheme: async () => {},
          ToggleFavorite: async () => {},
          CreateTag: async () => {},
          DeleteTag: async () => {},
          UpdateTag: async () => {},
          UpdateTagsOrder: async () => {},
          GetTagUsageCounts: async () => ({}),
          Maximize: async () => {},
          Minimize: async () => {},
          Close: async () => {},
          UndoOperation: async () => {},
          RedoOperation: async () => {},
          ClearUndoStack: async () => {},
          StartTerminal: async () => {},
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
      EventsOnMultiple: () => () => {},
      EventsOff: () => {},
      EventsOn: () => () => {},
      EventsEmit: () => {},
      BrowserOpenURL: () => {},
      WindowToggleMaximise: async () => {},
      WindowIsMaximised: async () => false,
      ClipboardSetText: async () => {}
    }
  }
}
