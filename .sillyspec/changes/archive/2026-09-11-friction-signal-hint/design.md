---
author: qinyi
created_at: 2026-09-11 09:49:29
generated_by: sillyspec-design-init
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— friction-signal-hint

## 背景

腾讯 2026-09 开源 teamai-cli 的调研结论（2026-09-11 对话）：其最值得借鉴的不是具体功能，而是**摩擦信号触发器的设计立场**——用确定性代码从结构化信号算出触发条件（打断次数/工具拒绝次数/纠偏次数），顺利会话零打扰、每次最多提示一次、可配置关闭。

sillyspec 的现状是"半成品"：摩擦事件（gate 失败回滚、verify 实测失败、审查打回）全部流经 CLI 自身状态机，但**没有任何计数与消费**；verify/doctor 已有 advisory postmortem 提示（verify.js「实现偏差 postmortem 提示」、doctor.js「状态错乱补 postmortem 提示」），触发条件却是写在 prompt 里让 agent 自判——信噪比取决于模型自觉。已有先例证明该路线可行：verify-lint-tally.json（46 跑 7 败）正是 2026-09-08 lint 升硬门的决策分母。

本变更把触发器升级为 CLI 结构化计数，并补齐三类零提示的摩擦盲区。

## 设计目标

1. 三类高信噪比摩擦事件自动计数：gate 失败回滚、verify test/lint 实测失败、审查 verdict=fail。
2. quick `--done` / verify `--done` 收尾时计数非零输出**一行** advisory，引导按 现象/根因/护栏/证据 补 postmortem（落点链路与 verify.js/doctor.js 既有 advisory 完全一致，不新建命令）。
3. 克制语义（照抄 teamai）：全零静默、每收尾最多一行、提示后清零、`friction_hint.enabled` 可关。
4. 隐私红线：落盘只含计数/类型/时间戳/结构化短标签，永不接触提示词与对话原文。

## 非目标

- reopen/revision 计数消费、archive 输出点、wait/rounds、stall 信号——留待 MVP 验证信噪比后再议（D-004）。
- 不新建 QUICKLOG/knowledge 写入链路——提示后人判，不自动写草稿（方案 C 已否决）。
- 不做跨机/团队级摩擦聚合（D-002 红线）。
- 不改 verify.js/doctor.js 既有 agent 自判 advisory（两机制并行：CLI 计数补盲区，agent 语义判定管已覆盖面）。

## 拆分判断

单变更实施（8 个源文件 + 1 测试 + 文档），不拆批：埋点/计数/输出三者互相依赖，拆开无独立交付价值；规模可控（每个触点 ≤10 行调用代码，核心逻辑集中在新增 friction-tally.js）。

## 总体方案

三层结构，全部 fail-soft（摩擦提示绝不反向阻断收尾，同 verify-lint-tally「计数器不许反向阻断」立场）：

**Phase 1 数据层**（新增 `src/friction-tally.js`）：
- `recordFrictionEvent({ cwd, platformOpts, changeName, type, detail })`：**模块内部自行推导 specBase**（`platformOpts?.specRoot || platformOpts?.specDriftAnchor || join(cwd, '.sillyspec')`，与 complete.js:125 同序——gates.js 的 rollbackCompletionAndReturn 签名里没有 specBase，Grill CC-04），调用方只传 type/detail。按 changeName 路由落盘——`quick-<8hex>` 会话形态落 `quick-sessions/<sessionId>/friction-tally.json`，真实变更落 `.runtime/friction-tally-<changeName>.json`（D-002：均在平台同步排除区；路径解析统一走 resolveRuntimeRoot，比 lint tally 的 specBase 直拼更对齐平台模式，Grill CC-09）。文件结构 `{ events: { <type>: { count, lastAt } }, history: [{ at, type, detail }] }`，history 截尾 20 条（同 lint tally）。原子写、读写全 try/catch 静默。
- `consumeFrictionHint({ cwd, platformOpts, changeName })`：读计数 → 全零返回 `{ hint: null }`；非零渲染一行提示并**删除计数文件**（清零语义）。配置 `friction_hint.enabled: false` 时 record/consume 双双直通空操作。
- 类型枚举：`gate_rollback`（detail 为 gate 来源标签）、`verify_run_failed`（detail: test/lint）、`review_rejected`（detail: stage-review/task-review，走专属类型不与 gate_rollback 重复计）。
- 遗留处置：归档/删变更时由 `pruneArchivedChangeRuntime`（complete-handlers.js:157，现清理 apply-pathspec/execute-runs/stage-reviews）一并清 `friction-tally-<changeName>.json`；放弃变更的残留为本机无害文件，接受（Grill CC-12）。

**Phase 2 埋点层**：
- `src/run/gates.js` `rollbackCompletionAndReturn` 增可选尾参 `friction`（默认 `{ type: 'gate_rollback', detail: 'gate-cascade' }`）；**13 处**调用点（599/670/697/737/763/792/826/855/916/936/1045/1061/1315，Grill CC-02 核正——原稿 16 为误计）按所属 gate 段补标签：599 validators / 670 verify-test / 697 verify-lint / 737/763/792/826 verify-contract / 855 plan-execute-contract（复审核正：855 属 Plan→Execute Contract 段 gates.js:863，非审查段）/ 916/936 stage-review（review_rejected）/ 1045/1061 task-review（review_rejected）/ 1315 internal-error。审查两段（Stage Review Gate 867-938、Execute Task Review Gate）内全部阻断分支统一传 `review_rejected`——缺 review.json 与 verdict=fail 同属审查摩擦，不逐分支细分。
- `src/run/verify-quality-scan.js` `executeVerifyQualityScan`：记录条件 = `testFailed || lintCheck.status === 'failed'`（**advisory lint 失败也计摩擦**，无论 shouldBlockVerifyLint 是否阻断 throw，Grill CC-10），落点在 throw 决策前。--done 对账路径的失败由 gates.js verify-test/verify-lint 回滚自然覆盖（gate_rollback），两时刻是不同摩擦事件，不视为重复计。
- `src/run/complete-handlers.js` quick 两处失败分支（audit blocked / test-lint gate fail）exit(1) 前记 `gate_rollback`（detail: quick-audit / quick-test-lint），落 session 目录。

**Phase 3 输出层 + 配置**：
- quick：`handleQuickStageCompletion` 内 QUICKLOG 完成打印后、session 目录清理前 consume——session 目录随后整体删除，天然二次保险清零。
- verify：`src/run/complete.js` **两处**完成收尾段（completeStep ~667 与 continueStep wait 解除完成路径 ~1475，Grill CC-03——后者不补则 --continue 收尾静默丢提示丢清零）对 `stageName === 'verify'` consume 一行。
- `src/config-schema.js` 注册 `friction_hint.enabled`（boolean，默认 true，example 生成含注释）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/friction-tally.js | 数据层：recordFrictionEvent / consumeFrictionHint / renderFrictionHintLine / readFrictionHintEnabled（local.yaml 极简读取，不引 yaml 依赖时按现有 docs-check 配置读取先例） |
| 修改 | src/run/gates.js | rollbackCompletionAndReturn 加可选 friction 尾参并在函数体首行 record；13 处调用点补类型/来源标签（每处 +1 实参） |
| 修改 | src/run/verify-quality-scan.js | executeVerifyQualityScan 失败判定处记 verify_run_failed（testFailed 或 lint failed，含 advisory） |
| 修改 | src/run/complete-handlers.js | quick 两处失败分支 exit(1) 前 record；handleQuickStageCompletion 收尾 consume 提示；pruneArchivedChangeRuntime 清单补 friction-tally-<changeName>.json |
| 修改 | src/run/complete.js | verify 完成收尾 consume 提示（completeStep 与 continueStep 两处，Grill CC-03） |
| 修改 | src/config-schema.js | LOCAL_YAML_SCHEMA 注册 friction_hint.enabled（默认 true） |
| 新增 | NEW:test/friction-tally.test.mjs | 数据层单测 + 路由/清零/开关/截尾/降级 |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md | 模块文档同步（新模块职责/文件） |
| 修改 | docs/sillyspec/file-lifecycle.md | 新增 .runtime/friction-tally-*.json 生命周期条目（归档 prune + 放弃残留策略；路径为仓根 docs/，Grill CC-05 核正） |

字段数据流标注（配置键）：`friction_hint.enabled`，producer=src/config-schema.js LOCAL_YAML_SCHEMA（example 生成器同步）→ 读侧 src/friction-tally.js readFrictionHintEnabled（local.yaml 解析，缺键=默认 true）→ consumer=recordFrictionEvent/consumeFrictionHint（false 时双直通）。无序列化跨跳，单仓单文件读。

## 接口定义

```js
// src/friction-tally.js
const FRICTION_TYPES = new Set(['gate_rollback', 'verify_run_failed', 'review_rejected'])
const FRICTION_HISTORY_CAP = 20

/** 路由：quick-<8hex> 会话 → <sessionsDir>/<changeName>/friction-tally.json；真实变更 → <runtimeRoot>/friction-tally-<changeName>.json。specBase 模块内部推导（platformOpts.specRoot || specDriftAnchor || cwd/.sillyspec），调用方不传。 */
function frictionTallyPath({ platformOpts, cwd, changeName })

/** 记一次摩擦事件。全静默降级（读写失败返回 null，绝不抛）。enabled=false 直通。 */
export function recordFrictionEvent({ cwd, platformOpts, changeName, type, detail })

/** 读计数并消费：全零 { hint: null, counts: {} }；非零 { hint: '<一行>', counts } 且删除计数文件。enabled=false 或读失败 → { hint: null }。 */
export function consumeFrictionHint({ cwd, platformOpts, changeName })

/** 纯渲染（单测用）：counts → 一行提示文案；空 counts → null */
export function renderFrictionHintLine(counts)
```

提示文案（一行，条件式措辞防灌水）：
`🩹 本次会话累计摩擦信号：gate 回滚 N 次、验证失败 M 次、审查打回 K 次——若其中有值得沉淀的坑，建议按 现象/根因/护栏/证据 补一条 postmortem（QUICKLOG 条目或正文核对）；护栏结论经人工确认后归入 knowledge/known-issues.md`

## 生命周期契约表

不涉及生命周期契约（本变更是 CLI 内旁路计数 + advisory 输出，不新增/修改任何 session/lease/状态机事件；quick 会话目录的创建与删除完全复用既有 handleQuickStageCompletion 行为，不改变其时序）。

## 数据模型

无 schema 变更（不触 SQLite/DB）。新增本机运行时文件两种：

```jsonc
// .sillyspec/.runtime/friction-tally-<changeName>.json（或 quick-sessions/<sessionId>/friction-tally.json）
{
  "events": {
    "gate_rollback": { "count": 2, "lastAt": "2026-09-11T02:00:00.000Z" },
    "verify_run_failed": { "count": 1, "lastAt": "..." }
  },
  "history": [ { "at": "...", "type": "gate_rollback", "detail": "verify-test" } ]  // 截尾 20
}
```

字段值域约束（隐私红线，D-005）：type ∈ 枚举；detail ∈ 预定义标签集（gate 来源/测试类型）；不含任何 prompt/对话/文件内容文本。

## 兼容策略（brownfield 必填）

- 未配置 `friction_hint` → 默认 enabled=true，行为=提示开启（advisory 一行，不阻断任何流程）；`friction_hint.enabled: false` 一键全关（record+consume 双直通，.runtime 零写入）。
- 旧变更/旧 DB：计数文件是全新旁路产物，不存在迁移；损坏/缺失文件按零计数处理（consume 静默 null）。
- 不改变的 API/表结构：CLI 命令面零新增；DB schema 零变更；QUICKLOG/knowledge 写入链路零改动。
- rollbackCompletionAndReturn 新参为可选尾参，第三方调用不传时默认通用标签，签名向后兼容。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 多 agent 并行同 change 计数读-改-写互踩（丢计数） | P2 | 接受——hint 非 gate，丢一次计数无害（与 verify-lint-tally 同立场：裸读写+静默降级）；后续可升级 quicklog.js 的 O_EXCL 锁 |
| R-02 | gate 来源标签贴错（13 处调用点人工归类） | P2 | 标签仅影响提示文案可读性不影响计数正确性；测试覆盖代表性行为；默认值 'gate-cascade' 兜底 |
| R-03 | 提示本身成为新噪音（agent 为消除提示灌水记录） | P1 | 条件式措辞「若其中有」+ 提示后清零 + 可一键关（D-003 三重防线） |
| R-04 | 计数文件误落同步面污染他机 | P0 | 路由单一出口 frictionTallyPath + 单测断言两路径都在 .runtime 树内（D-002）；spec-sync UPLOAD_EXCLUDE_TOP_BASE + .gitignore 双重排除（Grill CC-06 已核实） |
| R-05 | friction 读取 local.yaml 失败误判为关/开 | P2 | 读失败=默认开（缺配置语义），与「未配置=默认 true」同兜底路径，单测覆盖 |
| R-06 | 放弃/未走到 verify 的变更遗留计数文件 | P2 | 本机无害（.runtime 不入 git 不上平台）；归档/删变更时 pruneArchivedChangeRuntime 一并清理；放弃变更残留接受 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案三层结构、Phase 2 埋点选点、非目标「不新建链路」 | 已覆盖 |
| D-002@v1 | 接口定义 frictionTallyPath 路由规则、R-04、文件清单落点 | 已覆盖 |
| D-003@v1 | consumeFrictionHint 清零语义、提示文案条件式、config-schema 注册、R-03 | 已覆盖 |
| D-004@v1 | 类型枚举 FRICTION_TYPES、非目标清单、history 结构 | 已覆盖 |
| D-005@v1 | 数据模型字段值域约束、隐私红线 | 已覆盖 |
| D-006@v1 | Grill 修正包：双 consume 点（CC-03）、specBase 内部推导（CC-04）、file-lifecycle 路径核正 + prune 处置（CC-05/CC-12）、13 处调用点核正（CC-02）、advisory lint 计入（CC-10） | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale/risk_level）
- [x] 引用所有当前版本 D-xxx@v1（6/6，决策追踪表逐行覆盖）
- [x] 生命周期关键词检查：正文含 session 字样但均为引用既有 quick-sessions 机制，紧邻豁免短语已写；计数文件生命周期已显式登记（prune + 残留策略）
- [x] UI 原型：不涉前端文件，跳过
- [x] Design Grill（independent，agent-tool 通道）已过：specVerdict pass / qualityVerdict fail → 3 项 P1 已全部修入本版（CC-03/04/05），P2 项（CC-02/10/11/12）一并修入；无 unresolved blocker
- [x] 无「⚠️ 自审存疑」项——三个埋点/输出点代码位置均已实地核实（gates.js:509 及 13 处调用点、verify-quality-scan.js:271-278、complete-handlers.js:1055-1080/1294 session 清理时序、complete.js:663 与 1473 双收尾段、pruneArchivedChangeRuntime complete-handlers.js:157）
