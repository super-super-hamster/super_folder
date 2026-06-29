import { useRef, useEffect } from 'react'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
import folderAnim from '../../assets/anim/folder.json'

const Lottie = (LottieLib as any).default || LottieLib

export default function AnimatedFolderIcon({ className = "w-16 h-16" }: { className?: string }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = containerRef.current?.closest('.group')
    if (!parent) return

    const handleMouseEnter = () => {
      lottieRef.current?.setDirection(1)
      lottieRef.current?.play()
    }
    const handleMouseLeave = () => {
      lottieRef.current?.setDirection(-1)
      lottieRef.current?.play()
    }

    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div ref={containerRef} className={`${className} pointer-events-none`}>
      <Lottie
        lottieRef={lottieRef}
        animationData={folderAnim}
        loop={false}
        autoplay={false}
      />
    </div>
  )
}
