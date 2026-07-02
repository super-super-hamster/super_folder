import { useEffect } from 'react'
import { Button, Switch } from '@heroui/react'
import { usePrivacyStore } from '../../store/privacyStore'

export default function PrivacySettings() {
  const { state, load, requestPrivacyMode, lock, setRestoreOnStartup, verifyWindowsReset, openDialog } = usePrivacyStore()
  const isPrivacy = state?.mode === 'privacy'

  useEffect(() => {
    load().catch(console.error)
  }, [])

  const handleReset = async () => {
    const ok = await verifyWindowsReset()
    if (ok) openDialog('reset')
  }

  return (
    <div className="flex flex-col h-full space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">隐私</h2>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-sf-panel/80 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={`/src/assets/icons/${isPrivacy ? 'lock_line.svg' : 'unlock_line.svg'}`} className="w-6 h-6" alt="mode" />
            <div>
              <div className="text-sm font-semibold text-gray-800">当前模式</div>
              <div className="text-xs text-gray-500">{isPrivacy ? '隐私模式' : '公开模式'}</div>
            </div>
          </div>
          <Button className={isPrivacy ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-green-500 text-white hover:bg-green-600'} onPress={isPrivacy ? lock : requestPrivacyMode}>
            {isPrivacy ? '切换到公开模式' : '进入隐私模式'}
          </Button>
        </div>

        <div className="bg-sf-panel/80 rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800">启动时恢复上次隐私模式</div>
            <div className="text-xs text-gray-500">开启后，下次启动需要先解锁才会恢复隐私模式。</div>
          </div>
          <Switch isSelected={!!state?.restorePrivacyOnStartup} onChange={setRestoreOnStartup}>
            {({ isSelected }) => (
              <Switch.Content>
                <Switch.Control className={isSelected ? 'bg-green-500' : 'bg-gray-300'}>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            )}
          </Switch>
        </div>

        <div className="bg-sf-panel/80 rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800">忘记隐私密码</div>
            <div className="text-xs text-gray-500">{state?.windowsIdentityAvailable ? '通过 Windows 身份验证后才允许重设密码，保护标记不会被移除。' : '当前设备暂不支持 Windows 身份验证重设，保护标记不会被移除。'}</div>
          </div>
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300" isDisabled={!state?.hasPassword || !state?.windowsIdentityAvailable} onPress={handleReset}>
            重设密码
          </Button>
        </div>
      </div>
    </div>
  )
}
