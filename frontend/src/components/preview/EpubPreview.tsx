import { useEffect, useRef, useState } from 'react'
import { Dropdown, Label } from '@heroui/react'
import ePub from 'epubjs'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
import leftAnim from '../../assets/anim/left.json'
import rightAnim from '../../assets/anim/right.json'

const Lottie = (LottieLib as any).default || LottieLib

interface TocItem {
  id: string
  label: string
  href: string
  subitems?: TocItem[]
}

function getEpubStorageKey(path: string) {
  return `epub:${path}`
}

function loadProgress(path: string): string | null {
  try {
    return localStorage.getItem(getEpubStorageKey(path))
  } catch {
    return null
  }
}

function saveProgress(path: string, cfi: string | null) {
  try {
    if (cfi) {
      localStorage.setItem(getEpubStorageKey(path), cfi)
    } else {
      localStorage.removeItem(getEpubStorageKey(path))
    }
  } catch {}
}

function buildFileUrl(path: string) {
  return `/file?path=${encodeURIComponent(path)}`
}

function flattenToc(items: any[]): TocItem[] {
  const result: TocItem[] = []
  items.forEach((item) => {
    result.push({
      id: item.id || item.href,
      label: item.label,
      href: item.href,
    })
    if (item.subitems && item.subitems.length > 0) {
      result.push(...flattenToc(item.subitems))
    }
  })
  return result
}

interface EpubPreviewProps {
  path: string
}

export default function EpubPreview({ path }: EpubPreviewProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const leftRef = useRef<LottieRefCurrentProps>(null)
  const rightRef = useRef<LottieRefCurrentProps>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')
  const [toc, setToc] = useState<TocItem[]>([])
  const [currentHref, setCurrentHref] = useState<string | null>(null)
  const [canGoPrev, setCanGoPrev] = useState(false)
  const [canGoNext, setCanGoNext] = useState(false)

  useEffect(() => {
    let mounted = true

    setLoading(true)
    setError(null)
    setChapterTitle('')
    setToc([])
    setCurrentHref(null)

    const book = ePub(buildFileUrl(path))
    bookRef.current = book

    book.loaded.navigation
      .then((nav: any) => {
        if (!mounted) return
        setToc(flattenToc(nav.toc || []))
      })
      .catch(() => {
        if (!mounted) return
        setToc([])
      })

    if (!viewerRef.current) return

    const rendition = book.renderTo(viewerRef.current, {
      flow: 'scrolled-doc',
      width: '100%',
      height: '100%',
      allowScriptedContent: false,
    })
    renditionRef.current = rendition

    rendition.hooks.content.register((contents: any) => {
      const doc = contents.document
      if (doc && doc.head) {
        const style = doc.createElement('style')
        style.textContent = `
          html, body { max-width: 100% !important; overflow-x: hidden !important; overflow-y: auto !important; margin: 0 !important; padding: 0 !important; }
          * { scrollbar-width: none !important; }
          *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
          img, svg, video, canvas, iframe, object, embed { max-width: 100% !important; height: auto !important; box-sizing: border-box !important; }
          body > * { max-width: 100% !important; }
          img { display: block; }
          * { word-wrap: break-word !important; overflow-wrap: break-word !important; }
          pre, code { white-space: pre-wrap !important; word-break: break-all !important; }
          table { display: table !important; table-layout: fixed !important; width: 100% !important; max-width: 100% !important; }
          td, th { word-break: break-all !important; overflow-wrap: break-word !important; }
        `
        doc.head.appendChild(style)
      }
    })

    const lastKeyRef = { key: '', time: 0 }
    const DOUBLE_PRESS_WINDOW = 400
    const iframeHandlers = new WeakMap<Document, { handler: (e: KeyboardEvent) => void; keyUp: (e: KeyboardEvent) => void }>()

    const makeKeyHandler = (scrollTarget: HTMLElement | Window) => {
      return (e: KeyboardEvent) => {
        if (!renditionRef.current) return
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          const now = Date.now()
          if (lastKeyRef.key === e.key && now - lastKeyRef.time <= DOUBLE_PRESS_WINDOW) {
            if (e.key === 'ArrowLeft') {
              renditionRef.current.prev()
            } else {
              renditionRef.current.next()
            }
            lastKeyRef.key = ''
            lastKeyRef.time = 0
          } else {
            lastKeyRef.key = e.key
            lastKeyRef.time = now
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (scrollTarget instanceof Window) {
            viewerRef.current?.scrollBy({ top: -40, behavior: 'smooth' })
          } else {
            scrollTarget.scrollBy({ top: -40, behavior: 'smooth' })
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (scrollTarget instanceof Window) {
            viewerRef.current?.scrollBy({ top: 40, behavior: 'smooth' })
          } else {
            scrollTarget.scrollBy({ top: 40, behavior: 'smooth' })
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
      }
    }

    rendition.hooks.content.register((contents: any) => {
      const doc = contents.document as Document | undefined
      if (!doc) return
      const handler = makeKeyHandler(viewerRef.current || window)
      doc.addEventListener('keydown', handler)
      doc.addEventListener('keyup', handleKeyUp)
      iframeHandlers.set(doc, { handler, keyUp: handleKeyUp })
    })

    const parentKeyHandler = makeKeyHandler(window)
    window.addEventListener('keydown', parentKeyHandler, true)
    window.addEventListener('keyup', handleKeyUp, true)

    const resizeObserver = new ResizeObserver(() => {
      try {
        const el = viewerRef.current
        if (el) renditionRef.current?.resize(el.clientWidth, el.clientHeight)
      } catch {}
    })
    if (viewerRef.current) {
      resizeObserver.observe(viewerRef.current)
    }

    rendition.on('relocated', (location: any) => {
      if (!mounted) return
      const cfi = location?.start?.cfi || null
      if (cfi) {
        saveProgress(path, cfi)
      }
      setCurrentHref(location?.start?.href || null)
      setCanGoPrev(!!location?.start?.cfi)
      setCanGoNext(!!location?.end?.cfi)
    })

    rendition.on('rendered', (_section: any, view: any) => {
      if (!mounted) return
      const section = book.spine?.get?.(view?.section?.href || view?.section?.idref)
      const title = (section as any)?.chapter?.title || (section as any)?.navitem?.label || ''
      if (title) setChapterTitle(title)
    })

    const saved = loadProgress(path)
    const displayPromise = saved ? rendition.display(saved) : rendition.display()

    displayPromise
      .then(() => {
        if (!mounted) return
        setLoading(false)
      })
      .catch((err: any) => {
        if (!mounted) return
        setError(err?.message || '无法打开 EPUB')
        setLoading(false)
      })

    return () => {
      mounted = false
      window.removeEventListener('keydown', parentKeyHandler, true)
      window.removeEventListener('keyup', handleKeyUp, true)
      resizeObserver.disconnect()
      try {
        rendition.destroy()
      } catch {}
      try {
        book.destroy()
      } catch {}
      bookRef.current = null
      renditionRef.current = null
    }
  }, [path])

  useEffect(() => {
    const titleItem = toc.find((item) => {
      const itemHref = item.href.split('#')[0]
      const current = currentHref?.split('#')[0]
      return itemHref && current && (current.endsWith(itemHref) || itemHref.endsWith(current))
    })
    if (titleItem?.label) {
      setChapterTitle(titleItem.label)
    }
  }, [toc, currentHref])

  const goPrev = () => {
    leftRef.current?.goToAndPlay(0, true)
    renditionRef.current?.prev()
  }

  const goNext = () => {
    rightRef.current?.goToAndPlay(0, true)
    renditionRef.current?.next()
  }

  const handleTocAction = (key: string) => {
    const item = toc.find((t) => t.id === key)
    if (item && renditionRef.current) {
      renditionRef.current.display(item.href)
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-2xl shadow-panel border border-gray-100 overflow-hidden wails-no-drag">
      <style>{`
        .epub-container {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .epub-container::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <button
          onClick={goPrev}
          onMouseDown={(e) => e.preventDefault()}
          disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
          title="上一章"
        >
          <Lottie lottieRef={leftRef} animationData={leftAnim} autoplay={false} loop={false} className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center justify-center px-4 min-w-0">
          <span className="text-sm font-medium text-gray-800 text-center max-w-[50%] leading-tight line-clamp-2">
            {chapterTitle || ' '}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goNext}
            onMouseDown={(e) => e.preventDefault()}
            disabled={!canGoNext}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
            title="下一章"
          >
            <Lottie lottieRef={rightRef} animationData={rightAnim} autoplay={false} loop={false} className="w-5 h-5" />
          </button>

          <Dropdown>
            <Dropdown.Trigger>
              <button
                onMouseDown={(e) => e.preventDefault()}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors focus:outline-none"
                title="目录"
              >
                <img src="/src/assets/icons/menu_line.svg" className="w-5 h-5 opacity-70" alt="目录" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end" className="max-h-[70vh] overflow-y-auto min-w-[200px] p-1 rounded-xl border border-gray-200 shadow-lg">
              <Dropdown.Menu onAction={(key) => handleTocAction(String(key))}>
                {toc.map((item) => (
                  <Dropdown.Item key={item.id} id={item.id} textValue={item.label}>
                    <Label className="text-sm text-gray-800">{item.label}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 bg-white z-10">
            加载中...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 bg-white z-10">
            {error}
          </div>
        )}
        <div
          ref={viewerRef}
          className="h-full w-full overflow-y-auto overflow-x-hidden bg-white no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        />
      </div>
    </div>
  )
}
