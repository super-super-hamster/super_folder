import { useState, useEffect } from 'react'
import { Select, ListBox, Input } from '@heroui/react'
import { useBatchRenameStore } from '../../store/batchRenameStore'
import { GetRenameSchemes, BatchRenameFiles, CheckBatchRenameConflicts } from '../../../wailsjs/go/main/App'
import { rename } from '../../../wailsjs/go/models'
import { useUIStore } from '../../store/uiStore'
import { useModalStore } from '../../store/modalStore'
import { useTabsStore } from '../../store/tabsStore'
import { EventsOn } from '../../../wailsjs/runtime/runtime'

export default function BatchRenameView() {
  const { files, setFiles } = useBatchRenameStore()
  const { setTerminalOpen } = useUIStore()
  const { goBack } = useTabsStore()

  const [schemes, setSchemes] = useState<rename.Scheme[]>([])
  const [selectedSchemeName, setSelectedSchemeName] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [preview, setPreview] = useState<{ oldName: string; newName: string; path: string; error?: string }[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchSchemes = async () => {
    try {
      const result = await GetRenameSchemes()
      let finalSchemes = result || []
      
      if (finalSchemes.length === 0) {
        finalSchemes = [
          {
            name: '添加日期后缀',
            code: `const d = new Date();\nconst dateStr = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');\nreturn file.name + "_" + dateStr;`
          },
          {
            name: '添加日期前缀',
            code: `const d = new Date();\nconst dateStr = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');\nreturn dateStr + "_" + file.name;`
          },
          {
            name: '后缀数字补零对齐',
            code: `const match = file.name.match(/(\\d+)$/);\nif (!match) return file.name;\nconst numStr = match[1];\nlet maxLen = 0;\nfor (const f of files) {\n  const m = f.name.match(/(\\d+)$/);\n  if (m && m[1].length > maxLen) maxLen = m[1].length;\n}\nreturn file.name.substring(0, file.name.length - numStr.length) + numStr.padStart(maxLen, '0');`
          },
          {
            name: '前缀数字补零对齐',
            code: `const match = file.name.match(/^(\\d+)/);\nif (!match) return file.name;\nconst numStr = match[1];\nlet maxLen = 0;\nfor (const f of files) {\n  const m = f.name.match(/^(\\d+)/);\n  if (m && m[1].length > maxLen) maxLen = m[1].length;\n}\nreturn numStr.padStart(maxLen, '0') + file.name.substring(numStr.length);`
          }
        ]
      }

      setSchemes(finalSchemes)
      setSelectedSchemeName(prev => {
        if (!prev && finalSchemes.length > 0) {
          setCode(finalSchemes[0].code)
          return finalSchemes[0].name
        }
        if (prev) {
          const current = finalSchemes.find(s => s.name === prev)
          if (current) setCode(current.code)
        }
        return prev
      })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchSchemes()
    const cancel = EventsOn("schemes-changed", fetchSchemes)
    return () => cancel()
  }, [])

  useEffect(() => {
    if (selectedSchemeName) {
      if (selectedSchemeName === '__ADD_NEW__') {
        handleAddScheme()
        setSelectedSchemeName(schemes[0]?.name || '')
      } else {
        const scheme = schemes.find(s => s.name === selectedSchemeName)
        if (scheme) {
          setCode(scheme.code)
        }
      }
    }
  }, [selectedSchemeName, schemes])

  useEffect(() => {
    if (!code || files.length === 0) {
      setPreview([])
      return
    }

    const workerCode = `
      self.onmessage = function(e) {
        const { code, files } = e.data;
        try {
          let scriptToRun = code;
          if (code.includes('function rename')) {
            scriptToRun = code + '\\nreturn rename(file, index, files);';
          }
          const sandboxFunc = new Function('file', 'index', 'files', scriptToRun);
          
          // Strip ext from file.name so scripts see pure stem
          const cleanFiles = files.map(function(f) {
            var stem = f.name;
            if (f.ext && stem.endsWith(f.ext)) {
              stem = stem.slice(0, -f.ext.length);
            }
            return { name: stem, ext: f.ext, path: f.path, isDir: f.isDir, size: f.size };
          });

          const results = [];
          for (let i = 0; i < cleanFiles.length; i++) {
            const f = cleanFiles[i];
            try {
              const rawName = sandboxFunc(f, i, cleanFiles);
              if (typeof rawName !== 'string') {
                results.push({ error: '代码必须返回字符串' });
              } else if (rawName.trim() === '') {
                results.push({ error: '新名称不能为空' });
              } else {
                // Auto-append ext if the script result doesn't already end with it
                let newName = rawName;
                if (f.ext && !rawName.endsWith(f.ext)) {
                  newName = rawName + f.ext;
                }
                if (/[\\\\/:*?"<>|]/.test(newName)) {
                  results.push({ error: '名称包含非法字符' });
                } else {
                  results.push({ newName });
                }
              }
            } catch (err) {
              results.push({ error: '运行出错: ' + (err.message || String(err)) });
            }
          }
          self.postMessage({ type: 'success', results });
        } catch (err) {
          self.postMessage({ type: 'compile_error', error: '代码语法错误' });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    let timeoutId: number;

    worker.onmessage = (e) => {
      clearTimeout(timeoutId);
      const { type, results, error } = e.data;
      if (type === 'compile_error') {
        setPreview(files.map(f => ({ oldName: f.name, newName: '', path: f.path, error })));
      } else if (type === 'success') {
        const newPreview = [];
        const newNames = new Set<string>();
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const oldName = f.name;
          let resError = results[i].error || '';
          let newName = results[i].newName || '';

          if (!resError && newNames.has(newName)) {
            resError = '出现重复名称';
          }
          if (!resError) {
            newNames.add(newName);
          }
          newPreview.push({ oldName, newName, path: f.path, error: resError });
        }
        setPreview(newPreview);
      }
    };

    worker.postMessage({ code, files });

    timeoutId = window.setTimeout(() => {
      worker.terminate();
      setPreview(files.map(f => ({ oldName: f.name, newName: '', path: f.path, error: '执行超时(超过5秒)' })));
    }, 5000);

    return () => {
      worker.terminate();
      clearTimeout(timeoutId);
    };
  }, [code, files])

  const handleAddScheme = () => {
    setTerminalOpen(true)
    window.dispatchEvent(new CustomEvent('sf:triggerRenameAdd'))
  }

  const handleApply = async () => {
    if (preview.some(p => p.error)) return
    setIsProcessing(true)

    const operations: Record<string, string> = {}
    for (const p of preview) {
      if (p.oldName !== p.newName) {
        const lastSlash = p.path.lastIndexOf('\\')
        const dir = lastSlash >= 0 ? p.path.substring(0, lastSlash) : ''
        const newPath = dir ? `${dir}\\${p.newName}` : p.newName
        operations[p.path] = newPath
      }
    }

    try {
      const conflicts = await CheckBatchRenameConflicts(operations)
      if (conflicts && conflicts.length > 0) {
        useModalStore.getState().openModal('batch_rename_conflict', {
          conflicts,
          operations,
          onConfirm: async () => {
            setIsProcessing(true)
            try {
              await BatchRenameFiles(operations)
              goBack()
            } catch (e) {
              alert('重命名失败: ' + e)
            } finally {
              setIsProcessing(false)
            }
          }
        })
      } else {
        await BatchRenameFiles(operations)
        goBack()
      }
    } catch (e) {
      alert('重命名失败: ' + e)
    } finally {
      setIsProcessing(false)
    }
  }

  const hasErrors = preview.some(p => p.error)

  const handleRemoveFile = (pathToRemove: string) => {
    setFiles(files.filter(f => f.path !== pathToRemove))
  }

  return (
    <div className="flex w-full h-full bg-white relative items-center justify-center p-8 gap-8">
      {/* Left Container */}
      <div className="w-[400px] h-[600px] bg-sf-panel rounded-3xl p-6 overflow-y-auto flex flex-col gap-3 relative">
        {files.map(f => (
          <div key={f.path} className="bg-sf-item px-4 py-2 rounded-full flex items-center justify-between text-sm text-gray-800 transition-all hover:bg-sf-item-hover">
            <span className="truncate flex-1 font-medium">{f.name}</span>
            <button 
              onClick={() => handleRemoveFile(f.path)}
              className="text-gray-500 hover:text-gray-900 shrink-0 ml-3 text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
        {files.length === 0 && (
          <div className="text-gray-400 text-center mt-10">空</div>
        )}
      </div>

      {/* Middle Arrow & Scheme */}
      <div className="flex flex-col items-center justify-center gap-6">
        <button 
          onClick={handleApply}
          disabled={hasErrors || files.length === 0 || isProcessing}
          className="hover:opacity-80 transition-opacity disabled:opacity-30 cursor-pointer"
          title="点击执行重命名"
        >
          <img src="/src/assets/icons/large_arrow_right_fill.svg" className="w-16 h-16" alt="Apply" />
        </button>

        <div className="relative w-[180px] rounded-full ring-0">
          <Select 
            aria-label="选择方案"
            className="w-full"
            selectedKey={selectedSchemeName}
            onSelectionChange={(k) => {
              if (k === '__ADD_NEW__') {
                handleAddScheme()
                setSelectedSchemeName(schemes[0]?.name || '')
              } else if (k) {
                setSelectedSchemeName(k as string)
              }
            }}
          >
            <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-10 min-h-10 w-full flex items-center px-4 data-[hover=true]:bg-sf-input-hover">
              <Select.Value className="text-gray-800 font-medium text-center bg-transparent w-full truncate" />
            </Select.Trigger>
            <Select.Popover className="border border-gray-200 shadow-lg rounded-xl">
              <ListBox>
                  {schemes.map(s => (
                    <ListBox.Item key={s.name} id={s.name} textValue={s.name} className="text-gray-800 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">{s.name}</ListBox.Item>
                  ))}
                  <ListBox.Item key="__ADD_NEW__" id="__ADD_NEW__" textValue="新建方案..." className="text-gray-800 font-bold data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <img src="/src/assets/icons/add_line.svg" className="w-4 h-4" alt="Add" />
                    新建方案...
                  </div>
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      {/* Right Container */}
      <div className="w-[400px] h-[600px] bg-sf-panel rounded-3xl p-6 overflow-y-auto flex flex-col gap-3 relative">
        {preview.map((p, idx) => (
          <div 
            key={idx} 
            className={`px-4 py-2 rounded-full text-sm truncate flex items-center justify-between font-medium ${
              p.error ? 'bg-red-200 text-red-800' : 'bg-sf-item text-gray-800'
            }`}
            title={p.error || p.newName}
          >
            <span className="truncate">{p.newName || p.error || '(空)'}</span>
            {p.error && (
              <span className="text-red-600 text-xs shrink-0 ml-2 font-bold">!</span>
            )}
          </div>
        ))}
        {preview.length === 0 && (
          <div className="text-gray-400 text-center mt-10">空</div>
        )}
      </div>
    </div>
  )
}
