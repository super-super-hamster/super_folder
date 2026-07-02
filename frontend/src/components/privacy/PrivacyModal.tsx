import { KeyboardEvent, useEffect, useState } from 'react'
import { Button, InputOTP, Modal, REGEXP_ONLY_DIGITS_AND_CHARS } from '@heroui/react'
import { usePrivacyStore } from '../../store/privacyStore'

const PASSWORD_LENGTH = 6

function OtpInput({
  value,
  onChange,
  invalid,
  autoFocus = false,
  onKeyDown
}: {
  value: string
  onChange: (value: string) => void
  invalid: boolean
  autoFocus?: boolean
  onKeyDown?: (e: KeyboardEvent) => void
}) {
  return (
    <InputOTP
      autoFocus={autoFocus}
      className="privacy-otp justify-center gap-2 overflow-visible"
      inputMode="text"
      isInvalid={invalid}
      maxLength={PASSWORD_LENGTH}
      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown as any}
    >
      <InputOTP.Group className="gap-2">
        {Array.from({ length: PASSWORD_LENGTH }).map((_, index) => (
          <InputOTP.Slot key={index} index={index} className="size-10" />
        ))}
      </InputOTP.Group>
    </InputOTP>
  )
}

export default function PrivacyModal() {
  const { dialogMode, closeDialog, setup, unlock, resetPassword, loading, error } = usePrivacyStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [focusConfirm, setFocusConfirm] = useState(false)
  const isSetup = dialogMode === 'setup' || dialogMode === 'reset'
  const isUnlock = dialogMode === 'unlock'
  const isOpen = dialogMode === 'setup' || dialogMode === 'unlock' || dialogMode === 'reset'

  useEffect(() => {
    setPassword('')
    setConfirm('')
    setFocusConfirm(false)
  }, [dialogMode, error])

  useEffect(() => {
    if (isUnlock && password.length === PASSWORD_LENGTH && !loading) {
      handleSubmit()
    }
  }, [isUnlock, password, loading])

  if (!isOpen) return null

  const title = dialogMode === 'unlock' ? '进入隐私模式' : dialogMode === 'reset' ? '重设隐私密码' : '设置隐私密码'
  const description = dialogMode === 'unlock' ? '请输入密码' : '请设置 6 位数字或字母密码。'
  const canSubmit = password.length === PASSWORD_LENGTH && (!isSetup || confirm.length === PASSWORD_LENGTH)

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'unlock') {
        await unlock(password)
      } else if (dialogMode === 'reset') {
        await resetPassword(password, confirm)
      } else {
        await setup(password, confirm)
      }
    } catch (_) {}
  }

  const handlePasswordKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && isSetup && password.length === PASSWORD_LENGTH) {
      e.preventDefault()
      setFocusConfirm(true)
    }
  }

  const handleConfirmKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit && !loading) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (isSetup && value.length === PASSWORD_LENGTH) {
      setFocusConfirm(true)
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && closeDialog()} variant="blur" className="bg-black/10">
        <Modal.Container placement="center">
          <Modal.Dialog className="rounded-2xl shadow-panel w-[460px] overflow-visible">
            <style>{`.privacy-otp [data-slot="input-otp-slot-value"]{color:transparent;position:relative}.privacy-otp [data-slot="input-otp-slot-value"]::after{content:"*";color:#111827;position:absolute;inset:0;display:flex;align-items:center;justify-content:center}`}</style>
            <Modal.Header className="flex items-center gap-2 justify-center mt-2 text-gray-900">
              <img src={`/src/assets/icons/${dialogMode === 'unlock' ? 'lock_line.svg' : 'unlock_line.svg'}`} className="w-6 h-6" alt="privacy" />
              {title}
            </Modal.Header>
            <Modal.Body className="items-center gap-5 overflow-visible px-8">
              <p className="text-sm text-gray-500 text-center mb-2">{description}</p>
              <div className="flex flex-col gap-2 items-center">
                {isSetup && <span className="text-sm font-medium text-gray-700">输入密码</span>}
                <OtpInput value={password} onChange={handlePasswordChange} invalid={!!error} autoFocus onKeyDown={handlePasswordKeyDown} />
              </div>
              {isSetup && (
                <div className="flex flex-col gap-2 items-center">
                  <span className="text-sm font-medium text-gray-700">再次输入密码</span>
                  <OtpInput key={focusConfirm ? 'confirm-focused' : 'confirm'} value={confirm} onChange={setConfirm} invalid={!!error} autoFocus={focusConfirm} onKeyDown={handleConfirmKeyDown} />
                </div>
              )}
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            </Modal.Body>
            {!isUnlock && (
              <Modal.Footer className="w-full">
                <Button className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300" onPress={closeDialog}>
                  取消
                </Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" isDisabled={!canSubmit || loading} onPress={handleSubmit}>
                  确认
                </Button>
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
