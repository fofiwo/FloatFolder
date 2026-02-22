import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
  const previewFileRef = useRef<FileInfo | null>(null)
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<'name' | 'time'>('name')
  const [hoveredFile, setHoveredFile] = useState<FileInfo | null>(null)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const selectedPathsRef = useRef<Set<string>>(selectedPaths)
  const isDraggingRef = useRef(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctrlPressed = useRef(false)

  /** 同步 selectedPaths 到 ref，供 mousedown 闭包读取最新值 */
  useEffect(() => { selectedPathsRef.current = selectedPaths }, [selectedPaths])

  /** 监听 Ctrl 按键状态，按住时清除悬停效果 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !ctrlPressed.current) {
        ctrlPressed.current = true
        setHoveredFile(null)
        previewFileRef.current = null
        if (previewTimer.current) {
          clearTimeout(previewTimer.current)
          previewTimer.current = null
        }
        setPreviewFile(null)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlPressed.current = false
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  /** 过滤 + 排序：支持按名称（默认）和按时间倒序 */
  const sortedAndFilteredFiles = useMemo(() => {
    const filtered = searchQuery
      ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : files
    if (sortMode === 'time') {
      return [...filtered].sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      })
    }
    return filtered
  }, [files, searchQuery, sortMode])

  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileInfo) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  const handleCloseContextMenu = useCallback(() => { setContextMenu(null) }, [])

  const handleOpenFile = useCallback((file: FileInfo) => {
    window.electronAPI.openFile(file.path)
  }, [])

  /** 单击选择/多选文件 */
  const handleClick = useCallback(
    (e: React.MouseEvent, file: FileInfo) => {
      /** 拖拽刚结束，忽略本次 click */
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        return
      }

      /** 点击时立即关闭预览 */
      if (previewTimer.current) {
        clearTimeout(previewTimer.current)
        previewTimer.current = null
      }
      previewFileRef.current = null
      setPreviewFile(null)

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

  /** mousedown 检测拖拽手势，超过阈值后调用 Electron 原生拖拽 */
  const DRAG_THRESHOLD = 5
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, file: FileInfo) => {
      if (e.button !== 0) return
      if (e.ctrlKey || e.metaKey) return

      const startX = e.clientX
      const startY = e.clientY

      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - startX
        const dy = me.clientY - startY
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          isDraggingRef.current = true

          /** 关闭图片预览 */
          if (previewTimer.current) {
            clearTimeout(previewTimer.current)
            previewTimer.current = null
          }
          previewFileRef.current = null
          setPreviewFile(null)

          /** 调用 Electron 原生拖拽 */
          const paths = selectedPathsRef.current
          if (paths.has(file.path) && paths.size > 1) {
            window.electronAPI.startDrag(Array.from(paths))
          } else {
            window.electronAPI.startDrag(file.path)
          }
          cleanup()
        }
      }

      const onUp = () => cleanup()

      const cleanup = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    []
  )

  const handleMouseEnter = useCallback((e: React.MouseEvent, file: FileInfo) => {
    if (ctrlPressed.current) return
    setHoveredFile(file)
    mousePos.current = { x: e.clientX, y: e.clientY }
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico']
    if (!imageExts.includes(file.extension)) return
    previewTimer.current = setTimeout(() => {
      previewFileRef.current = file
      setPreviewFile({ file, x: mousePos.current.x + 16, y: mousePos.current.y + 8 })
    }, 200)
  }, [])

  /** 鼠标移动时实时更新预览位置 */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY }
    if (ctrlPressed.current) return
    if (previewFileRef.current) {
      setPreviewFile((prev) => prev ? { ...prev, x: e.clientX + 16, y: e.clientY + 8 } : null)
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredFile(null)
    previewFileRef.current = null
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
      {/* 工具栏：搜索 + 排序 */}
      {files.length > 5 && (
        <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
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
          <button
            onClick={() => setSortMode((prev) => (prev === 'name' ? 'time' : 'name'))}
            title={sortMode === 'name' ? '按名称排序' : '按时间倒序'}
            className="flex-shrink-0 p-1.5 rounded-lg bg-mac-surface border border-mac-border hover:border-mac-accent/50 transition-all text-mac-text-secondary hover:text-mac-text"
          >
            {sortMode === 'name' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h12M3 18h6" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1">
        {sortedAndFilteredFiles.length === 0 ? (
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
          sortedAndFilteredFiles.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              isSelected={selectedPaths.has(file.path)}
              onClick={(e: React.MouseEvent) => handleClick(e, file)}
              onDoubleClick={() => handleOpenFile(file)}
              onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, file)}
              onMouseDown={(e: React.MouseEvent) => handleMouseDown(e, file)}
              onMouseEnter={(e: React.MouseEvent) => handleMouseEnter(e, file)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          ))
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-glass-border text-[10px] text-white/25 flex-shrink-0">
        <span>{selectedPaths.size > 0 ? `已选 ${selectedPaths.size} / ` : ''}{sortedAndFilteredFiles.length} 个文件</span>
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
