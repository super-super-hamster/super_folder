import { useEffect, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

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
  '.bat': 'batch',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
}

export default function CodePreview({ path, ext }: CodePreviewProps) {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setCode(null)

    fetch(`/file?path=${encodeURIComponent(path)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load file')
        const size = res.headers.get('content-length')
        if (size && parseInt(size) > 2 * 1024 * 1024) {
          throw new Error('File is too large to preview (>2MB)')
        }
        return res.text()
      })
      .then((text) => setCode(text))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [path])

  const language = languageMap[ext.toLowerCase()] || 'text'

  if (loading) return <div className="p-4 text-sm text-gray-500 flex items-center justify-center h-full">Loading code...</div>
  if (error) return <div className="p-4 text-sm text-red-500 flex items-center justify-center h-full">{error}</div>

  return (
    <div className="w-full h-full overflow-auto bg-[#1E1E1E] no-scrollbar preview-code">
      <style>{`
        .preview-code pre::-webkit-scrollbar { display: none; }
      `}</style>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '16px', fontSize: '13px', background: 'transparent', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        showLineNumbers={true}
      >
        {code || ''}
      </SyntaxHighlighter>
    </div>
  )
}
