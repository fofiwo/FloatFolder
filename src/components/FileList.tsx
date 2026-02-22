import { useState, useCallback, useRef } from 'react'
import type { FileInfo } from '../types'
import FileItem from './FileItem'
import FileCard from './FileCard'
import ContextMenu from './ContextMenu'
import Preview from './Preview'

type ViewMode = 'list' | 'card'

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
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredFiles = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files

  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileInfo) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleOpenFile = useCallback((file: FileInfo) => {
    window.electronAPI.openFile(file.path)
  }, [])

  /** 单击选择/多选文件 */
  const handleClick = useCallback(
    (e: React.MouseEvent, file: FileInfo) => {
      if (e.ctrlKey || e.metaKey) {
        /** Ctrl+单击：切换多选 */
        setSelectedPaths((prev) => {
          const next = new Set(prev)
          if (next.has(file.path)) {
            next.delete(file.path)
          } else {
            next.add(file.path)
          }
          return next
        })
      } else {
        /** 普通单击：选中并复制 */
        setSelectedPaths(new Set([file.path]))
        window.electronAPI.copyFile(file.path).then((success) => {
          showToast(success ? `已复制: ${file.name}` : '复制失败')
        })
      }
    },
    [showToast]
  )

  /** 拖拽开始（支持多选拖拽） */
  const handleDragStart = useCallback(
    (e: React.DragEvent, file: FileInfo) => {
      e.preventDefault()
      if (selectedPaths.has(file.path) && selectedPaths.size > 1) {
        window.electronAPI.startDrag(Array.from(selectedPaths))
      } else {
        window.electronAPI.startDrag(file.path)
      }
    },
    [selectedPaths]
  )

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

  /** 右键菜单操作（支持多选批量操作） */
  const handleMenuAction = useCallback(
    async (action: string) => {
      if (!contextMenu) return
      const file = contextMenu.file

      /** 收集选中文件（包含右键点击的文件） */
      const selected = selectedPaths.has(file.path) && selectedPaths.size > 1
        ? Array.from(selectedPaths)
        : [file.path]

      switch (action) {
        case 'open':
          window.electronAPI.openFile(file.path)
          break
        case 'copy': {
          const success = await window.electronAPI.copyFile(selected)
          if (success) {
            showToast(selected.length > 1 ? `已复制 ${selected.length} 个文件` : `已复制: ${file.name}`)
          } else {
            showToast('复制失败')
          }
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
    [contextMenu, selectedPaths, showToast]
  )

  return (
    <div className="flex flex-col h-full" onClick={handleCloseContextMenu}>
      {/* macOS Spotlight 风格搜索栏 */}
      {files.length > 5 && (
        <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0">
          <div className="relative">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-mac-text-tertiary"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder="搜索"
              className="w-full pl-9 pr-3 py-[6px] rounded-lg bg-mac-surface text-[13px] text-mac-text placeholder-mac-text-tertiary outline-none border border-mac-border focus:border-mac-accent/50 focus:ring-1 focus:ring-mac-accent/20 transition-all mac-focus"
            />
          </div>
        </div>
      )}

      {/* 文件列表/卡片 */}
      <div className={`flex-1 overflow-y-auto py-1 ${
        viewMode === 'card' ? 'px-2' : 'px-1'
      }`}>
        {filteredFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/25 text-xs">
            {searchQuery ? '没有匹配的文件' : '文件夹为空'}
          </div>
        ) : viewMode === 'list' ? (
          filteredFiles.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              isSelected={selectedPaths.has(file.path)}
              onClick={(e: React.MouseEvent) => handleClick(e, file)}
              onDoubleClick={() => handleOpenFile(file)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              onDragStart={(e) => handleDragStart(e, file)}
              onMouseEnter={(e) => handleMouseEnter(e, file)}
              onMouseLeave={handleMouseLeave}
            />
          ))
        ) : (
          <div className="grid grid-cols-3 gap-1.5 p-1">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.path}
                file={file}
                isSelected={selectedPaths.has(file.path)}
                onClick={(e: React.MouseEvent) => handleClick(e, file)}
                onDoubleClick={() => handleOpenFile(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                onDragStart={(e) => handleDragStart(e, file)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-glass-border text-[10px] text-white/25 flex-shrink-0">
        <span>{selectedPaths.size > 0 ? `已选 ${selectedPaths.size} / ` : ''}{files.length} 个文件</span>
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
