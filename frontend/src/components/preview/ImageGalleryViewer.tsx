import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from '@heroui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { models } from '../../../wailsjs/go/models'
import { usePrivacyStore } from '../../store/privacyStore'
import { useTabsStore } from '../../store/tabsStore'
import { getDirectoryCache, setDirectoryCache } from '../../utils/directoryCache'
import { streamDirectory } from '../../utils/directoryLoader'
import { isImage } from '../../utils/previewHelper'
import { useTooltipState } from '../../utils/useTooltipState'
import leftIcon from '../../assets/icons/left_line.svg'
import rightIcon from '../../assets/icons/right_line.svg'

interface ImageGalleryViewerProps {
  path: string
}

interface Size {
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8

const getExtension = (path: string) => {
  const match = path.match(/\.[^\\.]+$/)
  return match ? match[0].toLowerCase() : ''
}

const getParentPath = (path: string) => {
  const separator = path.lastIndexOf('\\')
  if (separator < 0) return ''
  const parent = path.slice(0, separator)
  return /^[a-z]:$/i.test(parent) ? `${parent}\\` : parent
}

const fileUrl = (path: string) => `/file?path=${encodeURIComponent(path)}`
const thumbnailUrl = (path: string) => {
  const ext = getExtension(path)
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)
    ? `/thumb?path=${encodeURIComponent(path)}`
    : fileUrl(path)
}

const createCurrentFile = (path: string) => ({
  name: path.split('\\').pop() || path,
  path,
  isDir: false,
  size: 0,
  modTime: '',
  ext: getExtension(path),
  isProtected: false,
} as models.FileInfo)

const getImageFiles = (files: models.FileInfo[], currentPath: string) => {
  const imageFiles = files
    .filter((file) => !file.isDir && isImage(file.ext || getExtension(file.path)))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' }))

  if (!imageFiles.some((file) => file.path.toLowerCase() === currentPath.toLowerCase())) {
    imageFiles.push(createCurrentFile(currentPath))
  }
  return imageFiles
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

interface FilmstripThumbnailProps {
  file: models.FileInfo
  selected: boolean
  reducedMotion: boolean
  start: number
  onSelect: () => void
}

function FilmstripThumbnail({ file, selected, reducedMotion, start, onSelect }: FilmstripThumbnailProps) {
  const tooltip = useTooltipState(200)

  return (
    <Tooltip delay={200} isOpen={tooltip.isOpen}>
      <button
        ref={tooltip.triggerRef as unknown as React.Ref<HTMLButtonElement>}
        type="button"
        aria-label={`查看 ${file.name}`}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className={`absolute top-0 h-[68px] w-[68px] overflow-hidden rounded-md border-2 bg-sf-panel transition-[border-color,opacity,transform] ${selected ? 'border-[#fff1bd] opacity-100' : 'border-transparent opacity-65 hover:opacity-100'}`}
        style={{ transform: `translateX(${start}px) scale(${reducedMotion || selected ? 1 : 0.95})` }}
        {...tooltip.triggerProps}
      >
        <img
          src={thumbnailUrl(file.path)}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
      </button>
      <Tooltip.Content placement="top" triggerRef={tooltip.triggerRef}>{file.name}</Tooltip.Content>
    </Tooltip>
  )
}

export default function ImageGalleryViewer({ path }: ImageGalleryViewerProps) {
  const navigate = useTabsStore((state) => state.navigate)
  const privacyMode = usePrivacyStore((state) => state.state?.mode || 'public')
  const viewportRef = useRef<HTMLDivElement>(null)
  const filmstripRef = useRef<HTMLDivElement>(null)
  const zoomTimerRef = useRef<number | null>(null)
  const dragRef = useRef<{ pointerId: number; origin: Point; pan: Point } | null>(null)

  const [images, setImages] = useState<models.FileInfo[]>(() => [createCurrentFile(path)])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 })
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [showZoom, setShowZoom] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const parentPath = useMemo(() => getParentPath(path), [path])
  const currentIndex = useMemo(
    () => images.findIndex((file) => file.path.toLowerCase() === path.toLowerCase()),
    [images, path],
  )

  const filmstripVirtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => filmstripRef.current,
    estimateSize: () => 76,
    horizontal: true,
    overscan: 6,
    paddingStart: Math.max(0, viewportSize.width / 2 - 34),
    paddingEnd: Math.max(0, viewportSize.width / 2 - 34),
  })

  useEffect(() => {
    const cached = getDirectoryCache(parentPath, privacyMode)
    const currentInCache = cached?.files.some((file) => file.path.toLowerCase() === path.toLowerCase())
    if (cached) setImages(getImageFiles(cached.files, path))
    if (cached?.complete && currentInCache) {
      setLoading(false)
      return
    }

    setLoading(true)
    return streamDirectory(parentPath, {
      onUpdate: (files, complete) => {
        setDirectoryCache(parentPath, privacyMode, files, complete)
        setImages(getImageFiles(files, path))
        if (complete) setLoading(false)
      },
      onError: () => {
        setImages((current) => current.length > 0 ? current : [createCurrentFile(path)])
        setLoading(false)
      },
    })
  }, [parentPath, privacyMode])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateSize = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const fitScale = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height || !viewportSize.width || !viewportSize.height) return 1
    return Math.min(viewportSize.width / naturalSize.width, viewportSize.height / naturalSize.height, 1)
  }, [naturalSize, viewportSize])

  const clampPan = useCallback((nextPan: Point, nextZoom = zoom) => {
    const renderedWidth = naturalSize.width * fitScale * nextZoom
    const renderedHeight = naturalSize.height * fitScale * nextZoom
    const maxX = Math.max(0, (renderedWidth - viewportSize.width) / 2)
    const maxY = Math.max(0, (renderedHeight - viewportSize.height) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
      y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
    }
  }, [fitScale, naturalSize, viewportSize, zoom])

  useEffect(() => {
    setPan((value) => clampPan(value))
  }, [clampPan])

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setNaturalSize({ width: 0, height: 0 })
    setLoadFailed(false)
  }, [path])

  const goToIndex = useCallback((index: number) => {
    if (index < 0 || index >= images.length || index === currentIndex) return
    const file = images[index]
    navigate(file.path, file.name, false, true)
  }, [currentIndex, images, navigate])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        event.stopPropagation()
        goToIndex(currentIndex - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        event.stopPropagation()
        goToIndex(currentIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [currentIndex, goToIndex])

  useEffect(() => {
    if (currentIndex < 0) return
    filmstripVirtualizer.scrollToIndex(currentIndex, {
      align: 'center',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }, [currentIndex, filmstripVirtualizer, reducedMotion])

  useEffect(() => {
    if (currentIndex < 0) return
    const preload: HTMLImageElement[] = []
    for (const index of [currentIndex - 1, currentIndex + 1]) {
      if (index < 0 || index >= images.length) continue
      const image = new Image()
      image.src = fileUrl(images[index].path)
      preload.push(image)
    }
    return () => preload.forEach((image) => { image.src = '' })
  }, [currentIndex, images])

  useEffect(() => () => {
    if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current)
  }, [])

  const revealZoom = useCallback(() => {
    setShowZoom(true)
    if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current)
    zoomTimerRef.current = window.setTimeout(() => setShowZoom(false), 800)
  }, [])

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!naturalSize.width || !viewportRef.current) return

    const rect = viewportRef.current.getBoundingClientRect()
    const cursor = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 }
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * Math.exp(-event.deltaY * 0.0015)))
    const ratio = nextZoom / zoom
    const nextPan = {
      x: cursor.x - (cursor.x - pan.x) * ratio,
      y: cursor.y - (cursor.y - pan.y) * ratio,
    }

    setZoom(nextZoom)
    setPan(clampPan(nextPan, nextZoom))
    revealZoom()
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || zoom <= 1) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, origin: { x: event.clientX, y: event.clientY }, pan }
    setDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setPan(clampPan({
      x: drag.pan.x + event.clientX - drag.origin.x,
      y: drag.pan.y + event.clientY - drag.origin.y,
    }))
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex >= 0 && currentIndex < images.length - 1

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-sf-page text-sf-text select-none">
      <div
        ref={viewportRef}
        className={`relative min-h-0 flex-1 overflow-hidden touch-none ${zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {loadFailed ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-sf-text-secondary">无法加载图片</div>
        ) : (
          <img
            key={path}
            src={fileUrl(path)}
            alt={path.split('\\').pop() || '图片预览'}
            draggable={false}
            onLoad={(event) => {
              setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
              setLoadFailed(false)
            }}
            onError={() => setLoadFailed(true)}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{
              width: naturalSize.width || 'auto',
              height: naturalSize.height || 'auto',
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${fitScale * zoom})`,
              transformOrigin: 'center',
            }}
          />
        )}

        {canGoPrevious && (
          <div className="group/previous absolute inset-y-0 left-0 z-10 w-24">
            <button
              type="button"
              aria-label="上一张图片"
              onClick={() => goToIndex(currentIndex - 1)}
              onPointerDown={(event) => event.stopPropagation()}
              className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-sf-border bg-sf-panel/50 text-sf-text opacity-0 shadow-panel transition-[opacity,background-color] group-hover/previous:pointer-events-auto group-hover/previous:opacity-100 hover:bg-sf-item-hover"
            >
              <img src={leftIcon} className="h-5 w-5" />
            </button>
          </div>
        )}
        {canGoNext && (
          <div className="group/next absolute inset-y-0 right-0 z-10 w-24">
            <button
              type="button"
              aria-label="下一张图片"
              onClick={() => goToIndex(currentIndex + 1)}
              onPointerDown={(event) => event.stopPropagation()}
              className="pointer-events-none absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-sf-border bg-sf-panel/50 text-sf-text opacity-0 shadow-panel transition-[opacity,background-color] group-hover/next:pointer-events-auto group-hover/next:opacity-100 hover:bg-sf-item-hover"
            >
              <img src={rightIcon} className="h-5 w-5" />
            </button>
          </div>
        )}

        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/55 px-4 py-2 text-sm font-medium text-white transition-opacity ${showZoom ? 'opacity-100' : 'opacity-0'}`}
          aria-live="polite"
        >
          {Math.round(zoom * 100)}%
        </div>
      </div>

      <div className="relative h-[88px] shrink-0 border-t border-sf-border bg-sf-page px-3 py-2">
        <div
          ref={filmstripRef}
          className="h-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="relative h-full" style={{ width: `${filmstripVirtualizer.getTotalSize()}px` }}>
            {filmstripVirtualizer.getVirtualItems().map((virtualItem) => {
              const index = virtualItem.index
              const file = images[index]
              const selected = index === currentIndex
              return (
                <FilmstripThumbnail
                  key={file.path}
                  file={file}
                  selected={selected}
                  reducedMotion={reducedMotion}
                  start={virtualItem.start}
                  onSelect={() => goToIndex(index)}
                />
              )
            })}
          </div>
        </div>
        {loading && <div className="pointer-events-none absolute bottom-2 right-3 rounded-full border border-sf-border bg-sf-panel px-3 py-1 text-xs text-sf-text-secondary shadow-sm">正在读取图片...</div>}
      </div>
    </div>
  )
}
