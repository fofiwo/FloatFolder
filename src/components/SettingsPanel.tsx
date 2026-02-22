import { useState, useCallback, useEffect, useRef } from 'react'

interface SettingsPanelProps {
  currentHotkey: string
  alwaysOnTop: boolean
  onHotkeyChange: (hotkey: string) => void
  onClose: () => void
}

/** Electron 快捷键修饰符映射 */
const KEY_MAP: Record<string, string> = {
  Control: 'Ctrl',
  Meta: 'Super',
  Alt: 'Alt',
  Shift: 'Shift',
}

/** 将 KeyboardEvent.key 转换为 Electron accelerator 格式 */
function keyToAccelerator(e: KeyboardEvent): string | null {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Super')

  const key = e.key
  if (Object.keys(KEY_MAP).includes(key)) return null

  if (key.length === 1) {
    parts.push(key.toUpperCase())
  } else if (key.startsWith('F') && key.length <= 3) {
    parts.push(key)
  } else if (key === ' ') {
    parts.push('Space')
  } else if (key === 'Escape') {
    return null
  } else {
    parts.push(key)
  }

  if (parts.length < 2) return null
  return parts.join('+')
}

/** 将 Electron accelerator 格式转为友好显示 */
function formatHotkey(hotkey: string): string {
  if (!hotkey) return '未设置'
  return hotkey
    .replace('Ctrl', '⌃')
    .replace('Alt', '⌥')
    .replace('Shift', '⇧')
    .replace('Super', '⊞')
    .replace(/\+/g, ' ')
}

export default function SettingsPanel({ currentHotkey, alwaysOnTop, onHotkeyChange, onClose }: SettingsPanelProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [pendingHotkey, setPendingHotkey] = useState('')
  const inputRef = useRef<HTMLDivElement>(null)

  /** 监听快捷键录制 */
  useEffect(() => {
    if (!isRecording) return

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setIsRecording(false)
        setPendingHotkey('')
        return
      }

      const accelerator = keyToAccelerator(e)
      if (accelerator) {
        setPendingHotkey(accelerator)
        setIsRecording(false)
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isRecording])

  /** 保存快捷键 */
  const handleSave = useCallback(() => {
    if (pendingHotkey) {
      onHotkeyChange(pendingHotkey)
      setPendingHotkey('')
    }
  }, [pendingHotkey, onHotkeyChange])

  /** 清除快捷键 */
  const handleClear = useCallback(() => {
    setPendingHotkey('')
    onHotkeyChange('')
  }, [onHotkeyChange])

  const displayHotkey = pendingHotkey || currentHotkey

  return (
    <div className="w-full h-full flex flex-col bg-mac-bg">
      {/* 标题栏 */}
      <div className="drag-region flex items-center justify-between h-11 px-4 flex-shrink-0 border-b border-mac-border">
        <button
          onClick={onClose}
          className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-mac-text-secondary hover:text-mac-text hover:bg-mac-overlay-strong transition-all"
          title="返回"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-mac-text-secondary text-[13px] font-medium">设置</span>
        <div className="w-7" />
      </div>

      {/* 设置内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* 快捷键唤醒 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-mac-accent">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
            <span className="text-[13px] text-mac-text font-medium">快捷键唤醒</span>
          </div>
          <p className="text-[11px] text-mac-text-tertiary mb-3">
            设置全局快捷键以快速展开/收起面板
          </p>

          {/* 快捷键显示区域 */}
          <div
            ref={inputRef}
            onClick={() => setIsRecording(true)}
            className={`hotkey-input cursor-pointer flex items-center justify-between min-h-[36px] ${
              isRecording ? 'border-mac-accent shadow-[0_0_0_3px_var(--mac-selected-ring)]' : ''
            }`}
          >
            {isRecording ? (
              <span className="text-mac-accent text-[12px]">请按下组合键...</span>
            ) : (
              <span className={`text-[13px] ${displayHotkey ? 'text-mac-text' : 'text-mac-text-tertiary'}`}>
                {displayHotkey ? formatHotkey(displayHotkey) : '点击设置快捷键'}
              </span>
            )}
            {displayHotkey && !isRecording && (
              <span className="text-[11px] text-mac-text-tertiary font-mono">{displayHotkey}</span>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 mt-2">
            {pendingHotkey && (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-md bg-mac-accent hover:bg-mac-accent-hover text-white text-[12px] font-medium transition-colors"
              >
                保存
              </button>
            )}
            {displayHotkey && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 rounded-md bg-mac-surface hover:bg-mac-hover text-mac-text-secondary text-[12px] transition-colors"
              >
                清除
              </button>
            )}
            {isRecording && (
              <button
                onClick={() => { setIsRecording(false); setPendingHotkey('') }}
                className="px-3 py-1.5 rounded-md bg-mac-surface hover:bg-mac-hover text-mac-text-secondary text-[12px] transition-colors"
              >
                取消
              </button>
            )}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-mac-border" />

        {/* 使用说明 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-mac-accent">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span className="text-[13px] text-mac-text font-medium">使用说明</span>
          </div>
          <div className="space-y-2 text-[11px] text-mac-text-secondary leading-relaxed">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-mac-accent mt-1.5 flex-shrink-0" />
              <span>鼠标悬停图标展开面板，移出自动收起</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-mac-accent mt-1.5 flex-shrink-0" />
              <span>点击图标手动展开/收起</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-mac-accent mt-1.5 flex-shrink-0" />
              <span>右键图标打开设置</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-mac-accent mt-1.5 flex-shrink-0" />
              <span>使用快捷键可全局唤醒面板</span>
            </div>
          </div>
        </div>

        {/* 状态信息 */}
        <div className="border-t border-mac-border pt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-mac-text-tertiary">窗口置顶</span>
            <span className={`${alwaysOnTop ? 'text-mac-green' : 'text-mac-text-tertiary'}`}>
              {alwaysOnTop ? '已开启' : '已关闭'}
            </span>
          </div>
        </div>
      </div>

      {/* 底部版本信息 */}
      <div className="px-4 py-2 border-t border-mac-border text-center">
        <span className="text-[10px] text-mac-text-tertiary">FloatFolder v1.1.0</span>
      </div>
    </div>
  )
}
