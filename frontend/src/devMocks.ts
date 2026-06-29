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
          GetDriveUsage: async () => ({})
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
