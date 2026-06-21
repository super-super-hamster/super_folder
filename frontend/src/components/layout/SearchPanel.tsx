import { motion } from 'framer-motion'

export default function SearchPanel() {
  return (
    <motion.div 
      id="search-panel"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 280, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 flex-shrink-0 wails-no-drag"
    >
      <div className="p-6 h-full flex flex-col">
        <h3 className="text-sm font-medium text-gray-500 mb-4">近期搜索</h3>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          暂无搜索结果
        </div>
      </div>
    </motion.div>
  )
}
