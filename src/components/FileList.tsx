import { useState, useCallback, useRef } from 'react'
import type { FileInfo } from '../types'
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
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 过滤文件 */
  const filteredFiles = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files

  /** 右键菜单 */
  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileInfo) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  /** 关闭右键菜单 */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  /** 双击打开文件 */
  const handleOpenFile = useCallback((file: FileInfo) => {
    window.electronAPI.openFile(file.path)
  }, [])

  /** 单击复制文件 */
  const handleCopyFile = useCallback(
    async (file: FileInfo) => {
      const success = await window.electronAPI.copyFile(file.path)
      if (success) {
        showToast(`已复制: ${file.name}`)
      } else {
        showToast('复制失败')
      }
    },
    [showToast]
  )

  /** 拖拽开始 */
  const handleDragStart = useCallback((e: React.DragEvent, file: FileInfo) => {
    e.preventDefault()
    window.electronAPI.startDrag(file.path)
  }, [])

  /** 悬停预览 */
  const handleMouseEnter = useCallback((e: React.MouseEvent, file: FileInfo) => {
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico']
    if (!imageExts.includes(file.extension)) return

    previewTimer.current = setTimeout(() => {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setPreviewFile({ file, x: rect.right + 8, y: rect.top })
    }, 500)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current)
      previewTimer.current = null
    }
    setPreviewFile(null)
  }, [])

  /** 右键菜单操作 */
  const handleMenuAction = useCallback(
    async (action: string) => {
      if (!contextMenu) return
      const file = contextMenu.file

      switch (action) {
        case 'open':
          window.electronAPI.openFile(file.path)
          break
        case 'copy':
          const success = await window.electronAPI.copyFile(file.path)
          showToast(success ? `已复制: ${file.name}` : '复制失败')
          break
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
      {/* 搜索栏 */}
      {files.length > 5 && (
        <div className="px-3 py-2 border-b border-glass-border flex-shrink-0">
          <div className="relative">
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文件..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-white/[0.04] border border-glass-border text-xs text-white/80 placeholder-white/20 outline-none focus:border-blue-400/40 transition-colors"
            />
          </div>
        </div>
      )}

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filteredFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/25 text-xs">
            {searchQuery ? '没有匹配的文件' : '文件夹为空'}
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
        <span>{files.length} 个文件</span>
        <span className="truncate max-w-[200px]" title={folderPath}>{folderPath}</span>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAction={handleMenuAction}
          onClose={handleCloseContextMenu}
        />
      )}

      {/* 图片预览 */}
      {previewFile && (
        <Preview
          file={previewFile.file}
          x={previewFile.x}
          y={previewFile.y}
        />
      )}
    </div>
  )
}
