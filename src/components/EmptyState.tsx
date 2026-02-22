interface EmptyStateProps {
  onAddFolder: () => void
}

export default function EmptyState({ onAddFolder }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      {/* macOS 风格文件夹图标 */}
      <div className="w-16 h-16 rounded-2xl bg-mac-surface flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-mac-text-tertiary">
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          <path d="M12 10v6" />
          <path d="M9 13h6" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[15px] text-mac-text font-medium mb-1">暂无文件夹</p>
        <p className="text-[13px] text-mac-text-tertiary">添加文件夹以开始监控文件变化</p>
      </div>
      <button
        onClick={onAddFolder}
        className="px-5 py-2 rounded-lg bg-mac-accent hover:bg-mac-accent-hover text-white text-[13px] font-medium transition-colors shadow-sm active:scale-[0.97]"
      >
        添加文件夹
      </button>
    </div>
  )
}
