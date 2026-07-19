import ScrollArea from '../common/ScrollArea'

interface ImagePreviewProps {
  path: string
}

export default function ImagePreview({ path }: ImagePreviewProps) {
  return (
    <ScrollArea className="h-full w-full bg-gray-50" innerClassName="flex items-center justify-center">
      <img
        src={`/file?path=${encodeURIComponent(path)}`}
        alt="Preview"
        loading="lazy"
        className="max-w-full max-h-full object-contain"
      />
    </ScrollArea>
  )
}
