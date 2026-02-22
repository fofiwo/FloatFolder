import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onAction: (action: string) => void
  onClose: () => void
}

const menuItems = [
  { action: 'open', label: '打开', icon: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4' },
  { action: 'copy', label: '复制文件', icon: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
  { action: 'copy-path', label: '复制路径', icon: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
  { action: 'show-in-explorer', label: '在资源管理器中显示', icon: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' }
]

export default function ContextMenu({ x, y, onAction, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
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
  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 100
  }

  return (
    <div
      ref={ref}
      className="rounded-lg py-1.5 shadow-xl border border-glass-border preview-popup"
      style={{ ...style, background: 'rgba(35, 35, 48, 0.98)', backdropFilter: 'blur(20px)', minWidth: '180px' }}
    >
      {menuItems.map((item) => (
        <button
          key={item.action}
          onClick={(e) => {
            e.stopPropagation()
            onAction(item.action)
          }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-white/40">
            <path d={item.icon} />
          </svg>
          {item.label}
        </button>
      ))}
    </div>
  )
}
