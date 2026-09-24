---
name: sillyspec
description: "多 agent 仓库的变更账本 + 确定性验收层，规范驱动开发工具包。默认快道=薄流程（flow start/done 2 次调用：机器起草治理工件+每条 FR 测试绑定槽+收口实测门+patch 留档；需求不清晰 CLI 拦下指路头脑风暴预段，产物自动收编）。复杂变更走完整流程 scan → brainstorm → plan → execute → verify → archive（薄道实测失败自动升厚）；绿地 /sillyspec:init，棕地 /sillyspec:scan，全自动 /sillyspec:auto。核心能力：CLI 实测验收门禁（自报不算、亲测才算）、多 agent 并发控制（会话/worktree/跨仓隔离 + 竞态硬门）、SQLite 持久账本断点恢复、范围对账与 API 契约矩阵。兼容 Claude Code / Cursor / Codex / OpenCode / OpenClaw / Gemini。"
---

# SillySpec

从"你说要啥"到"代码能跑"的规范驱动开发工具包。
Claude Code / Cursor / Codex / OpenCode / OpenClaw / Gemini 通用。

## 快速开始

| 场景 | 命令 |
|---|---|
| 常规变更（需求已明确）——默认快道 | `sillyspec flow start --change <名> --input "<含『成功标准：』条目的需求>"` → 干活 → `sillyspec flow done`（2 次调用，机器起草治理工件+测试绑定+patch 留档） |
| 需求不明确（先头脑风暴预段） | `sillyspec run brainstorm --change <名>` → 完成后 `sillyspec flow start --change <名>` 收编续跑薄道 |
| 全自动流程 | `/sillyspec:auto <需求描述>` |
| 全新项目（空目录） | `/sillyspec:init` |
| 已有代码的项目 | `/sillyspec:scan` |
| 多项目工作区 | `/sillyspec:workspace` |
| 自由思考 | `/sillyspec:explore` |

## 完整工作流

```
默认快道（薄流程）：flow start → 干活 → flow done（需求不清晰时 CLI 拦下指路头脑风暴预段，产物自动收编）
复杂变更（完整流程）：brainstorm → plan → execute → verify → archive（薄道实测失败自动升厚至此）
绿地：init → brainstorm → plan → execute → verify → archive
棕地：scan → brainstorm → plan → execute → verify → archive
全自动：auto（自动推进全部阶段，支持用户确认门控）
```

## 核心命令

| 命令 | 用途 |
|---|---|
| `/sillyspec:auto` | 全自动推进全部流程 |
| `/sillyspec:init` | 绿地项目初始化 |
| `/sillyspec:scan` | 棕地项目扫描（生成 7 份文档） |
| `/sillyspec:brainstorm` | 需求探索 + 生成设计文档 |
| `/sillyspec:plan` | 编写实现计划（Wave 分组 + 拓扑排序） |
| `/sillyspec:execute` | TDD 执行 + 子代理并行 |
| `/sillyspec:verify` | 验证（测试 + 代码审查 + E2E） |
| `/sillyspec:archive` | 归档变更 |

## 辅助命令

| 命令 | 用途 |
|---|---|
| `/sillyspec:status` · `/sillyspec:state` | 查看项目进度和状态 |
| `/sillyspec:continue` | 自动判断并执行下一步 |
| `/sillyspec:explore` | 自由思考模式 |
| `/sillyspec:quick` | 快速任务，跳过完整流程 |
| `/sillyspec:resume` | 恢复工作 |
| `/sillyspec:doctor` | 项目自检 |
| `/sillyspec:commit` | 智能提交 |
| `/sillyspec:knowledge` | 知识库检索 / 沉淀 |
| `/sillyspec:export` | 导出成功方案为可复用模板 |
| `/sillyspec:workspace` | 多项目工作区管理 |

## CLI 命令

```bash
sillyspec run auto            全自动推进全部流程
sillyspec run scan            执行代码扫描阶段
sillyspec run brainstorm      执行需求探索阶段
sillyspec run plan            执行实现计划阶段
sillyspec run execute         执行开发阶段（子代理并行 + worktree 隔离）
sillyspec run verify          执行验证阶段
sillyspec run archive         执行归档阶段
sillyspec run quick           快速任务
sillyspec run explore         自由探索
sillyspec progress show       显示当前项目状态
sillyspec setup               安装推荐 MCP 工具
sillyspec init                初始化（零交互，自动检测工具）
```

## 核心特性

**护城河层（外部状态，模型能力不可替代）**
- **多 agent 并发控制** — 会话/变更/worktree 三级隔离；文件锁 ql-ID 分配 + 双占用 fail-closed 硬拦；边界声明归属切分（窗口∩声明）；并发写预检告警；平台乐观锁（base_ts + 身份头 + 服务器权威钟）
- **实测验收门禁** — verify/quick 收尾时 CLI 亲自执行 test/lint 与自报对账，不符即阻断回滚；docHash 重算 + git 证据交叉对账防伪造；门禁跑在隔离快照里不受并行会话脏文件污染
- **持久账本 + 断点恢复** — SQLite 单一进度源，进度/决策/审批答复全落库，跨会话跨天续跑；quicklog 四字段结构化台账
- **跨仓变更管理** — task 卡声明 `repo:` 字段，跨仓同构 worktree 隔离，base 锚快照，apply 不覆盖用户在途改动

**确定性对账层（机械核验，零模型轮次）**
- **范围对账** — 计划改动 × 实际改动三态对账（planned/unplanned/untouched），execute/verify/archive/quick 四处收尾注入
- **API 契约矩阵** — provider/consumer 识别、endpoint 工件提取、前后端 API parity 对账
- **文档一致性棘轮** — 源码引用真实性校验（HEAD 模式），失败数只降不升
- **noAI 下沉 / IR 事实层** — 机械轮次下沉 CLI（骨架预生成、注入、代算对账），判断层留给 agent；同一契约清单事前渲染预览、事后引擎核验

**协作与流程层**
- **规范驱动 + 阶段状态机** — 每阶段入口契约、产物文件名、门禁校验强制流转，不能跳步
- **子代理并行 + Wave 拓扑** — depends_on 自动拓扑排序，同 Wave 并行
- **独立审查 + 人类审批** — Design Grill / stage review / task review 分层审查带 provenance；wait 等待态与审批答复持久化
- **跨机派发 / 棕地入库 / 知识飞轮** — SillyHub MCP worker 池 + 本机逐级回退；scan 生成七文档；export 模板蒸馏 + 决策版本化

**自我运维层**
- **doctor 自诊自愈** — 13 维诊断 + 幽灵 worktree/僵尸会话自动归档
- **摩擦计数** — 门禁回滚/实测失败/审查打回结构化计数喂复盘循环

> 📖 完整能力地图与对外叙事基准：`docs/sillyspec/capability-highlights-2026-09-14.md`

## MCP 工具

```bash
sillyspec setup              安装全部推荐 MCP
sillyspec setup --list       查看已安装 MCP 状态
```
