---
author: t
created_at: 2026-10-14 08:33:42
generated_by: sillyspec-design-init
scale: small
---

# 设计文档（Design）— 2026-10-14-thin-turbo-mode

## 背景

轻量变更（薄道，`flow start/done` 两调用协议）很多时候只需要 spec 文档和写代码，但 flow done 收口仍强制跑 test+lint 实测（大仓 15-20 分钟）与一串仪式门（hunk 归属/dirty 冻结/ui 探针/独立评审），对「用户明说只要 spec+代码」的场景是纯税。用户要求：通过提示词驱动 agent 触发一个极速模式——按次显式触发、仅薄道、跳过验证仪式，头脑风暴预段组合也要有极速形态。现有逃生门（env `SILLYSPEC_QUICK_TEST_GATE=skip`，src/run/quick-audit.js:482）只整门跳 test+lint、env 不持久、审计弱，覆盖不足（D-005 rejected-B）；仓级配置常开与「按次显式触发」初衷冲突（D-005 rejected-C）。

## 设计目标

1. `flow start --turbo`：用户显式意图 → flow-state 留痕（声明即过），agent 由提示词面理解触发判据并携带 flag（D-001/D-003）。
2. `flow done` 读态生效：跳过面（test+lint 实测/hunk/dirty/ui 探针/评审）逐项 skipped 留痕；必留面（spec 结构校验/tasks 全勾/ledger/patch 冻结/distill/archive）语义逐字不变（D-002/D-006）。
3. 提示词面三处同步（AGENTS.md 选道行/flow 命令卡/预段极速约定），触发判据含禁 agent 自启（D-001/D-004）。
4. 缺省路径零回归：无 flag 时全部输出与改动前逐字一致。

## 非目标

- 厚道 `run <stage>` 全族不做任何改动（D-004）
- 头脑风暴阶段机（步数/状态/门禁）不做 CLI 改动——预段极速纯提示词面约定
- 不做 agent 自主触发、不做仓级常开配置、不做环境变量旁路（FR-05）
- 必留面校验不做任何放松

## 拆分判断

单上下文可吞吐：改动集中在 flow.js 两函数 + 文案三处 + 测试四件，无 Wave 编排/上下文分片需求，brainstorm 出口收编轻量道。

## 总体方案

### Phase 1 — CLI 承载：`flow start --turbo`（FR-01）
- `cmdFlow`（src/flow.js:2446）用既有 `hasFlag` helper 解析 `--turbo`，透传 `cmdFlowStart`（src/flow.js:575）新参 `turbo`。
- `cmdFlowStart` 在 flow-state 首写/续写点（src/flow.js:618 `writeFlowState`，src/flow.js:47 定义）追加 `turbo: true` + `turbo_since: <ISO 时间戳>` 两枚声明性留痕字段（`writeFlowState` 是部分合并语义，扩键零成本）。
- start 输出追加一行极速指引：`⚡ 极速模式（用户显式触发）：只产 spec+代码，收口自动跳过实测与重仪式门（必留面照常）`。无 flag 路径不进该分支，输出逐字不变。
- 不拦截：`--turbo` 是声明性 flag，不做二次确认（用户显式意图即授权，D-001；滥用防线在提示词面判据 + 留痕审计，不在 CLI 弹窗）。

### Phase 2 — CLI 生效：`flow done` 读态跳过面（FR-02/FR-03）
`cmdFlowDone`（src/flow.js:1148）入口读 `readFlowState(changeDir)`（src/flow-state.js:13），`turbo === true && st.tier !== 'thick'` 时置 `const turbo = true`（**升厚即失效——X-001 修复**：distill 异态升厚点 src/flow.js:2211 在 turbo 下仍可触达，升厚后重入 done 必须恢复全量仪式，turbo 残留不得短路厚档；D-007），各门按 D-002 分档：
- **跳过**：quick 实测门（src/flow.js:1429 `runQuickTestLintGate`）——turbo 时不调用，直接合成 gate 同形状对象 `{ action:'skip', reason:'⚡ 极速模式（用户显式触发 <turbo_since>）——test+lint 实测跳过（审计留痕）', test:{ status:'skipped', reason:同上, command:null, durationMs:null, resultPath:null }, lint:同形状 }`（带 status:'skipped' 完整形态——gateSummary 的 fmt（src/flow.js:1490）对 null 显示 '—'，带形态才输出「skipped — 跳过原因」，审计可见；失败升厚分支 src/flow.js:1472 turbo 下天然不触达）。
- **降 advisory**：hunk 归属门（src/flow.js:2123）gate 档强制 warn；dirty 收口阻断门（src/flow.js:1734 `!freezeDirty && !acceptDirtyGap` exit 1）加第三豁免条件 `&& !turbo`，降为警告+缺口数留痕不 exit。
- **跳过**：ui 视觉探针（src/flow.js:2107）。
- **强制豁免**：评审子步——turbo 时跳过 `classifyReviewNeed`（src/flow-review.js:138），直接 `reviewOutcome = { required:false, verdict:'exempt', turboExempt:true }`（telemetry 消费面 src/flow.js:1190 整对象 JSON 序列化，多余字段无破坏——探针已核），豁免理由「用户显式极速声明」进收口输出。
- **必留（零改动）**：verifyThinDocsV2 文档结构校验、tasks 全勾门（src/flow.js:1371/1386）、ledger 门、patch 冻结子步（change.patch/change-patch.json，D-006）、distill 子步、archive 链。
- 收口 `gateSummaryText`（src/flow.js:1492）前缀加 `⚡极速模式｜`，skipped 项逐项列名。

### Phase 3 — 提示词面三处同步（FR-04）
- `AGENTS.md` 选道表新增一行：触发判据=用户显式极速原话（「极速/别验证/只要 spec 和代码」类），携带 `--turbo`；**agent 不得自主启用**；与 route-hindsight 同意门（src/flow.js:795）正交（极速行不豁免选道门）。
- `templates/command-cards/` flow 卡补 `--turbo` 文档与一句极速语义。
- 预段极速形态写入 AGENTS.md 极速行附注：头脑风暴预段走轻量跑判定（step3 指引 P0-3 既有通道）+ 单轮合并问询 + burst 一次 `--done`——阶段机零改动。

### Phase 4 — 测试（零回归三态，对齐仓内探针 config-absent-zero-regression 精神）
四件新测试（requirements 测试绑定表）：start 留痕+逐字一致（FR-01）/done 跳过面逐项断言（FR-02）/必留面照常断言（FR-03）/作用域隔离（FR-05）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | cmdFlow 解析 --turbo；cmdFlowStart 签名扩 turbo+留痕写点+指引行；cmdFlowDone 读态分档（跳过面/降档/豁免，tier!=='thick' 前提）+gateSummary 标注 |
| 修改 | AGENTS.md | 选道表极速行 + 预段极速附注 |
| 修改 | assets/command-cards/flow.md | --turbo 文档（init 经 src/command-cards.js 注入工具命令目录，卡资产为单源） |
| 新增 | NEW:test/turbo-mode-start.test.mjs | FR-01 |
| 新增 | NEW:test/turbo-mode-done-skip.test.mjs | FR-02 |
| 新增 | NEW:test/turbo-mode-done-keep.test.mjs | FR-03 |
| 新增 | NEW:test/turbo-mode-scope.test.mjs | FR-05 |

（src/run/quick-audit.js 零改动：turbo 不进 gate 内部——flow.js 侧合成 skip 对象，gate 零感知，最小耦合。）

## 接口定义

CLI flag 面（对外契约）：
- `sillyspec flow start --change <名> --input "<...>" --turbo`：布尔 flag，无值；与既有 flag 正交可组合（--with-tasks/--no-prestage 等不受影响）。
- flow-state.yaml 新增字段契约：`turbo: true`（bool）+ `turbo_since: <ISO-8601 串>`；仅 flow start --turbo 写入；flow done 只读；平台同步投影（serializeForSync）本变更不消费 turbo 字段（不进投影面，短窗展示零影响）。

本变更接口面：0 端点（无 HTTP 端点/模块导出签名变更；cmdFlowStart/cmdFlowDone 为进程内函数签名扩展，非对外导出契约）。

## 生命周期契约表

本变更不涉及生命周期契约（lifecycle contract）——无 session/lease/agent_run/daemon/claim/heartbeat 状态机改动；仅 flow-state.yaml 增两枚声明性留痕字段，读写复用既有 writeFlowState/readFlowState 部分合并链路，无新状态转移。

## 数据模型

无 schema 变更（无 DB 表/迁移）。flow-state.yaml 为既有 YAML 文件加两键（turbo/turbo_since），js-yaml 读写兼容旧文件（旧文件无键=非 turbo；readFlowState 缺文件/损坏→null 既有 fail-soft 语义，src/flow-state.js:13）。

## 兼容策略（brownfield 必填）

- 未带 `--turbo`：cmdFlowStart/cmdFlowDone 全部新分支不进入，输出与改动前逐字一致（FR-05 三态测试锚①）。
- 旧变更（flow-state 无 turbo 键）：flow done 按 `turbo !== true` 走既有路径，零影响。
- **升厚交互（X-001，D-007）**：`--turbo` 与 `--thick` 同给——`--thick` 写 tier='thick'，done 侧 `turbo && tier!=='thick'` 判定天然不生效（turbo 字段留痕但不短路厚档）；薄道运行中升厚（distill 异态 src/flow.js:2211）后重入 done 同判定恢复全量仪式。测试锚覆盖。
- 回退路径：flag 级开关，不带即回退；无数据迁移、无配置残留。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | agent 违规自启 turbo（绕过实证核验） | P1 | 提示词面判据明文禁令（AGENTS.md/命令卡）+ flow-state 留痕可审计（turbo_since 溯源）；CLI 不做弹窗（D-001 滥用防线在判据+审计） |
| R-02 | 跳过面改动误伤必留门（回归） | P1 | 必留面「零改动」设计（不动代码路径只加分支）+ FR-03 测试锚逐项断言照常执行 |
| R-03 | turbo 变更实测问题延后暴露（收口无测试客观核验） | P2 | 收口输出显式标注「本次收口不含测试客观核验」；pre-push git hook（仓级 lint+test+docs gate）仍兜底 push 时点 |
| R-04 | turbo 留痕字段泄漏进平台投影造成短窗展示漂移 | P2 | 设计定死不进 serializeForSync 投影面（接口定义节声明）；FR-05 测试锚覆盖 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01/FR-04（触发权边界+禁自启判据） | 已覆盖 |
| D-002@v1 | FR-02/FR-03（跳过面与必留面清单） | 已覆盖 |
| D-003@v1 | Phase 1+2+3（双层承载架构） | 已覆盖 |
| D-004@v1 | 非目标+FR-04/FR-05（厚道零改动、预段纯提示词） | 已覆盖 |
| D-005@v1 | 总体方案（方案 A 形态；rejected-B/C 见 decisions.md） | 已覆盖 |
| D-006@v1 | FR-03/必留面（patch 冻结件保留） | 已覆盖 |
| D-007@v1 | Phase 2/兼容策略（turbo 升厚即失效，tier!=='thick' 前提） | 已覆盖 |

无未解决决策；剩余风险即 R-01~R-04 登记项。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-006 全覆盖）
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语（豁免短语在节内，否定词紧邻）
- [x] UI 原型分级核对：跳过——纯 CLI/配置/文档变更，无任何界面变化（Step 5 已声明，用户确认设计时在场）
- [x] 不确定的问题标注「⚠️ 自审存疑」：无
