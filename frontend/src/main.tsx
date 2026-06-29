import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import App from './App'
import { HeroUIProvider } from '@heroui/system'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installDevMocks } from './devMocks'
import { useUIStore } from './store/uiStore'

installDevMocks()

// 禁用浏览器快捷键和缩放
document.addEventListener('keydown', (e) => {
  // 处理 Ctrl+F (搜索)
  if (e.ctrlKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
    }
    return;
  }

  // F5 刷新
  if (e.key === 'F5') {
    e.preventDefault();
    useUIStore.getState().triggerRefresh();
    return;
  }

  // 禁用其他原生快捷键
  if (
    (e.ctrlKey && ['r', 'p', 's', 'g', 'j', 'u', 'h', 'd'].includes(e.key.toLowerCase())) ||
    (e.ctrlKey && ['=', '-', '0'].includes(e.key)) // 禁用缩放快捷键
  ) {
    e.preventDefault();
  }
});

document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault(); // 禁用 Ctrl+滚轮缩放
  }
}, { passive: false });

// 禁用右键菜单，除非是在特定元素上
document.addEventListener('contextmenu', (e) => {
  // 只允许在类名包含 allow-context-menu 的元素上触发原生右键菜单
  if (!(e.target instanceof Element && e.target.closest('.allow-context-menu'))) {
    e.preventDefault();
  }
});

// Mock Wails runtime for browser preview
if (!(window as any).go) {
  (window as any).go = {
    main: {
      App: {
        GetDrives: async () => ["C:\\", "D:\\"],
        GetDefaultPaths: async () => ({
          Desktop: "C:\\Users\\Mock\\Desktop",
          Pictures: "C:\\Users\\Mock\\Pictures",
          Downloads: "C:\\Users\\Mock\\Downloads",
          Documents: "C:\\Users\\Mock\\Documents",
          Music: "C:\\Users\\Mock\\Music",
          Videos: "C:\\Users\\Mock\\Videos",
        }),
        ReadDir: async () => ([
          { name: "mock_folder", path: "C:\\mock_folder", isDir: true, size: 0, ext: "" },
          { name: "mock_image.png", path: "C:\\mock_image.png", isDir: false, size: 1024, ext: ".png" }
        ])
      }
    }
  }
}

const container = document.getElementById('root')


const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <HeroUIProvider>
            <ErrorBoundary>
                <App/>
            </ErrorBoundary>
        </HeroUIProvider>
    </React.StrictMode>
)
