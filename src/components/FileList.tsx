import { useState, useCallback, useRef } from 'react'
import type { FileInfo } from '../types'
import { formatFileSize } from '../lib/utils'
import FileItem from './FileItem'
import ContextMenu from './ContextMenu'
import Preview from './Preview'

interface FileListProps {
  files: FileInfo[]
  folderPath: string
  showToast: (message: string) => void
}

interface ContextMenuState {
  x: number
  y: number
  file: FileInfo
}

export default function FileList({ files, folderPath, showToast }: FileListProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [previewFile, setPreviewFile] = useState<{ file: FileInfo; x: number; y: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredFile, setHoveredFile] = useState<FileInfo | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredFiles = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files

  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileInfo) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  const handleCloseContextMenu = useCallback(() => { setContextMenu(null) }, [])

  const handleOpenFile = useCallback((file: FileInfo) => {
    window.electronAPI.openFile(file.path)
  }, [])

  const handleCopyFile = useCallback(
    async (file: FileInfo) => {
      const success = await window.electronAPI.copyFile(file.path)
      showToast(success ? `已复制: ${file.name}` : '复制失败')
    },
    [showToast]
  )

  const handleDragStart = useCallback((e: React.DragEvent, file: FileInfo) => {
    e.preventDefault()
    window.electronAPI.startDrag(file.path)
  }, [])

  const handleMouseEnter = useCallback((e: React.MouseEvent, file: FileInfo) => {
    setHoveredFile(file)
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico']
    if (!imageExts.includes(file.extension)) return
    previewTimer.current = setTimeout(() => {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setPreviewFile({ file, x: rect.right + 8, y: rect.top })
    }, 500)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredFile(null)
    if (previewTimer.current) {
      clearTimeout(previewTimer.current)
      previewTimer.current = null
    }
    setPreviewFile(null)
  }, [])

  const handleMenuAction = useCallback(
    async (action: string) => {
      if (!contextMenu) return
      const file = contextMenu.file
      switch (action) {
        case 'open':
          window.electronAPI.openFile(file.path)
          break
        case 'copy': {
          const success = await window.electronAPI.copyFile(file.path)
          showToast(success ? `已复制: ${file.name}` : '复制失败')
          break
        }
        case 'copy-path':
          await window.electronAPI.copyPath(file.path)
          showToast('已复制路径')
          break
        case 'show-in-explorer':
          window.electronAPI.showInExplorer(file.path)
          break
      }
      setContextMenu(null)
    },
    [contextMenu, showToast]
  )

  return (
    <div className="flex flex-col h-full" onClick={handleCloseContextMenu}>
      {/* macOS Spotlight 风格搜索栏 */}
      {files.length > 5 && (
        <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0">
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-mac-text-tertiary">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder="搜索"
              className="w-full pl-9 pr-3 py-[6px] rounded-lg bg-mac-surface text-[13px] text-mac-text placeholder-mac-text-tertiary outline-none border border-mac-border focus:border-mac-accent/50 focus:ring-1 focus:ring-mac-accent/20 transition-all"
            />
          </div>
        </div>
      )}

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-mac-text-tertiary">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] text-mac-text-tertiary">
              {searchQuery ? '没有匹配的文件' : '文件夹为空'}
            </span>
          </div>
        ) : (
          filteredFiles.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              onClick={() => handleCopyFile(file)}
              onDoubleClick={() => handleOpenFile(file)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              onDragStart={(e) => handleDragStart(e, file)}
              onMouseEnter={(e) => handleMouseEnter(e, file)}
              onMouseLeave={handleMouseLeave}
            />
          ))
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-glass-border text-[10px] text-white/25 flex-shrink-0">
        <span>{filteredFiles.length} 个文件</span>
        {hoveredFile ? (
          <span className="truncate max-w-[260px] text-white/40">
            {hoveredFile.name} · {hoveredFile.isDirectory ? '文件夹' : formatFileSize(hoveredFile.size)}
          </span>
        ) : (
          <span className="truncate max-w-[200px]" title={folderPath}>{folderPath.split('\\').pop() || folderPath.split('/').pop()}</span>
        )}
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onAction={handleMenuAction} onClose={handleCloseContextMenu} />
      )}
      {previewFile && (
        <Preview file={previewFile.file} x={previewFile.x} y={previewFile.y} />
      )}
    </div>
  )
}
