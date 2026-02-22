interface TitleBarProps {
  alwaysOnTop: boolean
  theme: 'light' | 'dark'
  onTogglePin: () => void
  onToggleTheme: () => void
  onOpenSettings: () => void
  onMinimize: () => void
  onClose: () => void
}

export default function TitleBar({ alwaysOnTop, theme, onTogglePin, onToggleTheme, onOpenSettings, onMinimize, onClose }: TitleBarProps) {
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
      <div className="drag-region flex items-center justify-center gap-1.5 w-[120px]">
        <span className="text-mac-text-secondary text-[13px] font-medium">FloatFolder</span>
        {alwaysOnTop && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-mac-accent">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        )}
      </div>

      {/* 右侧：空白区域，保持布局平衡 */}
      <div className="w-[100px]" />
    </div>
  )
}
