import type { FileInfo } from '../types'

/** 文件大小格式化 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/** 时间格式化 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 根据文件类型返回对应图标 SVG */
export function getFileIcon(file: FileInfo): JSX.Element {
  if (file.isDirectory) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    )
  }

  const ext = file.extension
  const iconColor = getColorByExtension(ext)

  /** 图片文件 */
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    )
  }

  /** 视频文件 */
  if (['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
        <rect width="14" height="12" x="2" y="6" rx="2" />
      </svg>
    )
  }

  /** 音频文件 */
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    )
  }

  /** 文档文件 */
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    )
  }

  /** 表格文件 */
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <rect width="8" height="6" x="8" y="12" rx="1" />
      </svg>
    )
  }

  /** 代码文件 */
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'md', 'sh', 'bat'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    )
  }

  /** 压缩文件 */
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 12v6" />
        <path d="m13 15-3-3-3 3" />
      </svg>
    )
  }

  /** 可执行文件 */
  if (['exe', 'msi', 'dmg', 'app'].includes(ext)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>
    )
  }

  /** 默认文件图标 */
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  )
}

/** 根据扩展名返回图标颜色 */
function getColorByExtension(ext: string): string {
  const colorMap: Record<string, string> = {
    // 图片
    png: '#22c55e', jpg: '#22c55e', jpeg: '#22c55e', gif: '#22c55e', bmp: '#22c55e', webp: '#22c55e', svg: '#22c55e', ico: '#22c55e',
    // 视频
    mp4: '#a855f7', avi: '#a855f7', mov: '#a855f7', mkv: '#a855f7', wmv: '#a855f7', flv: '#a855f7', webm: '#a855f7',
    // 音频
    mp3: '#f59e0b', wav: '#f59e0b', flac: '#f59e0b', aac: '#f59e0b', ogg: '#f59e0b', wma: '#f59e0b',
    // 文档
    pdf: '#ef4444', doc: '#3b82f6', docx: '#3b82f6', txt: '#94a3b8', rtf: '#3b82f6', odt: '#3b82f6',
    // 表格
    xls: '#22c55e', xlsx: '#22c55e', csv: '#22c55e',
    // 代码
    js: '#eab308', ts: '#3b82f6', jsx: '#06b6d4', tsx: '#06b6d4', py: '#3b82f6', java: '#ef4444',
    html: '#f97316', css: '#8b5cf6', json: '#eab308', md: '#6b7280',
    // 压缩
    zip: '#f59e0b', rar: '#f59e0b', '7z': '#f59e0b', tar: '#f59e0b', gz: '#f59e0b',
    // 可执行
    exe: '#ef4444', msi: '#ef4444', dmg: '#ef4444', app: '#ef4444'
  }
  return colorMap[ext] || '#6b7280'
}
