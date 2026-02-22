<div align="center">

# 📂 FloatFolder

**轻量级桌面悬浮文件夹工具**

一键访问常用文件，拖拽即用，实时同步。

[![Electron](https://img.shields.io/badge/Electron-33-47848f?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

## 💡 这是什么？

FloatFolder 是一个 **Windows 桌面悬浮窗工具**，将你常用的文件夹内容以浮窗形式展示在桌面上。

无需反复打开资源管理器，**鼠标悬停即可查看**，**单击复制、双击打开、拖拽到任意位置**——让文件操作回归直觉。

> 设计灵感来自 macOS Finder，采用 Apple 设计语言，在 Windows 上提供优雅的文件管理体验。

---

## ✨ 核心功能

<table>
<tr>
<td width="50%">

### 📁 文件管理
- 多文件夹 **Tab 标签页**，拖拽排序
- **实时监控** 文件变化（新增/删除/修改自动刷新）
- 单击 **一键复制** 到剪贴板
- 双击用 **系统默认程序打开**
- **原生拖拽** 到桌面或任意程序
- 右键菜单（打开/复制/复制路径/在资源管理器中显示）

</td>
<td width="50%">

### 🎨 视觉体验
- macOS 风格 UI（红绿灯按钮、Spotlight 搜索栏）
- **亮色/暗色主题** 一键切换
- 图片文件 **内联缩略图** 展示
- 悬停 **大图预览**（Quick Look 风格）
- 根据文件类型显示 **彩色图标**
- 窗口 **透明度可调**

</td>
</tr>
<tr>
<td width="50%">

### ⚡ 效率操作
- **Ctrl+单击** 多选文件
- **Shift+单击** 范围选择
- **Ctrl+Shift** 追加范围选择
- 多选文件 **批量拖拽/复制**
- **全局快捷键** 随时唤醒，跟随鼠标弹出
- **文件搜索** 快速过滤

</td>
<td width="50%">

### 🔧 贴心设计
- 窗口 **置顶/位置/尺寸** 自动记忆
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

| 操作 | 说明 |
|------|------|
| **单击** 文件 | 复制到剪贴板 |
| **双击** 文件 | 用默认程序打开 |
| **拖拽** 文件 | 拖到桌面或其他程序 |
| **右键** 文件 | 打开 / 复制 / 复制路径 / 在资源管理器中显示 |
| **悬停** 图片 | 显示大图预览 |
| **Ctrl+单击** | 多选文件 |
| **Shift+单击** | 范围选择文件 |
| **全局快捷键** | 在鼠标位置弹出/隐藏窗口 |
| **关闭窗口** | 最小化到系统托盘，双击托盘图标恢复 |

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
