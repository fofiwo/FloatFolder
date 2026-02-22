import { memo } from 'react'

interface TitleBarProps {
  alwaysOnTop: boolean
  theme: 'light' | 'dark'
  onTogglePin: () => void
  onToggleTheme: () => void
  onOpenSettings: () => void
  onMinimize: () => void
  onClose: () => void
}

export default memo(function TitleBar({ alwaysOnTop, theme, onTogglePin, onToggleTheme, onOpenSettings, onMinimize, onClose }: TitleBarProps) {
  return (
    <div className="flex items-center h-11 px-4 flex-shrink-0 border-b border-mac-border transition-colors duration-150">
      {/* 左侧：macOS 红绿灯按钮 */}
      <div className="flex items-center gap-2 no-drag traffic-group w-[100px]">
        <button onClick={onClose} className="traffic-btn no-drag" style={{ background: '#ff5f57' }} title="隐藏到托盘" aria-label="隐藏到托盘">
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" stroke="#4a0002" strokeWidth="1.2">
            <path d="M0.5 0.5L5.5 5.5M5.5 0.5L0.5 5.5" />
          </svg>
        </button>
        <button onClick={onMinimize} className="traffic-btn no-drag" style={{ background: '#febc2e' }} title="最小化" aria-label="最小化">
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" stroke="#995700" strokeWidth="1.2">
            <path d="M0.5 3H5.5" />
          </svg>
        </button>
        <button onClick={onTogglePin} className="traffic-btn no-drag" style={{ background: '#28c840' }} title={alwaysOnTop ? '取消置顶' : '置顶窗口'} aria-label={alwaysOnTop ? '取消置顶' : '置顶窗口'}>
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" stroke="#006500" strokeWidth="1.2">
            {alwaysOnTop ? (
              <>
                <path d="M1 3.5L3 1.5L5 3.5" />
                <path d="M1 2.5L3 4.5L5 2.5" />
              </>
            ) : (
              <>
                <path d="M0.5 1.5L3 4L5.5 1.5" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* 中间：标题 - 可拖拽区域 */}
      <div className="drag-region flex-1 flex items-center justify-center gap-1.5">
        <span className="text-mac-text-secondary text-[13px] font-medium">FloatFolder</span>
        {alwaysOnTop && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-mac-accent">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        )}
      </div>

      {/* 右侧：设置和主题切换按钮 */}
      <div className="flex items-center justify-end gap-1 no-drag w-[100px]">
        <button
          onClick={onToggleTheme}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-mac-overlay transition-colors duration-150"
          title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
        >
          {theme === 'light' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mac-text-secondary">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mac-text-secondary">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
        <button
          onClick={onOpenSettings}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-mac-overlay transition-colors duration-150"
          title="设置"
          aria-label="设置"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mac-text-secondary">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
})
