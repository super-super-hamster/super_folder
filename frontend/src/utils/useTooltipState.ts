import { useState, useRef, useCallback, useEffect } from 'react'

export function useTooltipState(delay = 0) {
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const triggerRef = useRef<HTMLElement>(null!)

  const show = useCallback(() => {
    clearTimeout(timerRef.current)
    if (delay > 0) timerRef.current = setTimeout(() => setIsOpen(true), delay)
    else setIsOpen(true)
  }, [delay])

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setIsOpen(false)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return {
    isOpen,
    triggerRef,
    triggerProps: {
      onPointerEnter: show,
      onPointerLeave: hide,
      onFocus: show,
      onBlur: hide,
    }
  }
}
