interface EmptyStateProps {
  onAddFolder: () => void
}

export default function EmptyState({ onAddFolder }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        <path d="M12 10v6" />
        <path d="M9 13h6" />
      </svg>
      <div className="text-center">
        <p className="text-sm mb-1">暂无监控文件夹</p>
        <p className="text-xs text-white/25">点击下方按钮添加文件夹</p>
      </div>
      <button
        onClick={onAddFolder}
        className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors border border-blue-400/20"
      >
        添加文件夹
      </button>
    </div>
  )
}
