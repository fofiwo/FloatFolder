import type { FolderTab } from '../types'

interface TabBarProps {
  tabs: FolderTab[]
  activeIndex: number
  onTabChange: (index: number) => void
  onTabRemove: (index: number) => void
  onAddTab: () => void
}

export default function TabBar({ tabs, activeIndex, onTabChange, onTabRemove, onAddTab }: TabBarProps) {
  return (
    <div className="flex items-center h-8 border-b border-glass-border flex-shrink-0 overflow-x-auto no-drag"
      style={{ scrollbarWidth: 'none' }}>
      <div className="flex items-center h-full min-w-0 flex-1">
        {tabs.map((tab, index) => (
          <div
            key={tab.path}
            className={`group relative flex items-center gap-1.5 h-full px-3 cursor-pointer transition-colors text-xs flex-shrink-0 max-w-[160px] ${
              index === activeIndex
                ? 'text-white/90 bg-white/[0.06] border-b-2 border-blue-400'
                : 'text-white/45 hover:text-white/70 hover:bg-white/[0.03]'
            }`}
            onClick={() => onTabChange(index)}
            title={tab.path}
          >
            {/* 文件夹图标 */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>

            <span className="truncate">{tab.name}</span>

            {/* 文件数量 */}
            <span className="text-[10px] text-white/30 flex-shrink-0">{tab.files.length}</span>

            {/* 关闭按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTabRemove(index)
              }}
              className="ml-auto opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 transition-all flex-shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 添加文件夹按钮 */}
      <button
        onClick={onAddTab}
        className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors flex-shrink-0"
        title="添加文件夹"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
