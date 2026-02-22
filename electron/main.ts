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
    iconPosition: { x: 100, y: 100 },
    folders: [] as string[],
    activeTab: 0,
    alwaysOnTop: true,
    autoLaunch: false,
    opacity: 0.95,
    theme: 'light' as 'light' | 'dark',
    hotkey: '' as string,

    /** 当已设置快捷键时：是否仍显示悬浮图标（默认开启，避免“莫名消失”的体感） */
    showFloatingIconWithHotkey: true,
  }
})

/** 图标模式窗口尺寸 */
/**
 * icon 窗口需要比 orb 大很多：halo blur 会被窗口边界裁切，形成“方形框”。
 * 因此这里留出足够安全边界。
 */
const ICON_MODE_SIZE = { width: 160, height: 160 }
let currentMode: 'icon' | 'expanded' = 'icon'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let registeredHotkey: string | null = null
const watchers: Map<string, chokidar.FSWatcher> = new Map()

let iconMoveDebounceTimer: ReturnType<typeof setTimeout> | null = null
let isDraggingIcon = false
let iconDragTimer: ReturnType<typeof setInterval> | null = null
let iconDragOffset: { x: number; y: number } | null = null

function clampToWorkArea(x: number, y: number, width: number, height: number) {
  const display = screen.getDisplayNearestPoint({ x, y })
  const workArea = display.workArea

  const nextX = Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - width)
  const nextY = Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - height)
  return { x: nextX, y: nextY }
}

function saveIconPosition() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const [x, y] = mainWindow.getPosition()
  store.set('iconPosition', { x, y })
}

function snapIconWindowToEdges() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (currentMode !== 'icon') return

  const bounds = mainWindow.getBounds()
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
  const workArea = display.workArea

  const threshold = 16
  let nextX = bounds.x
  let nextY = bounds.y

  /** left / right */
  if (Math.abs(bounds.x - workArea.x) <= threshold) {
    nextX = workArea.x
  } else if (Math.abs(bounds.x + bounds.width - (workArea.x + workArea.width)) <= threshold) {
    nextX = workArea.x + workArea.width - bounds.width
  }

  /** top / bottom */
  if (Math.abs(bounds.y - workArea.y) <= threshold) {
    nextY = workArea.y
  } else if (Math.abs(bounds.y + bounds.height - (workArea.y + workArea.height)) <= threshold) {
    nextY = workArea.y + workArea.height - bounds.height
  }

  if (nextX !== bounds.x || nextY !== bounds.y) {
    const clamped = clampToWorkArea(nextX, nextY, bounds.width, bounds.height)
    mainWindow.setPosition(clamped.x, clamped.y, false)
    store.set('iconPosition', { x: clamped.x, y: clamped.y })
  }
}

function startIconDrag(offsetX: number, offsetY: number) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (currentMode !== 'icon') return

  isDraggingIcon = true
  iconDragOffset = { x: offsetX, y: offsetY }

  if (iconDragTimer) clearInterval(iconDragTimer)
  iconDragTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !iconDragOffset) return

    const cursor = screen.getCursorScreenPoint()
    const bounds = mainWindow.getBounds()
    const nextX = cursor.x - iconDragOffset.x
    const nextY = cursor.y - iconDragOffset.y
    const clamped = clampToWorkArea(nextX, nextY, bounds.width, bounds.height)

    /** 禁用动画：拖拽需要跟手 */
    mainWindow.setPosition(clamped.x, clamped.y, false)
    store.set('iconPosition', { x: clamped.x, y: clamped.y })
  }, 16)
}

function stopIconDrag() {
  isDraggingIcon = false
  iconDragOffset = null

  if (iconDragTimer) {
    clearInterval(iconDragTimer)
    iconDragTimer = null
  }

  saveIconPosition()
  snapIconWindowToEdges()
}

function sendSettingsChanged(
  patch: Partial<{
    alwaysOnTop: boolean
    autoLaunch: boolean
    opacity: number
    theme: 'light' | 'dark'
    hotkey: string
    showFloatingIconWithHotkey: boolean
  }>
) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('settings-changed', patch)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function shouldShowFloatingIcon(): boolean {
  return store.get('showFloatingIconWithHotkey') as boolean
}

/** 图标模式下：根据用户设置隐藏/显示悬浮图标（隐藏时忽略鼠标事件，避免“透明窗口挡点”） */
function applyIconVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (currentMode !== 'icon') return

  const opacity = store.get('opacity') as number
  const safeOpacity = typeof opacity === 'number' ? Math.min(1, Math.max(0.4, opacity)) : 0.95

  if (shouldShowFloatingIcon()) {
    mainWindow.setIgnoreMouseEvents(false)
    mainWindow.setOpacity(safeOpacity)
    return
  }

  /** 0 会导致某些系统下窗口异常，这里用接近 0 的透明度 */
  mainWindow.setIgnoreMouseEvents(true, { forward: true })
  mainWindow.setOpacity(0.01)
}

function positionExpandedWindowNearCursor() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const workArea = display.workArea

  const saved = store.get('windowBounds') as { width: number; height: number }
  const width = saved?.width ?? 400
  const height = saved?.height ?? 500

  const margin = 12
  const x = clamp(cursor.x - Math.round(width / 2), workArea.x + margin, workArea.x + workArea.width - width - margin)
  const y = clamp(cursor.y + 18, workArea.y + margin, workArea.y + workArea.height - height - margin)

  /** 禁用窗口动画，减少展开时卡顿 */
  mainWindow.setBounds({ x, y, width, height }, false)
}

function toggleExpandFromHotkey() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const nextMode: 'icon' | 'expanded' = currentMode === 'icon' ? 'expanded' : 'icon'

  if (nextMode === 'expanded') {
    mainWindow.show()
    mainWindow.focus()

    /** 展开时恢复正常交互 */
    mainWindow.setIgnoreMouseEvents(false)

    const opacity = store.get('opacity') as number
    if (typeof opacity === 'number') {
      mainWindow.setOpacity(Math.min(1, Math.max(0.4, opacity)))
    }

    setWindowMode('expanded')
    positionExpandedWindowNearCursor()
  } else {
    setWindowMode('icon')
    applyIconVisibility()
  }

  mainWindow.webContents.send('toggle-expand', { mode: nextMode, source: 'hotkey' })
}

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = !!VITE_DEV_SERVER_URL

function createWindow() {
  const bounds = store.get('windowBounds') as { x: number; y: number; width: number; height: number }
  const iconPosition = store.get('iconPosition') as { x: number; y: number }
  const opacity = store.get('opacity') as number

  const safeIconPos = clampToWorkArea(
    iconPosition?.x ?? bounds.x,
    iconPosition?.y ?? bounds.y,
    ICON_MODE_SIZE.width,
    ICON_MODE_SIZE.height
  )

  mainWindow = new BrowserWindow({
    x: safeIconPos.x,
    y: safeIconPos.y,
    width: ICON_MODE_SIZE.width,
    height: ICON_MODE_SIZE.height,
    minWidth: 0,
    minHeight: 0,
    frame: false,
    transparent: true,
    resizable: false,
    /** 图标模式默认强置顶，避免被其他窗口遮挡 */
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: true,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  /** 图标模式：提升置顶级别（Windows 上更稳定） */
  mainWindow.setAlwaysOnTop(true, 'floating')

  /** 应用透明度（用户设置） */
  if (typeof opacity === 'number') {
    mainWindow.setOpacity(Math.min(1, Math.max(0.4, opacity)))
  }

  currentMode = 'icon'

  /** 初始化图标显示策略（快捷键模式可隐藏悬浮图标） */
  applyIconVisibility()

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

  /** 保存窗口尺寸和位置（仅在展开模式下保存） */
  mainWindow.on('resized', () => {
    if (currentMode === 'expanded') saveWindowBounds()
  })
  mainWindow.on('moved', () => {
    if (currentMode === 'expanded') {
      saveWindowBounds()
      return
    }

    /** 拖拽中由 setInterval 控制位置，避免 moved 里再触发吸附造成抖动 */
    if (isDraggingIcon) return

    /** 图标模式：持久化位置 + 靠边吸附 */
    saveIconPosition()

    if (iconMoveDebounceTimer) clearTimeout(iconMoveDebounceTimer)
    iconMoveDebounceTimer = setTimeout(() => {
      snapIconWindowToEdges()
    }, 120)
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

/** 切换窗口模式（图标/展开） */
function setWindowMode(mode: 'icon' | 'expanded') {
  if (!mainWindow || mainWindow.isDestroyed()) return
  /**
   * 重要：即使 mode 未变化，也要确保窗口处于正确的“可交互”状态。
   * 线上出现过 ignoreMouseEvents 残留导致按钮点击无响应的情况（看起来像 UI 卡死，实际事件被穿透/忽略）。
   * 这里做成幂等：同模式重复调用仅修正关键窗口属性，不重复覆盖用户尺寸。
   */
  if (mode === currentMode) {
    if (mode === 'icon') {
      mainWindow.setResizable(false)
      mainWindow.setMinimumSize(0, 0)
      mainWindow.setSkipTaskbar(true)
      mainWindow.setHasShadow(false)
      mainWindow.setAlwaysOnTop(true, 'floating')
      applyIconVisibility()
      return
    }

    /** expanded */
    mainWindow.setSkipTaskbar(false)
    mainWindow.setHasShadow(true)
    mainWindow.setMinimumSize(300, 350)
    mainWindow.setResizable(true)

    /** 展开模式必须可交互 */
    mainWindow.setIgnoreMouseEvents(false)

    /** 展开模式遵循用户的置顶设置 */
    const alwaysOnTop = store.get('alwaysOnTop') as boolean
    mainWindow.setAlwaysOnTop(alwaysOnTop)

    /** 应用透明度（用户设置） */
    const opacity = store.get('opacity') as number
    if (typeof opacity === 'number') {
      mainWindow.setOpacity(Math.min(1, Math.max(0.4, opacity)))
    }
    return
  }

  currentMode = mode

  if (mode === 'icon') {
    /** 切换到图标模式：缩小窗口 */
    const [x, y] = mainWindow.getPosition()
    mainWindow.setResizable(false)
    mainWindow.setMinimumSize(0, 0)
    const clamped = clampToWorkArea(x, y, ICON_MODE_SIZE.width, ICON_MODE_SIZE.height)
    mainWindow.setBounds({ x: clamped.x, y: clamped.y, width: ICON_MODE_SIZE.width, height: ICON_MODE_SIZE.height }, false)
    mainWindow.setSkipTaskbar(true)
    mainWindow.setHasShadow(false)

    /** 图标模式强置顶，避免被遮挡 */
    mainWindow.setAlwaysOnTop(true, 'floating')

    applyIconVisibility()
  } else {
    /** 切换到展开模式：恢复保存的窗口尺寸 */
    const bounds = store.get('windowBounds') as { x: number; y: number; width: number; height: number }
    const [x, y] = mainWindow.getPosition()
    mainWindow.setHasShadow(true)
    mainWindow.setSkipTaskbar(false)
    mainWindow.setMinimumSize(300, 350)
    mainWindow.setBounds({ x, y, width: bounds.width, height: bounds.height }, false)
    mainWindow.setResizable(true)

    /** 展开模式遵循用户的置顶设置 */
    const alwaysOnTop = store.get('alwaysOnTop') as boolean
    mainWindow.setAlwaysOnTop(alwaysOnTop)

    /** 展开模式必须可交互 */
    mainWindow.setIgnoreMouseEvents(false)

    const opacity = store.get('opacity') as number
    if (typeof opacity === 'number') {
      mainWindow.setOpacity(Math.min(1, Math.max(0.4, opacity)))
    }
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
        setWindowMode('expanded')
        mainWindow?.webContents.send('open-settings')
      }
    },
    {
      label: '置顶窗口',
      type: 'checkbox',
      checked: store.get('alwaysOnTop') as boolean,
      click: (menuItem) => {
        store.set('alwaysOnTop', menuItem.checked)

        /** 图标模式强置顶：仅保存偏好，不降低置顶级别 */
        if (currentMode === 'expanded') {
          mainWindow?.setAlwaysOnTop(menuItem.checked)
        } else {
          mainWindow?.setAlwaysOnTop(true, 'floating')
        }

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
      toggleExpandFromHotkey()
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

  /** 图标模式强置顶：仅保存偏好，不降低置顶级别 */
  if (currentMode === 'expanded') {
    mainWindow?.setAlwaysOnTop(next)
  } else {
    mainWindow?.setAlwaysOnTop(true, 'floating')
  }

  sendSettingsChanged({ alwaysOnTop: next })
  refreshTrayMenu()
  return next
})

ipcMain.handle('set-always-on-top', (_event, enable: boolean) => {
  store.set('alwaysOnTop', enable)

  /** 图标模式强置顶：仅保存偏好，不降低置顶级别 */
  if (currentMode === 'expanded') {
    mainWindow?.setAlwaysOnTop(enable)
  } else {
    mainWindow?.setAlwaysOnTop(true, 'floating')
  }

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
    showFloatingIconWithHotkey: store.get('showFloatingIconWithHotkey') as boolean,
  }
})

/** 设置全局快捷键 */
ipcMain.handle('set-hotkey', (_event, hotkey: string) => {
  const success = registerGlobalHotkey(hotkey)
  if (success) {
    store.set('hotkey', hotkey)

    sendSettingsChanged({ hotkey })
    applyIconVisibility()
  }
  return success
})

ipcMain.handle('set-show-floating-icon-with-hotkey', (_event, enable: boolean) => {
  store.set('showFloatingIconWithHotkey', enable)
  sendSettingsChanged({ showFloatingIconWithHotkey: enable })
  applyIconVisibility()
  return enable
})

/** 设置窗口模式 */
ipcMain.handle('set-window-mode', (_event, mode: 'icon' | 'expanded') => {
  setWindowMode(mode)
})

/** 悬浮球自定义拖拽（允许在球体本身拖动） */
ipcMain.handle('start-icon-drag', (_event, offsetX: number, offsetY: number) => {
  startIconDrag(offsetX, offsetY)
})

ipcMain.handle('stop-icon-drag', () => {
  stopIconDrag()
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

  if (currentMode === 'icon' && !shouldShowFloatingIcon()) {
    mainWindow?.setOpacity(0.01)
  } else {
    mainWindow?.setOpacity(safeOpacity)
  }

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
