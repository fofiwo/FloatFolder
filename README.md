<div align="center">

# �️ FloatFolder

**桌面图片素材快速拖拽工具**

截图、设计稿、素材图——悬浮在桌面上，拖拽即用。

[![Electron](https://img.shields.io/badge/Electron-33-47848f?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

## 💡 这是什么？

FloatFolder 是一个 **Windows 桌面悬浮窗工具**，专为 **图片文件夹** 和 **截图文件夹** 设计。

把你的截图目录、设计素材文件夹挂载到桌面悬浮窗，**看到缩略图就能直接拖拽**到微信、Figma、浏览器、Word——任何接受图片的地方。

> **痛点**：每次要发截图或插入图片，都要打开资源管理器 → 找到文件夹 → 翻找文件 → 拖拽。
> **FloatFolder**：截图自动出现在浮窗里，一拖即走。

### 🎯 典型使用场景

- **截图文件夹** — 截图后立即出现在浮窗，拖到聊天窗口发送
- **设计素材库** — Logo、Icon、配图常驻桌面，随取随用
- **写文档配图** — 拖拽图片到 Word / Notion / 飞书文档
- **社交媒体运营** — 批量图片快速拖拽上传

---

## ✨ 核心功能

<table>
<tr>
<td width="50%">

### �️ 图片就绪
- 图片文件 **内联缩略图**，一眼找到目标
- 悬停 **大图预览**（Quick Look 风格）
- **原生拖拽** 到任何接受图片的程序
- 单击 **一键复制** 图片到剪贴板
- **实时监控** 文件夹变化——截图后自动出现
- 多文件夹 **Tab 标签页**（截图 / 素材 / 配图分类管理）

</td>
<td width="50%">

### 🎨 视觉体验
- macOS 风格 UI（红绿灯按钮、Spotlight 搜索栏）
- **亮色/暗色主题** 一键切换
- 根据文件类型显示 **彩色图标**
- 窗口 **透明度可调**，不遮挡工作区
- 窗口 **置顶** 常驻桌面
- 精致圆角 + 毛玻璃设计

</td>
</tr>
<tr>
<td width="50%">

### ⚡ 效率操作
- **Ctrl+单击** 多选图片
- **Shift+单击** 范围选择
- 多选图片 **批量拖拽 / 批量复制**
- **全局快捷键** 随时唤醒，跟随鼠标弹出
- **搜索过滤** 快速定位文件
- 双击用系统默认程序打开编辑

</td>
<td width="50%">

### 🔧 贴心设计
- 窗口 **位置/尺寸** 自动记忆
- **系统托盘** 常驻，关闭即隐藏
- **开机自启动**（可关闭）
- 设置面板集中管理所有偏好
- 支持 `prefers-reduced-motion` 无障碍
- 最小资源占用，不干扰工作流

</td>
</tr>
</table>

---

## 📸 截图预览

> 💡 **提示**：截图待补充。你可以通过 `npm run dev` 运行项目后自行体验。

<!-- 
在此放置截图：
![亮色主题](./docs/screenshots/light.png)
![暗色主题](./docs/screenshots/dark.png)
-->

| 亮色主题 | 暗色主题 |
|:---:|:---:|
| *截图待补充* | *截图待补充* |

---

## 🚀 快速开始

### 直接下载

从 [Releases](../../releases) 页面下载最新的 `FloatFolder Setup x.x.x.exe`，双击安装即可使用。

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/你的用户名/float-folder.git
cd float-folder

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 打包为 Windows 安装包
npm run build
```

---

## 📖 使用指南

1. 启动后点击「添加文件夹」，选择你的 **截图文件夹** 或 **图片素材文件夹**
2. 文件夹中的图片会以 **缩略图列表** 展示在悬浮窗中
3. 新截图会 **自动出现** 在列表顶部（实时监控）
4. **直接拖拽** 图片到微信、Figma、Word 等任何程序

| 操作 | 说明 |
|------|------|
| **拖拽** 图片 | 拖到聊天窗口 / 编辑器 / 浏览器 / 桌面 |
| **单击** 图片 | 复制到剪贴板，直接 Ctrl+V 粘贴 |
| **悬停** 图片 | 大图预览，确认是不是要找的那张 |
| **双击** 图片 | 用默认程序打开编辑 |
| **Ctrl+单击** | 多选图片，批量拖拽 |
| **Shift+单击** | 范围选择多张图片 |
| **全局快捷键** | 随时在鼠标位置唤出浮窗 |
| **右键菜单** | 打开 / 复制 / 复制路径 / 在资源管理器中显示 |

---

## 🛠️ 技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| **桌面框架** | Electron 33 | 跨平台桌面应用 |
| **前端框架** | React 18 | 组件化 UI 开发 |
| **类型系统** | TypeScript 5 | 类型安全 |
| **样式方案** | TailwindCSS 3 | 原子化 CSS |
| **文件监听** | chokidar | 跨平台文件系统监控 |
| **持久化** | electron-store | 用户设置持久化存储 |
| **构建工具** | Vite + electron-builder | 快速开发 + 安装包构建 |
| **图标处理** | sharp | SVG → PNG / ICO 多尺寸图标生成 |

---

## 📁 项目结构

```
float-folder/
├── electron/                # Electron 主进程
│   ├── main.ts              #   窗口管理、系统托盘、文件监听、IPC 通信
│   └── preload.ts           #   预加载脚本，安全暴露 API 到渲染进程
├── src/                     # React 渲染进程
│   ├── components/          #   UI 组件
│   │   ├── TitleBar.tsx     #     标题栏（macOS 红绿灯按钮 + 主题/设置）
│   │   ├── TabBar.tsx       #     文件夹标签页栏（拖拽排序）
│   │   ├── FileList.tsx     #     文件列表（搜索、排序、多选、拖拽）
│   │   ├── FileItem.tsx     #     单个文件行（缩略图懒加载）
│   │   ├── ContextMenu.tsx  #     右键菜单
│   │   ├── Preview.tsx      #     图片悬停大图预览
│   │   ├── SettingsPanel.tsx #    设置面板
│   │   ├── Toast.tsx        #     轻提示通知
│   │   └── EmptyState.tsx   #     空状态引导
│   ├── lib/
│   │   └── utils.tsx        #   工具函数（文件图标、格式化）
│   ├── types/
│   │   └── index.ts         #   TypeScript 类型定义
│   ├── App.tsx              #   主应用组件（视图状态管理）
│   ├── main.tsx             #   渲染进程入口
│   └── index.css            #   全局样式 + CSS 变量主题系统
├── scripts/                 # 构建脚本
│   ├── generate-icons.js    #   SVG → 多尺寸 PNG
│   └── generate-ico.js      #   PNG → Windows ICO
├── public/                  # 静态资源（图标文件）
└── package.json
```

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. **Fork** 本仓库
2. 创建功能分支：`git checkout -b feat/amazing-feature`
3. 提交变更：`git commit -m 'feat: 添加某个很棒的功能'`
4. 推送分支：`git push origin feat/amazing-feature`
5. 提交 **Pull Request**

> 提交消息请遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范。

---

## 📄 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

---

<div align="center">

**如果觉得有用，请给个 ⭐ Star 支持一下！**

</div>
