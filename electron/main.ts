import { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, nativeImage, clipboard, globalShortcut, screen } from 'electron'
import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'
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

function createWindow() {
  const bounds = store.get('windowBounds') as { x: number; y: number; width: number; height: number }
  const opacity = store.get('opacity') as number

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 300,
    minHeight: 350,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    skipTaskbar: false,
    hasShadow: true,
    roundedCorners: true,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setAlwaysOnTop(true, 'floating')

  /** 应用透明度（用户设置） */
  if (typeof opacity === 'number') {
    mainWindow.setOpacity(Math.min(1, Math.max(0.4, opacity)))
  }

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
        mainWindow?.webContents.send('open-settings')
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

/** 根据鼠标位置定位窗口，确保不超出屏幕边界 */
function positionWindowNearCursor() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const workArea = display.workArea

  const bounds = store.get('windowBounds') as { width: number; height: number }
  const width = bounds?.width ?? 400
  const height = bounds?.height ?? 500

  const margin = 12

  // 计算窗口位置：鼠标居中，稍微偏下一点避免遮挡鼠标
  let x = cursor.x - Math.round(width / 2)
  let y = cursor.y + 20

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
  const bounds = mainWindow.getBounds()
  store.set('windowBounds', bounds)
}

/** 创建系统托盘 */
function createTray() {
  const iconPath = path.join(__dirname, '../public/icon-16.png')
  let trayIcon: Electron.NativeImage

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
  } else {
    /** 备用：尝试加载大图标并缩放 */
    const fallback = path.join(__dirname, '../public/icon.png')
    trayIcon = fs.existsSync(fallback)
      ? nativeImage.createFromPath(fallback).resize({ width: 16, height: 16 })
      : nativeImage.createEmpty()
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

/** 读取文件夹内容 */
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
    /** 防抖：延迟发送更新 */
    if (mainWindow && !mainWindow.isDestroyed()) {
      const files = readFolderContents(folderPath)
      mainWindow.webContents.send('folder-updated', { folderPath, files })
    }
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
ipcMain.handle('get-folder-contents', (_event, folderPath: string) => {
  return readFolderContents(folderPath)
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

/** 复制文件到剪贴板（支持单个或多个文件） */
ipcMain.handle('copy-file', (_event, filePaths: string | string[]) => {
  try {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths]
    const addLines = paths.map((p) => `$f.Add("${p.replace(/"/g, '`"')}")`).join('; ')
    const psScript = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Collections.Specialized.StringCollection; ${addLines}; [System.Windows.Forms.Clipboard]::SetFileDropList($f)`
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, { timeout: 5000, windowsHide: true })
    return true
  } catch (err) {
    console.error('复制文件失败:', err)
    return false
  }
})

/** 复制文件路径 */
ipcMain.handle('copy-path', (_event, filePath: string) => {
  clipboard.writeText(filePath)
  return true
})

/** 原生文件拖拽（支持单个或多个文件） */
ipcMain.on('ondragstart', (event, filePaths: string | string[]) => {
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

/** 获取文件缩略图（图片文件） */
ipcMain.handle('get-thumbnail', async (_event, filePath: string) => {
  try {
    const ext = path.extname(filePath).toLowerCase()
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico']
    if (!imageExts.includes(ext)) return null

    const data = fs.readFileSync(filePath)
    const base64 = data.toString('base64')
    const mime = ext === '.svg' ? 'image/svg+xml' : `image/${ext.slice(1)}`
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
})

/** 获取缩略图（指定尺寸，用于列表/卡片内联展示） */
ipcMain.handle('get-small-thumbnail', async (_event, filePath: string, maxSize: number = 64) => {
  try {
    const ext = path.extname(filePath).toLowerCase()
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ico']
    if (!imageExts.includes(ext)) return null

    /** SVG 直接返回原始数据（体积小） */
    if (ext === '.svg') {
      const data = fs.readFileSync(filePath)
      return `data:image/svg+xml;base64,${data.toString('base64')}`
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

    return `data:image/png;base64,${resized.toPNG().toString('base64')}`
  } catch {
    return null
  }
})

// ============ 应用生命周期 ============

app.whenReady().then(() => {
  createWindow()
  createTray()

  /** 启动时同步开机自启状态（避免仅切换时生效，重启后状态不一致） */
  setAutoLaunch(store.get('autoLaunch') as boolean)
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
  /** 关闭所有文件监听 */
  watchers.forEach((watcher) => watcher.close())
  watchers.clear()
  /** 注销全局快捷键 */
  globalShortcut.unregisterAll()
})
