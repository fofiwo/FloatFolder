import { useState, useRef, useCallback } from 'react'
import type { FolderTab } from '../types'

interface TabBarProps {
  tabs: FolderTab[]
  activeIndex: number
  onTabChange: (index: number) => void
  onTabRemove: (index: number) => void
  onAddTab: () => void
  onTabReorder: (fromIndex: number, toIndex: number) => void
}

export default function TabBar({ tabs, activeIndex, onTabChange, onTabRemove, onAddTab, onTabReorder }: TabBarProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const dragStartX = useRef(0)
  const isDragging = useRef(false)

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    isDragging.current = true
    setDragIndex(index)
    dragStartX.current = e.clientX
    e.dataTransfer.effectAllowed = 'move'
    /** 设置透明拖拽图像 */
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(img, 0, 0)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndex !== null && index !== dragIndex) {
      setDropIndex(index)
    }
  }, [dragIndex])

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      onTabReorder(dragIndex, dropIndex)
    }
    setDragIndex(null)
    setDropIndex(null)
    isDragging.current = false
  }, [dragIndex, dropIndex, onTabReorder])

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-mac-border flex-shrink-0 overflow-x-auto no-drag bg-mac-bg"
      style={{ scrollbarWidth: 'none' }}>
      {tabs.map((tab, index) => (
        (() => {
          const isActive = index === activeIndex
          return (
        <div
          key={tab.path}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`group relative flex items-center gap-1.5 h-7 px-3 cursor-pointer text-[12px] flex-shrink-0 max-w-[180px] rounded-md border transition-all duration-150 ${
            isActive
              ? 'bg-mac-surface text-mac-text border-mac-border-strong shadow-sm'
              : 'bg-transparent text-mac-text-tertiary border-transparent hover:text-mac-text-secondary hover:bg-mac-overlay hover:border-mac-border'
          } ${isActive ? 'after:absolute after:inset-x-2 after:-bottom-[2px] after:h-[2px] after:rounded-full after:bg-mac-accent' : ''} ${dragIndex === index ? 'opacity-40' : ''} ${dropIndex === index ? 'ring-1 ring-mac-accent/50' : ''}`}
          onClick={() => onTabChange(index)}
          title={tab.path}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
            className={`flex-shrink-0 ${isActive ? 'stroke-mac-accent' : 'stroke-current'}`} strokeWidth="2">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          </svg>

          <span className="truncate">{tab.name}</span>

          <span
            className={`ml-0.5 text-[10px] leading-none flex-shrink-0 px-1.5 h-4 inline-flex items-center justify-center rounded-full border ${
              isActive
                ? 'bg-[var(--mac-selected-bg)] text-mac-accent border-mac-accent/20'
                : 'bg-mac-overlay-strong text-mac-text-tertiary border-transparent group-hover:border-mac-border'
            }`}
          >
            {tab.files.length}
          </span>

          <button
            onClick={(e) => { e.stopPropagation(); onTabRemove(index) }}
            aria-label="关闭标签页"
            className="ml-0.5 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full hover:bg-mac-overlay-strong transition-all flex-shrink-0"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1L7 7M7 1L1 7" />
            </svg>
          </button>
        </div>
          )
        })()
      ))}

      <button
        onClick={onAddTab}
        className="w-7 h-7 flex items-center justify-center rounded-md text-mac-text-tertiary hover:text-mac-text-secondary hover:bg-mac-overlay-strong transition-all flex-shrink-0"
        title="添加文件夹"
        aria-label="添加文件夹"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
