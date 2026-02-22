import { useState } from 'react'

interface FloatingIconProps {
  onExpand: () => void
  onOpenSettings: () => void
  fileCount: number
  folderCount: number
}

/** Apple 风格悬浮图标，带呼吸灯效果 */
export default function FloatingIcon({ onExpand, onOpenSettings, fileCount, folderCount }: FloatingIconProps) {
  const [isHovering, setIsHovering] = useState(false)

  return (
    <div
      className="w-full h-full flex items-center justify-center drag-region"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative flex items-center justify-center">
        {/* 呼吸灯外圈 */}
        <div className="absolute w-[52px] h-[52px] rounded-[16px] bg-mac-accent/20 breathing-ring" />

        {/* 主图标容器 */}
        <button
          onClick={onExpand}
          onContextMenu={(e) => {
            e.preventDefault()
            onOpenSettings()
          }}
          className="no-drag relative w-[44px] h-[44px] rounded-[14px] flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
            boxShadow: isHovering
              ? '0 4px 20px rgba(0,122,255,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset'
              : '0 2px 10px rgba(0,122,255,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
          }}
          title="点击展开 · 右键设置"
        >
          {/* 文件夹图标 */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white drop-shadow-sm"
            strokeWidth="1.8"
            stroke="currentColor"
          >
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
          </svg>

          {/* 呼吸灯指示点 */}
          <div
            className="absolute -bottom-[3px] -right-[3px] w-[10px] h-[10px] rounded-full pulse-dot"
            style={{
              background: 'linear-gradient(135deg, #34c759, #30d158)',
              border: '2px solid var(--mac-bg)',
            }}
          />
        </button>

        {/* 悬停提示信息 */}
        {isHovering && (folderCount > 0 || fileCount > 0) && (
          <div
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-mac-text-secondary px-2 py-0.5 rounded-md pop-in"
            style={{
              background: 'var(--mac-popup-bg)',
              border: '1px solid var(--mac-popup-border)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {folderCount} 文件夹 · {fileCount} 文件
          </div>
        )}
      </div>
    </div>
  )
}
