import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { InputOTP, REGEXP_ONLY_DIGITS_AND_CHARS } from '@heroui/react'
import { usePrivacyStore } from '../../store/privacyStore'

const PASSWORD_LENGTH = 6

export default function PrivacyStartupGate() {
  const { dialogMode, unlock, lock, loading, error } = usePrivacyStore()
  const [password, setPassword] = useState('')
  const inputWrapRef = useRef<HTMLDivElement>(null)
  const isOpen = dialogMode === 'startupUnlock'

  useEffect(() => {
    if (!isOpen) setPassword('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const timer = window.setTimeout(() => {
      window.focus()
      inputWrapRef.current?.querySelector('input')?.focus()
    }, 100)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && password.length === PASSWORD_LENGTH && !loading) {
      unlock(password).catch(() => setPassword(''))
    }
  }, [isOpen, password, loading])

  if (!isOpen) return null

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && password.length === PASSWORD_LENGTH && !loading) {
      e.preventDefault()
      unlock(password).catch(() => setPassword(''))
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-8 wails-no-drag">
      <style>{`.startup-otp [data-slot="input-otp-slot-value"]{color:transparent;position:relative}.startup-otp [data-slot="input-otp-slot-value"]::after{content:"*";color:#111827;position:absolute;inset:0;display:flex;align-items:center;justify-content:center}`}</style>
      <img src="/src/assets/appIcon.png" className="w-[21rem] h-[21rem] object-contain" alt="Super Folder" />
      <div ref={inputWrapRef} className="flex flex-col items-center gap-3">
        <InputOTP
          autoFocus
          className="startup-otp justify-center gap-2 overflow-visible"
          inputMode="text"
          isInvalid={!!error}
          maxLength={PASSWORD_LENGTH}
          pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
          value={password}
          onChange={setPassword}
          onKeyDown={handleKeyDown as any}
        >
          <InputOTP.Group className="gap-2">
            {Array.from({ length: PASSWORD_LENGTH }).map((_, index) => (
              <InputOTP.Slot key={index} index={index} className="size-11" />
            ))}
          </InputOTP.Group>
        </InputOTP>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={() => lock()}
          className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none mt-2"
        >
          以公开模式进入&gt;
        </button>
      </div>
    </div>
  )
}
