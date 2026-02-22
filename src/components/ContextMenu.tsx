import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onAction: (action: string) => void
  onClose: () => void
}

const menuItems = [
  { action: 'open', label: '打开', shortcut: 'Enter', icon: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4' },
  { action: 'copy', label: '复制文件', shortcut: 'Ctrl+C', icon: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
  { action: 'copy-path', label: '复制路径', shortcut: '', icon: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
  { action: 'show-in-explorer', label: '在资源管理器中显示', shortcut: '', icon: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' }
]

export default function ContextMenu({ x, y, onAction, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  /** 确保菜单不超出窗口 */
  const adjustedX = Math.min(x, window.innerWidth - 220)
  const adjustedY = Math.min(y, window.innerHeight - 180)

  return (
    <div
      ref={ref}
      className="fixed z-[100] rounded-mac py-1 shadow-2xl pop-in"
      style={{
        left: adjustedX,
        top: adjustedY,
        background: 'var(--mac-popup-bg)',
        border: '1px solid var(--mac-popup-border)',
        minWidth: '200px',
        backdropFilter: 'blur(20px)',
      }}
    >
      {menuItems.map((item, i) => (
        <button
          key={item.action}
          onClick={(e) => { e.stopPropagation(); onAction(item.action) }}
          className={`w-full flex items-center gap-3 px-3 py-[6px] text-[13px] text-mac-text hover:bg-mac-accent hover:text-white transition-colors rounded-[4px] mx-1 ${
            i === 0 ? '' : ''
          }`}
          style={{ width: 'calc(100% - 8px)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-60">
            <path d={item.icon} />
          </svg>
          <span className="flex-1 text-left">{item.label}</span>
          {item.shortcut && (
            <span className="text-[11px] text-mac-text-tertiary">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  )
}
