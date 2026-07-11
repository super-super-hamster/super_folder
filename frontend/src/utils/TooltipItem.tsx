import { useState, useRef, ReactNode } from 'react'
import { Tooltip } from '@heroui/react'

export function TooltipItem({ children, content, placement = 'top', delay = 500 }: { children: ReactNode, content: string, placement?: string, delay?: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  return (
    <Tooltip delay={delay} isOpen={isOpen}>
      <span
        ref={triggerRef}
        style={{ display: 'inline-block' }}
        onPointerOver={() => {
          clearTimeout(hideTimer.current)
          if (delay > 0) hideTimer.current = setTimeout(() => setIsOpen(true), delay)
          else setIsOpen(true)
        }}
        onPointerOut={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            clearTimeout(hideTimer.current)
            hideTimer.current = setTimeout(() => setIsOpen(false), 100)
          }
        }}
      >
        {children}
      </span>
      <Tooltip.Content placement={placement as any} triggerRef={triggerRef}>{content}</Tooltip.Content>
    </Tooltip>
  )
}
