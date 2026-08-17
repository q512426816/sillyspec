---
author: qinyi
created_at: 2026-08-17 16:14:16
---

# Design — execute 阶段 task 执行 batch 调度

## 背景与目标

**背景**：plan 阶段 TaskCard 生成已落地 batch 分派（9aa91aa）。execute 阶段 `buildWavePrompt`（`src/stages/execute.js:846`）仍要求「每个任务必须由独立子代理执行」，同 Wave 5~8 个 task 时子代理调用随 task 数线性增长——每个子代理重复读 design/plan/源文件，token 与协调开销大，且高并发易撞 429/529 限流。

**问题**：同 Wave task 定义即「无依赖可并行」，其中大量 task 的 allowed_paths 完全正交（改不同文件、无契约消费），由一个子代理串行做完与多个子代理并行做产出等价，开销差数倍。

**目标**：把「可选 batch」模式推广到 execute——默认每 task 独立子代理（零行为回归），同 Wave 内文件正交、无契约依赖链、组大小 ≤3 时可合并为一个子代理串行实现；同 Wave 的多个子代理（独立或 batch）仍并行启动。预期同 Wave 子代理调用数从 N 降至 ceil(正交分组数)。

## 决策记录（方案选择）

三个候选方案的裁决（详见 brainstorm step 4，用户拍板）：

| 方案 | 结论 | 理由 |
|---|---|---|
| **A. 纯 prompt 调度层改造**（本设计） | ✅ 采纳 | 与 plan batch 模式一致；正交判定交给有 design/plan 上下文的主 agent 比 CLI 纯结构判定更准；零 schema/状态机变更，回退容易；review 缺失由既有 Task Review Gate 兜底 |
| B. prompt + postcheck 硬校验 | ❌ 否决 | 需发明 batch 落盘 schema 才能校验，违反 YAGNI；plan batch 落地时也未加校验 |
| C. CLI 代码化 batch 规划 | ❌ 否决 | CLI 重复实现契约图/路径解析逻辑；正交 ≠ 安全（测试连带、模块归属等语义因素），剥夺主 agent 语义判断反而增加误判风险 |

关键设计决策：
- 档位 = 平衡（可选 batch），用户拍板；batch 上限 3（execute 真实写代码，比 plan 的 4 保守）
- batch 只合并**实现**不合并**审查**——review.json 产出与 checkbox 勾选始终归主 agent（Design Grill P0 修复，与 :848/:906/:929 现状职责一致）
- 契约 task 禁止同批（与 plan 的「尽量同批」方向相反，理由见差异表）

## 总体设计

**纯 prompt 调度层改造**（方案 A，用户已拍板）。只改 `src/stages/execute.js` 的 `buildWavePrompt` 调度指令，不新增 schema、不改状态机、不加 CLI 校验。借鉴 plan 阶段 TaskCard batch 分派（9aa91aa）的「可选 batch」模式，但**两阶段在契约 task 处理上方向相反**（见「与 plan batch 的差异」），且 execute 真实写代码，安全约束更严：batch 上限 3（plan 为 4）、batch 只合并**实现**不合并**审查**（review.json 产出与 checkbox 勾选始终归主 agent）。

### 与 plan batch 的差异（非同构，方向性区别）

| 维度 | plan TaskCard batch | execute 实现 batch（本设计） |
|---|---|---|
| 子代理产出 | task-N.md 文档卡片 | 源码 + 测试（真实写代码） |
| 契约（provides/expects_from）task | **尽量同批**（生成卡片时需同时看到 consumer 与 provider 对齐字段） | **禁止同批**（实现时 consumer 依赖 provider 的产出文件，串行实现会读到半成品；契约 task 由独立子代理并行或跨 Wave 处理） |
| 批内执行 | 无顺序要求（一次生成多卡） | 逐 task 串行实现闭环 |
| 审查 | 无 task review | review.json + 勾选归主 agent，不下放（FR-03） |
| 上限 | 4 | 3 |

### 调度模型

```
同 Wave 内，主 agent 逐 task 判定分组：
  条件①：候选组内任意两 task 的 allowed_paths 无交集（文件正交）
  条件②：候选组内任意两 task 之间无 provides/expects_from 契约链
  条件③：组大小 ≤ 3
  全部满足 → 合并为一个 batch（一个子代理串行执行）
  任一不满足 → 该 task 独立子代理（默认形态）
分组结果：多个子代理（独立 + batch）并行启动
```

正交性判定由主 agent 完成（有 design.md/plan.md/tasks/*.md 全量上下文，能识别 CLI 看不到的语义因素：测试连带、模块归属、共享工具函数），不做代码化自动规划。

### batch 子代理执行协议（prompt 铁律）

1. 按 batch 内 task 顺序逐个完成**实现闭环**：读取 `tasks/task-N.md` → 实现 → 跑该 task verify 命令 → 记录该 task 报告（改动文件清单 / verify 结果 / 卡点）→ 才开始下一个 task；最终回复输出逐 task 报告清单（增量落盘铁律第 6 条既有要求在 batch 下的具体化）
2. **职责边界**：batch 子代理只做实现与自验，不写 review.json、不勾选 plan.md checkbox——task 审查、review.json 产出与勾选归主 agent，在子代理返回后逐 task 进行（FR-02/FR-03，与「不信任 implementer 自报结果」铁律一致）
3. 越权即停：发现必须改 batch 内其他 task 或任何 batch 外 task 的 allowed_paths 文件 → 立即停止本 task 及后续，报告冲突文件与卡点，回主 agent 裁决（重分 Wave / 调整 plan / 回退独立子代理）（FR-04；与既有任务边界铁律第 7 条同义，batch 下「本 task」= 当前正在实现的 task）
4. 主 agent 收到 batch 报告后：逐 task 对照 allowed_paths 检查改动文件清单有无越权 → 按既有 Task Review 流程写 review.json → 勾选 checkbox

### 改动位置（buildWavePrompt 内）

- `src/stages/execute.js:846`「每个任务必须由独立子代理执行」→ 改写为「默认每 task 独立子代理；满足三条件的可合并 batch（≤3）由一个子代理串行实现」
- `src/stages/execute.js:848` 主 agent 角色描述「调度者 + 审查者」审查职责**不变**，明确「batch 子代理只实现，审查/勾选仍归你」
- `src/stages/execute.js:891-892` 调度要求 1「同一 Wave 内的任务必须并行启动子代理（Wave 定义=无依赖可并行，不自行分析依赖关系；…）」→ 改写为「同一 Wave 的多个子代理（独立或 batch）必须并行启动；batch 内部串行」；括号注「不自行分析依赖关系」同步改写为「batch 分组仅按文件正交/无契约链判定，不改变 Wave 依赖语义」
- 「任务摘要（按需读取完整蓝图）」节：batch 子代理 prompt 要点补 batch 协议（逐 task 实现闭环+报告、不写 review 不勾选、越权即停）；「执行方式」节补一句显式互斥说明「SillyHub 派发模式下按派发段执行（一 Wave 一 mission），不按 batch 分组」
- 既有第 6/7 条（增量落盘/任务边界铁律，c8cb458）保留不动；第 7 条的「本 task」在 batch 语境下显式消歧为「当前正在实现的 task」
- **Task Review Gate 段（:904-932）与调度要求 4（先写 review 再勾选）不改**——其主语本就是主 agent，batch 协议与其职责定义一致（实现与审查分离）

不涉及生命周期契约。

## 文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/stages/execute.js` | 修改 | buildWavePrompt 调度指令 + batch 子代理 prompt 要点（约 3 处文本块） |
| `test/dispatch/execute-dispatch-integration.test.mjs` | 修改 | 新增 batch 调度断言（指导存在/上限 3/串行协议/越权即停/并行语义改写） |
| `docs/prompt/_extracted.json` | 再生 | `node docs/prompt/_extract.mjs` 重跑 |
| `docs/prompt/execute.md` | 修改 | Step 镜像同步（prompt 原文以 _extracted.json 为准逐字替换） |
| `.claude/skills/sillyspec-execute/SKILL.md` | 修改 | 如调度描述段落涉及则同步（保持对外纯净性，不引内部编号） |
| `.sillyspec/docs/sillyspec/modules/stages.md` | 修改 | 变更索引追加条目（execute 模块卡片） |

## 接口定义

无新代码接口。prompt 文本契约（测试断言锚点）：

- `buildWavePrompt(...)` 产出 prompt 含「batch」「最多 3 个 task」「逐个完成」组合断言
- 含职责边界断言：batch 子代理「不写 review.json / 不勾选 checkbox」（或等义表述），审查归主 agent
- 含改写后并行铁律断言（「独立或 batch」字样 + 「并行启动」）
- 不再含旧文案「每个任务必须由独立子代理执行，你不要自己写代码」的独占表述（改为默认形态 + batch 例外结构）

## 数据模型 / Schema

无变更（不动 sillyspec.db、不动 review.json schema、不动 plan.md 结构）。

## 并发与状态

- batch 内串行、batch 间并行：与既有 Wave 并行模型兼容，无新竞态面
- worktree 隔离不变：batch 子代理与其他子代理一样在 worktree cwd 工作，文件正交保证无同文件并发写
- 中断续跑兼容：plan.md checkbox 逐 task 勾选的断点续跑机制不变（batch 中断时已勾选 task 跳过，未完成的按需重跑——与现状语义一致）

## 兼容策略

- 纯 prompt 文本变更，CLI 无行为分支，旧变更（已有 plan.md 的）不受影响
- 默认形态不变：不满足条件的 task 走独立子代理，与改前行为完全一致
- prompt.js 注入框架（persona/铁律/占位符）不动

## 风险登记 / Risk

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| LLM 误判正交性（allowed_paths 有隐藏交集，如测试文件连带） | 中 | batch 子代理改到他人文件，测试连带失效 | prompt 明确「拿不准就不合并」；越权即停协议（FR-04）；主 agent 审查 batch 报告时逐 task 对照 allowed_paths 检查越权文件；verify 阶段全量对账最终兜底（注：Task Review Gate 的 changedFiles 校验是交集校验，不拦越权文件，不能作为本风险缓解） |
| batch 子代理一个 task 失败拖累整批 | 中 | 后续 task 未执行，Wave 变慢 | 失败即停并报告卡点，已完成 task 的磁盘产物保留（增量落盘铁律）；主 agent 审查产物后可回退独立子代理补做未完成部分 |
| review.json 质量下降 | 低 | review 失真 | 审查职责不变：review.json 仍由主 agent 逐 task 产出（FR-02/03），batch 只合并实现不合并审查；Task Review Gate schema 硬校验兜底 |
| 与 SillyHub 派发路径交叠（dispatch 模式下 batch 语义未定义） | 低 | 派发模式行为不明 | dispatchSection 不动；SillyHub 派发按 mission 原语义（一 Wave 一 mission 的粒度天然 ≥ batch），本地 Agent tool 派发才按 batch 指导分组 |
| 并行 session 同改 execute.js（当前工作区已有并行改动） | 高 | 编辑冲突/覆盖 | execute 前核对 git status，stage 隔离，commit 用显式 pathspec |

## 自审 / Self-Review

- ✅ FR-01~06 全部有对应设计落点（调度模型/prompt 协议/测试断言）
- ✅ 借鉴 plan batch（9aa91aa）「可选 batch」模式，差异表明确两阶段方向性区别（契约 task：plan 尽量同批 / execute 禁止同批）
- ✅ 方案 B（CLI 硬校验）、方案 C（自动规划）已否决并记录理由（YAGNI / 语义判定归属）
- ✅ 不变式清单完整：审查职责不下放（review.json + 勾选归主 agent）、越权即停、Wave 间顺序、worktree 语义
- ✅ Design Grill P0 已修：batch 只合并实现不合并审查，与 Task Review Gate 主语（主 agent）及「不信任 implementer 自报」铁律一致
- ✅ Design Grill P1 已修：删 tier=independent 误引（task review 无 tier 概念）；同构声明改差异表；风险缓解不再引用 changedFiles 交集校验拦越权（实测不拦）；892 括号注改写列入改动位置
- ⚠️ 已知残留：①batch 正交判定无机器校验，依赖 prompt 指导 + 主 agent 判断（方案 A 固有权衡，接受）；②plan-postcheck 同 Wave 共享文件错误文案中「execute 强制并行」表述将过时（低优先级文案债，非本变更范围，不连带改）
