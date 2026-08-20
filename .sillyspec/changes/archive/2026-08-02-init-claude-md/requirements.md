---
author: qinyi
created_at: 2026-08-02
---

# 需求规格（Requirements）— init 为 Claude Code 生成 CLAUDE.md

## 角色

| 角色 | 说明 |
|---|---|
| 开发者 | 在新/既有项目跑 `sillyspec init` 安装 SillySpec 的用户 |
| Claude Code（agent） | 读取项目根 CLAUDE.md 获取工程纪律/流程约定 |

## 功能需求

### FR-01: init 为 claude 生成完整 CLAUDE.md（新文件态）
覆盖决策：D-003@v1
**Given** 项目根无 `CLAUDE.md`，`sillyspec init` 选中 claude 工具
**When** doInstall 执行到 claude 注入点
**Then** 在项目根生成 `CLAUDE.md`，内容 = `<!-- SillySpec v{当前版本} — 由 sillyspec init 生成... -->` + `templates/claude-instruction.md` 正文

**边界**：模板正文不含 `爸爸~爸爸~`、不含 dogfood/multi-agent-platform/npm 发布状态；版本注释由 init.js 动态拼接（模板文件本身无版本）。

### FR-02: 已有 CLAUDE.md 无标记 → 追加受管段（追加态）
覆盖决策：D-003@v1
**Given** 项目根已有 `CLAUDE.md`，且不含任何 `<!-- SillySpec v` 标记
**When** init 选中 claude 执行注入
**Then** 在文件末尾追加 `<!-- SillySpec v{版本} START — 勿手动编辑此段 -->` + `INJECTION_CONTENT` + `<!-- SillySpec END -->`，原文内容字节保留

### FR-03: 同版本重复 init → 跳过（幂等）
覆盖决策：D-004@v1
**Given** `CLAUDE.md` 已含 `<!-- SillySpec v{V} -->` 标记，且 V == 当前 SillySpec 版本
**When** 再次跑 init（选中 claude）
**Then** 不改写文件（内容与 mtime 不变）

### FR-04: 升级（异版本）刷新/提示
覆盖决策：D-004@v1
**Given 4a** `CLAUDE.md` 含 `<!-- SillySpec v{Vold} START -->...<!-- SillySpec END -->` 块，Vold != 当前版本
**When** 再次跑 init
**Then** 用当前版本的受管段**替换该块**，块外用户内容字节保留

**Given 4b** `CLAUDE.md` 仅含完整态顶部注释 `<!-- SillySpec v{Vold} — ... -->`（无 START/END 块），Vold != 当前版本
**When** 再次跑 init
**Then** **不覆盖**文件，stderr 打印升级提示（含旧→新版本 + 手动重建路径）

### FR-05: 模板内容合规
覆盖决策：D-002@v1
**Given** `templates/claude-instruction.md`
**When** 审查模板正文
**Then** 含通用核心规则（依据先行/完整流程/quick/执行顺序/判规模/B 模式/实证核验/进度存储/文档验收/禁改测试/hook 不跳过/跨平台/任务隔离/quicklog 精修/多 agent 并行/不奉承）；**不含**汇报格式段、`爸爸~爸爸~`、dogfood 自述、multi-agent-platform、npm 发布状态

### FR-06: 隔离性（不改三工具 / 不做 cursor）
覆盖决策：D-001@v1
**Given** 任意 init 调用
**When** 注入阶段
**Then** `INSTRUCTION_TOOLS`/`INSTRUCTION_FILE_MAP`/`injectInstructions` 行为零变化；不生成任何 `.cursor/rules` 文件

## 非功能需求

- **兼容性**：未选 claude → 零行为变化；既有 CLAUDE.md（非 SillySpec 生成）→ 仅追加不覆盖；Windows/Linux/macOS 路径与换行均兼容（正则不依赖换行风格，写入用模板原样字节）。
- **可回退**：删除 CLAUDE.md 重跑 init 即重建。
- **可测试**：`injectClaudeInstructions` 导出，test/ 直接单测四态（无需走 cmdInit 重依赖）。
- **发布**：`templates/claude-instruction.md` 随 npm 发布（templates/ 已在包内，.npmignore 显式保留）。

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-06 | 范围只做 claude，不做 cursor |
| D-002@v1 | FR-05 | 通用模板去汇报格式段 |
| D-003@v1 | FR-01, FR-02 | 方案 A 独立注入函数 |
| D-004@v1 | FR-03, FR-04 | 版本感知幂等仅 claude |
