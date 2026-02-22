import { memo } from 'react'
import type { FileInfo } from '../types'
import { getFileIcon, formatFileSize, formatTime } from '../lib/utils'

interface FileItemProps {
  file: FileInfo
  onClick: () => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent) => void
  onMouseEnter: (e: React.MouseEvent) => void
  onMouseLeave: () => void
}

export default memo(function FileItem({
  file,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onMouseEnter,
  onMouseLeave
}: FileItemProps) {
  return (
    <div
      className="file-item flex items-center gap-2.5 px-3 py-1.5 mx-1 rounded-md cursor-pointer group"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={`${file.name}\n大小: ${formatFileSize(file.size)}\n修改时间: ${formatTime(file.modifiedTime)}\n\n单击复制 | 双击打开 | 拖拽移动`}
    >
      {/* 文件图标 */}
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-white/50">
        {getFileIcon(file)}
      </div>

      {/* 文件名 */}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-white/75 truncate block">{file.name}</span>
      </div>

      {/* 文件大小 */}
      <span className="text-[10px] text-white/20 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.isDirectory ? '' : formatFileSize(file.size)}
      </span>
    </div>
  )
})
