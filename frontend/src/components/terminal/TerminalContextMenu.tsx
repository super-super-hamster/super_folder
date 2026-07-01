import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime/runtime'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
const Lottie = (LottieLib as any).default || LottieLib
import copyAnim from '../../assets/anim/copy.json'

interface TerminalContextMenuProps {
  term: any
  visible: boolean
  x: number
  y: number
  onClose: () => void
}

export default function TerminalContextMenu({ term, visible, x, y, onClose }: TerminalContextMenuProps) {
  const [canPaste, setCanPaste] = useState(false)
  const copyLottieRef = useRef<LottieRefCurrentProps>(null)

  useEffect(() => {
    if (!visible) return
    ClipboardGetText().then((text: string) => {
      setCanPaste(text.length > 0)
    }).catch(() => setCanPaste(false))
  }, [visible])

  const handleCopy = async () => {
    if (!term) return
    if (term.hasSelection()) {
      const text = term.getSelection()
      await ClipboardSetText(text)
      term.clearSelection()
    }
    onClose()
  }

  const handlePaste = async () => {
    if (!term) return
    try {
      const text = await ClipboardGetText()
      if (text) {
        term.paste(text)
      }
    } catch (e) {
      console.error(e)
    }
    onClose()
  }

  if (!visible) return null

  const menuWidth = 120
  const menuHeight = 90
  let posX = x
  let posY = y
  if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 10
  if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 10
  if (posX < 10) posX = 10
  if (posY < 10) posY = 10

  const hasSelection = term?.hasSelection() || false

  const Item = ({ label, disabled, icon, lottieRef, onClick }: {
    label: string
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
      className={`flex items-center w-full px-3 py-2 text-sm font-medium transition-colors text-left ${
        disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 hover:bg-gray-100'
      }`}
    >
      {icon && <div className="w-4 h-4 mr-3 flex items-center justify-center opacity-70">{icon}</div>}
      <span>{label}</span>
    </button>
  )

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{ top: posY, left: posX }}
        className="fixed z-[80] w-32 bg-white/95 backdrop-blur-md rounded-lg border border-gray-100 shadow-panel py-1 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Item
          label="复制"
          disabled={!hasSelection}
          lottieRef={copyLottieRef}
          icon={<Lottie lottieRef={copyLottieRef} animationData={copyAnim} autoplay={false} loop={false} />}
          onClick={handleCopy}
        />
        <Item
          label="粘贴"
          disabled={!canPaste}
          icon={<img src="/src/assets/icons/paste_line.svg" className="w-4 h-4 opacity-70" alt="paste" />}
          onClick={handlePaste}
        />
      </motion.div>
    </AnimatePresence>
  )
}
