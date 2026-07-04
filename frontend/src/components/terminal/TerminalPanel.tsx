import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { motion } from 'framer-motion'
import EditorLib from 'react-simple-code-editor'
const Editor = (EditorLib as any).default || EditorLib
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-go'
import { EventsOn, EventsEmit } from '../../../wailsjs/runtime'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { useState } from 'react'
import { SaveRenameScheme, GetRenameSchemes, DeleteRenameScheme } from '../../../wailsjs/go/main/App'
import { RENAME_SCHEME_TEMPLATE } from '../../utils/renameSchemeTemplate'
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime/runtime'
import TerminalContextMenu from './TerminalContextMenu'


interface TerminalPanelProps {
  onClose?: () => void
}

export default function TerminalPanel({ onClose }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const { terminalPanelHeight, setTerminalPanelHeight, isTerminalOpen } = useUIStore()
  const [isResizing, setIsResizing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })

  const [editorMode, setEditorMode] = useState<'none' | 'editing' | 'prompt'>('none')
  const [editorName, setEditorName] = useState('')
  const [editorCode, setEditorCode] = useState('')
  const [editorOriginalCode, setEditorOriginalCode] = useState('')

  const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      // Calculate height from bottom of window.
      // The cursor y position from bottom is: window.innerHeight - e.clientY
      // We subtract some padding (e.g., 12px for gap) if necessary, but window.innerHeight - e.clientY is roughly the height.
      const newHeight = window.innerHeight - e.clientY - 12
      const clampedHeight = Math.min(Math.max(newHeight, 150), window.innerHeight * 0.8)
      setTerminalPanelHeight(clampedHeight)
    }
    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setTerminalPanelHeight])

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#ffffff', // white
        foreground: '#1f2937', // slate-800
        cursor: '#1f2937',
        selectionBackground: '#e2e8f0',
        // Adjust ANSI colors for light background visibility
        yellow: '#b45309', // darker yellow
        green: '#15803d', // darker green
        cyan: '#0e7490',
        blue: '#1d4ed8',
        magenta: '#a21caf',
        red: '#b91c1c',
        brightYellow: '#b45309',
        brightGreen: '#15803d',
        brightCyan: '#0e7490',
        brightBlue: '#1d4ed8',
        brightMagenta: '#a21caf',
        brightRed: '#b91c1c',
        white: '#1f2937',
        brightWhite: '#1f2937',
        black: '#f8fafc',
        brightBlack: '#cbd5e1'
      }
    })
    
    const fitAddon = new FitAddon()
    fitAddonRef.current = fitAddon
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    xtermRef.current = term
    
    terminalRef.current.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault()
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY })
    })
    terminalRef.current.addEventListener('click', () => {
      closeContextMenu()
    })
    
    // Only fit if currently open to prevent shrinking to 1 row and causing ConPTY blank lines
    if (useUIStore.getState().isTerminalOpen) {
      fitAddon.fit()
    }

    let sfMode = false
    let sfState = 'cmd' // 'cmd' | 'rename_name'
    let sfRenameName = ""
    let sfBuffer = ""
    let cmdRawBuffer = ""
    let currentSfPath = ""
    let syncRemaining = 0
    let syncBuffer = ""
    let sfHistory: string[] = []
    let sfHistoryIndex = 0
    let sfCursorOffset = 0

    term.attachCustomKeyEventHandler((e) => {
      // Handle Ctrl+Enter directly to close terminal without bubbling to App.tsx
      if (e.ctrlKey && e.code === 'Enter' && e.type === 'keydown') {
        e.preventDefault()
        e.stopPropagation()
        useUIStore.getState().setTerminalOpen(false)
        return false // Prevent xterm from capturing it further
      }

      // In SF mode, Ctrl+C cancels the current operation (rename etc.)
      if (e.ctrlKey && e.code === 'KeyC' && e.type === 'keydown' && sfMode) {
        e.preventDefault()
        e.stopPropagation()
        if (sfState === 'rename_name') {
          sfState = 'cmd'
          sfBuffer = ''
          sfRenameName = ''
          sfCursorOffset = 0
          term.write('\r\n\x1b[33m[取消] 已取消新建方案\x1b[0m\r\n')
          term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
        } else {
          sfBuffer = ''
          sfCursorOffset = 0
          sfHistoryIndex = sfHistory.length
          term.write(`^C\r\n\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
        }
        return false
      }
      return true
    })


    // Handle input from user
    const onDataDisposable = term.onData((data) => {
      if (sfMode) {
        if (sfState === 'rename_name') {
          if (data === '\x1b') { // ESC
            sfState = 'cmd'
            sfBuffer = ''
            sfRenameName = ''
            sfCursorOffset = 0
            term.write('\r\n\x1b[33m[取消] 已取消新建方案\x1b[0m\r\n')
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
            return
          } else if (data === '\r') {
            const cmd = sfBuffer.trim()
            if (cmd === '') {
              term.write('\r\n\x1b[31m[错误] 名称不能为空\x1b[0m\r\n')
              term.write('\x1b[36m名称：\x1b[0m ')
              sfBuffer = ''
              sfCursorOffset = 0
              return
            }
            GetRenameSchemes().then(async (existing) => {
              const list = existing || []
              const lower = cmd.toLowerCase()
              const dup = list.find(s => s.name.toLowerCase() === lower)
              if (dup) {
                term.write(`\r\n\x1b[31m[错误] 方案 '${cmd}' 已存在，请重新输入\x1b[0m\r\n`)
                term.write('\x1b[36m名称：\x1b[0m ')
                sfBuffer = ''
                sfRenameName = ''
                sfCursorOffset = 0
                return
              }
              sfRenameName = cmd
              try {
                const schemes = await GetRenameSchemes()
                const existingScheme = schemes.find(s => s.name === cmd)
                const savePath = existingScheme?.path || `${cmd}.js`
                await SaveRenameScheme(cmd, RENAME_SCHEME_TEMPLATE(savePath))
                const refreshed = await GetRenameSchemes()
                const scheme = refreshed.find(s => s.name === cmd)
                if (scheme) {
                  setEditorName(scheme.name)
                  setEditorCode(scheme.code)
                  setEditorOriginalCode(scheme.code)
                  setEditorMode('editing')
                } else {
                  term.write(`\r\n\x1b[32m[成功] 方案 '${cmd}' 已创建\x1b[0m\r\n`)
                }
              } catch (e: any) {
                term.write(`\r\n\x1b[31m[错误] ${e?.message || String(e)}\x1b[0m\r\n`)
                sfState = 'cmd'
                sfBuffer = ''
                sfRenameName = ''
                sfCursorOffset = 0
                term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
              }
            }).catch((e: any) => {
              term.write(`\r\n\x1b[31m[错误] ${e?.message || String(e)}\x1b[0m\r\n`)
              term.write('\x1b[36m名称：\x1b[0m ')
              sfBuffer = ''
              sfRenameName = ''
              sfCursorOffset = 0
            })
            return
          } else if (data === '\x7f') {
            if (sfBuffer.length > 0) {
              sfBuffer = sfBuffer.slice(0, -1)
              term.write('\b \b')
            }
            return
          } else if (!data.startsWith('\x1b')) {
            sfBuffer += data
            term.write(data)
            return
          }
          return
        }

        const redrawLine = () => {
          const prompt = `\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `
          term.write(`\x1b[2K\r${prompt}${sfBuffer}`)
          if (sfCursorOffset > 0) {
            term.write(`\x1b[${sfCursorOffset}D`)
          }
        }


        // Simple line editor for SF Mode
        if (data === '\r') { // Enter
          term.write('\r\n')
          const cmd = sfBuffer.trim()
          
          if (sfState === 'cmd' && cmd !== '') {
            if (sfHistory.length === 0 || sfHistory[sfHistory.length - 1] !== cmd) {
              sfHistory.push(cmd)
            }
          }
          sfHistoryIndex = sfHistory.length
          sfCursorOffset = 0

        const parts = cmd.trim().split(/\s+/).filter(Boolean)
        const mainCmd = parts.length > 0 ? parts[0] : ''
        const subCmd = parts.length > 1 ? parts[1] : ''
        const arg = parts.length > 2 ? parts.slice(2).join(' ') : ''

        const getSfCommandArg = (input: string, prefixTokens: string[]) => {
          const tokens = input.trim().split(/\s+/).filter(Boolean)
          if (tokens.length < prefixTokens.length) return ''
          for (let i = 0; i < prefixTokens.length; i++) {
            if (tokens[i] !== prefixTokens[i]) return ''
          }
          return tokens.slice(prefixTokens.length).join(' ')
        }

        if (sfState === 'rename_name') {
          return
        }

        if (cmd === '@cmd') {
          sfMode = false
          sfBuffer = ""
          syncRemaining = 1
          syncBuffer = ""
          term.write('\x1b[0m')
          EventsEmit('terminal:input', '\x1b')
          EventsEmit('terminal:input', '\r')
        } else if (mainCmd === 'rename' && subCmd === 'add') {
          sfState = 'rename_name'
          sfBuffer = ''
          term.write('\x1b[36m名称：\x1b[0m ')
          return
        } else if (mainCmd === 'rename' && subCmd === 'show') {
          GetRenameSchemes().then((schemes) => {
            const list = schemes || []
            if (list.length === 0) {
              term.write('\x1b[33m[提示] 暂无重命名方案\x1b[0m\r\n')
            } else {
              term.write('\x1b[36m重命名方案列表：\x1b[0m\r\n')
              list.forEach((s) => {
                term.write(`  - ${s.name}\r\n`)
              })
            }
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
          }).catch((e: any) => {
            term.write(`\x1b[31m[错误] ${e?.message || String(e)}\x1b[0m\r\n`)
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
          })
          sfBuffer = ''
          return
        } else if (mainCmd === 'rename' && subCmd === 'edit') {
          const name = getSfCommandArg(cmd, ['rename', 'edit'])
          if (!name) {
            term.write('\x1b[31m[错误] 请输入方案名称\x1b[0m\r\n')
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
            sfBuffer = ''
            return
          }
          if (name.includes(' ')) {
            term.write('\x1b[31m[错误] 方案名称不能包含空格\x1b[0m\r\n')
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
            sfBuffer = ''
            return
          }
          GetRenameSchemes().then((schemes) => {
            const list = schemes || []
            const target = list.find((s) => s.name.toLowerCase() === name.toLowerCase())
            if (!target) {
              term.write(`\x1b[31m[错误] 方案 '${name}' 不存在\x1b[0m\r\n`)
              term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
              return
            }
            setEditorName(target.name)
            setEditorCode(target.code)
            setEditorOriginalCode(target.code)
            setEditorMode('editing')
          }).catch((e: any) => {
            term.write(`\x1b[31m[错误] ${e?.message || String(e)}\x1b[0m\r\n`)
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
          })
          sfBuffer = ''
          return
        } else if (mainCmd === 'rename' && subCmd === 'delete') {
          const name = getSfCommandArg(cmd, ['rename', 'delete'])
          if (!name) {
            term.write('\x1b[31m[错误] 请输入方案名称\x1b[0m\r\n')
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
            sfBuffer = ''
            return
          }
          if (name.includes(' ')) {
            term.write('\x1b[31m[错误] 方案名称不能包含空格\x1b[0m\r\n')
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
            sfBuffer = ''
            return
          }
          DeleteRenameScheme(name).then(() => {
            term.write(`\x1b[32m[成功] 方案 '${name}' 已删除\x1b[0m\r\n`)
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
          }).catch((e: any) => {
            term.write(`\x1b[31m[错误] ${e?.message || String(e)}\x1b[0m\r\n`)
            term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
          })
          sfBuffer = ''
          return
        } else {
          if (cmd.length > 0) {
            // We could also pass currentSfPath to the backend if needed
            EventsEmit('terminal:sf:command', cmd)
          }
          sfBuffer = ""
          term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
        }
        } else if (data === '\x1b[A') { // Up arrow
          if (sfState === 'cmd' && sfHistoryIndex > 0) {
            sfHistoryIndex--
            sfBuffer = sfHistory[sfHistoryIndex]
            sfCursorOffset = 0
            redrawLine()
          }
        } else if (data === '\x1b[B') { // Down arrow
          if (sfState === 'cmd' && sfHistoryIndex < sfHistory.length) {
            sfHistoryIndex++
            if (sfHistoryIndex === sfHistory.length) {
              sfBuffer = ""
            } else {
              sfBuffer = sfHistory[sfHistoryIndex]
            }
            sfCursorOffset = 0
            redrawLine()
          }
        } else if (data === '\x1b[D') { // Left arrow
          if (sfCursorOffset < sfBuffer.length) {
            sfCursorOffset++
            term.write('\x1b[D')
          }
        } else if (data === '\x1b[C') { // Right arrow
          if (sfCursorOffset > 0) {
            sfCursorOffset--
            term.write('\x1b[C')
          }
        } else if (data === '\x7f') { // Backspace
          if (sfBuffer.length > sfCursorOffset) {
            const pos = sfBuffer.length - sfCursorOffset
            sfBuffer = sfBuffer.slice(0, pos - 1) + sfBuffer.slice(pos)
            redrawLine()
          }
        } else if (data === '\x03') { // Ctrl+C
          sfBuffer = ""
          sfCursorOffset = 0
          sfHistoryIndex = sfHistory.length
          term.write(`^C\r\n\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
        } else if (data === '\t') { // Tab
          const pos = sfBuffer.length - sfCursorOffset
          if (sfBuffer.slice(0, pos).endsWith('@here')) {
            const tabsState = useTabsStore.getState()
            const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeTabId)
            let cp = activeTab?.currentPath || ''
            cp = cp.startsWith('favorite://') || cp.startsWith('recent://') ? '' : cp
            
            if (cp) {
              const toInsert = `"${cp}"`
              sfBuffer = sfBuffer.slice(0, pos - 5) + toInsert + sfBuffer.slice(pos)
              redrawLine()
            }
          }
        } else {
          if (data.startsWith('\x1b')) return // ignore other ansi
          // If user was browsing history, reset to latest and start fresh input
          if (sfHistoryIndex !== sfHistory.length) {
            sfHistoryIndex = sfHistory.length
            sfBuffer = ""
          }
          const pos = sfBuffer.length - sfCursorOffset
          sfBuffer = sfBuffer.slice(0, pos) + data + sfBuffer.slice(pos)
          redrawLine()
        }
      } else {
        // CMD Mode
        if (data === '\t' && cmdRawBuffer.endsWith('@here')) {
          const tabsState = useTabsStore.getState()
          const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeTabId)
          let cp = activeTab?.currentPath || ''
          cp = cp.startsWith('favorite://') || cp.startsWith('recent://') ? '' : cp
          
          if (cp) {
            EventsEmit('terminal:input', '\x7f\x7f\x7f\x7f\x7f')
            cmdRawBuffer = cmdRawBuffer.slice(0, -5)
            const toInsert = `"${cp}"`
            EventsEmit('terminal:input', toInsert)
            cmdRawBuffer += toInsert
            return
          }
        }
        
        if (data.includes('\r')) {
          const parts = data.split('\r')
          if ((cmdRawBuffer + parts[0]).trim() === '@sf') {
            sfMode = true
            sfBuffer = ""
            cmdRawBuffer = ""
            
            // Extract path from the prompt on screen
            const activeBuffer = term.buffer.active
            const line = activeBuffer.getLine(activeBuffer.cursorY + activeBuffer.baseY)
            const lineText = line?.translateToString(true) || ''
            const promptParts = lineText.split('>')
            
            if (promptParts.length >= 2 && promptParts[0].includes('@cmd')) {
              currentSfPath = promptParts[0].replace('@cmd', '').trim()
            } else {
              // fallback to tabsStore
              const tabsState = useTabsStore.getState()
              const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeTabId)
              const cp = activeTab?.currentPath || ''
              currentSfPath = cp.startsWith('favorite://') || cp.startsWith('recent://') ? '' : cp
            }

            term.write('\x1b[0m') // Reset ANSI to prevent color bleeding
            // Send Escape to PowerShell to clear whatever was typed
            EventsEmit('terminal:input', '\x1b')
            term.write(`\r\n\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
            return // Do NOT send this input to powershell
          }
          cmdRawBuffer = "" // Reset on enter
        } else if (data === '\x7f' || data === '\b') {
          cmdRawBuffer = cmdRawBuffer.slice(0, -1)
        } else if (!data.includes('\x1b')) {
          cmdRawBuffer += data
        } else {
          cmdRawBuffer = "" // Invalidate on arrow keys or complex ANSI sequences
        }
        
        EventsEmit('terminal:input', data)
      }
    })

    // Handle resize
    const handleResize = () => {
      if (useUIStore.getState().isTerminalOpen) {
        fitAddon.fit()
        EventsEmit('terminal:resize', { cols: term.cols, rows: term.rows })
      }
    }
    window.addEventListener('resize', handleResize)
    // Initial resize to inform backend
    setTimeout(() => {
      EventsEmit('terminal:resize', { cols: term.cols, rows: term.rows })
    }, 100)

    // Handle output from backend
    const unsubscribeOutput = EventsOn('terminal:output', (data: string) => {
      if (sfMode) {
        return // Drop PTY output during sfMode since we do local echo
      }
      
      if (syncRemaining > 0) {
        syncBuffer += data
        const promptCount = (syncBuffer.match(/@cmd/g) || []).length
        if (promptCount >= syncRemaining) {
          syncRemaining = 0
          const idx = syncBuffer.lastIndexOf('@cmd')
          const promptText = syncBuffer.substring(idx)
          syncBuffer = ""
          term.write(promptText)
        }
        return
      }
      term.write(data)
    })

    // Handle mode changes or custom clear
    const unsubscribeClear = EventsOn('terminal:clear', () => {
      term.clear()
    })
    
    const unsubscribeSfMode = EventsOn('terminal:mode:sf', () => {
      sfMode = true
      sfBuffer = ""
      sfState = 'cmd'
    })

    const handleTriggerRenameAdd = () => {
      if (!sfMode) {
        sfMode = true
        sfBuffer = 'rename add'
        sfState = 'cmd'
        cmdRawBuffer = ''
        term.write('\x1b[0m') // Reset ANSI
        EventsEmit('terminal:input', '\x1b') // Escape to clear any ghost buffer in PS
        term.write(`\r\n\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> rename add`)
      } else {
        sfState = 'cmd'
        sfBuffer = 'rename add'
        term.write(`\x1b[2K\r\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> rename add`)
      }
    }
    window.addEventListener('sf:triggerRenameAdd', handleTriggerRenameAdd)

    // Focus terminal on load
    term.focus()

    // Notify backend to start/sync directory if needed
    const tabsState = useTabsStore.getState()
    const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeTabId)
    const currentPath = activeTab?.currentPath || ''
    const dirPath = currentPath.startsWith('favorite://') || currentPath.startsWith('recent://') ? '' : currentPath
    // Wait for bindings to be available
    setTimeout(() => {
      if ((window as any).go?.main?.App?.StartTerminal) {
        (window as any).go.main.App.StartTerminal(dirPath).catch(console.error)
      }
    }, 100)

    return () => {
      if (onDataDisposable) onDataDisposable.dispose()
      window.removeEventListener('sf:triggerRenameAdd', handleTriggerRenameAdd)
      window.removeEventListener('resize', handleResize)
      unsubscribeOutput()
      unsubscribeClear()
      unsubscribeSfMode()
      term.dispose()
    }
  }, [])

  // Call fitAddon when terminal panel height changes
  useEffect(() => {
    if (!fitAddonRef.current) return
    const fit = () => {
      if (!isTerminalOpen) return
      fitAddonRef.current?.fit()
      if (xtermRef.current) {
        EventsEmit('terminal:resize', { cols: xtermRef.current.cols, rows: xtermRef.current.rows })
      }
    }
    // Initial fit after panel opens
    const t1 = setTimeout(fit, 50)
    // Re-fit after animation completes
    const t2 = setTimeout(fit, 250)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [terminalPanelHeight, isTerminalOpen])

  const highlightCode = (codeToHighlight: string) => {
    try {
      if (Prism.languages.javascript) {
        return Prism.highlight(codeToHighlight, Prism.languages.javascript, 'javascript')
      }
      return codeToHighlight
    } catch (e) {
      return codeToHighlight
    }
  }

  const exitEditor = () => {
    setEditorMode('none')
    setEditorName('')
    setEditorCode('')
    setEditorOriginalCode('')
  }

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && editorMode === 'editing') {
      e.preventDefault()
      setEditorMode('prompt')
    }
  }

  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (editorMode !== 'prompt') return
    const key = e.key.toLowerCase()
    if (key === 'y') {
      SaveRenameScheme(editorName, editorCode).then(() => {
        exitEditor()
        const term = xtermRef.current
        if (term) {
          term.write('\x1b[32m[成功] 方案已保存\x1b[0m\r\n')
          term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${useTabsStore.getState().tabs.find(t => t.id === useTabsStore.getState().activeTabId)?.currentPath || ''}> `)
        }
      }).catch((err: any) => {
        const term = xtermRef.current
        if (term) {
          term.write(`\x1b[31m[错误] ${err?.message || String(err)}\x1b[0m\r\n`)
          term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${useTabsStore.getState().tabs.find(t => t.id === useTabsStore.getState().activeTabId)?.currentPath || ''}> `)
        }
        exitEditor()
      })
    } else if (key === 'n') {
      exitEditor()
      const term = xtermRef.current
      if (term) {
        term.write('\x1b[33m[取消] 未保存方案\x1b[0m\r\n')
        term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${useTabsStore.getState().tabs.find(t => t.id === useTabsStore.getState().activeTabId)?.currentPath || ''}> `)
      }
    }
  }

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={
        isTerminalOpen 
          ? { height: terminalPanelHeight, opacity: 1, display: 'block' } 
          : { height: 0, opacity: 0, transitionEnd: { display: 'none' } }
      }
      exit={{ height: 0, opacity: 0, transitionEnd: { display: 'none' } }}
      transition={{ duration: isResizing ? 0 : 0.2 }}
      className="w-full relative z-10 flex-shrink-0"
      style={isTerminalOpen ? { minHeight: '150px' } : { height: 0, overflow: 'hidden' }}
    >
      {/* Resizer Handle */}
      {isTerminalOpen && (
        <div 
          className="h-3 w-full absolute -top-3 left-0 cursor-ns-resize z-50 wails-no-drag"
          onMouseDown={(e) => {
            e.preventDefault()
            setIsResizing(true)
          }}
        />
      )}
      
      {/* Inner Box */}
      <div className="w-full h-full bg-white rounded-2xl shadow-panel border border-gray-200 flex flex-col overflow-hidden wails-no-drag relative">
        {/* Terminal Container */}
        <div 
          ref={terminalRef} 
          className="flex-1 p-3 pt-4 overflow-hidden h-full"
          style={{
            paddingRight: '12px'
          }}
        />

        {/* Scheme Editor Overlay */}
        {editorMode !== 'none' && (
          <div 
            className="absolute inset-0 z-20 flex flex-col bg-[#1d1f21] wails-no-drag"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onKeyDown={handleEditorKeyDown}
            tabIndex={-1}
          >
            <div className="flex-1 overflow-auto p-4 no-scrollbar">
              <style>{`
                .code-editor-override textarea {
                  outline: none !important;
                }
              `}</style>
              <Editor
                value={editorCode}
                onValueChange={setEditorCode}
                highlight={highlightCode}
                padding={10}
                className="text-sm code-editor-override"
                textareaClassName="focus:outline-none"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 13,
                  backgroundColor: 'transparent',
                  minHeight: '100%',
                  color: '#c5c8c6'
                }}
              />
            </div>
            <div className="px-4 py-2 text-xs text-gray-400 bg-[#1d1f21] border-t border-gray-700 flex justify-between items-center">
              <span>按 ESC 退出编辑</span>
              <span>{editorName}.js</span>
            </div>

            {/* Save Confirmation Prompt */}
            {editorMode === 'prompt' && (
              <div 
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
                onKeyDown={handlePromptKeyDown}
                tabIndex={0}
                ref={(el) => { if (el) setTimeout(() => el.focus(), 0) }}
              >
                <div className="bg-[#1d1f21] border border-gray-600 rounded-lg px-6 py-4 shadow-xl">
                  <div className="text-sm text-gray-200 mb-3">是否保存(Y/N)：</div>
                  <div className="text-xs text-gray-400">按 Y 保存并退出，按 N 不保存退出</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <TerminalContextMenu
        term={xtermRef.current}
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={closeContextMenu}
      />
    </motion.div>
  )
}


