import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { motion } from 'framer-motion'
import { EventsOn, EventsEmit } from '../../../wailsjs/runtime'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { useState } from 'react'
import { SaveRenameScheme, GetRenameSchemes } from '../../../wailsjs/go/main/App'


interface TerminalPanelProps {
  onClose?: () => void
}

export default function TerminalPanel({ onClose }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const { terminalPanelHeight, setTerminalPanelHeight, isTerminalOpen } = useUIStore()
  const [isResizing, setIsResizing] = useState(false)

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
    
    // Only fit if currently open to prevent shrinking to 1 row and causing ConPTY blank lines
    if (useUIStore.getState().isTerminalOpen) {
      fitAddon.fit()
    }

    let sfMode = false
    let sfState = 'cmd' // 'cmd' | 'rename_name' | 'rename_code'
    let sfRenameName = ""
    let sfRenameCode = ""
    let sfBuffer = ""
    let cmdRawBuffer = ""
    let currentSfPath = ""
    let sfLineCount = 0
    let syncingConpty = false
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

      // Allow Ctrl+C to copy if there's a selection
      if (e.ctrlKey && e.code === 'KeyC' && e.type === 'keydown') {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection())
          term.clearSelection()
          return false // Prevent Ctrl+C from being sent to terminal
        }
      }
      return true
    })

    // Handle input from user
    const onDataDisposable = term.onData((data) => {
      if (sfMode) {
        if (sfState === 'rename_code') {
          if (data === '\x1b') { // ESC
            SaveRenameScheme(sfRenameName, sfRenameCode).then(() => {
              term.write('\r\n\x1b[32m[Success] Scheme saved.\x1b[0m\r\n')
              sfState = 'cmd'
              sfBuffer = ""
              sfLineCount += sfRenameCode.split('\n').length + 2
              term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
            }).catch(e => {
              term.write(`\r\n\x1b[31m[Error] ${e}\x1b[0m\r\n`)
              sfState = 'cmd'
              sfBuffer = ""
              term.write(`\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `)
            })
            return
          } else if (data === '\r') {
            sfRenameCode += '\n'
            term.write('\r\n')
            return
          } else if (data === '\x7f') {
            if (sfRenameCode.length > 0) {
              sfRenameCode = sfRenameCode.slice(0, -1)
              term.write('\b \b')
            }
            return
          } else {
            sfRenameCode += data
            term.write(data)
            return
          }
        }

        const redrawLine = () => {
          const prompt = sfState === 'rename_name' ? 'name: ' : `\x1b[38;2;255;108;2m@sf\x1b[0m ${currentSfPath}> `
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

          if (sfState === 'rename_name') {
            if (cmd === '') {
              term.write('\x1b[31m[Error] 名称不能为空\x1b[0m\r\n')
              term.write('name: ')
              sfBuffer = ''
              return
            }
            GetRenameSchemes().then((existing) => {
              const list = existing || []
              const lower = cmd.toLowerCase()
              const dup = list.find(s => s.name.toLowerCase() === lower)
              if (dup) {
                term.write(`\x1b[31m[Error] 方案 '${cmd}' 已存在，请重新输入\x1b[0m\r\n`)
                term.write('name: ')
                sfBuffer = ''
                sfRenameName = ''
                return
              }
              sfRenameName = cmd
              sfState = 'rename_code'
              sfBuffer = ''
              sfRenameCode = ''
              sfLineCount++
              term.write('code (Press ESC to finish): \r\n')
            }).catch((e: any) => {
              term.write(`\x1b[31m[Error] ${e?.message || String(e)}\x1b[0m\r\n`)
              term.write('name: ')
              sfBuffer = ''
            })
            return
          }

          if (cmd === '@cmd') {
            sfMode = false
            sfBuffer = ""
            syncingConpty = true
            syncBuffer = ""
            term.write('\x1b[0m') // Reset ANSI
            EventsEmit('terminal:input', '\x1b') // Escape to clear any ghost buffer in PS
            // Sync ConPTY cursor down to match xterm by sending empty enters. Empty enters don't go into history!
            const newlines = '\r'.repeat(Math.max(1, sfLineCount))
            EventsEmit('terminal:input', newlines)
            sfLineCount = 0
          } else if (cmd === 'rename add') {
            sfState = 'rename_name'
            sfBuffer = ''
            sfLineCount++
            term.write('name: ')
            return
          } else {
            if (cmd.length > 0) {
              // We could also pass currentSfPath to the backend if needed
              EventsEmit('terminal:sf:command', cmd)
            }
            sfBuffer = ""
            sfLineCount++
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
          sfLineCount++
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
            sfLineCount = 1 // Start at 1 for the prompt line
            
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
      
      if (syncingConpty) {
        syncBuffer += data
        // Wait until PowerShell prints the new prompt
        if (syncBuffer.includes('@cmd') && syncBuffer.includes('>')) {
          syncingConpty = false
          const idx = syncBuffer.lastIndexOf('@cmd')
          const promptText = syncBuffer.substring(idx)
          syncBuffer = ""
          term.write(promptText)
        }
        return // Drop output to hide the synchronization sequence from xterm
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
        sfLineCount = 1
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
    if (fitAddonRef.current && isTerminalOpen) {
      // Add a slight delay to allow CSS transitions/resizing to finish
      const timeout = setTimeout(() => {
        fitAddonRef.current?.fit()
        if (xtermRef.current) {
          EventsEmit('terminal:resize', { cols: xtermRef.current.cols, rows: xtermRef.current.rows })
        }
      }, 50) // Increased slightly to ensure flex layout finishes settling
      return () => clearTimeout(timeout)
    }
  }, [terminalPanelHeight, isTerminalOpen])

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
      <div className="w-full h-full bg-white rounded-2xl shadow-panel border border-gray-200 flex flex-col overflow-hidden wails-no-drag">
        {/* Terminal Container */}
        <div 
          ref={terminalRef} 
          className="flex-1 p-3 pt-4 overflow-hidden"
          style={{
            paddingRight: '12px'
          }}
        />
      </div>
    </motion.div>
  )
}


