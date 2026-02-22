import { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, nativeImage, clipboard } from 'electron'
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
    opacity: 0.95
  }
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const watchers: Map<string, chokidar.FSWatcher> = new Map()

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = !!VITE_DEV_SERVER_URL

function createWindow() {
  const bounds = store.get('windowBounds') as { x: number; y: number; width: number; height: number }
  const alwaysOnTop = store.get('alwaysOnTop') as boolean

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 300,
    minHeight: 350,
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop,
    skipTaskbar: false,
    backgroundColor: '#1e1e1e',
    roundedCorners: true,
    icon: path.join(__dirname, '../public/icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
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
  mainWindow.on('resized', saveWindowBounds)
  mainWindow.on('moved', saveWindowBounds)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  /** 初始化已保存的文件夹监听 */
  const folders = store.get('folders') as string[]
  folders.forEach((folder) => startWatching(folder))
}

function saveWindowBounds() {
  if (!mainWindow) return
  const bounds = mainWindow.getBounds()
  store.set('windowBounds', bounds)
}

/** 创建系统托盘 */
function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.svg')
  let trayIcon: Electron.NativeImage

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } else {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('FloatFolder - 悬浮文件夹')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    {
      label: '置顶窗口',
      type: 'checkbox',
      checked: store.get('alwaysOnTop') as boolean,
      click: (menuItem) => {
        store.set('alwaysOnTop', menuItem.checked)
        mainWindow?.setAlwaysOnTop(menuItem.checked)
        mainWindow?.webContents.send('settings-changed', { alwaysOnTop: menuItem.checked })
      }
    },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: store.get('autoLaunch') as boolean,
      click: (menuItem) => {
        store.set('autoLaunch', menuItem.checked)
        setAutoLaunch(menuItem.checked)
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
  const icon = getDefaultDragIcon()

  if (paths.length === 1) {
    const customIcon = nativeImage.createFromPath(paths[0]).resize({ width: 32, height: 32 })
    event.sender.startDrag({
      file: paths[0],
      icon: customIcon.isEmpty() ? icon : customIcon
    })
  } else {
    event.sender.startDrag({
      file: '',
      files: paths,
      icon
    })
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
  const current = mainWindow?.isAlwaysOnTop() ?? false
  mainWindow?.setAlwaysOnTop(!current)
  store.set('alwaysOnTop', !current)
  return !current
})

/** 获取设置 */
ipcMain.handle('get-settings', () => {
  return {
    alwaysOnTop: store.get('alwaysOnTop'),
    autoLaunch: store.get('autoLaunch'),
    opacity: store.get('opacity'),
    activeTab: store.get('activeTab')
  }
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
})
