interface PdfPreviewProps {
  path: string
}

export default function PdfPreview({ path }: PdfPreviewProps) {
  return (
    <div className="h-full w-full bg-gray-100">
      <iframe
        src={`/file?path=${encodeURIComponent(path)}`}
        className="w-full h-full border-none"
        title="PDF Preview"
      />
    </div>
  )
}
