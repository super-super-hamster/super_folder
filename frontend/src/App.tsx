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

function App() {
  const { isSearchPanelOpen, isRightSidebarOpen, isSettingsOpen } = useUIStore()

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
      // 避免在输入框中触发快捷键
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement || 
          (e.target as HTMLElement).isContentEditable) {
        return;
      }
      
      if (e.key === 'ArrowLeft' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        useTabsStore.getState().goBack();
      } else if (e.key === 'ArrowRight' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        useTabsStore.getState().goForward();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) { // 鼠标侧键返回
        e.preventDefault();
        useTabsStore.getState().goBack();
      } else if (e.button === 4) { // 鼠标侧键前进
        e.preventDefault();
        useTabsStore.getState().goForward();
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
      <div className="flex h-screen w-screen bg-[#dcdcdc] p-3 gap-3 overflow-hidden select-none font-sans text-gray-800 wails-draggable">
        {/* Sidebar Island */}
        {isSettingsOpen ? <SettingsSidebar /> : <Sidebar />}

        {/* Main Column */}
        <div className="flex flex-col flex-1 gap-3 min-w-0">
          {/* TopNav Island */}
          <TopNav />

          {/* Search Panel Island (Conditionally rendered) */}
          {!isSettingsOpen && (
            <AnimatePresence>
              {isSearchPanelOpen && <SearchPanel />}
            </AnimatePresence>
          )}

          {/* Content Area */}
          <div className="flex flex-1 gap-3 min-h-0 relative">
            {isSettingsOpen ? (
              <SettingsContent />
            ) : (
              <>
                {/* Left Sidebar Island (formerly RightSidebar) */}
                <AnimatePresence>
                  {isRightSidebarOpen && <RightSidebar />}
                </AnimatePresence>

                {/* FileList Island */}
                <main className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative wails-no-drag">
                  <FileList />
                </main>
              </>
            )}
          </div>
        </div>
      </div>
      <ModalManager />
    </>
  )
}

export default App
