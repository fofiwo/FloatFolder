import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface FloatingIconProps {
  onExpand: () => void
  onOpenSettings: () => void
  fileCount: number
  folderCount: number
}

/** Apple 风格悬浮图标，带呼吸灯效果 */
export default function FloatingIcon({ onExpand, onOpenSettings, fileCount, folderCount }: FloatingIconProps) {
  const [isHovering, setIsHovering] = useState(false)
  const hoverExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDraggingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const pointerDownRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (hoverExpandTimer.current) {
        clearTimeout(hoverExpandTimer.current)
        hoverExpandTimer.current = null
      }
    }
  }, [])

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX,
      offsetY: e.clientY,
    }
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = pointerDownRef.current
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const dist = Math.hypot(dx, dy)
    if (isDraggingRef.current || dist < 4) return

    /** 达到拖拽阈值：启动主进程自定义拖拽 */
    isDraggingRef.current = true
    suppressClickRef.current = true

    if (hoverExpandTimer.current) {
      clearTimeout(hoverExpandTimer.current)
      hoverExpandTimer.current = null
    }

    window.electronAPI.startIconDrag(start.offsetX, start.offsetY)
  }

  const handlePointerUpOrCancel = () => {
    pointerDownRef.current = null
    if (isDraggingRef.current) {
      window.electronAPI.stopIconDrag()
      isDraggingRef.current = false
    }
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onExpand()
  }

  const handleMouseEnter = () => {
    if (isDraggingRef.current) return
    setIsHovering(true)

    /**
     * 悬停自动展开（轻微延迟用于过滤“路过”）
     * - 只在图标模式窗口内触发
     */
    if (hoverExpandTimer.current) clearTimeout(hoverExpandTimer.current)
    hoverExpandTimer.current = setTimeout(() => {
      onExpand()
    }, 60)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    if (hoverExpandTimer.current) {
      clearTimeout(hoverExpandTimer.current)
      hoverExpandTimer.current = null
    }
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center drag-region"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Siri 光晕：用 conic + blur 做“呼吸灯” */}
        <div
          className="pointer-events-none absolute w-[120px] h-[120px] rounded-full siri-halo"
          style={{
            background:
              'conic-gradient(from 180deg, rgba(10,132,255,0.0), rgba(10,132,255,0.55), rgba(52,199,89,0.45), rgba(255,214,10,0.35), rgba(255,69,58,0.32), rgba(88,86,214,0.5), rgba(10,132,255,0.0))',
            filter: 'blur(18px)',
          }}
        />

        {/* 主 orb：圆形 3D 立体质感 */}
        <button
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          onContextMenu={(e) => {
            e.preventDefault()

            /** 右键时不触发展开 */
            if (hoverExpandTimer.current) {
              clearTimeout(hoverExpandTimer.current)
              hoverExpandTimer.current = null
            }
            onOpenSettings()
          }}
          className="no-drag siri-orb relative w-[56px] h-[56px] rounded-full flex items-center justify-center cursor-pointer transition-[filter,box-shadow] duration-150 active:brightness-95"
          style={{
            background:
              'radial-gradient(120% 120% at 30% 25%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.10) 35%, rgba(0,0,0,0.12) 100%), linear-gradient(135deg, rgba(10,132,255,0.95) 0%, rgba(88,86,214,0.92) 55%, rgba(255,69,58,0.72) 100%)',
            boxShadow: isHovering
              ? '0 10px 30px rgba(0,0,0,0.25), 0 6px 18px rgba(10,132,255,0.35), inset 0 1px 0 rgba(255,255,255,0.28)'
              : '0 8px 22px rgba(0,0,0,0.22), 0 4px 14px rgba(10,132,255,0.28), inset 0 1px 0 rgba(255,255,255,0.22)',
          }}
          title="悬停展开 · 右键设置"
        >
          {/* 轻薄高光扫过 */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full overflow-hidden"
            style={{
              maskImage: 'radial-gradient(circle at 50% 45%, black 55%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black 55%, transparent 80%)',
            }}
          >
            {/* 内部流光：旋转的彩色能量层（更像 Siri 的“活体”效果） */}
            <div
              className="siri-flow absolute inset-0"
              style={{
                background:
                  'conic-gradient(from 90deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.0) 40deg, rgba(255,255,255,0.18) 70deg, rgba(255,255,255,0) 110deg, rgba(255,255,255,0.0) 180deg, rgba(255,255,255,0.14) 220deg, rgba(255,255,255,0) 280deg, rgba(255,255,255,0) 360deg)',
                mixBlendMode: 'screen',
                opacity: 0.55,
                filter: 'blur(0.5px)',
              }}
            />

            <div
              className="siri-sheen absolute -inset-y-10 -left-1/2 w-[140%]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent)',
                filter: 'blur(1px)',
              }}
            />
          </div>

          {/* 功能暗示：极简文件夹 glyph（更像 Siri “内部符号” 而不是按钮） */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/90 drop-shadow-sm"
            strokeWidth="1.7"
            stroke="currentColor"
          >
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          </svg>
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
