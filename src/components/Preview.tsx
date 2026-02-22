import { useState, useEffect } from 'react'
import type { FileInfo } from '../types'

interface PreviewProps {
  file: FileInfo
  x: number
  y: number
}

export default function Preview({ file, x, y }: PreviewProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.electronAPI.getThumbnail(file.path).then((data) => {
      if (!cancelled && data) setThumbnail(data)
    })
    return () => { cancelled = true }
  }, [file.path])

  if (!thumbnail) return null

  return (
    <div
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
}
