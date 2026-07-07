import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Select, ListBox, Input, Button } from '@heroui/react'
import { useSettingsStore, ChineseConvScheme } from '../../store/settingsStore'

const baseSchemeOptions = [
  { key: 's2t', label: '简体 → 繁体' },
  { key: 't2s', label: '繁体 → 简体' },
  { key: 's2tw', label: '简体 → 台湾繁体' },
  { key: 'tw2s', label: '台湾繁体 → 简体' },
  { key: 's2hk', label: '简体 → 香港繁体' },
  { key: 'hk2s', label: '香港繁体 → 简体' },
]

export default function ChineseConvSettings() {
  const { chineseConvSchemes, setChineseConvSchemes } = useSettingsStore()
  const [isCreating, setIsCreating] = useState(false)
  const [schemeName, setSchemeName] = useState('')
  const [baseScheme, setBaseScheme] = useState('s2t')
  const [pairs, setPairs] = useState<{ from: string; to: string }[]>([])
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')

  const handleAddPair = () => {
    if (fromInput.trim() === '') return
    setPairs([...pairs, { from: fromInput.trim(), to: toInput.trim() }])
    setFromInput('')
    setToInput('')
  }

  const handleRemovePair = (idx: number) => {
    setPairs(pairs.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    if (!schemeName.trim()) return
    const newScheme: ChineseConvScheme = {
      id: Date.now().toString(),
      name: schemeName.trim(),
      baseScheme,
      pairs,
    }
    setChineseConvSchemes([...chineseConvSchemes, newScheme])
    setIsCreating(false)
    setSchemeName('')
    setBaseScheme('s2t')
    setPairs([])
  }

  const handleDelete = (id: string) => {
    setChineseConvSchemes(chineseConvSchemes.filter(s => s.id !== id))
  }

  return (
    <div className="flex flex-col mt-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">自定义简繁转换方案</h2>
      </div>

      <div className="flex flex-col gap-2">
        {chineseConvSchemes.length === 0 && !isCreating && (
          <div className="text-sm text-gray-400 py-4 text-center bg-sf-panel/80 rounded-xl">
            暂无方案
          </div>
        )}

        {chineseConvSchemes.map(scheme => (
          <div key={scheme.id} className="flex items-center justify-between px-4 py-3 bg-sf-panel/80 rounded-xl group">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">{scheme.name}</span>
              <span className="text-xs text-gray-500">
                {baseSchemeOptions.find(o => o.key === scheme.baseScheme)?.label}
                {scheme.pairs.length > 0 && ` · ${scheme.pairs.length} 条替换`}
              </span>
            </div>
            <button
              onClick={() => handleDelete(scheme.id)}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all text-gray-400 hover:text-red-500"
              title="删除方案"
            >
              <img src="/src/assets/icons/close_line.svg" className="w-4 h-4 opacity-50" alt="删除" />
            </button>
          </div>
        ))}

        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 bg-sf-panel/80 rounded-xl p-5 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">方案名称</span>
                <Input
                  autoFocus
                  value={schemeName}
                  onChange={(e) => setSchemeName(e.target.value)}
                  placeholder="输入方案名称"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">基础方案</span>
                <Select
                  selectedKey={baseScheme}
                  onSelectionChange={(key) => {
                    const selected = Array.from(key as any)[0] || key
                    setBaseScheme(selected as string)
                  }}
                  className="w-full"
                >
                  <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-10 min-h-10 flex items-center px-4">
                    <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
                  </Select.Trigger>
                  <Select.Popover className="border border-gray-200 shadow-lg rounded-xl p-1">
                    <ListBox className="gap-1 p-0">
                      {baseSchemeOptions.map(opt => (
                        <ListBox.Item
                          key={opt.key}
                          id={opt.key}
                          textValue={opt.label}
                          className="rounded-lg text-sm font-medium text-gray-800 px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer"
                        >
                          {opt.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">自定义替换词</span>
                <div className="flex items-center gap-2">
                  <Input
                    value={fromInput}
                    onChange={(e) => setFromInput(e.target.value)}
                    placeholder="源词"
                    className="flex-1"
                  />
                  <span className="text-gray-400">→</span>
                  <Input
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    placeholder="目标词"
                    className="flex-1"
                  />
                  <Button onPress={handleAddPair}>添加</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pairs.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 text-sm text-gray-700 border border-gray-200">
                      <span>{p.from}</span>
                      <span className="text-gray-400">→</span>
                      <span>{p.to}</span>
                      <button
                        onClick={() => handleRemovePair(idx)}
                        className="ml-1 p-0.5 hover:bg-gray-100 rounded"
                      >
                        <img src="/src/assets/icons/close_line.svg" className="w-3 h-3 opacity-50" alt="删除" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onPress={() => {
                    setIsCreating(false)
                    setSchemeName('')
                    setBaseScheme('s2t')
                    setPairs([])
                  }}
                  className="bg-gray-100 text-gray-700"
                >
                  取消
                </Button>
                <Button onPress={handleSave}>保存</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center w-full px-4 py-3 bg-sf-panel/80 hover:bg-sf-item rounded-xl text-sm font-medium text-gray-700 transition-colors"
          >
            + 新建方案
          </button>
        )}
      </div>
    </div>
  )
}
