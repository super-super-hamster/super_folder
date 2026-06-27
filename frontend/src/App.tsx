import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TopNav from './components/layout/TopNav'
import FileList from './components/fileList/FileList'
import RightSidebar from './components/layout/RightSidebar'
import SearchPanel from './components/layout/SearchPanel'
import { ModalManager } from './components/common/ModalManager'
import { useUIStore } from './store/uiStore'
import { useTabsStore } from './store/tabsStore'
import SettingsSidebar from './components/settings/SettingsSidebar'
import SettingsContent from './components/settings/SettingsContent'
import { useUndoStore } from './store/undoStore'
import TerminalPanel from './components/terminal/TerminalPanel'
import FullFileEditor from './components/editor/FullFileEditor'

function App() {
  const { isSearchPanelOpen, isRightSidebarOpen, isSettingsOpen, isTerminalOpen } = useUIStore()
  const { tabs, activeTabId } = useTabsStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const isInsideSearchBox = target.closest('#search-container');
      const isInsideSearchPanel = target.closest('#search-panel');
      
      if (!isInsideSearchBox && !isInsideSearchPanel) {
        const state = useUIStore.getState();
        if (state.isSearchPanelOpen) {
          state.setSearchPanelOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const state = useUIStore.getState();
        state.setTerminalOpen(!state.isTerminalOpen);
        return;
      }
      
      // 避免在输入框中触发快捷键
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement || 
          (e.target as HTMLElement).isContentEditable) {
        return;
      }
      
      if (e.key === 'ArrowLeft' || (e.altKey && e.key === 'ArrowLeft') || e.key === 'BrowserBack') {
        e.preventDefault();
        document.getElementById('nav-back-button')?.click();
      } else if (e.key === 'ArrowRight' || (e.altKey && e.key === 'ArrowRight') || e.key === 'BrowserForward') {
        e.preventDefault();
        document.getElementById('nav-forward-button')?.click();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          (window as any).go.main.App.RedoOperation().then(() => {
            useUndoStore.getState().showMessage("已恢复");
            useUIStore.getState().triggerRefresh();
          }).catch((err: any) => {
            useUndoStore.getState().showMessage(err || "恢复失败", true);
            (window as any).go.main.App.ClearUndoStack();
          });
        } else {
          (window as any).go.main.App.UndoOperation().then(() => {
            useUndoStore.getState().showMessage("已撤销");
            useUIStore.getState().triggerRefresh();
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

  return (
    <>
      <div className="flex h-screen w-screen bg-gray-200 p-4 gap-4 overflow-hidden select-none font-sans text-gray-800 wails-draggable">
        {/* Sidebar Island */}
        {isSettingsOpen ? <SettingsSidebar /> : <Sidebar />}

        {/* Main Column */}
        <div className="flex flex-col flex-1 gap-4 min-w-0">
          {/* TopNav Island */}
          <TopNav />

          {/* Search Panel Island (Conditionally rendered) */}
          {!isSettingsOpen && (
            <AnimatePresence>
              {isSearchPanelOpen && <SearchPanel />}
            </AnimatePresence>
          )}

          {/* Content Area */}
          <div className="flex flex-1 gap-4 min-h-0 relative">
            {isSettingsOpen ? (
              <SettingsContent />
            ) : (
              <>
                {/* Left Sidebar Island (formerly RightSidebar) */}
                <AnimatePresence>
                  {isRightSidebarOpen && <RightSidebar />}
                </AnimatePresence>

                {/* FileList Island or File Editor */}
                <main className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative wails-no-drag">
                  {activeTab && !activeTab.isDir ? (
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
    </>
  )
}

export default App
