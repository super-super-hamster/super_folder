interface MediaPreviewProps {
  path: string
  type: 'audio' | 'video'
}

export default function MediaPreview({ path, type }: MediaPreviewProps) {
  const src = `/file?path=${encodeURIComponent(path)}`

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 overflow-hidden p-6 relative">
      {type === 'video' ? (
        <video 
          src={src} 
          controls 
          autoPlay={false}
          className="max-w-full max-h-full rounded-lg shadow-sm bg-black"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center shadow-inner">
            <img src="/src/assets/icons/music_2_line.svg" className="w-12 h-12 text-blue-500 opacity-60" alt="Audio" />
          </div>
          <audio 
            src={src} 
            controls 
            autoPlay={false}
            className="w-full"
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  )
}
