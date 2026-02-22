import { memo, useState, useEffect, useRef } from 'react'
import type { FileInfo } from '../types'
import { getFileIcon, formatFileSize, isImageFile } from '../lib/utils'

interface FileCardProps {
  file: FileInfo
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseEnter: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseLeave: () => void
}

export default memo(function FileCard({
  file,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
  onMouseDown,
  onMouseEnter,
  onMouseMove,
  onMouseLeave
}: FileCardProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isImage = isImageFile(file.extension)

  /** 懒加载缩略图：仅在元素进入视口时加载 */
  useEffect(() => {
    if (!isImage || !cardRef.current) return
    let cancelled = false

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          window.electronAPI.getSmallThumbnail(file.path, 160).then((data) => {
            if (!cancelled && data) setThumbnail(data)
          })
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(cardRef.current)
    return () => { cancelled = true; observer.disconnect() }
  }, [file.path, isImage])

  return (
    <div
      ref={cardRef}
      className={`file-card flex flex-col items-center rounded-lg cursor-pointer group p-2 transition-all ${isSelected ? 'file-item-selected' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      title={`${file.name}\n${formatFileSize(file.size)}`}
    >
      {/* 缩略图/图标区域 */}
      <div className="w-full aspect-square rounded-md overflow-hidden bg-mac-overlay flex items-center justify-center mb-1.5">
        {isImage && thumbnail ? (
          <img src={thumbnail} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-mac-text-tertiary scale-[2]">
            {getFileIcon(file)}
          </div>
        )}
      </div>

      {/* 文件名 */}
      <div className="w-full text-center px-0.5">
        <span className="text-[10px] text-mac-text-secondary group-hover:text-mac-text leading-tight line-clamp-2 break-all transition-colors">
          {file.name}
        </span>
      </div>
    </div>
  )
})
