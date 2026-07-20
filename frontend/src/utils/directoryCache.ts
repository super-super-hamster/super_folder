import { models } from '../../wailsjs/go/models'

export interface DirectoryCacheEntry {
  files: models.FileInfo[]
  complete: boolean
}

const directoryCache = new Map<string, DirectoryCacheEntry>()

const getKey = (path: string, privacyMode: string) => `${privacyMode}:${path.toLowerCase()}`

export function getDirectoryCache(path: string, privacyMode: string) {
  return directoryCache.get(getKey(path, privacyMode))
}

export function setDirectoryCache(path: string, privacyMode: string, files: models.FileInfo[], complete: boolean) {
  directoryCache.set(getKey(path, privacyMode), { files, complete })
}

export function deleteDirectoryCache(path: string, privacyMode: string) {
  directoryCache.delete(getKey(path, privacyMode))
}
