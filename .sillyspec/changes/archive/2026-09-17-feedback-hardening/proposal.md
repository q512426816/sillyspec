---
change: 2026-09-17-feedback-hardening
created_at: 2026-09-17
author: zcode-feedback-hardening
stage: brainstorm
---

# 提案：门禁摩擦收敛三修复（快照供给链命令面 / 探针7锚点口径对齐 / 隐式Wave串行）

## 背景与问题

用户 2026-09-17 工具使用小结的负面三条（正面项不属修复面）：

1. **verify lint 门环境缺陷（build-id 坑）**：门禁隔离快照（gate-snapshot）内跑 commands.test/lint，`gate_snapshot.copy` 只能从主仓 junction/复制生成物现态——主仓侧缺失（fresh clone 未跑 postinstall）或过期（构建期产物随版本变）时，快照内全量测试必挂，只能 SNAPSHOT_OFF 或 advisory 逃生。用户建议：工具侧在快照供给链补 postinstall。
2. **探针7 矩阵证据锚点摩擦**：硬门收三形态锚点（`.test.` 文件名 / file:line / 反引号包裹），但预填说明写「证据列给首命中 file:line 锚点**或人工核验提示**」（后半句对 covered/partial 过不了硬门，误导 agent），advisory 又只认两形态并施压「审查会要求回补」——agent 在行号上往返三轮才过门。
3. **轻量计划口径打架**：plan 阶段宣称「light 级 plan.md 无任务区——execute 自动把注册表合成为单个隐式 Wave 串行执行」，但 buildWavePrompt 对隐式 Wave 实际下发「同一 Wave 的多个子代理必须并行启动」，plan-postcheck 按全并行口径把「无显式 Wave + 多 task 共享 allowed_path」硬拦——用户被迫补 6 个 Wave 段。

## 方案对比

### 问题①（快照供给链）

| 方案 | 核心思路 | 优势 | 劣势 |
| --- | --- | --- | --- |
| A（选定） | `gate_snapshot.commands: string[]`，快照构建期（环境目录链接后、copy 面前）逐条执行 | 供给「应然态」而非「主仓现态」；显式配置无隐式执行面；先于 copy 面使产出为真实文件（规避 junction 写穿透，且新鲜度优先） | 每次门禁多跑命令（超时帽 300s/条收口）；配置面 +1 键 |
| B | 自动探测并执行 package.json `postinstall` | 零配置 | 隐式执行面危险；非 npm 生态无对应物；与 D-002@v1 否决理由正面冲突 |
| C | 维持纯 copy 面 | 零改动 | 本轮实证缺口（主仓缺/过期即必挂） |

覆盖决策：D-002@v2（复潮 friction5 D-002@v1 的 B 否决，收窄设计见 decisions.md）。

### 问题②（探针7 锚点口径）

| 方案 | 核心思路 | 优势 | 劣势 |
| --- | --- | --- | --- |
| A（选定） | 预填说明改写明示三形态+行号可省；advisory 本地正则补第三形态（反引号），与硬门同权 | 从填表源头消灭误导；advisory 不再对已过硬门的证据施压回补 | advisory 行数趋零（增量价值已实证为纯摩擦，退役即目的） |
| B | 只改预填说明，advisory 维持两形态 | 改动面最小 | 反引号路径证据（行号漂移场景的正解）仍被 advisory 施压，摩擦残留 |
| C | 硬门放宽到任意非空证据 | — | 锚点底线失守，证据可捏造空话，否决 |

覆盖决策：D-005@v2（复潮 friction5 D-005@v1 的「裸反引号不收」）。

### 问题③（隐式 Wave 语义）

| 方案 | 核心思路 | 优势 | 劣势 |
| --- | --- | --- | --- |
| A（选定） | 隐式 Wave 真串行：buildWavePrompt 对 `wave.implicit` 下发串行调度指令；postcheck 无显式 Wave 共享路径 error→warning | 「自动串行」宣称成为真实行为；串行是更安全缺省（不可能互相覆盖）；轻量计划零格式负担 | full 级 plan 纯漏写 Wave 段时静默串行（慢但安全，warning 提示并行收益） |
| B | 维持全并行，改宣称与提示为「必须显式分 Wave」 | 调度语义不变 | 格式负担转嫁给所有轻量计划；与既有宣称矛盾（正是用户抱怨点） |
| C | postcheck 自动按 depends_on 拓扑补 Wave 段 | 零人工 | CLI 静默改写 agent 产物破坏分工；topo 只看依赖不看文件重叠（friction5 D-004 同坑） |

覆盖决策：D-003@v1（新决策）。

## 推荐与依据

三处均选 A：①用户原始建议即命令面方向；②摩擦根因在口径不一致而非门禁本身；③串行缺省是安全性严格不劣的选择。方案选择已由用户原始反馈给定（①「建议工具侧在快照供给链补 postinstall」、②「锚点要求 file:line 但预填给不上」即要求行号非必须、③引述「宣称自动串行」为应然行为），本会话自主推进不再停等。

## 影响面（粗）

- src/run/gate-snapshot.js（commands 键解析 + 执行段）、src/config-schema.js（登记 + 示例）
- src/probe7-anchor-check.js、src/verify-probes.js（预填说明）、src/run/gates.js（advisory 文案）
- src/stages/execute.js（buildWavePrompt implicit 分支 + 检查 0.8 文案 + 注释扶正）、src/stages/plan-postcheck.js（error→warning）
- 测试：gate-snapshot / probe7-anchor / plan-optimization（Test 5f 契约随行）等
- 文档镜像：docs/prompt/{plan,execute,verify}.md、.claude/skills/sillyspec-{plan,execute,verify}/SKILL.md、docs/sillyspec/troubleshooting.md、config 文档
