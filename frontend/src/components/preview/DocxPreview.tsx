import { useEffect, useState } from 'react'
import mammoth from 'mammoth'
import ScrollArea from '../common/ScrollArea'

interface DocxPreviewProps {
  path: string
}

export default function DocxPreview({ path }: DocxPreviewProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setHtml(null)

    fetch(`/file?path=${encodeURIComponent(path)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load file')
        return res.arrayBuffer()
      })
      .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
      .then((result) => setHtml(result.value))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [path])

  if (loading) return <div className="p-4 text-sm text-gray-500 flex items-center justify-center h-full">Loading document...</div>
  if (error) return <div className="p-4 text-sm text-red-500 flex items-center justify-center h-full">{error}</div>

  return (
    <ScrollArea className="h-full w-full bg-white" innerClassName="p-6">
      <div 
        className="prose prose-sm max-w-none prose-img:max-w-full"
        dangerouslySetInnerHTML={{ __html: html || '' }} 
      />
    </ScrollArea>
  )
}
