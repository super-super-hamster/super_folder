import { useEffect, useState, useCallback, useRef } from 'react'
import EditorLib from 'react-simple-code-editor'
const Editor = (EditorLib as any).default || EditorLib
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-go'

import TextContextMenu from '../editor/TextContextMenu'
import { ReadFileText, WriteFileText } from '../../../wailsjs/go/main/App'
import { useUIStore } from '../../store/uiStore'

interface CodePreviewProps {
  path: string
  ext: string
}

const languageMap: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.json': 'json',
  '.html': 'html',
  '.css': 'css',
  '.go': 'go',
  '.md': 'markdown',
  '.py': 'python',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cs': 'csharp',
  '.sh': 'bash',
  '.bat': 'bash',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
}

export default function CodePreview({ path, ext }: CodePreviewProps) {
  const [code, setCode] = useState('')
  const [originalCode, setOriginalCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  const { setUnsavedEditorPath } = useUIStore()

  useEffect(() => {
    setLoading(true)
    setError(null)

    ReadFileText(path)
      .then((text: string) => {
        setCode(text)
        setOriginalCode(text)
      })
      .catch((err: any) => setError(err.message || String(err)))
      .finally(() => setLoading(false))
  }, [path])

  useEffect(() => {
    if (!loading) {
      if (code !== originalCode) {
        setUnsavedEditorPath(path)
      } else {
        setUnsavedEditorPath(null)
      }
    }
    return () => setUnsavedEditorPath(null)
  }, [code, originalCode, loading, path, setUnsavedEditorPath])

  const handleSave = useCallback(async () => {
    try {
      await WriteFileText(path, code)
      setOriginalCode(code)
      setUnsavedEditorPath(null)
    } catch (err) {
      console.error('Failed to save code file:', err)
    }
  }, [path, code, setUnsavedEditorPath])

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

  const language = languageMap[ext.toLowerCase()] || 'text'

  const highlight = (codeToHighlight: string) => {
    try {
      if (Prism.languages[language]) {
        return Prism.highlight(codeToHighlight, Prism.languages[language], language)
      }
      return codeToHighlight
    } catch (e) {
      return codeToHighlight
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500 flex items-center justify-center h-full">加载代码中...</div>
  if (error) return <div className="p-4 text-sm text-red-500 flex items-center justify-center h-full">{error}</div>

  return (
    <div ref={editorRef} className="w-full h-full overflow-auto bg-[#1d1f21] relative no-scrollbar wails-no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      {code !== originalCode && (
        <div className="absolute top-3 right-4 z-10 w-2 h-2 rounded-full bg-orange-500" />
      )}
      <div className="min-h-full min-w-full p-4" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        <style>{`
          .code-editor-override textarea {
            outline: none !important;
          }
        `}</style>
        <Editor
          value={code}
          onValueChange={setCode}
          highlight={highlight}
          padding={10}
          className="text-sm code-editor-override"
          textareaClassName="focus:outline-none"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
            backgroundColor: 'transparent',
            minHeight: '100%',
            color: '#c5c8c6'
          }}
        />
      </div>
      <TextContextMenu containerRef={editorRef} value={code} onChange={setCode} />
    </div>
  )
}
