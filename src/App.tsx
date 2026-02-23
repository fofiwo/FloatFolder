import { useState, useEffect, useCallback, useRef } from 'react'
import type { FolderTab } from './types'
import TitleBar from './components/TitleBar'
import TabBar from './components/TabBar'
import FileList from './components/FileList'
import Toast from './components/Toast'
import EmptyState from './components/EmptyState'
import SettingsPanel from './components/SettingsPanel'

type ViewMode = 'expanded' | 'settings'

export default function App() {
  const [tabs, setTabs] = useState<FolderTab[]>([])
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [opacity, setOpacity] = useState(0.95)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('expanded')
  const [hotkey, setHotkey] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 应用主题到 html 元素 */
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [theme])

  /** 初始化：一次 IPC 获取设置 + 所有文件夹数据 */
  useEffect(() => {
    async function init() {
      const { settings, tabs: loadedTabs } = await window.electronAPI.getInitData()
      setAlwaysOnTop(settings.alwaysOnTop)
      setAutoLaunch(settings.autoLaunch)
      setOpacity(settings.opacity)
      setTheme(settings.theme || 'light')
      setHotkey(settings.hotkey || '')

      if (loadedTabs.length > 0) {
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
      if (data.autoLaunch !== undefined) {
        setAutoLaunch(data.autoLaunch)
      }
      if (data.opacity !== undefined) {
        setOpacity(data.opacity)
      }
      if (data.theme !== undefined) {
        setTheme(data.theme)
      }
      if (data.hotkey !== undefined) {
        setHotkey(data.hotkey)
      }
    })
    return () => unsubscribe()
  }, [])

  /** 监听主进程的“打开设置”事件（托盘菜单） */
  useEffect(() => {
    const unsubscribe = window.electronAPI.onOpenSettings(() => {
      setViewMode('settings')
    })
    return () => unsubscribe()
  }, [])

  /** 监听主进程的快捷键唤醒事件 */
  useEffect(() => {
    const unsubscribe = window.electronAPI.onToggleExpand((data) => {
      setViewMode(data?.mode === 'expanded' ? 'expanded' : 'settings')
    })
    return () => unsubscribe()
  }, [])

  /** 显示 Toast 提示 */
  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMessage(message)
    setToastVisible(true)
    toastTimer.current = setTimeout(() => {
      setToastVisible(false)
    }, 2000)
  }, [])

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
    const result = await window.electronAPI.selectFolder()
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
        const newIndex = newTabs.length === 0 ? 0
          : index <= activeTabIndex ? Math.max(0, activeTabIndex - 1)
          : activeTabIndex
        setActiveTabIndex(newIndex)
        window.electronAPI.setActiveTab(newIndex)
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

  /** 窗口最小化 */
  const handleMinimize = useCallback(() => {
    window.electronAPI.windowMinimize()
  }, [])

  /** 窗口关闭（隐藏到托盘） */
  const handleClose = useCallback(() => {
    window.electronAPI.windowClose()
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

  const handleThemeChange = useCallback((next: 'light' | 'dark') => {
    setTheme(next)
    window.electronAPI.setTheme(next)
  }, [])

  const handleAlwaysOnTopChange = useCallback(async (enable: boolean) => {
    const value = await window.electronAPI.setAlwaysOnTop(enable)
    setAlwaysOnTop(value)
  }, [])

  const handleAutoLaunchChange = useCallback(async (enable: boolean) => {
    const value = await window.electronAPI.setAutoLaunch(enable)
    setAutoLaunch(value)
    showToast(value ? '已开启开机自启' : '已关闭开机自启')
  }, [showToast])

  const handleOpacityChange = useCallback(async (nextOpacity: number) => {
    const value = await window.electronAPI.setOpacity(nextOpacity)
    setOpacity(value)
  }, [])

  const currentTab = tabs[activeTabIndex] || null

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* expanded layer */}
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden bg-mac-bg transition-opacity duration-150 ${
          viewMode === 'expanded' ? 'opacity-100 pointer-events-auto expand-enter' : 'opacity-0 pointer-events-none'
        }`}
      >
        <TitleBar
          alwaysOnTop={alwaysOnTop}
          theme={theme}
          onTogglePin={handleTogglePin}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={handleOpenSettings}
          onMinimize={handleMinimize}
          onClose={handleClose}
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
      </div>

      {/* settings layer */}
      <div
        className={`absolute inset-0 overflow-hidden bg-mac-bg transition-opacity duration-150 ${
          viewMode === 'settings' ? 'opacity-100 pointer-events-auto expand-enter' : 'opacity-0 pointer-events-none'
        }`}
      >
        <SettingsPanel
          isActive={viewMode === 'settings'}
          currentHotkey={hotkey}
          alwaysOnTop={alwaysOnTop}
          autoLaunch={autoLaunch}
          opacity={opacity}
          theme={theme}
          onHotkeyChange={handleHotkeyChange}
          onAlwaysOnTopChange={handleAlwaysOnTopChange}
          onAutoLaunchChange={handleAutoLaunchChange}
          onOpacityChange={handleOpacityChange}
          onThemeChange={handleThemeChange}
          onClose={handleCloseSettings}
        />
      </div>

      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  )
}
