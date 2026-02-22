# 更新日志

## [1.7.5] - 2026-02-22

### Fixed（fix）
- 修复悬浮图标在 Windows 透明窗口下出现白色背景/白边的问题（icon-mode 强制根节点透明）
- 修复悬浮图标在非置顶状态下被其他应用遮挡：图标模式默认强置顶（alwaysOnTop + level=floating），展开模式恢复用户设置
- 优化悬停展开不跟手/抖动：降低 hover 延迟、移除 hover scale 引起的边缘抖动，并在展开瞬间添加短暂交互锁

### Changed（style）
- 悬浮图标视觉升级为 Siri 风格圆形 3D Orb + 呼吸光晕（更克制、更立体）

## [1.7.4] - 2026-02-22

### Fixed（fix）
- 修复 Toast 通知在亮色模式下硬编码暗色背景导致的视觉冲突（改为主题感知变量）
- 修复三级文本对比度不达标（亮色/暗色均低于 WCAG AA 4.5:1），opacity 从 0.3 提升至 0.45
- 修复右键菜单快捷键文字在 hover 蓝色背景上不可读的问题（添加 group-hover 白色覆盖）
- 修复图片预览弹出在亮色模式下与白色背景融为一体的问题（恢复主题感知 border）
- 修复 Toast 勾选图标硬编码暗色绿色 #32d74b（改为 var(--mac-green)）
- 修复 z-index 层级冲突：Preview(55) < Toast(60) < ContextMenu(100)
- 修复 TabBar 活跃标签指示条被 border 截断（添加 overflow-y-visible）
- 修复 FileItem 缩略图 alt 文本为空（改为文件名，提升无障碍性）

### Changed（style）
- 所有图标按钮添加 aria-label 属性（TitleBar、TabBar、FileList 排序按钮）
- 统一全局微交互过渡时间为 150ms（TitleBar/TabBar/FileList/文件行）
- 添加 prefers-reduced-motion 全局支持，禁用所有动画和过渡
- 清理未使用的呼吸灯动画死代码（breathing-glow、breathing-ring、pulse-dot）

## [1.7.3] - 2026-02-22

### Fixed（fix）
- 修复渲染进程缺失 IPC API 暴露导致快捷键/窗口模式切换失效的问题（preload 补齐 setHotkey/setWindowMode/onToggleExpand）
- 修复悬浮图标未按需求“悬停即展开”的问题：增加 hover 自动展开（带轻微延迟防误触）

### Changed（style）
- 恢复悬浮图标呼吸光环与脉冲点动画，并继续尊重 prefers-reduced-motion 降低动画干扰

## [1.7.2] - 2026-02-22

### Fixed（fix）
- 修复 Windows 任务栏和系统托盘不显示应用图标的问题（SVG 格式不被 nativeImage 支持）
- 新增 SVG→PNG 多尺寸图标生成脚本（16/32/48/64/128/256px）
- 窗口图标和托盘图标改用 PNG 格式，确保跨平台兼容

### Fixed（fix）
- 修复亮色主题下右键菜单对比度不足导致看不清的问题（弹层背景/边框跟随主题变量）

### Changed（style）
- 优化复制 Toast 提示：清新绿色小勾 +「已复制 / 文件名」两行更简洁文案
- 弱提示文字（tertiary）对比度提升，信息更易读
- 尊重系统减少动画偏好（prefers-reduced-motion），减少动画干扰

## [1.7.1] - 2026-02-22

### Changed（style）
- 移除悬停图片预览（Quick Look）外框边框描边，改用阴影与背景层次区分
- 优化 Tab 标签页辨识度：激活态强调条/边框/背景更清晰，文件数改为徽标样式

## [1.7.0] - 2026-02-22

### Added（feat）
- 新增悬浮图标模式：Apple 风格呼吸灯图标，降低视觉干扰
- 鼠标悬停图标自动展开完整界面，移开后延迟收起
- 新增 FloatingIcon 组件（脉冲光点、呼吸光环、文件夹/文件计数提示）
- 新增 SettingsPanel 设置面板（右键图标打开）
- 新增全局快捷键配置，支持录制、保存、清除快捷键
- 新增窗口模式切换（图标模式 72x72 透明窗口 ↔ 展开模式完整窗口）
- 新增 `set-hotkey`、`set-window-mode` IPC 通道
- 新增 `onToggleExpand` 事件监听（快捷键唤醒切换）
- 新增呼吸灯、脉冲光点、展开/收起 CSS 动画

### Changed（refactor）
- 窗口创建改为透明模式，初始以图标形式启动
- 窗口尺寸仅在展开模式下保存，图标模式不覆盖
- 应用退出时自动注销全局快捷键

## [1.6.1] - 2026-02-22

### Fixed（fix）
- 修复多选文件拖拽失败：统一图标创建逻辑（多选路径未校验 isEmpty 导致静默失败）+ 为 files 参数添加 fallback

## [1.6.0] - 2026-02-22

### Added（feat）
- 新增亮色/暗色主题切换功能，符合 Apple 设计规范
- TitleBar 右侧新增太阳/月亮主题切换按钮
- 主题偏好自动持久化（重启后保持上次选择）
- 亮色主题配色：白色背景、#f5f5f7 表面、#007aff 强调色
- 暗色主题配色：#1e1e1e 背景、#2a2a2c 表面、#0a84ff 强调色
- 所有组件（搜索栏、右键菜单、预览弹出、Toast、状态栏）自动适配主题
- 主题切换带平滑 0.25s 过渡动画

### Changed（refactor）
- 颜色系统从硬编码值重构为 CSS 变量，支持动态主题切换
- Tailwind 配置新增 darkMode: 'class' 策略

## [1.5.0] - 2026-02-22

### Added（feat）
- 新增文件排序功能，支持按名称排序和按修改时间倒序排序
- 搜索栏旁新增排序切换按钮（名称图标/时钟图标），点击切换排序方式
- 文件夹始终置顶，文件按所选方式排序

## [1.4.4] - 2026-02-22

### Fixed（fix）
- 修复右键单击打开菜单时仍会触发悬停图片预览的问题（菜单打开期间抑制悬停预览，避免视线污染）

## [1.4.3] - 2026-02-22

### Fixed（fix）
- 修复多选文件后无法拖拽的问题（用 mousedown 手动检测拖拽手势替代不可靠的 HTML5 dragstart）

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
