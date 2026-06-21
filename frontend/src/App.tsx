import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TopNav from './components/layout/TopNav'
import FileList from './components/fileList/FileList'
import RightSidebar from './components/layout/RightSidebar'
import SearchPanel from './components/layout/SearchPanel'
import { ModalManager } from './components/common/ModalManager'
import { useUIStore } from './store/uiStore'

function App() {
  const { isSearchPanelOpen, isRightSidebarOpen } = useUIStore()

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

  return (
    <>
      <div className="flex h-screen w-screen bg-[#dcdcdc] p-3 gap-3 overflow-hidden select-none font-sans text-gray-800 wails-draggable">
        {/* Sidebar Island */}
        <Sidebar />

        {/* Main Column */}
        <div className="flex flex-col flex-1 gap-3 min-w-0">
          {/* TopNav Island */}
          <TopNav />

          {/* Search Panel Island (Conditionally rendered) */}
          <AnimatePresence>
            {isSearchPanelOpen && <SearchPanel />}
          </AnimatePresence>

          {/* Content Area */}
          <div className="flex flex-1 gap-3 min-h-0 relative">
            {/* Left Sidebar Island (formerly RightSidebar) */}
            <AnimatePresence>
              {isRightSidebarOpen && <RightSidebar />}
            </AnimatePresence>

            {/* FileList Island */}
            <main className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative wails-no-drag">
              <FileList />
            </main>
          </div>
        </div>
      </div>
      <ModalManager />
    </>
  )
}

export default App
