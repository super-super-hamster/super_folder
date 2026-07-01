import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime/runtime'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
const Lottie = (LottieLib as any).default || LottieLib
import copyAnim from '../../assets/anim/copy.json'

interface TextContextMenuProps {
  containerRef: React.RefObject<HTMLElement | null>
  value: string
  onChange: (value: string) => void
}

export default function TextContextMenu({ containerRef, value, onChange }: TextContextMenuProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hasSelection, setHasSelection] = useState(false)
  const [canPaste, setCanPaste] = useState(false)
  const copyLottieRef = useRef<LottieRefCurrentProps>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleContextMenu = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target || (target.tagName !== 'TEXTAREA' && !target.closest('textarea'))) {
        setVisible(false)
        return
      }

      e.preventDefault()
      const textarea = getActiveTextarea()
      const selected = textarea ? value.substring(textarea.selectionStart, textarea.selectionEnd) : ''
      setHasSelection(selected.length > 0)

      try {
        const text = await ClipboardGetText()
        setCanPaste(text.length > 0)
      } catch {
        setCanPaste(false)
      }

      setPos({ x: e.clientX, y: e.clientY })
      setVisible(true)
    }

    const handleClick = () => setVisible(false)
    const handleScroll = () => setVisible(false)

    container.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [containerRef])

  const getActiveTextarea = (): HTMLTextAreaElement | null => {
    const container = containerRef.current
    if (!container) return null
    return container.querySelector('textarea')
  }

  const handleCopy = async () => {
    const textarea = getActiveTextarea()
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) return
    const selected = value.substring(start, end)
    await ClipboardSetText(selected)
    setVisible(false)
  }

  const handleCut = async () => {
    const textarea = getActiveTextarea()
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) return
    const selected = value.substring(start, end)
    await ClipboardSetText(selected)
    const newValue = value.substring(0, start) + value.substring(end)
    onChange(newValue)
    requestAnimationFrame(() => {
      textarea.selectionStart = start
      textarea.selectionEnd = start
      textarea.focus()
    })
    setVisible(false)
  }

  const handlePaste = async () => {
    const textarea = getActiveTextarea()
    if (!textarea) return
    let text: string
    try {
      text = await ClipboardGetText()
    } catch {
      setVisible(false)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = value.substring(0, start) + text + value.substring(end)
    onChange(newValue)
    const cursor = start + text.length
    requestAnimationFrame(() => {
      textarea.selectionStart = cursor
      textarea.selectionEnd = cursor
      textarea.focus()
    })
    setVisible(false)
  }

  if (!visible) return null

  const menuWidth = 120
  const menuHeight = 120
  let x = pos.x
  let y = pos.y
  if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10
  if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10
  if (x < 10) x = 10
  if (y < 10) y = 10

  const Item = ({ label, shortcut, disabled, icon, lottieRef, onClick }: {
    label: string
    shortcut?: string
    disabled?: boolean
    icon?: React.ReactNode
    lottieRef?: React.RefObject<LottieRefCurrentProps | null>
    onClick: () => void
  }) => (
    <button
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onClick()
      }}
      onMouseEnter={() => {
        lottieRef?.current?.setSpeed(0.33)
        lottieRef?.current?.setDirection(1)
        lottieRef?.current?.goToAndPlay(0, true)
      }}
      onMouseLeave={() => {
        lottieRef?.current?.setSpeed(0.33)
        lottieRef?.current?.setDirection(-1)
        lottieRef?.current?.play()
      }}
      disabled={disabled}
      className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium transition-colors text-left ${
        disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center">
        {icon && <div className="w-4 h-4 mr-3 flex items-center justify-center opacity-70">{icon}</div>}
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-gray-400 text-xs tracking-wider">{shortcut}</span>}
    </button>
  )

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{ top: y, left: x }}
        className="fixed z-[70] w-44 bg-white/95 backdrop-blur-md rounded-lg border border-gray-100 shadow-panel py-1 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Item
          label="复制"
          shortcut="Ctrl+C"
          disabled={!hasSelection}
          lottieRef={copyLottieRef}
          icon={<Lottie lottieRef={copyLottieRef} animationData={copyAnim} autoplay={false} loop={false} />}
          onClick={handleCopy}
        />
        <Item
          label="剪切"
          shortcut="Ctrl+X"
          disabled={!hasSelection}
          icon={<img src="/src/assets/icons/scissors_line.svg" className="w-4 h-4 opacity-70" alt="cut" />}
          onClick={handleCut}
        />
        <Item
          label="粘贴"
          shortcut="Ctrl+V"
          disabled={!canPaste}
          icon={<img src="/src/assets/icons/paste_line.svg" className="w-4 h-4 opacity-70" alt="paste" />}
          onClick={handlePaste}
        />
      </motion.div>
    </AnimatePresence>
  )
}
