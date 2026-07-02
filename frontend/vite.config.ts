import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function copySrcAssetsForWails() {
  return {
    name: 'copy-src-assets-for-wails',
    closeBundle() {
      const source = resolve(__dirname, 'src/assets')
      const target = resolve(__dirname, 'dist/src/assets')
      if (!existsSync(source)) return
      rmSync(target, { recursive: true, force: true })
      cpSync(source, target, { recursive: true })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    copySrcAssetsForWails(),
    {
      name: 'wails-thumb-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.startsWith('/thumb') || req.url.startsWith('/file'))) {
            res.statusCode = 404
            res.end()
            return
          }
          next()
        })
      }
    }
  ]
})
