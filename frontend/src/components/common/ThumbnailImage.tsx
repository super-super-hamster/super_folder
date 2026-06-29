import { useState, useEffect } from 'react'

export default function ThumbnailImage({ path, alt, className }: { path: string, alt: string, className?: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [srcUrl, setSrcUrl] = useState<string | null>(null)

  useEffect(() => {
    setLoaded(false)
    setError(false)
    setSrcUrl(null)

    const abortController = new AbortController()
    let objectUrl: string | null = null

    const timer = setTimeout(() => {
      fetch(`/thumb?path=${encodeURIComponent(path)}`, { signal: abortController.signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to load')
          return res.blob()
        })
        .then(blob => {
          if (abortController.signal.aborted) return
          objectUrl = URL.createObjectURL(blob)
          setSrcUrl(objectUrl)
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            setError(true)
          }
        })
    }, 150)

    return () => {
      clearTimeout(timer)
      abortController.abort()
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [path])

  return (
    <div className={`relative overflow-hidden rounded-xl ${className || 'w-16 h-16'}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 w-full h-full bg-gray-200 animate-pulse rounded-xl" />
      )}
      {!error && srcUrl ? (
        <img
          src={srcUrl}
          className="w-full h-full object-cover transition-opacity duration-300 rounded-xl"
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true)
            setLoaded(true)
          }}
          style={{ opacity: loaded ? 1 : 0 }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-sf-panel">
          <img src="/src/assets/icons/pic_2_fill.svg" className="w-8 h-8 opacity-40" />
        </div>
      )}
    </div>
  )
}
