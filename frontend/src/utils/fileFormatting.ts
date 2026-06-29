import { models } from '../../wailsjs/go/models'
export { isImage } from './previewHelper'

export function getFileIcon(file: models.FileInfo) {
  if (file.path === '__create_smart_folder__') return 'add_line.svg'
  if (file.path.startsWith('smartfolder://')) return 'folder_virtual.svg'
  if (file.isDir) return 'folder_3_line.svg'
  const ext = file.ext.toLowerCase()
  switch (ext) {
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
      return 'pic_2_fill.svg'
    case '.mp4':
    case '.mkv':
    case '.avi':
      return 'video_line.svg'
    case '.mp3':
    case '.wav':
    case '.flac':
      return 'music_2_line.svg'
    case '.doc':
    case '.docx':
      return 'doc_line.svg'
    case '.pdf':
      return 'pdf_line.svg'
    case '.txt':
    case '.md':
      return 'document_line.svg'
    case '.zip':
    case '.rar':
    case '.7z':
      return 'folder_zip_line.svg'
    case '.go':
    case '.js':
    case '.ts':
    case '.tsx':
    case '.json':
    case '.c':
    case '.cpp':
    case '.java':
    case '.py':
    case '.html':
    case '.css':
      return 'file_code_line.svg'
    case '.xls':
    case '.xlsx':
    case '.csv':
      return 'xls_line.svg'
    case '.ppt':
    case '.pptx':
      return 'ppt_line.svg'
    default:
      return 'document_line.svg'
  }
}

export function formatSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(dateValue: any) {
  if (!dateValue) return '--'
  try {
    const date = new Date(dateValue)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--'
  }
}
