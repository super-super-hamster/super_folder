import { useRef, useEffect } from 'react'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
import documentAnim from '../../assets/anim/document.json'

const Lottie = (LottieLib as any).default || LottieLib

export default function AnimatedDocumentIcon({ className = "w-16 h-16" }: { className?: string }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isHoveringRef = useRef(false)

  useEffect(() => {
    const parent = containerRef.current?.closest('.group')
    if (!parent) return

    const handleMouseEnter = () => {
      isHoveringRef.current = true
      lottieRef.current?.setDirection(1)
      const anim = lottieRef.current?.animationItem
      if (anim && anim.currentFrame >= anim.totalFrames - 1) {
        lottieRef.current?.goToAndPlay(0)
      } else {
        lottieRef.current?.play()
      }
    }

    const handleMouseLeave = () => {
      isHoveringRef.current = false
      lottieRef.current?.setDirection(1)
      lottieRef.current?.play()
    }

    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const handleEnterFrame = (e: any) => {
    if (isHoveringRef.current) return
    const anim = lottieRef.current?.animationItem
    if (!anim) return

    const current = e.currentTime
    const total = e.totalTime
    const half = total / 2

    if (current >= half && current < half + 2) {
      anim.pause()
    }
  }

  return (
    <div ref={containerRef} className={`${className} pointer-events-none`}>
      <Lottie
        lottieRef={lottieRef}
        animationData={documentAnim}
        loop={false}
        autoplay={false}
        onEnterFrame={handleEnterFrame}
        onComplete={() => {
          if (isHoveringRef.current) {
            lottieRef.current?.goToAndPlay(0)
          }
        }}
      />
    </div>
  )
}
