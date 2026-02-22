interface TitleBarProps {
  alwaysOnTop: boolean
  theme: 'light' | 'dark'
  onTogglePin: () => void
  onToggleTheme: () => void
  onMinimize: () => void
  onClose: () => void
}

export default function TitleBar({ alwaysOnTop, theme, onTogglePin, onToggleTheme, onMinimize, onClose }: TitleBarProps) {
  return (
    <div className="drag-region flex items-center justify-between h-11 px-4 flex-shrink-0 border-b border-mac-border transition-colors duration-200">
      {/* macOS 红绿灯按钮 */}
      <div className="flex items-center gap-2 no-drag traffic-group">
        <button onClick={onClose} className="traffic-btn" style={{ background: '#ff5f57' }} title="隐藏到托盘">
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" stroke="#4a0002" strokeWidth="1.2">
            <path d="M0.5 0.5L5.5 5.5M5.5 0.5L0.5 5.5" />
          </svg>
        </button>
        <button onClick={onMinimize} className="traffic-btn" style={{ background: '#febc2e' }} title="最小化">
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" stroke="#995700" strokeWidth="1.2">
            <path d="M0.5 3H5.5" />
          </svg>
        </button>
        <button onClick={onTogglePin} className="traffic-btn" style={{ background: '#28c840' }} title={alwaysOnTop ? '取消置顶' : '置顶窗口'}>
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

      {/* 标题 */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        <span className="text-mac-text-secondary text-[13px] font-medium">FloatFolder</span>
        {alwaysOnTop && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-mac-accent">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        )}
      </div>

      {/* 主题切换按钮 */}
      <button
        onClick={onToggleTheme}
        className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-mac-text-tertiary hover:text-mac-text-secondary hover:bg-mac-overlay-strong transition-all"
        title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
      >
        {theme === 'dark' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </div>
  )
}
