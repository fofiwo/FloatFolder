import { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, nativeImage, clipboard, globalShortcut, screen, powerMonitor } from 'electron'
import path from 'path'
import { execSync, exec } from 'child_process'
import fs from 'fs'
import fsPromises from 'fs/promises'
import chokidar from 'chokidar'
import Store from 'electron-store'

/** 持久化存储 */
const store = new Store({
  defaults: {
    windowBounds: { x: 100, y: 100, width: 400, height: 500 },
    folders: [] as string[],
    activeTab: 0,
    alwaysOnTop: true,
    autoLaunch: false,
    opacity: 0.95,
    theme: 'light' as 'light' | 'dark',
    hotkey: '' as string,
  }
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let registeredHotkey: string | null = null
const watchers: Map<string, chokidar.FSWatcher> = new Map()
const watcherDebounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

/** 缩略图内存缓存：key = filePath:maxSize, value = { data, mtime } */
const thumbnailCache: Map<string, { data: string; mtime: number }> = new Map()
const THUMBNAIL_CACHE_MAX = 200

/** 窗口位置保存防抖定时器 */
let saveWindowBoundsTimer: ReturnType<typeof setTimeout> | null = null

function sendSettingsChanged(
  patch: Partial<{
    alwaysOnTop: boolean
    autoLaunch: boolean
    opacity: number
    theme: 'light' | 'dark'
    hotkey: string
  }>
) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('settings-changed', patch)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = !!VITE_DEV_SERVER_URL

/** 解析图标路径：依次尝试多个候选目录，返回第一个存在的路径 */
function resolveIcon(iconName: string): string {
  const candidates = [
    path.join(__dirname, '../public', iconName),
    path.join(__dirname, '../dist', iconName),
    path.join(process.resourcesPath || '', iconName),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  console.warn('[resolveIcon] 未找到图标:', iconName, candidates)
  return candidates[0]
}

/** 从文件加载 nativeImage（ICO 用 createFromPath，PNG 等用 Buffer 方式提高 Windows 兼容性） */
function loadNativeImage(iconPath: string): Electron.NativeImage {
  try {
    if (!fs.existsSync(iconPath)) {
      console.warn('[loadNativeImage] 文件不存在:', iconPath)
      return nativeImage.createEmpty()
    }
    const isIco = iconPath.toLowerCase().endsWith('.ico')
    let img: Electron.NativeImage

    if (isIco) {
      /** ICO 格式只能用 createFromPath 加载 */
      img = nativeImage.createFromPath(iconPath)
    } else {
      /** PNG/JPEG 等用 Buffer 方式加载，兼容性更好 */
      const buffer = fs.readFileSync(iconPath)
      img = nativeImage.createFromBuffer(buffer)
      if (img.isEmpty()) {
        img = nativeImage.createFromPath(iconPath)
      }
    }

    console.log('[loadNativeImage]', iconPath, '→ empty:', img.isEmpty(), 'size:', img.isEmpty() ? 'N/A' : img.getSize())
    return img
  } catch (err) {
    console.error('[loadNativeImage] 加载失败:', iconPath, err)
    return nativeImage.createEmpty()
  }
}

function createWindow() {
  const bounds = store.get('windowBounds') as { x: number; y: number; width: number; height: number }
  const opacity = store.get('opacity') as number

  /** 获取主屏幕，计算居中位置 */
  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workArea
  const defaultWidth = bounds?.width ?? 400
  const defaultHeight = bounds?.height ?? 500
  const centerX = Math.round(workArea.x + (workArea.width - defaultWidth) / 2)
  const centerY = Math.round(workArea.y + (workArea.height - defaultHeight) / 2)

  /** 如果是第一次启动（位置为默认值100,100），则居中显示 */
  const isFirstLaunch = bounds?.x === 100 && bounds?.y === 100
  const windowX = isFirstLaunch ? centerX : (bounds?.x ?? centerX)
  const windowY = isFirstLaunch ? centerY : (bounds?.y ?? centerY)

  /** 根据主题设置初始背景色，避免启动时黑屏 */
  const theme = store.get('theme') as string
  const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff'

  mainWindow = new BrowserWindow({
    x: windowX,
    y: windowY,
    width: defaultWidth,
    height: defaultHeight,
    minWidth: 300,
    minHeight: 350,
    show: false,
    frame: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    backgroundColor: bgColor,
    skipTaskbar: false,
    hasShadow: true,
    roundedCorners: true,
    icon: loadNativeImage(resolveIcon('icon.ico')),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  /** 内容就绪后再显示窗口，避免黑屏闪烁 */
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return
    mainWindow.setAlwaysOnTop(store.get('alwaysOnTop') as boolean, 'floating')
    if (typeof opacity === 'number') {
      mainWindow.setOpacity(Math.min(1, Math.max(0.4, opacity)))
    }
    mainWindow.show()
  })

  if (VITE_DEV_SERVER_URL) {
    /** 带重试的加载机制，解决 Vite 未就绪的时序问题 */
    const loadWithRetry = (retries = 20) => {
      mainWindow!.loadURL(VITE_DEV_SERVER_URL).catch(() => {
        if (retries > 0) {
          setTimeout(() => loadWithRetry(retries - 1), 500)
        }
      })
    }
    loadWithRetry()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  /** 保存窗口尺寸和位置 */
  mainWindow.on('resized', () => {
    saveWindowBounds()
  })
  mainWindow.on('moved', () => {
    saveWindowBounds()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  /** 初始化已保存的文件夹监听 */
  const folders = store.get('folders') as string[]
  folders.forEach((folder) => startWatching(folder))

  /** 初始化全局快捷键 */
  const savedHotkey = store.get('hotkey') as string
  if (savedHotkey) {
    registerGlobalHotkey(savedHotkey)
  }
}

function refreshTrayMenu() {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    {
      label: '设置',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        /** 延迟发送，等待渲染进程从后台节流中恢复 */
        setTimeout(() => {
          mainWindow?.webContents.send('open-settings')
        }, 200)
      }
    },
    {
      label: '置顶窗口',
      type: 'checkbox',
      checked: store.get('alwaysOnTop') as boolean,
      click: (menuItem) => {
        store.set('alwaysOnTop', menuItem.checked)
        mainWindow?.setAlwaysOnTop(menuItem.checked)
        sendSettingsChanged({ alwaysOnTop: menuItem.checked })
        refreshTrayMenu()
      }
    },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: store.get('autoLaunch') as boolean,
      click: (menuItem) => {
        store.set('autoLaunch', menuItem.checked)
        setAutoLaunch(menuItem.checked)
        sendSettingsChanged({ autoLaunch: menuItem.checked })
        refreshTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

/** 根据鼠标位置定位窗口，智能选择空间更大的一侧显示，避免遮挡鼠标 */
function positionWindowNearCursor() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const workArea = display.workArea

  const bounds = store.get('windowBounds') as { width: number; height: number }
  const width = bounds?.width ?? 400
  const height = bounds?.height ?? 500

  const margin = 12
  const gap = 16 // 窗口与鼠标的间距

  // 计算 Y 位置：鼠标垂直居中
  let y = cursor.y - Math.round(height / 2)

  // 计算左右两侧可用空间
  const spaceLeft = cursor.x - workArea.x - gap
  const spaceRight = workArea.x + workArea.width - cursor.x - gap

  let x: number

  // 优先选择空间更大的一侧
  if (spaceRight >= width || spaceRight >= spaceLeft) {
    // 右侧空间足够或更大，显示在右侧
    x = cursor.x + gap
    // 如果右侧空间不足但左侧空间足够，切换到左侧
    if (x + width > workArea.x + workArea.width - margin && spaceLeft >= width) {
      x = cursor.x - width - gap
    }
  } else if (spaceLeft >= width) {
    // 左侧空间足够，显示在左侧
    x = cursor.x - width - gap
  } else {
    // 两侧空间都不够，显示在鼠标下方
    x = cursor.x - Math.round(width / 2)
    y = cursor.y + gap
  }

  // 边界检查：确保窗口不超出屏幕
  x = Math.max(workArea.x + margin, Math.min(x, workArea.x + workArea.width - width - margin))
  y = Math.max(workArea.y + margin, Math.min(y, workArea.y + workArea.height - height - margin))

  mainWindow.setBounds({ x, y, width, height }, false)
}

/** 注册全局快捷键 */
function registerGlobalHotkey(hotkey: string): boolean {
  /** 先注销已有的快捷键 */
  if (registeredHotkey) {
    try { globalShortcut.unregister(registeredHotkey) } catch {}
    registeredHotkey = null
  }

  if (!hotkey) return true

  try {
    const success = globalShortcut.register(hotkey, () => {
      if (!mainWindow || mainWindow.isDestroyed()) return
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        // 根据鼠标位置定位窗口
        positionWindowNearCursor()
        mainWindow.show()
        mainWindow.focus()
      }
    })
    if (success) {
      registeredHotkey = hotkey
    }
    return success
  } catch (err) {
    console.error('注册全局快捷键失败:', err)
    return false
  }
}

function saveWindowBounds() {
  if (!mainWindow) return
  if (saveWindowBoundsTimer) clearTimeout(saveWindowBoundsTimer)
  saveWindowBoundsTimer = setTimeout(() => {
    if (!mainWindow) return
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', bounds)
  }, 300)
}

/** 创建系统托盘 */
function createTray() {
  /** 托盘图标需要小尺寸（16~32px），优先使用已缩放的 PNG */
  const TRAY_SIZE = 16
  const iconCandidates = ['icon-16.png', 'icon-32.png', 'icon.ico', 'icon.png']
  let trayIcon: Electron.NativeImage = nativeImage.createEmpty()

  for (const name of iconCandidates) {
    const iconPath = resolveIcon(name)
    const img = loadNativeImage(iconPath)
    if (!img.isEmpty()) {
      const size = img.getSize()
      if (size.width > TRAY_SIZE || size.height > TRAY_SIZE) {
        trayIcon = img.resize({ width: TRAY_SIZE, height: TRAY_SIZE })
      } else {
        trayIcon = img
      }
      console.log('[createTray] 使用图标:', iconPath, '原始:', size, '→ 托盘:', trayIcon.getSize())
      break
    }
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('FloatFolder - 悬浮文件夹')

  refreshTrayMenu()
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

/** 设置开机自启 */
function setAutoLaunch(enable: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe')
  })
}

/** 读取文件夹内容（异步，不阻塞主进程） */
async function readFolderContentsAsync(folderPath: string): Promise<FileInfo[]> {
  try {
    await fsPromises.access(folderPath)
    const entries = await fsPromises.readdir(folderPath, { withFileTypes: true })
    const results = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith('.'))
        .map(async (entry) => {
          const fullPath = path.join(folderPath, entry.name)
          try {
            const stats = await fsPromises.stat(fullPath)
            return {
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: stats.size,
              modifiedTime: stats.mtime.toISOString(),
              extension: path.extname(entry.name).toLowerCase().slice(1)
            }
          } catch {
            return null
          }
        })
    )
    return (results.filter(Boolean) as FileInfo[]).sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  } catch (err) {
    console.error('读取文件夹失败:', err)
    return []
  }
}

/** 同步版本（仅启动时快速加载用） */
function readFolderContents(folderPath: string): FileInfo[] {
  try {
    if (!fs.existsSync(folderPath)) return []
    const entries = fs.readdirSync(folderPath, { withFileTypes: true })
    return entries
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => {
        const fullPath = path.join(folderPath, entry.name)
        const stats = fs.statSync(fullPath)
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modifiedTime: stats.mtime.toISOString(),
          extension: path.extname(entry.name).toLowerCase().slice(1)
        }
      })
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
  } catch (err) {
    console.error('读取文件夹失败:', err)
    return []
  }
}

interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedTime: string
  extension: string
}

/** 启动文件夹监听 */
function startWatching(folderPath: string) {
  if (watchers.has(folderPath)) return

  const watcher = chokidar.watch(folderPath, {
    depth: 0,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  })

  watcher.on('all', (_event, _filePath) => {
    /** 防抖：200ms 内多次文件变化只触发一次更新 */
    const existing = watcherDebounceTimers.get(folderPath)
    if (existing) clearTimeout(existing)
    watcherDebounceTimers.set(folderPath, setTimeout(async () => {
      watcherDebounceTimers.delete(folderPath)
      if (mainWindow && !mainWindow.isDestroyed()) {
        const files = await readFolderContentsAsync(folderPath)
        mainWindow.webContents.send('folder-updated', { folderPath, files })
      }
    }, 200))
  })

  watchers.set(folderPath, watcher)
}

/** 停止文件夹监听 */
function stopWatching(folderPath: string) {
  const watcher = watchers.get(folderPath)
  if (watcher) {
    watcher.close()
    watchers.delete(folderPath)
  }
}

/** 刷新所有文件夹内容并通知渲染进程 */
async function refreshAllFolders() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const folders = store.get('folders') as string[]
  for (const folderPath of folders) {
    try {
      const files = await readFolderContentsAsync(folderPath)
      mainWindow.webContents.send('folder-updated', { folderPath, files })
    } catch (err) {
      console.error('[refreshAllFolders] 刷新失败:', folderPath, err)
    }
  }
}

/** 重启所有文件夹监听（休眠唤醒后 watcher 可能失效） */
function restartAllWatchers() {
  const folders = store.get('folders') as string[]
  for (const folderPath of folders) {
    const existing = watchers.get(folderPath)
    if (existing) {
      existing.close()
      watchers.delete(folderPath)
    }
    startWatching(folderPath)
  }
  console.log('[restartAllWatchers] 已重启', folders.length, '个文件夹监听')
}

/** 窗口聚焦刷新防抖定时器 */
let focusRefreshTimer: ReturnType<typeof setTimeout> | null = null

/** 定时轮询间隔（毫秒） */
const POLL_INTERVAL = 5 * 60 * 1000
let pollTimer: ReturnType<typeof setInterval> | null = null

// ============ IPC 处理 ============

/** 选择文件夹 */
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: '选择要监控的文件夹'
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const folderPath = result.filePaths[0]
  const folders = store.get('folders') as string[]
  if (!folders.includes(folderPath)) {
    folders.push(folderPath)
    store.set('folders', folders)
    startWatching(folderPath)
  }

  const files = readFolderContents(folderPath)
  /** 切换到新添加的标签页 */
  store.set('activeTab', folders.indexOf(folderPath))
  return { folderPath, files, folders }
})

/** 获取所有文件夹 */
ipcMain.handle('get-folders', () => {
  const folders = store.get('folders') as string[]
  return folders
})

/** 获取文件夹内容 */
ipcMain.handle('get-folder-contents', async (_event, folderPath: string) => {
  return readFolderContentsAsync(folderPath)
})

/** 移除文件夹 */
ipcMain.handle('remove-folder', (_event, folderPath: string) => {
  stopWatching(folderPath)
  const folders = store.get('folders') as string[]
  const newFolders = folders.filter((f) => f !== folderPath)
  store.set('folders', newFolders)
  return newFolders
})

/** 用系统默认程序打开文件 */
ipcMain.handle('open-file', (_event, filePath: string) => {
  shell.openPath(filePath)
})

/** 在资源管理器中显示 */
ipcMain.handle('show-in-explorer', (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

/** 复制文件到剪贴板（支持单个或多个文件，异步执行不阻塞主进程） */
ipcMain.handle('copy-file', (_event, filePaths: string | string[]) => {
  return new Promise<boolean>((resolve) => {
    try {
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths]
      const addLines = paths.map((p) => `$f.Add("${p.replace(/"/g, '`"')}")`).join('; ')
      const psScript = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Collections.Specialized.StringCollection; ${addLines}; [System.Windows.Forms.Clipboard]::SetFileDropList($f)`
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      exec(`powershell -NoProfile -EncodedCommand ${encoded}`, { timeout: 5000, windowsHide: true }, (err) => {
        resolve(!err)
      })
    } catch (err) {
      console.error('复制文件失败:', err)
      resolve(false)
    }
  })
})

/** 复制文件路径 */
ipcMain.handle('copy-path', (_event, filePath: string) => {
  clipboard.writeText(filePath)
  return true
})

/** 原生文件拖拽（支持单个或多个文件，invoke 模式让渲染进程感知拖拽结束） */
ipcMain.handle('start-drag', (event, filePaths: string | string[]) => {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths]

  /** 统一图标逻辑：优先用第一个文件的缩略图，无效则用默认图标 */
  const defaultIcon = getDefaultDragIcon()
  let icon = defaultIcon
  try {
    const customIcon = nativeImage.createFromPath(paths[0]).resize({ width: 32, height: 32 })
    if (!customIcon.isEmpty()) icon = customIcon
  } catch { /* 使用默认图标 */ }
  if (icon.isEmpty()) icon = defaultIcon

  try {
    if (paths.length === 1) {
      event.sender.startDrag({ file: paths[0], icon })
    } else {
      /**
       * Windows 兼容：files 参数可能不生效，
       * 改为逐个调用 startDrag 只对第一个文件生效，
       * 因此直接用 (file + files) 并添加 fallback
       */
      try {
        event.sender.startDrag({ file: paths[0], files: paths, icon })
      } catch {
        /** fallback：仅拖第一个文件 */
        event.sender.startDrag({ file: paths[0], icon })
      }
    }
  } catch (err) {
    console.error('[startDrag] 拖拽失败:', err)
  }
})

/** 获取默认拖拽图标 */
function getDefaultDragIcon(): Electron.NativeImage {
  /** 创建一个简单的默认图标 */
  return nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABhSURBVFhH7c4xDQAgDAXRDhZw/y0YYOAPGdi4N/C+pPl07hMza7x3O3NHABEBEBEAEAEAEAEAEAEAEAEAEAEAEAEA/wHovffeO3NH4L8CiAgAiAAAiAAAiAAAiAAAiAAAiMgGYIt5A5JlvPwAAAAASUVORK5CYII=',
      'base64'
    )
  )
}

/** 窗口操作 */
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window-close', () => {
  mainWindow?.hide()
})

ipcMain.handle('toggle-always-on-top', () => {
  const current = store.get('alwaysOnTop') as boolean
  const next = !current
  store.set('alwaysOnTop', next)
  mainWindow?.setAlwaysOnTop(next)
  sendSettingsChanged({ alwaysOnTop: next })
  refreshTrayMenu()
  return next
})

ipcMain.handle('set-always-on-top', (_event, enable: boolean) => {
  store.set('alwaysOnTop', enable)
  mainWindow?.setAlwaysOnTop(enable)
  sendSettingsChanged({ alwaysOnTop: enable })
  refreshTrayMenu()
  return enable
})

/** 获取设置 */
ipcMain.handle('get-settings', () => {
  return {
    alwaysOnTop: store.get('alwaysOnTop'),
    autoLaunch: store.get('autoLaunch'),
    opacity: store.get('opacity'),
    activeTab: store.get('activeTab'),
    theme: store.get('theme') || 'light',
    hotkey: store.get('hotkey') || '',
  }
})

/** 设置全局快捷键 */
ipcMain.handle('set-hotkey', (_event, hotkey: string) => {
  const success = registerGlobalHotkey(hotkey)
  if (success) {
    store.set('hotkey', hotkey)
    sendSettingsChanged({ hotkey })
  }
  return success
})

/** 设置主题 */
ipcMain.handle('set-theme', (_event, theme: 'light' | 'dark') => {
  store.set('theme', theme)
  if (mainWindow) {
    mainWindow.setBackgroundColor(theme === 'dark' ? '#1e1e1e' : '#ffffff')
  }

  sendSettingsChanged({ theme })
})

ipcMain.handle('set-auto-launch', (_event, enable: boolean) => {
  store.set('autoLaunch', enable)
  setAutoLaunch(enable)
  sendSettingsChanged({ autoLaunch: enable })
  refreshTrayMenu()
  return enable
})

ipcMain.handle('set-opacity', (_event, opacity: number) => {
  const safeOpacity = Math.min(1, Math.max(0.4, opacity))
  store.set('opacity', safeOpacity)
  mainWindow?.setOpacity(safeOpacity)
  sendSettingsChanged({ opacity: safeOpacity })
  return safeOpacity
})

/** 重排文件夹顺序 */
ipcMain.handle('reorder-folders', (_event, folderPaths: string[]) => {
  store.set('folders', folderPaths)
})

/** 保存活跃标签页 */
ipcMain.handle('set-active-tab', (_event, index: number) => {
  store.set('activeTab', index)
})

/** 获取文件缩略图（图片文件，带缓存） */
ipcMain.handle('get-thumbnail', async (_event, filePath: string) => {
  try {
    const ext = path.extname(filePath).toLowerCase()
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico']
    if (!imageExts.includes(ext)) return null

    /** 检查缓存 */
    const cacheKey = `${filePath}:full`
    const stats = await fsPromises.stat(filePath)
    const cached = thumbnailCache.get(cacheKey)
    if (cached && cached.mtime === stats.mtimeMs) return cached.data

    const data = await fsPromises.readFile(filePath)
    const base64 = data.toString('base64')
    const mime = ext === '.svg' ? 'image/svg+xml' : `image/${ext.slice(1)}`
    const result = `data:${mime};base64,${base64}`

    /** 写入缓存，超过上限时清除最早条目 */
    if (thumbnailCache.size >= THUMBNAIL_CACHE_MAX) {
      const firstKey = thumbnailCache.keys().next().value
      if (firstKey) thumbnailCache.delete(firstKey)
    }
    thumbnailCache.set(cacheKey, { data: result, mtime: stats.mtimeMs })
    return result
  } catch {
    return null
  }
})

/** 获取缩略图（指定尺寸，用于列表/卡片内联展示，带缓存） */
ipcMain.handle('get-small-thumbnail', async (_event, filePath: string, maxSize: number = 64) => {
  try {
    const ext = path.extname(filePath).toLowerCase()
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ico']
    if (!imageExts.includes(ext)) return null

    /** 检查缓存 */
    const cacheKey = `${filePath}:${maxSize}`
    const stats = await fsPromises.stat(filePath)
    const cached = thumbnailCache.get(cacheKey)
    if (cached && cached.mtime === stats.mtimeMs) return cached.data

    /** SVG 直接返回原始数据（体积小） */
    if (ext === '.svg') {
      const data = await fsPromises.readFile(filePath)
      const result = `data:image/svg+xml;base64,${data.toString('base64')}`
      thumbnailCache.set(cacheKey, { data: result, mtime: stats.mtimeMs })
      return result
    }

    /** 使用 nativeImage 缩放生成小缩略图 */
    const img = nativeImage.createFromPath(filePath)
    if (img.isEmpty()) return null

    const size = img.getSize()
    const scale = Math.min(maxSize / size.width, maxSize / size.height, 1)
    const resized = img.resize({
      width: Math.round(size.width * scale),
      height: Math.round(size.height * scale),
      quality: 'good'
    })

    const result = `data:image/png;base64,${resized.toPNG().toString('base64')}`

    /** 写入缓存 */
    if (thumbnailCache.size >= THUMBNAIL_CACHE_MAX) {
      const firstKey = thumbnailCache.keys().next().value
      if (firstKey) thumbnailCache.delete(firstKey)
    }
    thumbnailCache.set(cacheKey, { data: result, mtime: stats.mtimeMs })
    return result
  } catch {
    return null
  }
})

/** 合并初始化接口：一次 IPC 返回设置 + 所有文件夹内容，减少启动时多次 IPC 往返 */
ipcMain.handle('get-init-data', async () => {
  const settings = {
    alwaysOnTop: store.get('alwaysOnTop'),
    autoLaunch: store.get('autoLaunch'),
    opacity: store.get('opacity'),
    activeTab: store.get('activeTab'),
    theme: store.get('theme') || 'light',
    hotkey: store.get('hotkey') || '',
  }
  const folders = store.get('folders') as string[]
  const tabs = await Promise.all(
    folders.map(async (folderPath) => {
      const files = await readFolderContentsAsync(folderPath)
      const name = folderPath.split('\\').pop() || folderPath.split('/').pop() || folderPath
      return { path: folderPath, name, files }
    })
  )
  return { settings, tabs }
})

// ============ 应用生命周期 ============

app.whenReady().then(() => {
  createWindow()
  createTray()

  /** 启动时同步开机自启状态（避免仅切换时生效，重启后状态不一致） */
  setAutoLaunch(store.get('autoLaunch') as boolean)

  /** 系统休眠唤醒后：重启 watcher + 刷新所有文件夹 */
  powerMonitor.on('resume', () => {
    console.log('[powerMonitor] 系统唤醒，重启文件监听、刷新文件夹、重注册快捷键')
    restartAllWatchers()
    setTimeout(() => refreshAllFolders(), 1000)

    /** 休眠唤醒后重新注册全局快捷键（Windows 休眠可能导致注册丢失） */
    const savedHotkey = store.get('hotkey') as string
    if (savedHotkey) {
      registerGlobalHotkey(savedHotkey)
    }
  })

  /** 窗口显示/聚焦时刷新文件夹内容（防抖 500ms） */
  if (mainWindow) {
    const onWindowFocus = () => {
      if (focusRefreshTimer) clearTimeout(focusRefreshTimer)
      focusRefreshTimer = setTimeout(() => {
        refreshAllFolders()
      }, 500)
    }
    mainWindow.on('show', onWindowFocus)
    mainWindow.on('focus', onWindowFocus)
  }

  /** 定时轮询兜底：每 5 分钟刷新一次文件夹内容 */
  pollTimer = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      refreshAllFolders()
    }
  }, POLL_INTERVAL)
})

app.on('window-all-closed', () => {
  /** Windows 上关闭所有窗口不退出应用 */
})

app.on('activate', () => {
  if (!mainWindow) {
    createWindow()
  }
})

app.on('before-quit', () => {
  /** 停止定时轮询 */
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  /** 关闭所有文件监听 */
  watchers.forEach((watcher) => watcher.close())
  watchers.clear()
  /** 注销全局快捷键 */
  globalShortcut.unregisterAll()
})
