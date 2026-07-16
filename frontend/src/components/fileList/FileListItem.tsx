import { Checkbox } from '@heroui/react'
import { TooltipItem } from '../../utils/TooltipItem'
import { models } from '../../../wailsjs/go/models'
import AnimatedFolderIcon from '../common/AnimatedFolderIcon'
import AnimatedDocumentIcon from '../common/AnimatedDocumentIcon'
import ThumbnailImage from '../common/ThumbnailImage'
import { isImage, getFileIcon, formatSize, formatDate } from '../../utils/fileFormatting'

export interface FileListItemProps {
  file: models.FileInfo
  isProtected?: boolean
  viewMode: 'list' | 'grid' | 'album'
  isSelectionMode?: boolean
  selectedPaths?: Set<string>
  dragSelectedPaths?: Set<string>
  dragOverPath?: string | null
  fileTagColors?: Record<string, string>
  onClick: (e: React.MouseEvent, file: models.FileInfo) => void
  onDoubleClick: (file: models.FileInfo) => void
  onContextMenu: (e: React.MouseEvent, file: models.FileInfo) => void
  onDragStart?: (e: React.DragEvent, file: models.FileInfo) => void
  onDragOver?: (e: React.DragEvent, file: models.FileInfo) => void
  onDragLeave?: (e: React.DragEvent, file: models.FileInfo) => void
  onDrop?: (e: React.DragEvent, file: models.FileInfo) => void
  onToggleSelect?: (path: string) => void
}

export default function FileListItem({
  file,
  isProtected = false,
  viewMode,
  isSelectionMode = false,
  selectedPaths = new Set(),
  dragSelectedPaths = new Set(),
  dragOverPath = null,
  fileTagColors = {},
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart = () => {},
  onDragOver = () => {},
  onDragLeave = () => {},
  onDrop = () => {},
  onToggleSelect = () => {}
}: FileListItemProps) {
  const isSelected = selectedPaths.has(file.path) || dragSelectedPaths.has(file.path)
  const isChecked = selectedPaths.has(file.path)
  const isDragOver = dragOverPath === file.path

  const containerClass = viewMode === 'list'
    ? `sf-list-item grid ${isSelectionMode ? 'grid-cols-[20px_24px_1fr_96px_128px]' : 'grid-cols-[24px_1fr_96px_128px]'} items-center gap-4 px-4 h-[40px] w-full rounded-md cursor-pointer group select-none relative ${isDragOver ? 'bg-sf-selected ring-1 ring-sf-accent' : isSelected ? 'bg-sf-selected' : 'hover:bg-sf-item-hover/70'}`
    : viewMode === 'album'
    ? `sf-list-item flex flex-col items-center justify-center p-0.5 rounded-md cursor-pointer group select-none w-full mx-auto relative ${isDragOver ? 'bg-sf-selected ring-1 ring-sf-accent' : isSelected ? 'bg-sf-selected' : 'hover:bg-sf-item-hover/70'} ${file.isDir ? 'h-28' : 'h-20'}`
    : `sf-list-item flex flex-col items-center justify-start p-2 rounded-md cursor-pointer group select-none h-36 w-28 mx-auto relative ${isDragOver ? 'bg-sf-selected ring-1 ring-sf-accent' : isSelected ? 'bg-sf-selected' : 'hover:bg-sf-item-hover'}`

  return (
    <div
      id={`file-${file.path}`}
      data-selected={isSelected ? 'true' : undefined}
      draggable={true}
      onDragStart={(e) => onDragStart(e, file)}
      onDragOver={(e) => onDragOver(e, file)}
      onDragLeave={(e) => onDragLeave(e, file)}
      onDrop={(e) => onDrop(e, file)}
      onClick={(e) => onClick(e, file)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu(e, file)
      }}
      onDoubleClick={() => onDoubleClick(file)}
      className={containerClass}
    >
      {viewMode === 'list' ? (
        <>
          {isSelectionMode && (
            <div className="flex items-center justify-center w-5 h-full" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                isSelected={isChecked}
                onChange={() => onToggleSelect(file.path)}
              >
                <Checkbox.Content>
                  <Checkbox.Control className="w-[18px] h-[18px] shadow-none border-2 border-gray-400 data-[selected=true]:border-blue-500 rounded-full">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            </div>
          )}
          <div className="w-6 h-6 flex items-center justify-center text-blue-900 relative">
            {file.isDir ? (
              <AnimatedFolderIcon className="w-6 h-6" />
            ) : getFileIcon(file) === 'document_line.svg' ? (
              <AnimatedDocumentIcon className="w-6 h-6" />
            ) : (
              <img src={`/src/assets/icons/${getFileIcon(file)}`} className="w-5 h-5 object-contain" draggable={false} alt="file icon" />
            )}
            {isProtected && (
              <img src="/src/assets/icons/lock_line.svg" className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-white/90 rounded-full" alt="protected" />
            )}
          </div>
          <TooltipItem content={file.name} placement="top">
            <div className="text-sm font-medium text-gray-700 truncate text-left">
              {file.name}
            </div>
          </TooltipItem>
          <div className="text-xs text-gray-400 text-right">
            {file.isDir ? '--' : formatSize(file.size)}
          </div>
          <div className="text-xs text-gray-400 text-right">
            {formatDate(file.modTime)}
          </div>
        </>
      ) : (
        <>
          <div className={`${viewMode === 'album' && !file.isDir ? 'w-full h-full p-0' : 'w-16 h-16 mb-2'} flex-shrink-0 flex items-center justify-center text-blue-900 transition-transform relative`}>
            {isImage(file.ext) ? (
              <ThumbnailImage path={file.path} alt={file.name} className={viewMode === 'album' && !file.isDir ? 'w-full h-full object-cover' : 'w-16 h-16'} />
            ) : file.isDir ? (
              <AnimatedFolderIcon />
            ) : getFileIcon(file) === 'document_line.svg' ? (
              <AnimatedDocumentIcon />
            ) : (
              <img
                src={`/src/assets/icons/${getFileIcon(file)}`}
                className="w-12 h-12 object-contain"
                alt="icon"
                draggable={false}
              />
            )}

            {fileTagColors[file.path] && (
              <div className="absolute -bottom-1 -right-1 z-10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: fileTagColors[file.path] }}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              </div>
            )}
            {isProtected && (
              <div className="absolute -bottom-1 -left-1 z-10 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white/90">
                <img src="/src/assets/icons/lock_line.svg" className="w-4 h-4" alt="protected" />
              </div>
            )}
          </div>
          {!(viewMode === 'album' && !file.isDir) && (
            <div className="h-10 w-full flex flex-col items-center justify-start overflow-hidden relative">
              <TooltipItem content={file.name} placement="top">
                <span className="text-sm font-medium text-gray-700 text-center line-clamp-2 w-full px-1 break-all">
                  {file.name}
                </span>
              </TooltipItem>
            </div>
          )}

          {isSelectionMode && (
            <div className="absolute bottom-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                isSelected={isChecked}
                onChange={() => onToggleSelect(file.path)}
              >
                <Checkbox.Content>
                  <Checkbox.Control className="w-[18px] h-[18px] shadow-none border-2 border-gray-400 data-[selected=true]:border-blue-500 rounded-full">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            </div>
          )}
        </>
      )}
    </div>
  )
}
