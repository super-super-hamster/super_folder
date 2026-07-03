import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TopNav from './components/layout/TopNav'
import FileList from './components/fileList/FileList'
import SimilarImages from './components/similar/SimilarImages'
import RightSidebar from './components/layout/RightSidebar'
import SearchPanel from './components/layout/SearchPanel'
import { ModalManager } from './components/common/ModalManager'
import { useUIStore } from './store/uiStore'
import { useTabsStore } from './store/tabsStore'
import SettingsSidebar from './components/settings/SettingsSidebar'
import SettingsContent from './components/settings/SettingsContent'
import { useUndoStore } from './store/undoStore'
import { useTagStore } from './store/tagStore'
import TerminalPanel from './components/terminal/TerminalPanel'
import FullFileEditor from './components/editor/FullFileEditor'
import ChineseConvView from './components/chineseconv/ChineseConvView'
import ContextMenu from './components/fileList/ContextMenu'
import PrivacyModal from './components/privacy/PrivacyModal'
import PrivacyStartupGate from './components/privacy/PrivacyStartupGate'
import { usePrivacyStore } from './store/privacyStore'

function App() {
  const { isSearchPanelOpen, isRightSidebarOpen, isSettingsOpen, isTerminalOpen } = useUIStore()
  const { tabs, activeTabId } = useTabsStore()
  const { initialized, dialogMode } = usePrivacyStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  useEffect(() => {
    usePrivacyStore.getState().load().catch(console.error)
  }, [])

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const state = useUIStore.getState();
        state.setTerminalOpen(!state.isTerminalOpen);
        return;
      }
      
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const state = useTabsStore.getState();
        const activeIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
        if (activeIndex !== -1 && state.tabs.length > 1) {
          if (e.shiftKey) {
            const prevIndex = (activeIndex - 1 + state.tabs.length) % state.tabs.length;
            state.setActiveTab(state.tabs[prevIndex].id);
          } else {
            const nextIndex = (activeIndex + 1) % state.tabs.length;
            state.setActiveTab(state.tabs[nextIndex].id);
          }
        }
        return;
      }
      
      // 避免在输入框中触发快捷键
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement || 
          (e.target as HTMLElement).isContentEditable) {
        return;
      }
      
      if (e.key === 'ArrowLeft' || (e.altKey && e.key === 'ArrowLeft') || e.key === 'BrowserBack') {
        const activeTab = useTabsStore.getState().tabs.find(t => t.id === useTabsStore.getState().activeTabId)
        const extMatch = activeTab?.currentPath?.match(/\.([^\.]+)$/)
        const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ''
        if (ext === '.epub') return
        e.preventDefault();
        document.getElementById('nav-back-button')?.click();
      } else if (e.key === 'ArrowRight' || (e.altKey && e.key === 'ArrowRight') || e.key === 'BrowserForward') {
        const activeTab = useTabsStore.getState().tabs.find(t => t.id === useTabsStore.getState().activeTabId)
        const extMatch = activeTab?.currentPath?.match(/\.([^\.]+)$/)
        const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ''
        if (ext === '.epub') return
        e.preventDefault();
        document.getElementById('nav-forward-button')?.click();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          (window as any).go.main.App.RedoOperation().then(() => {
            useUndoStore.getState().showMessage("已恢复");
            useUIStore.getState().triggerRefresh();
            useTagStore.getState().triggerTagRefresh();
          }).catch((err: any) => {
            useUndoStore.getState().showMessage(err || "恢复失败", true);
            (window as any).go.main.App.ClearUndoStack();
          });
        } else {
          (window as any).go.main.App.UndoOperation().then(() => {
            useUndoStore.getState().showMessage("已撤销");
            useUIStore.getState().triggerRefresh();
            useTagStore.getState().triggerTagRefresh();
          }).catch((err: any) => {
            useUndoStore.getState().showMessage(err || "撤销失败", true);
            (window as any).go.main.App.ClearUndoStack();
          });
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        (window as any).go.main.App.RedoOperation().then(() => {
          useUndoStore.getState().showMessage("已恢复");
          useUIStore.getState().triggerRefresh();
          useTagStore.getState().triggerTagRefresh();
        }).catch((err: any) => {
          useUndoStore.getState().showMessage(err || "恢复失败", true);
          (window as any).go.main.App.ClearUndoStack();
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) { // 鼠标侧键返回
        e.preventDefault();
        document.getElementById('nav-back-button')?.click();
      } else if (e.button === 4) { // 鼠标侧键前进
        e.preventDefault();
        document.getElementById('nav-forward-button')?.click();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const showStartupGate = dialogMode === 'startupUnlock'

  if (!initialized || showStartupGate) {
    return (
      <>
        <PrivacyStartupGate />
        <PrivacyModal />
      </>
    )
  }

  return (
    <>
      <div className="flex h-screen w-screen bg-gray-200 p-4 gap-4 overflow-hidden select-none font-sans text-gray-800 wails-draggable">
        { /* Sidebar Island */ }
        <div className="shrink-0 h-full">
          {isSettingsOpen ? <SettingsSidebar /> : <Sidebar />}
        </div>

        { /* Main Column */ }
        <div className="flex flex-col flex-1 gap-4 min-w-0">
          { /* TopNav Island */ }
          <TopNav />

          { /* Search Panel Island (Conditionally rendered) */ }
          {!isSettingsOpen && (
            <AnimatePresence>
              {isSearchPanelOpen && <SearchPanel />}
            </AnimatePresence>
          )}

          { /* Content Area */ }
          <div className="flex flex-1 gap-4 min-h-0 relative">
            {isSettingsOpen ? (
              <SettingsContent />
            ) : (
              <>
                { /* Left Sidebar Island (formerly RightSidebar) */ }
                <AnimatePresence>
                  {isRightSidebarOpen && <RightSidebar />}
                </AnimatePresence>

                { /* FileList Island or File Editor */ }
                <main className="flex-1 bg-white rounded-2xl shadow-panel border border-gray-100 overflow-hidden flex flex-col relative wails-no-drag min-w-0">
                  {activeTab?.currentPath?.endsWith('\\相似图片') ? (
                    <SimilarImages />
                  ) : activeTab?.currentPath?.endsWith('\\简繁转换') ? (
                    <ChineseConvView />
                  ) : activeTab && !activeTab.isDir ? (
                    <FullFileEditor path={activeTab.currentPath} />
                  ) : (
                    <FileList />
                  )}
                </main>
              </>
            )}
          </div>

          {/* Terminal Panel */}
          <TerminalPanel onClose={() => useUIStore.getState().setTerminalOpen(false)} />
        </div>
      </div>
      <ModalManager />
      <PrivacyModal />
      <PrivacyStartupGate />
      <ContextMenu />
    </>
  )
}

export default App
