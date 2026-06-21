import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownPreviewProps {
  path: string
}

export default function MarkdownPreview({ path }: MarkdownPreviewProps) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setContent(null)

    fetch(`/file?path=${encodeURIComponent(path)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load markdown file')
        const size = res.headers.get('content-length')
        if (size && parseInt(size) > 5 * 1024 * 1024) {
          throw new Error('Markdown file is too large (>5MB)')
        }
        return res.text()
      })
      .then((text) => setContent(text))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [path])

  if (loading) return <div className="p-4 text-sm text-gray-500 flex items-center justify-center h-full">Loading markdown...</div>
  if (error) return <div className="p-4 text-sm text-red-500 flex items-center justify-center h-full">{error}</div>

  return (
    <div className="w-full h-full overflow-auto bg-white p-6 no-scrollbar">
      <div className="prose prose-sm prose-blue max-w-none text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content || ''}
        </ReactMarkdown>
      </div>
    </div>
  )
}
