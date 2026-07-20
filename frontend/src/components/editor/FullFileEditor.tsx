import { useState, useEffect, useCallback, useRef } from 'react'
import { isImage, isCode, isMarkdown, isText, isVideo, isAudio, isPdf, isDocx, isXlsx, isEditableText, isEpub } from '../../utils/previewHelper'
import ImageGalleryViewer from '../preview/ImageGalleryViewer'
import PdfPreview from '../preview/PdfPreview'
import DocxPreview from '../preview/DocxPreview'
import XlsxPreview from '../preview/XlsxPreview'
import MediaPreview from '../preview/MediaPreview'
import MarkdownPreview from '../preview/MarkdownPreview'
import CodePreview from '../preview/CodePreview'
import EpubPreview from '../preview/EpubPreview'
import TextContextMenu from './TextContextMenu'
import { ReadFileText, WriteFileText } from '../../../wailsjs/go/main/App'
import { useUIStore } from '../../store/uiStore'

interface FullFileEditorProps {
  path: string
}

export default function FullFileEditor({ path }: FullFileEditorProps) {
  const extMatch = path.match(/\.([^\.]+)$/)
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ''

  const isEditable = isEditableText(ext)

  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const editorRef = useRef<HTMLDivElement>(null)

  const { setUnsavedEditorPath } = useUIStore()

  useEffect(() => {
    if (isEditable) {
      setLoading(true)
      ReadFileText(path)
        .then((text: string) => {
          setContent(text)
          setOriginalContent(text)
          setLoading(false)
        })
        .catch(console.error)
    }
  }, [path, isEditable])

  useEffect(() => {
    if (isEditable && !loading) {
      if (content !== originalContent) {
        setUnsavedEditorPath(path)
      } else {
        setUnsavedEditorPath(null)
      }
    }
    return () => {
      setUnsavedEditorPath(null)
    }
  }, [content, originalContent, isEditable, loading, path, setUnsavedEditorPath])

  const handleSave = useCallback(async () => {
    if (!isEditable) return
    try {
      await WriteFileText(path, content)
      setOriginalContent(content)
      setUnsavedEditorPath(null)
    } catch (err) {
      console.error('Failed to save file:', err)
    }
  }, [path, content, isEditable, setUnsavedEditorPath])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const renderContent = () => {
    if (isEditable) {
      if (loading) {
        return <div className="flex items-center justify-center h-full w-full text-gray-500">加载中...</div>
      }
      return (
        <div ref={editorRef} className="w-full h-full flex flex-col relative">
          {content !== originalContent && (
            <div className="absolute top-3 right-4 z-panel w-2 h-2 rounded-full bg-orange-500" />
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm bg-gray-50 text-gray-800 wails-no-drag"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            spellCheck={false}
          />
          <TextContextMenu containerRef={editorRef} value={content} onChange={setContent} />
        </div>
      )
    }

    if (isImage(ext)) return <ImageGalleryViewer path={path} />
    if (isPdf(ext)) return <PdfPreview path={path} />
    if (isDocx(ext)) return <DocxPreview path={path} />
    if (isXlsx(ext)) return <XlsxPreview path={path} />
    if (isVideo(ext)) return <MediaPreview path={path} type="video" />
    if (isAudio(ext)) return <MediaPreview path={path} type="audio" />
    if (isMarkdown(ext)) return <MarkdownPreview path={path} />
    if (isCode(ext)) return <CodePreview path={path} ext={ext} />
    if (isEpub(ext)) return <EpubPreview path={path} />

    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm flex-col gap-2 wails-no-drag">
        <img src="/src/assets/icons/document_line.svg" className="w-12 h-12 opacity-50" />
        <span>暂不支持预览该格式</span>
        <span className="text-xs text-gray-400 mt-1 truncate max-w-[80%]">{path.split('\\').pop()}</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-sf-page relative flex flex-col min-h-0 wails-no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      {renderContent()}
    </div>
  )
}
