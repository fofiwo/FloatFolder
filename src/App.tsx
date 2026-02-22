import { useState, useEffect, useCallback, useRef } from 'react'
import type { FolderTab } from './types'
import TitleBar from './components/TitleBar'
import TabBar from './components/TabBar'
import FileList from './components/FileList'
import Toast from './components/Toast'
import EmptyState from './components/EmptyState'
import FloatingIcon from './components/FloatingIcon'
import SettingsPanel from './components/SettingsPanel'

type ViewMode = 'icon' | 'expanded' | 'settings'

export default function App() {
  const [tabs, setTabs] = useState<FolderTab[]>([])
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('icon')
  const [hotkey, setHotkey] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInteracting = useRef(false)

  /** 应用主题到 html 元素 */
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [theme])

  /** 初始化：加载已保存的文件夹 */
  useEffect(() => {
    async function init() {
      const settings = await window.electronAPI.getSettings()
      setAlwaysOnTop(settings.alwaysOnTop)
      setTheme(settings.theme || 'light')
      setHotkey(settings.hotkey || '')

      const folders = await window.electronAPI.getFolders()
      if (folders.length > 0) {
        const loadedTabs: FolderTab[] = await Promise.all(
          folders.map(async (folderPath) => {
            const files = await window.electronAPI.getFolderContents(folderPath)
            const name = folderPath.split('\\').pop() || folderPath.split('/').pop() || folderPath
            return { path: folderPath, name, files }
          })
        )
        setTabs(loadedTabs)
        setActiveTabIndex(Math.min(settings.activeTab, loadedTabs.length - 1))
      }
    }
    init()
  }, [])

  /** 监听文件夹变化 */
  useEffect(() => {
    const unsubscribe = window.electronAPI.onFolderUpdated(({ folderPath, files }) => {
      setTabs((prev) =>
        prev.map((tab) => (tab.path === folderPath ? { ...tab, files } : tab))
      )
    })
    return () => unsubscribe()
  }, [])

  /** 监听设置变化 */
  useEffect(() => {
    const unsubscribe = window.electronAPI.onSettingsChanged((data) => {
      if (data.alwaysOnTop !== undefined) {
        setAlwaysOnTop(data.alwaysOnTop)
      }
    })
    return () => unsubscribe()
  }, [])

  /** 监听主进程的快捷键唤醒事件 */
  useEffect(() => {
    const unsubscribe = window.electronAPI.onToggleExpand(() => {
      setViewMode((prev) => {
        const next = prev === 'icon' ? 'expanded' : 'icon'
        window.electronAPI.setWindowMode(next)
        return next
      })
    })
    return () => unsubscribe()
  }, [])

  /** 切换到图标模式时通知主进程缩小窗口 */
  useEffect(() => {
    if (viewMode === 'icon') {
      window.electronAPI.setWindowMode('icon')
    } else {
      window.electronAPI.setWindowMode('expanded')
    }
  }, [viewMode])

  /** 显示 Toast 提示 */
  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMessage(message)
    setToastVisible(true)
    toastTimer.current = setTimeout(() => {
      setToastVisible(false)
    }, 2000)
  }, [])

  /** 展开面板 */
  const handleExpand = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setViewMode('expanded')
  }, [])

  /** 收起面板（带延迟，防止鼠标移动过程中误收起） */
  const handleCollapse = useCallback(() => {
    if (isInteracting.current) return
    collapseTimer.current = setTimeout(() => {
      setViewMode('icon')
    }, 400)
  }, [])

  /** 鼠标进入展开区域时取消收起 */
  const handleExpandedMouseEnter = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
  }, [])

  /** 鼠标离开展开区域时触发收起 */
  const handleExpandedMouseLeave = useCallback(() => {
    if (viewMode === 'settings') return
    handleCollapse()
  }, [viewMode, handleCollapse])

  /** 打开设置 */
  const handleOpenSettings = useCallback(() => {
    setViewMode('settings')
  }, [])

  /** 关闭设置回到展开模式 */
  const handleCloseSettings = useCallback(() => {
    setViewMode('expanded')
  }, [])

  /** 设置快捷键 */
  const handleHotkeyChange = useCallback(async (newHotkey: string) => {
    const success = await window.electronAPI.setHotkey(newHotkey)
    if (success) {
      setHotkey(newHotkey)
      showToast(newHotkey ? `快捷键已设置: ${newHotkey}` : '快捷键已清除')
    } else {
      showToast('快捷键设置失败，请尝试其他组合')
    }
  }, [showToast])

  /** 添加文件夹 */
  const handleAddFolder = useCallback(async () => {
    isInteracting.current = true
    const result = await window.electronAPI.selectFolder()
    isInteracting.current = false
    if (!result) return

    const { folderPath, files, folders } = result
    const name = folderPath.split('\\').pop() || folderPath.split('/').pop() || folderPath

    setTabs((prev) => {
      const existing = prev.findIndex((t) => t.path === folderPath)
      if (existing >= 0) {
        setActiveTabIndex(existing)
        return prev
      }
      const newTabs = [...prev, { path: folderPath, name, files }]
      setActiveTabIndex(newTabs.length - 1)
      window.electronAPI.setActiveTab(newTabs.length - 1)
      return newTabs
    })
  }, [])

  /** 移除文件夹标签页 */
  const handleRemoveTab = useCallback(
    async (index: number) => {
      const tab = tabs[index]
      if (!tab) return
      await window.electronAPI.removeFolder(tab.path)
      setTabs((prev) => {
        const newTabs = prev.filter((_, i) => i !== index)
        if (activeTabIndex >= newTabs.length) {
          setActiveTabIndex(Math.max(0, newTabs.length - 1))
        }
        return newTabs
      })
    },
    [tabs, activeTabIndex]
  )

  /** 拖拽重排标签页 */
  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    setTabs((prev) => {
      const newTabs = [...prev]
      const [moved] = newTabs.splice(fromIndex, 1)
      newTabs.splice(toIndex, 0, moved)

      /** 持久化新顺序 */
      window.electronAPI.reorderFolders(newTabs.map((t) => t.path))

      /** 更新 activeTabIndex 以跟随当前激活的 tab */
      const currentPath = prev[activeTabIndex]?.path
      const newActiveIndex = newTabs.findIndex((t) => t.path === currentPath)
      if (newActiveIndex >= 0 && newActiveIndex !== activeTabIndex) {
        setActiveTabIndex(newActiveIndex)
        window.electronAPI.setActiveTab(newActiveIndex)
      }

      return newTabs
    })
  }, [activeTabIndex])

  /** 切换标签页 */
  const handleTabChange = useCallback((index: number) => {
    setActiveTabIndex(index)
    window.electronAPI.setActiveTab(index)
  }, [])

  /** 切换置顶 */
  const handleTogglePin = useCallback(async () => {
    const newValue = await window.electronAPI.toggleAlwaysOnTop()
    setAlwaysOnTop(newValue)
  }, [])

  /** 切换主题 */
  const handleToggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    window.electronAPI.setTheme(next)
  }, [theme])

  const currentTab = tabs[activeTabIndex] || null
  const totalFiles = tabs.reduce((sum, tab) => sum + tab.files.filter(f => !f.isDirectory).length, 0)

  /** 图标模式 */
  if (viewMode === 'icon') {
    return (
      <div className="w-full h-full overflow-hidden bg-transparent">
        <FloatingIcon
          onExpand={handleExpand}
          onOpenSettings={handleOpenSettings}
          fileCount={totalFiles}
          folderCount={tabs.length}
        />
        <Toast message={toastMessage} visible={toastVisible} />
      </div>
    )
  }

  /** 设置模式 */
  if (viewMode === 'settings') {
    return (
      <div className="w-full h-full overflow-hidden bg-mac-bg expand-enter">
        <SettingsPanel
          currentHotkey={hotkey}
          alwaysOnTop={alwaysOnTop}
          onHotkeyChange={handleHotkeyChange}
          onClose={handleCloseSettings}
        />
        <Toast message={toastMessage} visible={toastVisible} />
      </div>
    )
  }

  /** 展开模式 */
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden bg-mac-bg expand-enter"
      onMouseEnter={handleExpandedMouseEnter}
      onMouseLeave={handleExpandedMouseLeave}
    >
      <TitleBar
        alwaysOnTop={alwaysOnTop}
        theme={theme}
        onTogglePin={handleTogglePin}
        onToggleTheme={handleToggleTheme}
        onMinimize={() => setViewMode('icon')}
        onClose={() => window.electronAPI.windowClose()}
      />

      {tabs.length > 0 && (
        <TabBar
          tabs={tabs}
          activeIndex={activeTabIndex}
          onTabChange={handleTabChange}
          onTabRemove={handleRemoveTab}
          onAddTab={handleAddFolder}
          onTabReorder={handleTabReorder}
        />
      )}

      <div className="flex-1 overflow-hidden">
        {currentTab ? (
          <FileList
            files={currentTab.files}
            folderPath={currentTab.path}
            showToast={showToast}
          />
        ) : (
          <EmptyState onAddFolder={handleAddFolder} />
        )}
      </div>

      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  )
}
