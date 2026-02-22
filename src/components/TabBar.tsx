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
        <div
          key={tab.path}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`group relative flex items-center gap-1.5 h-7 px-3 cursor-pointer text-[12px] flex-shrink-0 max-w-[180px] rounded-md transition-all duration-150 ${
            index === activeIndex
              ? 'bg-mac-elevated text-mac-text shadow-sm'
              : 'text-mac-text-tertiary hover:text-mac-text-secondary hover:bg-white/[0.04]'
          } ${dragIndex === index ? 'opacity-40' : ''} ${dropIndex === index ? 'ring-1 ring-mac-accent/50' : ''}`}
          onClick={() => onTabChange(index)}
          title={tab.path}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
            className={`flex-shrink-0 ${index === activeIndex ? 'stroke-mac-accent' : 'stroke-current'}`} strokeWidth="2">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          </svg>

          <span className="truncate">{tab.name}</span>

          <span className={`text-[10px] flex-shrink-0 ${
            index === activeIndex ? 'text-mac-text-secondary' : 'text-mac-text-tertiary'
          }`}>{tab.files.length}</span>

          <button
            onClick={(e) => { e.stopPropagation(); onTabRemove(index) }}
            className="ml-0.5 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10 transition-all flex-shrink-0"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1L7 7M7 1L1 7" />
            </svg>
          </button>
        </div>
      ))}

      <button
        onClick={onAddTab}
        className="w-7 h-7 flex items-center justify-center rounded-md text-mac-text-tertiary hover:text-mac-text-secondary hover:bg-white/[0.06] transition-all flex-shrink-0"
        title="添加文件夹"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
