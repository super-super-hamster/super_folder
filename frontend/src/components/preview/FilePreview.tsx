import { useSelectionStore } from '../../store/selectionStore'
import { useTabsStore } from '../../store/tabsStore'
import { useEffect, useState } from 'react'
import { ReadDir } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'

import CodePreview from './CodePreview'
import ImagePreview from './ImagePreview'
import PdfPreview from './PdfPreview'
import DocxPreview from './DocxPreview'
import XlsxPreview from './XlsxPreview'
import TextPreview from './TextPreview'
import MediaPreview from './MediaPreview'
import MarkdownPreview from './MarkdownPreview'
import EpubPreview from './EpubPreview'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div className={`w-full bg-white rounded-xl border border-gray-100 overflow-hidden relative flex flex-col min-h-0 max-h-full flex-1`}>
    {children}
  </div>
)

export default function FilePreview() {
  const { selectedPaths } = useSelectionStore()
  const { tabs, activeTabId } = useTabsStore()
  const currentPath = tabs.find(t => t.id === activeTabId)?.currentPath

  const [selectedFile, setSelectedFile] = useState<models.FileInfo | null>(null)
  const [dirInfo, setDirInfo] = useState<{files: number, folders: number} | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load directory info for current path (used as fallback preview)
  useEffect(() => {
    if (!currentPath) {
      setDirInfo(null)
      return
    }
    ReadDir(currentPath).then((items) => {
      const files = items.filter(i => !i.isDir).length
      const folders = items.filter(i => i.isDir).length
      setDirInfo({ files, folders })
    }).catch(() => {
      setDirInfo(null)
    })
  }, [currentPath])

  useEffect(() => {
    if (selectedPaths.size !== 1 || !currentPath) {
      setSelectedFile(null)
      return
    }

    const path = Array.from(selectedPaths)[0]
    setIsLoading(true)
    
    ReadDir(path).then((items) => {
      const files = items.filter(i => !i.isDir).length
      const folders = items.filter(i => i.isDir).length
      setDirInfo({ files, folders })
      setSelectedFile({
        path: path,
        name: path.split('\\').pop() || path,
        ext: '',
        isDir: true,
        size: 0,
        modTime: ''
      } as models.FileInfo)
      setIsLoading(false)
    }).catch(() => {
      const extMatch = path.match(/\.([^\.]+)$/)
      const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ''
      
      setSelectedFile({
        path: path,
        name: path.split('\\').pop() || path,
        ext: ext,
        isDir: false,
        size: 0,
        modTime: ''
      } as models.FileInfo)
      setIsLoading(false)
    })

  }, [selectedPaths, currentPath])

  const renderDirPreview = () => {
    if (!currentPath || !dirInfo) return null
    const dirName = currentPath.split('\\').pop() || currentPath
    return (
      <Wrapper>
        <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4 p-6">
          <img src="/src/assets/icons/folder_line.svg" className="w-24 h-24 opacity-80 filter brightness-0 invert-0" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2 truncate max-w-full px-4">{dirName}</h3>
            <p className="text-sm text-gray-500 mb-1">包含：</p>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex flex-col items-center bg-gray-50 px-4 py-2 rounded-lg min-w-[80px]">
                <span className="text-2xl font-semibold text-blue-600">{dirInfo.folders}</span>
                <span className="text-xs text-gray-400 mt-1">文件夹</span>
              </div>
              <div className="flex flex-col items-center bg-gray-50 px-4 py-2 rounded-lg min-w-[80px]">
                <span className="text-2xl font-semibold text-emerald-600">{dirInfo.files}</span>
                <span className="text-xs text-gray-400 mt-1">文件</span>
              </div>
            </div>
          </div>
        </div>
      </Wrapper>
    )
  }

  if (selectedPaths.size === 0) {
    return renderDirPreview() || <div className="flex items-center justify-center h-full text-gray-400 text-sm">未选择任何文件</div>
  }

  if (selectedPaths.size > 1) {
    return renderDirPreview() || <div className="flex items-center justify-center h-full text-gray-400 text-sm">已选择 {selectedPaths.size} 个项目</div>
  }

  if (isLoading || !selectedFile) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">加载中...</div>
  }

  if (selectedFile.isDir && dirInfo) {
    return (
      <Wrapper>
        <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4 p-6">
          <img src="/src/assets/icons/folder_line.svg" className="w-24 h-24 opacity-80 filter brightness-0 invert-0" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2 truncate max-w-full px-4">{selectedFile.name}</h3>
            <p className="text-sm text-gray-500 mb-1">包含：</p>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex flex-col items-center bg-gray-50 px-4 py-2 rounded-lg min-w-[80px]">
                <span className="text-2xl font-semibold text-blue-600">{dirInfo.folders}</span>
                <span className="text-xs text-gray-400 mt-1">文件夹</span>
              </div>
              <div className="flex flex-col items-center bg-gray-50 px-4 py-2 rounded-lg min-w-[80px]">
                <span className="text-2xl font-semibold text-emerald-600">{dirInfo.files}</span>
                <span className="text-xs text-gray-400 mt-1">文件</span>
              </div>
            </div>
          </div>
        </div>
      </Wrapper>
    )
  }

  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'].includes(selectedFile.ext)
  const isCode = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.go', '.py', '.java', '.c', '.cpp', '.cs', '.sh', '.bat', '.xml', '.yaml', '.yml', '.sql', '.php', '.rb', '.rs', '.swift', '.kt', '.dart', '.vue', '.svelte', '.h', '.hpp', '.m'].includes(selectedFile.ext)
  const isMarkdown = selectedFile.ext === '.md' || selectedFile.ext === '.markdown'
  const isText = ['.txt', '.log', '.ini', '.env', '.gitignore', '.conf', '.cfg', '.npmrc', '.editorconfig', '.properties'].includes(selectedFile.ext)
  const isVideo = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv'].includes(selectedFile.ext)
  const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(selectedFile.ext)
  const isPdf = selectedFile.ext === '.pdf'
  const isDocx = selectedFile.ext === '.docx'
  const isXlsx = selectedFile.ext === '.xlsx' || selectedFile.ext === '.csv'
  const isEpub = selectedFile.ext === '.epub'

  if (isImage) {
    return <ImagePreview path={selectedFile.path} />
  }

  if (isCode) {
    return <Wrapper><CodePreview path={selectedFile.path} ext={selectedFile.ext} /></Wrapper>
  }

  if (isText) {
    return <Wrapper><TextPreview path={selectedFile.path} /></Wrapper>
  }

  if (isPdf) {
    return <Wrapper><PdfPreview path={selectedFile.path} /></Wrapper>
  }

  if (isDocx) {
    return <Wrapper><DocxPreview path={selectedFile.path} /></Wrapper>
  }

  if (isXlsx) {
    return <Wrapper><XlsxPreview path={selectedFile.path} /></Wrapper>
  }

  if (isVideo) {
    return <Wrapper><MediaPreview path={selectedFile.path} type="video" /></Wrapper>
  }

  if (isAudio) {
    return <Wrapper><MediaPreview path={selectedFile.path} type="audio" /></Wrapper>
  }

  if (isMarkdown) {
    return <Wrapper><MarkdownPreview path={selectedFile.path} /></Wrapper>
  }

  if (isEpub) {
    return <Wrapper><EpubPreview path={selectedFile.path} /></Wrapper>
  }

  return renderDirPreview() || (
    <Wrapper>
      <div className="flex items-center justify-center h-full text-gray-400 text-sm flex-col gap-2">
        <img src="/src/assets/icons/document_line.svg" className="w-12 h-12 opacity-50" />
        <span>暂不支持预览该格式</span>
        <span className="text-xs text-gray-400 mt-1 truncate max-w-[80%]">{selectedFile.name}</span>
      </div>
    </Wrapper>
  )
}
