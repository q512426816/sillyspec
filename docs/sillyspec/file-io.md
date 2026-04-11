# 各阶段文件读写一览

## 核心流程

### brainstorm（头脑风暴）→ 架构师

| 类型 | 文件 | 用途 |
|------|------|------|
| 📥 读取 | `progress.json` | 状态检查 |
| 📥 读取 | `CODEBASE-OVERVIEW.md` | 项目概览 |
| 📥 读取 | `.sillyspec/projects/*.yaml` | 项目配置 |
| 📥 读取 | `.sillyspec/local.yaml` | 本地配置 |
| 📥 读取 | `docs/<project>/scan/STRUCTURE.md` | 代码结构（棕地） |
| 📥 读取 | `docs/<project>/scan/CONVENTIONS.md` | 代码规范（棕地） |
| 📥 读取 | `docs/<project>/scan/ARCHITECTURE.md` | 架构文档（棕地） |
| 📥 读取 | `.sillyspec/changes/` | 进行中的变更 |
| 📥 读取 | `~/.sillyspec/templates/` | 可复用模板 |
| 📤 产出 | `design.md` | 设计文档 |
| 📤 产出 | `proposal.md` | 提案 |
| 📤 产出 | `requirements.md` | 需求文档 |
| 📤 产出 | `tasks.md` | 任务列表 |

### plan（实现计划）→ 项目经理

| 类型 | 文件 | 用途 |
|------|------|------|
| 📥 读取 | `CODEBASE-OVERVIEW.md` | 项目概览 |
| 📥 读取 | `proposal.md`、`design.md`、`requirements.md`、`tasks.md` | brainstorm 产出 |
| 📥 读取 | `CONVENTIONS.md`、`ARCHITECTURE.md`、`STACK.md` | 代码规范 |
| 📥 读取 | `.sillyspec/local.yaml` | 本地配置 |
| 📤 产出 | `plan.md` | 计划总览（PM 视角，轻量） |
| 📤 产出 | `tasks/task-NN.md` | 任务蓝图（工程师视角，详细到可直接执行） |

### execute（波次执行）→ 工程师

| 类型 | 文件 | 用途 |
|------|------|------|
| 📥 读取 | `design.md` | 编码铁律章节 |
| 📥 读取 | `plan.md` | 全局任务划分和依赖 |
| 📥 读取 | `tasks/task-NN.md` | 任务蓝图（CLI 自动注入内容） |
| 📥 读取 | `CONVENTIONS.md`、`ARCHITECTURE.md` | 代码规范（温上下文，按需） |
| 📥 读取 | `.sillyspec/local.yaml` | 构建和测试命令 |
| 📥 读取 | `CODEBASE-OVERVIEW.md` | 项目概览 |
| 📥 读取 | `.sillyspec/knowledge/INDEX.md` | 知识库索引 |
| 📤 产出 | 代码文件 | 由任务决定 |
| 📤 产出 | 勾选 `task-N.md` 验收标准 + `plan.md` checkbox | 完成标记 |
| 📤 产出 | `knowledge/uncategorized.md` | 可能追加项目知识 |

### verify（验证确认）→ QA 专家

| 类型 | 文件 | 用途 |
|------|------|------|
| 📥 读取 | `proposal.md`、`design.md`、`tasks.md`、`requirements.md` | 设计文档 |
| 📥 读取 | `.sillyspec/projects/*.yaml` | 项目配置 |
| 📥 读取 | `.sillyspec/local.yaml` | 构建和测试命令 |
| 📥 读取 | `docs/<project>/scan/CONVENTIONS.md` | 代码规范 |
| 📥 读取 | `tasks/task-NN.md` | 任务蓝图验收标准 |
| 📤 产出 | 验证报告 | 终端输出 |
| 📤 产出 | `design.md` | 可能更新（Reverse Sync） |

## 辅助流程

### quick（快速任务）→ 全栈老兵

| 类型 | 文件 | 用途 |
|------|------|------|
| 📥 读取 | `.sillyspec/projects/*.yaml` | 项目配置 |
| 📥 读取 | `docs/<project>/scan/CONVENTIONS.md` | 代码规范 |
| 📥 读取 | `.sillyspec/local.yaml` | 本地配置 |
| 📥 读取 | `knowledge/INDEX.md` | 知识库 |
| 📥 读取 | `design.md` | 设计文档（有 `--change` 时） |
| 📤 产出 | 代码文件 | 由任务决定 |
| 📤 产出 | `tasks.md` | 有 `--change` 时追加任务 |
| 📤 产出 | `QUICKLOG-<用户名>.md` | 无 `--change` 时记录 |

### scan（代码扫描）

| 类型 | 文件 | 用途 |
|------|------|------|
| 📥 读取 | `.sillyspec/projects/*.yaml` | 项目配置 |
| 📥 读取 | `docs/*/scan/*.md` | 已有文档 |
| 📥 读取 | `package.json`、`pom.xml` 等 | 构建文件 |
| 📥 读取 | 源文件 | 通过 grep 搜索（禁止读全文） |
| 📤 产出 | `ARCHITECTURE.md` | 架构文档 |
| 📤 产出 | `CONVENTIONS.md` | 代码规范 |
| 📤 产出 | `STRUCTURE.md` | 代码结构 |
| 📤 产出 | `INTEGRATIONS.md` | 集成文档 |
| 📤 产出 | `TESTING.md` | 测试文档 |
| 📤 产出 | `CONCERNS.md` | 关注点 |
| 📤 产出 | `PROJECT.md` | 项目概览 |

### archive（归档变更）

| 类型 | 文件 | 用途 |
|------|------|------|
| 📥 读取 | `tasks.md` | 任务完成度检查 |
| 📥 读取 | `changes/<变更名>/` | 变更目录下所有文件 |
| 📤 产出 | `changes/archive/YYYY-MM-DD-<变更名>/` | 归档目录（移动） |
| 📤 产出 | `progress.json` | 更新进度 |

### doctor（项目自检）

| 类型 | 文件 | 用途 |
|------|------|------|
| 📥 读取 | `progress.json` | 进度 |
| 📥 读取 | `projects/*.yaml`、`local.yaml` | 项目配置 |
| 📥 读取 | MCP 配置 | Claude/Cursor/OpenClaw |
| 📥 读取 | `pom.xml`、`package.json` 等 | 构建文件 |
| 📤 产出 | 无 | 只检查报告 |

## 全局注入（每个 step）

### Persona

| 阶段 | 角色 |
|------|------|
| brainstorm | 🎯 资深架构师 |
| plan | 📋 技术项目经理 |
| execute | 💻 高级工程师 |
| verify | 🔍 QA 专家 |
| quick | 💻 全栈老兵 |

### 铁律

1. 文档是核心资产，代码是文档的产物
2. 只做本步骤描述的操作，不得自行扩展或跳过
3. 不要回头修改已完成的步骤
4. 不要编造不存在的 CLI 子命令
5. 完成后立即执行 `--done` 命令
6. 文档类型文件头部必须包含 author 和 created_at
7. 执行构建/测试前必须先读 local.yaml
