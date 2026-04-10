# 生命周期

## 核心理念

> **Code is Cheap, Context is Expensive.** 文档是核心资产，代码是文档的产物。没有文档就没有代码——文档是 AI 的记忆，是团队协作的基础，是后续维护的唯一依据。

## 工作流

### 🟢 绿地项目（空目录）

```
init → brainstorm → plan → execute → [verify] → archive
```

### 🟤 棕地项目（有代码）

```
scan → brainstorm → plan → execute → [verify] → archive
```

### 🩺 项目自检

```
sillyspec run doctor
```

4 步自检：SillySpec 内部检查 → 构建与测试检查 → 外部依赖检查 → 生成诊断报告。

### 🤖 自动模式

```
sillyspec run auto "需求描述"
```

全流程自动推进，支持阶段审核门控（复杂需求可选多角度子代理审查）。

### ⚡ 快速通道

```
quick "描述" → 直接执行（3 步：理解任务 → 实现并验证 → 暂存和记录）
explore "想法" → 讨论不写码
```

## 角色分工

每个阶段有专属 persona，由 CLI 自动注入：

| 阶段 | 角色 | 职责 |
|------|------|------|
| brainstorm | 🎯 资深架构师 | 理解业务本质，设计技术方案，决策附理由 |
| plan | 📋 技术项目经理 | 任务拆解，Wave 分组，依赖关系 |
| execute | 💻 高级工程师 | 按 task 蓝图搬砖，禁止发散思维 |
| verify | 🔍 QA 专家 | 对照文档检查，假设所有代码都有 bug |
| quick | 💻 全栈老兵 | 快速理解需求，直接干，不确定就问 |

**铁律：每个角色只做自己的事，不要越界。** 发现问题反馈而不是自己偷偷改。

## 文档体系

```
.sillyspec/
├── changes/<变更名>/
│   ├── design.md          # 设计文档（brainstorm 产出）
│   ├── requirements.md    # 需求文档
│   ├── proposal.md        # 提案
│   ├── plan.md            # 实现计划总览（PM 视角）
│   ├── tasks/task-01.md   # 任务蓝图（工程师视角，详细到可直接执行）
│   ├── tasks/task-02.md
│   └── ...
├── docs/<project>/scan/
│   ├── CONVENTIONS.md     # 代码规范
│   └── ARCHITECTURE.md    # 架构文档
├── projects/*.yaml        # 项目配置
├── local.yaml             # 本地配置（构建/测试命令）
└── knowledge/             # 项目知识库
```

### Reverse Sync

发现 Bug 时的处理流程：

```
发现 Bug → 是代码错了还是文档有遗漏？
├── 文档遗漏 → 先修文档 → 再修代码
└── 代码错误 → 直接修代码
```

## 上下文分层加载

execute 阶段按优先级管理上下文：

- 🔥 **热上下文**：design.md 编码铁律 + 当前 Wave 任务（必须加载）
- 🌡️ **温上下文**：CONVENTIONS.md + ARCHITECTURE.md（需要时加载）
- ❄️ **冷上下文**：其他变更的 design.md、历史 plan.md（不主动加载）

## 进度管理

### progress.json（唯一进度数据源）

位于 `.sillyspec/.runtime/progress.json`，由 `sillyspec run` CLI 自动管理：

```json
{
  "project": "my-app",
  "currentStage": "execute",
  "stages": {
    "scan": { "status": "completed" },
    "brainstorm": { "status": "completed" },
    "plan": { "status": "completed" },
    "execute": { "status": "in_progress" }
  }
}
```

### 批量进度

批量任务时，额外展示批量进度条：

```
📊 批量进度: ████████████████░░░░ 73/100 (2 失败, 1 跳过)
```

```bash
sillyspec progress batch --total 100 --completed 73
sillyspec progress batch --status
```

## Git 规范

- 所有阶段只执行 `git add`，**不自动 commit**
- 提交由用户通过 `/sillyspec:commit` 或手动完成
- commit message 语言与用户对话语言一致

## 中断恢复

工作中断时，使用 resume 恢复：

```bash
/sillyspec:resume
```

也可以用 continue 自动判断下一步：

```bash
/sillyspec:continue
```
