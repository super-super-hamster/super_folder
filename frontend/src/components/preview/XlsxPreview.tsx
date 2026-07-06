import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import ScrollArea from '../common/ScrollArea'

interface XlsxPreviewProps {
  path: string
}

export default function XlsxPreview({ path }: XlsxPreviewProps) {
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
      .then((arrayBuffer) => {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const htmlStr = XLSX.utils.sheet_to_html(worksheet)
        setHtml(htmlStr)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [path])

  if (loading) return <div className="p-4 text-sm text-gray-500 flex items-center justify-center h-full">Loading spreadsheet...</div>
  if (error) return <div className="p-4 text-sm text-red-500 flex items-center justify-center h-full">{error}</div>

  return (
    <ScrollArea className="h-full w-full bg-white" innerClassName="p-4">
      <style>{`
        .xlsx-preview table { border-collapse: collapse; width: 100%; font-size: 13px; }
        .xlsx-preview td, .xlsx-preview th { border: 1px solid #ddd; padding: 4px 8px; }
      `}</style>
      <div 
        className="xlsx-preview max-w-none"
        dangerouslySetInnerHTML={{ __html: html || '' }} 
      />
    </ScrollArea>
  )
}
