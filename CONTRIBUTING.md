# 贡献指南

感谢你对 FloatFolder 的关注！欢迎通过以下方式参与贡献。

## 🐛 报告问题

- 使用 [GitHub Issues](../../issues) 提交 Bug 报告
- 请包含：操作系统版本、复现步骤、预期行为、实际行为
- 如有截图或错误日志，请一并附上

## 💡 功能建议

- 通过 Issue 提交功能需求，标注 `enhancement` 标签
- 描述使用场景和期望的行为

## 🔧 提交代码

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/你的用户名/float-folder.git
cd float-folder

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 开发流程

1. 从 `master` 创建功能分支：`git checkout -b feat/your-feature`
2. 编写代码并测试
3. 提交变更（遵循下方提交规范）
4. 推送并创建 Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 格式：

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(filelist): 新增文件拖拽排序` |
| `fix` | 修复 Bug | `fix(titlebar): 修复按钮无法点击` |
| `refactor` | 代码重构 | `refactor(utils): 重构图标处理函数` |
| `style` | 样式调整 | `style(ui): 优化暗色主题配色` |
| `chore` | 构建/依赖 | `chore(deps): 升级 Electron 版本` |
| `docs` | 文档更新 | `docs: 更新 README 安装说明` |

### 代码规范

- **命名**：组件 `PascalCase`，函数/变量 `camelCase`，常量 `UPPER_SNAKE`
- **类型**：所有函数参数和返回值必须有 TypeScript 类型标注
- **注释**：复杂逻辑和 API 函数必须添加中文注释
- **样式**：优先使用 TailwindCSS 工具类，避免内联样式

### 项目结构

| 目录 | 内容 |
|------|------|
| `electron/` | Electron 主进程代码 |
| `src/components/` | React UI 组件 |
| `src/lib/` | 工具函数 |
| `src/types/` | TypeScript 类型定义 |
| `scripts/` | 构建辅助脚本 |

## 📄 协议

提交代码即表示你同意将代码以 [MIT License](./LICENSE) 协议开源。
