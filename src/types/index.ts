/** 文件信息 */
export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedTime: string
  extension: string
}

/** 文件夹标签页 */
export interface FolderTab {
  path: string
  name: string
  files: FileInfo[]
}

/** 应用设置 */
export interface AppSettings {
  alwaysOnTop: boolean
  autoLaunch: boolean
  opacity: number
  activeTab: number
}

/** Electron API 类型 */
export interface ElectronAPI {
  selectFolder: () => Promise<{ folderPath: string; files: FileInfo[]; folders: string[] } | null>
  getFolders: () => Promise<string[]>
  getFolderContents: (folderPath: string) => Promise<FileInfo[]>
  removeFolder: (folderPath: string) => Promise<string[]>
  reorderFolders: (folderPaths: string[]) => Promise<void>
  openFile: (filePath: string) => Promise<void>
  showInExplorer: (filePath: string) => Promise<void>
  copyFile: (filePaths: string | string[]) => Promise<boolean>
  copyPath: (filePath: string) => Promise<boolean>
  getThumbnail: (filePath: string) => Promise<string | null>
  getSmallThumbnail: (filePath: string, maxSize?: number) => Promise<string | null>
  startDrag: (filePaths: string | string[]) => void
  windowMinimize: () => Promise<void>
  windowClose: () => Promise<void>
  toggleAlwaysOnTop: () => Promise<boolean>
  getSettings: () => Promise<AppSettings>
  setActiveTab: (index: number) => Promise<void>
  onFolderUpdated: (callback: (data: { folderPath: string; files: FileInfo[] }) => void) => () => void
  onSettingsChanged: (callback: (data: any) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
