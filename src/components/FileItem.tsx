import { memo, useState, useEffect, useRef } from 'react'
import type { FileInfo } from '../types'
import { getFileIcon, formatFileSize, formatTime, isImageFile } from '../lib/utils'

interface FileItemProps {
  file: FileInfo
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent) => void
  onMouseEnter: (e: React.MouseEvent) => void
  onMouseLeave: () => void
}

export default memo(function FileItem({
  file,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onMouseEnter,
  onMouseLeave
}: FileItemProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isImage = isImageFile(file.extension)

  /** 懒加载缩略图：仅在元素进入视口时加载 */
  useEffect(() => {
    if (!isImage || !containerRef.current) return
    let cancelled = false

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          window.electronAPI.getSmallThumbnail(file.path, 48).then((data) => {
            if (!cancelled && data) setThumbnail(data)
          })
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(containerRef.current)
    return () => { cancelled = true; observer.disconnect() }
  }, [file.path, isImage])

  return (
    <div
      ref={containerRef}
      className={`file-row flex items-center gap-3 px-3 py-[7px] mx-1 cursor-pointer group ${isSelected ? 'file-item-selected' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 文件图标/缩略图 */}
      {isImage && thumbnail ? (
        <div className="w-8 h-8 flex-shrink-0 rounded-[5px] overflow-hidden bg-white/5 shadow-sm">
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-[5px] bg-white/[0.04]">
          {getFileIcon(file)}
        </div>
      )}

      {/* 文件名 + 大小 */}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] text-mac-text truncate block leading-tight">{file.name}</span>
        <span className="text-[11px] text-mac-text-tertiary leading-tight">
          {file.isDirectory ? '文件夹' : formatFileSize(file.size)}
        </span>
      </div>

      {/* 修改时间（hover 显示） */}
      <span className="text-[11px] text-mac-text-tertiary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {formatTime(file.modifiedTime).split(' ')[0]}
      </span>
    </div>
  )
})
