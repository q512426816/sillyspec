# 快速上手

## 安装

**推荐全局安装**，直接使用 `sillyspec` 命令：

```bash
npm i -g sillyspec@latest
```

> ⚠️ 需要 Node.js >= 18。

## 初始化项目

进入你的项目目录，运行：

```bash
sillyspec init
```

零交互，自动检测你用的 AI 工具并安装对应模板。

**指定工具：**

```bash
sillyspec init --tool claude
sillyspec init --tool cursor
sillyspec init --tool openclaw
```

## 选择入口

根据你的情况，选一个开始：

| 场景 | 命令 | 说明 |
|------|------|------|
| 🟢 绿地项目（空目录） | `/sillyspec:init` | 深度提问 → 需求文档 → 路线图 |
| 🟤 棕地项目（有代码） | `/sillyspec:scan` | 交互式扫描代码库 |
| 💡 自由思考 | `/sillyspec:explore "想法"` | 讨论、画图、调研，不写代码 |
| 🧩 大模块 | `/sillyspec:brainstorm` | 直接贴原型图 |
| 🩺 项目自检 | `sillyspec run doctor` | 4 步自检环境 |

## 基本工作流

```
绿地：init → brainstorm → plan → execute → [verify] → archive
棕地：scan → brainstorm → plan → execute → [verify] → archive
```

AI 通过 `sillyspec run <stage>` 命令驱动流程，每个阶段的进度由 progress.json 自动追踪。

也可以跳过流程：

- 小 bug：`/sillyspec:quick "修复 xxx"`
- 不确定要做什么：`/sillyspec:explore "想法"`
- 中断恢复：`/sillyspec:resume`
- 不知道下一步：`/sillyspec:continue`

## Skills 说明

SillySpec 的 skills 已精简为核心流程，每个 skill 对应一个明确阶段，不再有多余的中间层。
