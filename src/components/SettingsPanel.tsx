import { useState, useCallback, useEffect, useRef } from 'react'

interface SettingsPanelProps {
  currentHotkey: string
  alwaysOnTop: boolean
  autoLaunch: boolean
  opacity: number
  theme: 'light' | 'dark'
  showFloatingIconWithHotkey: boolean
  onHotkeyChange: (hotkey: string) => void
  onAlwaysOnTopChange: (enable: boolean) => void
  onAutoLaunchChange: (enable: boolean) => void
  onOpacityChange: (opacity: number) => void
  onThemeChange: (theme: 'light' | 'dark') => void
  onShowFloatingIconWithHotkeyChange: (enable: boolean) => void
  onClose: () => void
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group">
      <span className="w-[14px] h-[14px] rounded-full border border-mac-border text-[10px] leading-[12px] text-mac-text-tertiary flex items-center justify-center">?</span>
      <span
        className="pointer-events-none absolute z-10 left-1/2 -translate-x-1/2 top-5 min-w-[220px] max-w-[260px] px-2 py-1 rounded-md text-[11px] text-mac-text bg-[var(--mac-popup-bg)] border border-[var(--mac-popup-border)] shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        {text}
      </span>
    </span>
  )
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

export default function SettingsPanel({
  currentHotkey,
  alwaysOnTop,
  autoLaunch,
  opacity,
  theme,
  showFloatingIconWithHotkey,
  onHotkeyChange,
  onAlwaysOnTopChange,
  onAutoLaunchChange,
  onOpacityChange,
  onThemeChange,
  onShowFloatingIconWithHotkeyChange,
  onClose,
}: SettingsPanelProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [pendingHotkey, setPendingHotkey] = useState('')
  const inputRef = useRef<HTMLDivElement>(null)

  const handleThemeToggle = useCallback(() => {
    onThemeChange(theme === 'dark' ? 'light' : 'dark')
  }, [theme, onThemeChange])

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
        {/* 常用设置 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-mac-accent">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.18.33.28.71.28 1.09V10a1 1 0 0 0 1 1h.09a2 2 0 1 1 0 4h-.09a1 1 0 0 0-1 1Z" />
            </svg>
            <span className="text-[13px] text-mac-text font-medium">常用设置</span>
          </div>

          <div className="space-y-3">
            {/* 快捷键模式显示悬浮图标 */}
            <div className="flex items-center justify-between rounded-md border border-mac-border px-3 py-2 bg-mac-surface">
              <div>
                <div className="flex items-center gap-2 text-[12px] text-mac-text">
                  <span>快捷键下显示悬浮图标</span>
                  <Tooltip text={currentHotkey ? '默认关闭：设置快捷键后悬浮图标会自动隐藏，可通过快捷键或托盘唤醒。开启后可同时使用“快捷键 + 悬浮图标”。' : '请先设置全局快捷键。未设置快捷键时悬浮图标始终显示。'} />
                </div>
                <div className="text-[11px] text-mac-text-tertiary">仅在已设置快捷键时生效</div>
              </div>
              <button
                onClick={() => {
                  if (!currentHotkey) return
                  onShowFloatingIconWithHotkeyChange(!showFloatingIconWithHotkey)
                }}
                disabled={!currentHotkey}
                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${currentHotkey && showFloatingIconWithHotkey ? 'bg-mac-accent' : 'bg-mac-hover'} ${!currentHotkey ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="切换快捷键下显示悬浮图标"
                title={currentHotkey ? '切换快捷键下显示悬浮图标' : '请先设置快捷键'}
              >
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${currentHotkey && showFloatingIconWithHotkey ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* 置顶 */}
            <div className="flex items-center justify-between rounded-md border border-mac-border px-3 py-2 bg-mac-surface">
              <div>
                <div className="text-[12px] text-mac-text">窗口置顶</div>
                <div className="text-[11px] text-mac-text-tertiary">仅在展开模式下生效</div>
              </div>
              <button
                onClick={() => onAlwaysOnTopChange(!alwaysOnTop)}
                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${alwaysOnTop ? 'bg-mac-accent' : 'bg-mac-hover'}`}
                aria-label="切换窗口置顶"
                title="切换窗口置顶"
              >
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${alwaysOnTop ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* 开机自启 */}
            <div className="flex items-center justify-between rounded-md border border-mac-border px-3 py-2 bg-mac-surface">
              <div>
                <div className="text-[12px] text-mac-text">开机自启</div>
                <div className="text-[11px] text-mac-text-tertiary">随系统登录自动启动</div>
              </div>
              <button
                onClick={() => onAutoLaunchChange(!autoLaunch)}
                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${autoLaunch ? 'bg-mac-accent' : 'bg-mac-hover'}`}
                aria-label="切换开机自启"
                title="切换开机自启"
              >
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${autoLaunch ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* 透明度 */}
            <div className="rounded-md border border-mac-border px-3 py-2 bg-mac-surface">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] text-mac-text">窗口透明度</div>
                  <div className="text-[11px] text-mac-text-tertiary">范围 40% - 100%</div>
                </div>
                <span className="text-[11px] text-mac-text-secondary font-mono">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
                className="mt-2 w-full"
              />
            </div>

            {/* 主题 */}
            <div className="flex items-center justify-between rounded-md border border-mac-border px-3 py-2 bg-mac-surface">
              <div>
                <div className="text-[12px] text-mac-text">主题</div>
                <div className="text-[11px] text-mac-text-tertiary">{theme === 'dark' ? '暗色模式' : '亮色模式'}</div>
              </div>
              <button
                onClick={handleThemeToggle}
                className="px-3 py-1.5 rounded-md bg-mac-elevated hover:bg-mac-hover text-mac-text-secondary text-[12px] transition-colors"
                aria-label="切换主题"
                title="切换主题"
              >
                切换
              </button>
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-mac-border" />

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
          <div className="flex items-center justify-between text-[11px] mt-1.5">
            <span className="text-mac-text-tertiary">开机自启</span>
            <span className={`${autoLaunch ? 'text-mac-green' : 'text-mac-text-tertiary'}`}>
              {autoLaunch ? '已开启' : '已关闭'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1.5">
            <span className="text-mac-text-tertiary">透明度</span>
            <span className="text-mac-text-tertiary">{Math.round(opacity * 100)}%</span>
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
