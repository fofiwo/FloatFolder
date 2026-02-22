import { useState, useEffect, useCallback, useRef } from 'react'
import type { FileInfo, FolderTab } from './types'
import TitleBar from './components/TitleBar'
import TabBar from './components/TabBar'
import FileList from './components/FileList'
import Toast from './components/Toast'
import EmptyState from './components/EmptyState'

export default function App() {
  const [tabs, setTabs] = useState<FolderTab[]>([])
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 初始化：加载已保存的文件夹 */
  useEffect(() => {
    async function init() {
      const settings = await window.electronAPI.getSettings()
      setAlwaysOnTop(settings.alwaysOnTop)

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

  /** 显示 Toast 提示 */
  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMessage(message)
    setToastVisible(true)
    toastTimer.current = setTimeout(() => {
      setToastVisible(false)
    }, 2000)
  }, [])

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
        if (activeTabIndex >= newTabs.length) {
          setActiveTabIndex(Math.max(0, newTabs.length - 1))
        }
        return newTabs
      })
    },
    [tabs, activeTabIndex]
  )

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

  const currentTab = tabs[activeTabIndex] || null

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-mac-bg">
      <TitleBar
        alwaysOnTop={alwaysOnTop}
        onTogglePin={handleTogglePin}
        onMinimize={() => window.electronAPI.windowMinimize()}
        onClose={() => window.electronAPI.windowClose()}
      />

      {tabs.length > 0 && (
        <TabBar
          tabs={tabs}
          activeIndex={activeTabIndex}
          onTabChange={handleTabChange}
          onTabRemove={handleRemoveTab}
          onAddTab={handleAddFolder}
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
