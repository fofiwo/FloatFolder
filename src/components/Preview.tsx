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
      if (!cancelled && data) {
        setThumbnail(data)
      }
    })
    return () => { cancelled = true }
  }, [file.path])

  if (!thumbnail) return null

  return (
    <div
      className="fixed z-50 rounded-lg overflow-hidden shadow-2xl border border-glass-border preview-popup"
      style={{
        left: Math.min(x, window.innerWidth - 220),
        top: Math.min(y, window.innerHeight - 220),
        background: 'rgba(30, 30, 42, 0.98)',
        maxWidth: '200px',
        maxHeight: '200px'
      }}
    >
      <img
        src={thumbnail}
        alt={file.name}
        className="w-full h-full object-contain"
        style={{ maxWidth: '200px', maxHeight: '180px' }}
      />
      <div className="px-2 py-1 text-[10px] text-white/50 truncate text-center border-t border-glass-border">
        {file.name}
      </div>
    </div>
  )
}
