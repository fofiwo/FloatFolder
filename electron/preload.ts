import { contextBridge, ipcRenderer } from 'electron'

/** 暴露安全的 API 给渲染进程 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** 文件夹操作 */
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getFolders: () => ipcRenderer.invoke('get-folders'),
  getFolderContents: (folderPath: string) => ipcRenderer.invoke('get-folder-contents', folderPath),
  removeFolder: (folderPath: string) => ipcRenderer.invoke('remove-folder', folderPath),

  /** 文件操作 */
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  showInExplorer: (filePath: string) => ipcRenderer.invoke('show-in-explorer', filePath),
  copyFile: (filePaths: string | string[]) => ipcRenderer.invoke('copy-file', filePaths),
  copyPath: (filePath: string) => ipcRenderer.invoke('copy-path', filePath),
  getThumbnail: (filePath: string) => ipcRenderer.invoke('get-thumbnail', filePath),
  getSmallThumbnail: (filePath: string, maxSize?: number) => ipcRenderer.invoke('get-small-thumbnail', filePath, maxSize),

  /** 原生拖拽 */
  startDrag: (filePaths: string | string[]) => ipcRenderer.send('ondragstart', filePaths),

  /** 窗口操作 */
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),

  /** 设置 */
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setActiveTab: (index: number) => ipcRenderer.invoke('set-active-tab', index),

  /** 事件监听 */
  onFolderUpdated: (callback: (data: { folderPath: string; files: any[] }) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('folder-updated', handler)
    return () => ipcRenderer.removeListener('folder-updated', handler)
  },
  onSettingsChanged: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('settings-changed', handler)
    return () => ipcRenderer.removeListener('settings-changed', handler)
  }
})
