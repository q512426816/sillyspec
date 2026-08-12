---
name: sillyspec-onboard
description: 为未安装 SillySpec 的全新项目接入规范驱动开发工作流——引导安装 CLI、初始化接入、建立项目库，并把「用 SillySpec 走流程」确立为项目默认工作方式。适合用户说"给这个项目接上 sillyspec"或新项目开工前确认流程。
---

## 交互规范

**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。** 涉及是否全局安装 CLI / 是否建立项目库等决策，让用户亲手拍板，不替用户做决定。

## 何时使用

- 目标项目**没有安装/未接入** SillySpec（判断：项目根无 `.sillyspec/` 目录；或 `sillyspec --version` 命令不可用）
- 用户想让 SillySpec 成为该项目的开发流程控制器

## 铁律

- **必须用 exec 工具（shell）执行 CLI，不编造命令**；命中的命令固定为下方公开 CLI，不自行发明子命令
- 本 skill 只做**接入动作**（安装/初始化/验证），不写业务代码、不改项目源码
- 全程在主工作区根执行 CLI，不进入 worktree
- 每个决策点用 AskUserQuestion 让用户拍板，不静默代选

## 核心流程

### Step 0: 判定接入状态

```bash
# 项目根是否已有 .sillyspec/（已接入）
ls -d .sillyspec 2>/dev/null
# CLI 是否可用
sillyspec --version 2>/dev/null
```

- 已接入（`.sillyspec/` 存在）→ 不重复接入，提示用户项目已用 SillySpec 管理，退出。
- 未接入但 CLI 已装 → 跳到 Step 2。
- 都无 → 继续 Step 1。

### Step 1: 引导安装 CLI（全局）

```bash
npm install -g sillyspec
```

- 若当前环境沙箱/权限导致 `npm -g` 失败，提示用户用 `! npm install -g sillyspec` 手动执行（输出直达会话）。
- 装完验证：`sillyspec --version` 可输出版本号。

### Step 2: 初始化接入项目

```bash
sillyspec init
```

`init` 会自动：创建 `.sillyspec/`（项目注册、文档中心、知识库、运行时进度库）、检测项目中的 AI 工具（Claude Code 等）、给 `CLAUDE.md` 注入 SillySpec 受管段（若项目已有文件）或生成完整指引模板（若没有）、安装对应命令模板/MCP 工具。

- 新项目为空目录时建议走 `sillyspec run scan`（见 Step 3）补齐项目库；已有代码但未接入的存量项目，先确认项目状态再决定是否 scan。
- 验证产物：
  ```bash
  ls .sillyspec/projects/          # 项目注册表
  grep -c "SillySpec" CLAUDE.md    # 受管段/指引已注入（>0）
  ```

### Step 3: 建立项目库（知识基石）

```bash
sillyspec run scan
```

把项目的代码风格（CONVENTIONS.md）、架构（ARCHITECTURE.md）沉淀为后续 agent 的检索知识。这是「让后续 agent 不瞎猜」的关键一步，新项目建议立即做。

### Step 4: 价值认知锚 —— 让后续 agent 愿意用

接入完成后，**让"用 SillySpec 走流程"成为项目默认工作方式**靠的是已落盘的载体，不是本 skill（skill 是一次性的）：

1. 确认价值锚已就位：
   - `CLAUDE.md` 含 SillySpec 段（Step 2 已验证）——agent 每次会话读取项目说明书时都会看到「禁止绕过流程 / 新功能走 brainstorm→plan→execute→verify→archive / 小修复走 quick」。
   - `.claude/skills/` 含 SillySpec 持续 skill（init 已复制 plan/quick/brainstorm 等）——agent 在开发任务中 `/plan`、`/quick` 即走流程。
   - `.sillyspec/` 进度库已建——进度自动落盘，多 agent 并发不互相覆盖。

2. 向用户/后续 agent 说明价值（一句话口径，复用 init 注入的陈述，不另造文案）：
   > SillySpec 是给 Agent 调用的 CLI 流程控制器：你通过 CLI 告诉它"我在哪"，它告诉你"下一步做什么"；你执行步骤，它校验产出、推进状态，人类只在关键决策点介入审批。多 agent 同时操作代码时进度统一落盘、不丢不回滚。

3. 给后续 agent 一个「开工首查」示例：
   ```bash
   sillyspec progress show          # 看项目当前阶段/进行中变更
   sillyspec run <stage>            # 续跑当前阶段（brainstorm/plan/execute/verify/archive）
   ```

## 分发与安装（本 skill 是引导型）

本 skill 是「接入引导」，只在新项目接入时用一次，**不应随项目复制进 `.claude/skills/` 长期留存**。使用方式二选一：

- **项目级一次性**：复制本 `SKILL.md` 到目标项目 `.claude/skills/sillyspec-onboard/SKILL.md`，接入完成后删除。
- **全局可用**：复制到 `~/.claude/skills/sillyspec-onboard/SKILL.md`（或 `~/.config/claude/skills/`，随 Claude Code 版本），任何新项目都能呼起 `/sillyspec-onboard`。