import { useState } from 'react'

interface TitleBarProps {
  alwaysOnTop: boolean
  onTogglePin: () => void
  onMinimize: () => void
  onClose: () => void
}

export default function TitleBar({ alwaysOnTop, onTogglePin, onMinimize, onClose }: TitleBarProps) {
  return (
    <div className="drag-region flex items-center justify-between h-9 px-3 border-b border-glass-border flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-white/80 text-xs font-medium tracking-wide">FloatFolder</span>
      </div>

      <div className="flex items-center gap-1 no-drag">
        {/* 置顶按钮 */}
        <button
          onClick={onTogglePin}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
            alwaysOnTop
              ? 'text-blue-400 bg-blue-400/15 hover:bg-blue-400/25'
              : 'text-white/40 hover:text-white/70 hover:bg-white/10'
          }`}
          title={alwaysOnTop ? '取消置顶' : '置顶窗口'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
          </svg>
        </button>

        {/* 最小化 */}
        <button
          onClick={onMinimize}
          className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
          title="最小化"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>

        {/* 关闭（隐藏到托盘） */}
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-red-400 hover:bg-red-400/15 transition-colors"
          title="隐藏到托盘"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
