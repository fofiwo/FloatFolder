import { useState, useEffect, memo, useRef, useImperativeHandle, forwardRef } from 'react'
import type { FileInfo } from '../types'

interface PreviewProps {
  file: FileInfo
  x: number
  y: number
}

export interface PreviewHandle {
  updatePosition: (x: number, y: number) => void
}

/** 预览组件：使用 getSmallThumbnail 替代全尺寸 getThumbnail，加载更快 */
const Preview = memo(forwardRef<PreviewHandle, PreviewProps>(function Preview({ file, x, y }, ref) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  /** 暴露 updatePosition 方法，父组件通过 ref 直接操作 DOM 避免 setState */
  useImperativeHandle(ref, () => ({
    updatePosition: (nx: number, ny: number) => {
      if (containerRef.current) {
        containerRef.current.style.left = `${Math.min(nx, window.innerWidth - 240)}px`
        containerRef.current.style.top = `${Math.min(ny, window.innerHeight - 240)}px`
      }
    }
  }), [])

  useEffect(() => {
    let cancelled = false
    /** 使用 220px 缩略图而非全尺寸图片，大幅减少 IPC 传输量 */
    window.electronAPI.getSmallThumbnail(file.path, 220).then((data) => {
      if (!cancelled && data) setThumbnail(data)
    })
    return () => { cancelled = true }
  }, [file.path])

  if (!thumbnail) return null

  return (
    <div
      ref={containerRef}
      className="fixed z-[55] rounded-mac-lg overflow-hidden shadow-2xl pointer-events-none"
      style={{
        left: Math.min(x, window.innerWidth - 240),
        top: Math.min(y, window.innerHeight - 240),
        background: 'var(--mac-popup-bg)',
        border: '1px solid var(--mac-popup-border)',
        maxWidth: '220px',
      }}
    >
      <img
        src={thumbnail}
        alt={file.name}
        className="w-full object-contain"
        style={{ maxWidth: '220px', maxHeight: '200px' }}
      />
      <div className="px-3 py-1.5 text-[11px] text-mac-text-secondary truncate text-center bg-mac-overlay-strong">
        {file.name}
      </div>
    </div>
  )
}))

export default Preview
