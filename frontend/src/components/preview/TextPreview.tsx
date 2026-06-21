import { useEffect, useState } from 'react'

interface TextPreviewProps {
  path: string
}

export default function TextPreview({ path }: TextPreviewProps) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setText(null)

    fetch(`/file?path=${encodeURIComponent(path)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load file')
        const size = res.headers.get('content-length')
        if (size && parseInt(size) > 5 * 1024 * 1024) {
          throw new Error('Text file is too large (>5MB)')
        }
        return res.text()
      })
      .then((content) => setText(content))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [path])

  if (loading) return <div className="p-4 text-sm text-gray-500 flex items-center justify-center h-full">Loading text...</div>
  if (error) return <div className="p-4 text-sm text-red-500 flex items-center justify-center h-full">{error}</div>

  return (
    <div className="w-full h-full overflow-auto bg-gray-50 p-4">
      <pre className="text-gray-800 font-sans text-[13px] whitespace-pre-wrap break-words m-0">
        {text || ''}
      </pre>
    </div>
  )
}
