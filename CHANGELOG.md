# 更新日志

## [1.4.2] - 2026-02-22

### Added（feat）
- 按住 Ctrl 键自动停用悬停功能（禁用文件悬停高亮和图片预览，方便多选操作）

## [1.4.1] - 2026-02-22

### Fixed（fix）
- 修复多选文件后无法拖拽的问题（startDrag 的 file 参数不能为空字符串）

## [1.4.0] - 2026-02-22

### Changed（refactor）
- 全面重构 UI 为 Apple/macOS 暗色风格
- TitleBar 改用 macOS 红绿灯按钮（红关/黄最小化/绿置顶），居中标题
- TabBar 改用 pill 标签样式，活跃标签带高亮背景和阴影
- FileItem 改为双行布局（名称+大小），32px 圆角图标容器
- FileList 搜索栏改为 Spotlight 风格，底部状态栏显示文件夹名称
- ContextMenu 改为 macOS 右键菜单风格，hover 蓝色高亮，快捷键提示
- Preview 改为 Quick Look 风格弹出
- Toast 添加绿色勾选图标，毛玻璃背景
- EmptyState 改为大圆角图标容器 + 蓝色实心按钮
- 全局图标放大至 18px，描边改为 1.8px，文件夹图标用 macOS 蓝色
- 配色系统改为 macOS 暗色设计规范（#1e1e1e 背景、#2a2a2c 表面、#0a84ff 强调色）
- 字体改为 Apple 系统字体栈（SF Pro Display/Text）
- 滚动条改为 macOS 风格（圆角、半透明）

### Fixed（fix）
- 修复 Vite dev server IPv6/IPv4 不匹配导致 Electron 连接失败的问题（强制 127.0.0.1 监听）
- 修复透明窗口在 Windows 上不显示内容的问题

## [1.3.0] - 2026-02-22

### Added（feat）
- 新增拖拽调整 Tab 标签页顺序功能，支持持久化保存
- 拖拽时显示视觉反馈（源 tab 半透明，目标 tab 高亮边框）

## [1.2.0] - 2026-02-22

### Fixed（fix）
- 修复单击复制文件到剪贴板无效的问题（改用 PowerShell SetFileDropList API）

### Added（feat）
- 新增 Ctrl+单击多选文件功能，支持批量操作
- 新增多选文件拖拽到外部（Electron startDrag files 数组）
- 新增右键菜单批量复制选中文件
- 新增选中文件蓝色高亮样式
- 新增底部状态栏显示已选文件数量

## [1.1.0] - 2026-02-22

### Added（feat）
- 新增图片文件内联缩略图展示（列表视图显示小缩略图，替代纯图标）
- 新增卡片视图模式，支持列表/卡片视图切换
- 新增 FileCard 组件用于卡片网格展示
- 新增 `getSmallThumbnail` IPC 接口，使用 nativeImage 高效生成指定尺寸缩略图
- 新增 IntersectionObserver 懒加载缩略图，优化大量图片文件夹性能

## [1.0.0] - 2026-02-22

### Added（feat）
- 新增悬浮窗展示文件夹内容功能
- 新增多文件夹 Tab 标签页切换
- 新增 chokidar 文件实时监控
- 新增原生文件拖拽到外部功能
- 新增单击文件复制到剪贴板
- 新增双击文件用系统默认程序打开
- 新增右键菜单（打开/复制/复制路径/在资源管理器中显示）
- 新增图片文件悬停缩略图预览
- 新增文件搜索过滤
- 新增窗口尺寸和位置自动记忆（electron-store）
- 新增系统托盘支持
- 新增开机自启动设置
- 新增根据文件类型显示彩色图标
- 新增 Glassmorphism 风格深色 UI
