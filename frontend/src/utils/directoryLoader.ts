import { ReadDirChunked } from '../../wailsjs/go/main/App'
import { models } from '../../wailsjs/go/models'
import { EventsOff, EventsOn } from '../../wailsjs/runtime/runtime'

interface DirectoryStreamHandlers {
  onUpdate: (files: models.FileInfo[], complete: boolean) => void
  onError: (error: unknown) => void
}

export function streamDirectory(path: string, handlers: DirectoryStreamHandlers) {
  const requestId = `${Date.now()}-${Math.random()}`
  const chunkEvent = `directory:chunk:${requestId}`
  const doneEvent = `directory:done:${requestId}`
  const pendingChunks: models.FileInfo[][] = []
  const files: models.FileInfo[] = []
  const seen = new Set<string>()
  let active = true
  let initialReceived = false
  let doneReceived = false
  let flushTimer: number | null = null

  const append = (items: models.FileInfo[]) => {
    for (const file of items || []) {
      if (seen.has(file.path)) continue
      seen.add(file.path)
      files.push(file)
    }
  }

  const cleanup = () => {
    EventsOff(chunkEvent)
    EventsOff(doneEvent)
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  const flush = (complete = false) => {
    if (!active || !initialReceived) return
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer)
      flushTimer = null
    }
    handlers.onUpdate([...files], complete)
    if (complete) cleanup()
  }

  const scheduleFlush = () => {
    if (!active || !initialReceived || flushTimer !== null) return
    flushTimer = window.setTimeout(() => flush(false), 50)
  }

  EventsOn(chunkEvent, (chunk: models.FileInfo[]) => {
    if (!active) return
    if (!initialReceived) {
      pendingChunks.push(chunk || [])
      return
    }
    append(chunk || [])
    scheduleFlush()
  })

  EventsOn(doneEvent, () => {
    doneReceived = true
    if (initialReceived) flush(true)
  })

  ReadDirChunked(path, requestId)
    .then((initialFiles) => {
      if (!active) return
      append(initialFiles || [])
      for (const chunk of pendingChunks) append(chunk)
      pendingChunks.length = 0
      initialReceived = true
      flush(doneReceived)
    })
    .catch((error) => {
      if (!active) return
      cleanup()
      handlers.onError(error)
    })

  return () => {
    active = false
    cleanup()
  }
}
