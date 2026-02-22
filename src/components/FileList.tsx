import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react'
import type { FileInfo } from '../types'
import { formatFileSize } from '../lib/utils'
import FileItem from './FileItem'
import FileCard from './FileCard'
import ContextMenu from './ContextMenu'
import Preview from './Preview'
import type { PreviewHandle } from './Preview'

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

export default memo(function FileList({ files, folderPath, showToast }: FileListProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const contextMenuOpenRef = useRef(false)
  const [previewFile, setPreviewFile] = useState<{ file: FileInfo; x: number; y: number } | null>(null)
  const previewFileRef = useRef<FileInfo | null>(null)
  const previewRef = useRef<PreviewHandle>(null)
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<'name' | 'time'>('name')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [hoveredFile, setHoveredFile] = useState<FileInfo | null>(null)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const selectedPathsRef = useRef<Set<string>>(selectedPaths)
  const isDraggingRef = useRef(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctrlPressed = useRef(false)
  const shiftPressed = useRef(false)
  const lastClickedIndex = useRef<number>(-1)

  /** 虚拟滚动相关 */
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(600)
  const rafId = useRef<number>(0)
  const ITEM_HEIGHT = 46
  const OVERSCAN = 8

  /** 文件路径 -> FileInfo 映射，用于 data-path 事件委托模式 */
  const fileMap = useMemo(() => {
    const map = new Map<string, FileInfo>()
    files.forEach((f) => map.set(f.path, f))
    return map
  }, [files])

  /** Tab 切换时重置滚动和选择状态 */
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
    setScrollTop(0)
    setSelectedPaths(new Set())
    setSearchQuery('')
    lastClickedIndex.current = -1
  }, [folderPath])

  /** 监听滚动容器尺寸变化 */
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setViewportHeight(entries[0].contentRect.height)
    })
    observer.observe(el)
    setViewportHeight(el.clientHeight)
    return () => observer.disconnect()
  }, [])

  /** 滚动事件处理（RAF 节流） */
  const handleListScroll = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        setScrollTop(scrollContainerRef.current.scrollTop)
      }
    })
  }, [])

  /** 组件卸载时清理 RAF */
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  /** 同步 selectedPaths 到 ref，供 mousedown 闭包读取最新值 */
  useEffect(() => { selectedPathsRef.current = selectedPaths }, [selectedPaths])

  /** ContextMenu 打开期间：抑制悬停预览（避免右键单击触发图片预览造成视线污染） */
  useEffect(() => { contextMenuOpenRef.current = !!contextMenu }, [contextMenu])

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
      if (e.key === 'Shift' && !shiftPressed.current) {
        shiftPressed.current = true
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
      if (e.key === 'Shift') {
        shiftPressed.current = false
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

  /** 虚拟滚动：计算可见范围 */
  const totalHeight = sortedAndFilteredFiles.length * ITEM_HEIGHT
  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN)
  const endIdx = Math.min(sortedAndFilteredFiles.length, Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + OVERSCAN)
  const visibleFiles = sortedAndFilteredFiles.slice(startIdx, endIdx)
  const topPadding = startIdx * ITEM_HEIGHT
  const bottomPadding = Math.max(0, (sortedAndFilteredFiles.length - endIdx) * ITEM_HEIGHT)

  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileInfo) => {
    e.preventDefault()
    e.stopPropagation()

    /** 立即标记菜单打开，避免异步 setState 时序下短暂触发悬停预览 */
    contextMenuOpenRef.current = true

    /** 右键打开菜单时，立即关闭悬停预览（否则会和菜单叠在一起） */
    if (previewTimer.current) {
      clearTimeout(previewTimer.current)
      previewTimer.current = null
    }
    previewFileRef.current = null
    setPreviewFile(null)

    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    contextMenuOpenRef.current = false
    setContextMenu(null)
  }, [])

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

      const currentIndex = sortedAndFilteredFiles.findIndex((f) => f.path === file.path)

      if (e.shiftKey && lastClickedIndex.current >= 0) {
        /** Shift+单击：范围选择 */
        const start = Math.min(lastClickedIndex.current, currentIndex)
        const end = Math.max(lastClickedIndex.current, currentIndex)
        const rangePaths = sortedAndFilteredFiles.slice(start, end + 1).map((f) => f.path)
        if (e.ctrlKey || e.metaKey) {
          /** Ctrl+Shift：追加范围到现有选择 */
          setSelectedPaths((prev) => {
            const next = new Set(prev)
            rangePaths.forEach((p) => next.add(p))
            return next
          })
        } else {
          /** 纯 Shift：替换为范围选择 */
          setSelectedPaths(new Set(rangePaths))
        }
      } else if (e.ctrlKey || e.metaKey) {
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
        lastClickedIndex.current = currentIndex
      } else {
        /** 普通单击：选中并复制 */
        setSelectedPaths(new Set([file.path]))
        lastClickedIndex.current = currentIndex
        window.electronAPI.copyFile(file.path).then((success) => {
          showToast(success ? `已复制\n${file.name}` : '复制失败')
        })
      }
    },
    [showToast, sortedAndFilteredFiles]
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

    /** 右键菜单打开期间不触发悬停图片预览 */
    if (contextMenuOpenRef.current) return

    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico']
    if (!imageExts.includes(file.extension)) return
    previewTimer.current = setTimeout(() => {
      previewFileRef.current = file
      setPreviewFile({ file, x: mousePos.current.x + 16, y: mousePos.current.y + 8 })
    }, 200)
  }, [])

  /** 鼠标移动时通过 ref 直接更新 DOM 位置，避免 setState 触发整棵树重渲染 */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY }
    if (ctrlPressed.current) return
    if (contextMenuOpenRef.current) return
    if (previewFileRef.current && previewRef.current) {
      previewRef.current.updatePosition(e.clientX + 16, e.clientY + 8)
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
            showToast(selected.length > 1 ? `已复制\n${selected.length} 个文件` : `已复制\n${file.name}`)
          } else {
            showToast('复制失败')
          }
          break
        }
        case 'copy-path':
          await window.electronAPI.copyPath(file.path)
          showToast('已复制\n路径')
          break
        case 'show-in-explorer':
          window.electronAPI.showInExplorer(file.path)
          break
      }
      contextMenuOpenRef.current = false
      setContextMenu(null)
    },
    [contextMenu, selectedPaths, showToast]
  )

  return (
    <div className="flex flex-col h-full" onClick={handleCloseContextMenu}>
      {/* 工具栏：搜索 + 视图切换 + 排序 */}
      {files.length > 0 && (
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
            onClick={() => setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'))}
            title={viewMode === 'list' ? '切换到网格视图' : '切换到列表视图'}
            aria-label={viewMode === 'list' ? '切换到网格视图' : '切换到列表视图'}
            className="flex-shrink-0 p-1.5 rounded-lg bg-mac-surface border border-mac-border hover:border-mac-accent/50 transition-all text-mac-text-secondary hover:text-mac-text"
          >
            {viewMode === 'list' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setSortMode((prev) => (prev === 'name' ? 'time' : 'name'))}
            title={sortMode === 'name' ? '按名称排序' : '按时间倒序'}
            aria-label={sortMode === 'name' ? '按名称排序' : '按时间倒序'}
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

      {/* 文件列表（虚拟滚动） */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-1.5 py-1" onScroll={handleListScroll}>
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
          <div style={{ paddingTop: topPadding, paddingBottom: bottomPadding }}>
            {visibleFiles.map((file) => (
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
            ))}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-mac-border text-[10px] text-mac-text-tertiary flex-shrink-0 transition-colors duration-150">
        <span>{selectedPaths.size > 0 ? `已选 ${selectedPaths.size} / ` : ''}{sortedAndFilteredFiles.length} 个文件</span>
        {hoveredFile ? (
          <span className="truncate max-w-[260px] text-mac-text-secondary">
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
        <Preview ref={previewRef} file={previewFile.file} x={previewFile.x} y={previewFile.y} />
      )}
    </div>
  )
})
