interface ImagePreviewProps {
  path: string
}

export default function ImagePreview({ path }: ImagePreviewProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-50 overflow-auto">
      <img
        src={`/file?path=${encodeURIComponent(path)}`}
        alt="Preview"
        className="max-w-full max-h-full object-contain"
      />
    </div>
  )
}
