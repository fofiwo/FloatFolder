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
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [opacity, setOpacity] = useState(0.95)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('icon')
  const [hotkey, setHotkey] = useState('')
  const [showFloatingIconWithHotkey, setShowFloatingIconWithHotkey] = useState(false)
  const [isInstantLayerSwitch, setIsInstantLayerSwitch] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInteracting = useRef(false)
  const expandLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 应用主题到 html 元素 */
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [theme])

  /** 图标模式下强制透明背景，避免 Windows 透明窗出现白底/白边 */
  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('icon-mode', viewMode === 'icon')
  }, [viewMode])

  /** 初始化：加载已保存的文件夹 */
  useEffect(() => {
    async function init() {
      const settings = await window.electronAPI.getSettings()
      setAlwaysOnTop(settings.alwaysOnTop)
      setAutoLaunch(settings.autoLaunch)
      setOpacity(settings.opacity)
      setTheme(settings.theme || 'light')
      setHotkey(settings.hotkey || '')
      setShowFloatingIconWithHotkey(!!settings.showFloatingIconWithHotkey)

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
      if (data.showFloatingIconWithHotkey !== undefined) {
        setShowFloatingIconWithHotkey(!!data.showFloatingIconWithHotkey)
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
      /**
       * 快捷键唤醒时：如果分层用 opacity 过渡，会在 expanded layer 变为不透明前短暂看到 icon layer。
       * 这里在首帧禁用过渡，让 expanded 立即显示，避免“闪现悬浮图标”。
       */
      if (data?.source === 'hotkey') {
        setIsInstantLayerSwitch(true)
        requestAnimationFrame(() => setIsInstantLayerSwitch(false))
      }

      setViewMode(data?.mode === 'expanded' ? 'expanded' : 'icon')
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

    /**
     * 悬停展开时窗口会立刻 resize，个别系统上会产生“抖动/不跟手”体感。
     * 这里给一个很短的交互锁，避免刚展开就被收起逻辑抢占。
     */
    isInteracting.current = true
    if (expandLockTimer.current) clearTimeout(expandLockTimer.current)
    expandLockTimer.current = setTimeout(() => {
      isInteracting.current = false
    }, 250)

    setViewMode('expanded')
  }, [])

  /** 收起面板（带延迟，防止鼠标移动过程中误收起） */
  const handleCollapse = useCallback(() => {
    if (isInteracting.current) return
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }

    /** 需求：移出界面立即隐藏 */
    setViewMode('icon')
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

  const handleShowFloatingIconWithHotkeyChange = useCallback(async (enable: boolean) => {
    const value = await window.electronAPI.setShowFloatingIconWithHotkey(enable)
    setShowFloatingIconWithHotkey(value)
    showToast(value ? '已开启悬浮图标' : '已隐藏悬浮图标')
  }, [showToast])

  const currentTab = tabs[activeTabIndex] || null
  const totalFiles = tabs.reduce((sum, tab) => sum + tab.files.filter(f => !f.isDirectory).length, 0)

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* icon layer（保持挂载，避免切换时闪烁/重建） */}
      <div
        className={`absolute inset-0 bg-transparent ${isInstantLayerSwitch ? 'transition-none' : 'transition-opacity duration-150'} ${
          viewMode === 'icon' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <FloatingIcon
          onExpand={handleExpand}
          onOpenSettings={handleOpenSettings}
          fileCount={totalFiles}
          folderCount={tabs.length}
        />
      </div>

      {/* expanded layer */}
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden bg-mac-bg ${isInstantLayerSwitch ? 'transition-none' : 'transition-opacity duration-150'} ${
          viewMode === 'expanded' ? 'opacity-100 pointer-events-auto expand-enter' : 'opacity-0 pointer-events-none'
        }`}
        onMouseEnter={handleExpandedMouseEnter}
        onMouseLeave={handleExpandedMouseLeave}
      >
        <TitleBar
          alwaysOnTop={alwaysOnTop}
          theme={theme}
          onTogglePin={handleTogglePin}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={handleOpenSettings}
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
      </div>

      {/* settings layer */}
      <div
        className={`absolute inset-0 overflow-hidden bg-mac-bg ${isInstantLayerSwitch ? 'transition-none' : 'transition-opacity duration-150'} ${
          viewMode === 'settings' ? 'opacity-100 pointer-events-auto expand-enter' : 'opacity-0 pointer-events-none'
        }`}
      >
        <SettingsPanel
          currentHotkey={hotkey}
          alwaysOnTop={alwaysOnTop}
          autoLaunch={autoLaunch}
          opacity={opacity}
          theme={theme}
          showFloatingIconWithHotkey={showFloatingIconWithHotkey}
          onHotkeyChange={handleHotkeyChange}
          onAlwaysOnTopChange={handleAlwaysOnTopChange}
          onAutoLaunchChange={handleAutoLaunchChange}
          onOpacityChange={handleOpacityChange}
          onThemeChange={handleThemeChange}
          onShowFloatingIconWithHotkeyChange={handleShowFloatingIconWithHotkeyChange}
          onClose={handleCloseSettings}
        />
      </div>

      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  )
}
