---
author: qinyi
created_at: 2026-09-14 09:36:01
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-14-quick-exit-tiered-gates

## 背景

现行选道规则「≤3 文件、范围明确走 quick；多阶段/架构级走完整流程」中，文件数是唯一可机械核验的部分，事实上成了主判据。对 sillyhub（multi-agent-platform 仓）954 条 quicklog 的三轮统计实证了它量错了维度：

- 近期（≥2026-09-01）quick 条目 49.7% 超过 3 文件，其中 94.8% 为独立 quick（`关联变更：无`），完全绕过完整流程的设计/任务认领/verify 仪式；
- 交叉表显示交互效应：跨 2-3 模块 × ≤3 文件的改动文档同步率仅 24%（现行规则亲手放行的人群），而单模块 × 4-6 文件反而 74%；跨 4+ 模块 × 4-6 文件塌到 16%，是全表最差格；
- 37.1% 的超限条目存在未声明脏文件（审计面不完整），故门禁判定输入不能依赖 `--files` 自声明。

同时，选道的语义判据（"有没有设计决策要落盘"）无法靠 agent 自觉守住——数据已证明自觉会向快车道漂移（95% 独立 quick）。本变更据此确立「语义入口 + 机械出口」结构：入口判据改语义（D-001），出口由 CLI 在 quick --done 时用机械画像自动升级门禁（D-002），并把 scope-audit 命令增强为画像的独立可重放出口（D-008）。

## 设计目标

1. 选道规则从文件数主判据改为「有无需落盘的设计决策」（AGENTS.md 第 6 条 + init 模板同步改写）；
2. quick --done 出口按 CLI 自算画像分级加检查：L0 维持现状 / L1 每文件注记+测试增量 / L2 模块文档认领或显式豁免+运行时证据要求，全部 advisory 起步；
3. 画像信号 = 模块跨度（changedFiles × module-map 前缀聚类）+ 文件数 + 风险特征命中（扩展既有 detectChangeRisk，单一数据源）；
4. `sillyspec scope-audit --change <变更名或quick会话id> [--json]` 成为画像独立出口：表格与 JSON 双出口、支持历史会话重放，`--json` 批量重放即阈值校准数据源；
5. 判定输入全部 CLI 侧计算（changedFiles 用审计链既有 git 事实，不用 --files 自声明），agent 无法自选降级；零新增劝说 prompt。

## 非目标

- 不新增 mid 车道/新状态机/新阶段（D-002 已否决）；
- 不做配置化 gate 引擎（D-007 已否决方案 C——规则表达式/检查项不进配置面）；阈值例外：四个数值键经 local.yaml quick-gate 段覆写、缺省=代码内校准默认值（D-009@v1 修订）；
- 本变更不做 blocking 阻断——L1/L2 全部 advisory，升 blocking 另立变更（D-003 先例）；
- 不改 verify 侧 detectChangeRisk 判级语义（只加数据表）；
- 不改 quick test/lint 实测门禁本身（L0 现状原样保留）；
- 风险命中不做人工确认等待态（D-004@v2：要求运行时证据，不引入 quick 没有的 wait 机制）；
- 风险命中 v1 不做 diff 关键词扫描（D-004@v2）：quick 审计链无 diff 文本入参，引入需加 git 子进程（违背 R-04 零子进程承诺）且冻结重放态无 diff 文本不可重放；路径模式已覆盖 auth/permission/billing/migration 主要踩坑域，diff 维度待出现真实需求另立变更。

## 拆分判断

不拆分：信号层（纯函数）、门禁接线（audit 链）、规则面（AGENTS.md/模板）三者强耦合——阈值定稿依赖接线后的重放数据，规则面文案依赖门禁语义定稿，拆开会产生中间态不一致。不批量：无「模板×数据」重复模式。规模 large（跨 core-engine/runtime/stages/cli-entry 四模块 + 新文件 + 规则面）。

## 总体方案

**Wave 1 信号层**：新建 `src/quick-gate-profile.js` 纯函数模块——输入 (changedFiles, moduleIndex, opts)，输出画像对象（见接口定义）。阈值常量单点（初值按本轮统计：L1=跨≥2 模块或≥4 文件；L2=跨≥4 模块或风险命中；module-map 缺失的降级档：L1=≥4 文件、L2=≥8 文件或风险命中）。风险特征表在 `src/change-risk-profile.js` 扩展，v1 范围=**路径模式**（auth/permission/billing/migration/锁/调度等目录与文件名模式），作为单一数据源供 verify 与 quick 两侧共用；diff 关键词维度延后（见非目标——quick 审计链无 diff 文本入参，加 git 子进程违背零子进程承诺，冻结重放态亦无 diff 文本）。

**Wave 2 门禁接线 + scope-audit 出口**：`auditQuickCompletion`（宿主 run/shared.js）调用画像挂 `review.gateProfile`（照 docSyncHint 先例模式）；`run/complete-handlers.js` 既有 auditNotes 组装点落账（`--no-docs` 豁免同通道留痕，--no-docs 经 run/command.js knownFlags 登记透传）；`run/quick-audit.js` 打印 `[gate]` advisory 块；`src/index.js` 的 scope-audit 命令分支把画像并入表格与 `--json` 输出（复用 computeChangeScopeAudit 重放能力）。

**Wave 3 规则面 + 校准 + 验收**：AGENTS.md 第 6 条与 `templates/agents-instruction.md` 改写；用 scope-audit --json 对 sillyhub 历史会话按真实 module-map 重算交叉表校准阈值（定稿数字回写 THRESHOLDS 常量与 design 记录）；本仓 dogfood advisory 一个周期后核消费率（不消费则按 doc-consistency-debt §九收手线收缩）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/quick-gate-profile.js | 画像纯函数 computeGateProfile + THRESHOLDS 单点常量（无 IO；moduleIndex 由调用方传入） |
| 修改 | src/change-risk-profile.js | 扩展风险特征表：新增 quick 侧**路径模式**数据表（v1 不做 diff 关键词扫描，见非目标）；detectChangeRisk 判级语义不变（verify 侧行为零变化） |
| 修改 | src/config-schema.js | 新增 quick-gate 配置段四 optional 键（l1_span/l1_files/l2_span/l2_files_degraded，缺省=THRESHOLDS 校准默认值）——local.yaml 键单一数据源惯例（D-009）。数据流：producer=本段定义 → reader=resolveGateThresholds（quick-gate-profile.js）→ consumer=computeGateProfile opts.thresholds |
| 修改 | .sillyspec/local.yaml.example | quick-gate 段注释示例（四键+缺省说明） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | core-engine paths 追加 src/quick-gate-profile.js 一行（lint module-map 覆盖登记，task-06 边界核对项） |
| 修改 | src/run/shared.js | auditQuickCompletion 函数宿主（scope-audit.js:24 import 复用）：调用 computeGateProfile 挂 review.gateProfile。数据流：producer=quick-gate-profile.js → review.gateProfile → consumers=run/complete-handlers.js（auditNotes 落账）、run/quick-audit.js（打印）、scope-audit.js（重放出口字段） |
| 修改 | src/run/complete-handlers.js | quick --done 收尾消费 gateProfile：在既有 auditNotes 组装点（:1290 段）追加 [gate] 行与 --no-docs 豁免留痕（quicklog.js flipEntryInContent 的 auditNotes 参数为既有通道，无需改） |
| 修改 | src/run/complete.js | completeStep 解构并转发 isNoDocs（command.js → complete-handlers 的 --no-docs 透传物理必经层；Grill 后接线发现，task-02 target_files 已补登） |
| 修改 | src/run/command.js | --no-docs 登记进 knownFlags 白名单（:819-820 段，未知 flag fail-fast；布尔 flag 解析先例 :799-802）+ 透传审计链 |
| 修改 | src/run/quick-audit.js | printQuickAuditReview 打印 [gate] L1/L2 advisory 块（照 docSyncHint 打印样式，含涉及模块/风险命中/缺失检查项与 --no-docs 指引） |
| 修改 | src/scope-audit.js | computeChangeScopeAudit 结果并入 gateProfile 字段（quick 模式 :396 已跑 auditQuickCompletion，画像随 review 携带，不重复计算）；auditQuickCompletion 本体宿主在 run/shared.js，import 关系不变 |
| 修改 | src/index.js | scope-audit 命令分支（:1304-1378）：表格出口（renderScopeAuditTable 增画像段）与 --json 出口均含 gateProfile（quick flag 解析不在本层，case 'quick' 仅转发 runCommand） |
| 修改 | AGENTS.md | 第 6 条判规模条款改写：选道判据改「有无需落盘的设计决策」，文件数降为出口绊线提法；第 4 条 quick 适用描述同步 |
| 修改 | templates/agents-instruction.md | init 生成模板同步第 6 条改写（producer=本仓规则定稿 → 模板镜像 → consumer=后续 init 新项目） |
| 新增 | NEW:test/quick-gate-profile.test.mjs | 画像矩阵单测：span×files×risk 组合、module-map 缺失降级、阈值边界（≥2/≥4/≥4/≥8）、testDelta 规则、路径模式命中 |
| 修改 | test/audit-quick-completion.test.mjs | L0/L1/L2 三态集成用例 + --no-docs 豁免路径 |
| 修改 | test/scope-audit.test.mjs | gateProfile 字段出现在表格与 --json 两出口的回归用例 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | 模块卡登记 quick-gate-profile.js（新文件归属 core-engine：与 change-risk-profile/scope-audit 同卡）+ 门禁接线记录 |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md | 模块卡记录 run/shared.js 画像挂载、run/complete-handlers.js [gate] 落账、run/quick-audit.js 打印块、run/command.js flag 登记 |
| 修改 | .sillyspec/docs/sillyspec/modules/cli-entry.md | 模块卡记录 index.js scope-audit 命令分支 gateProfile 双出口（表格 + --json） |

## 接口定义

```js
// src/quick-gate-profile.js
// 默认值=校准定稿值（task-05）；local.yaml quick-gate 段可覆写（D-009），经 resolveGateThresholds 合并
export function resolveGateThresholds(config) {
  // config: local.yaml 解析结果（无 quick-gate 段/键非法 → 全默认值；键校验失败回退默认并 warn）
  // 返回 { l1_span, l1_files, l2_span, l2_files_degraded }（默认值 × 覆写键合并）
}

export const THRESHOLDS = { // 代码内默认值（校准定稿，缺省行为的单一事实源）
  L1_SPAN: 2,            // 跨 ≥2 模块 → L1
  L1_FILES: 4,           // 或 ≥4 文件 → L1
  L2_SPAN: 4,            // 跨 ≥4 模块 → L2
  L2_FILES_DEGRADED: 8,  // module-map 缺失降级档：≥8 文件 → L2
}

export function computeGateProfile(changedFiles, moduleIndex, opts = {}) {
  // changedFiles: string[]（CLI 审计链 git 事实，非 --files 自声明）
  // moduleIndex: _module-map.yaml 解析结果（paths 前缀表）；null/undefined → degraded
  // opts.riskTable: change-risk-profile.js 导出的路径模式风险表（默认内置引用）
  // opts.thresholds: 已合并阈值（resolveGateThresholds 产物；缺省用 THRESHOLDS，D-009）
  // opts.fileNotes: --file-notes 解析结果（perFileNotes 检查依赖：changedFiles 全集均有注记）
  // 计数口径：testFileCount=路径含 __tests__/、/tests/、/test_ 前缀或 .test./_test./.spec. 命名（对齐仓内既有测试判定先例）；
  //          codeFileCount=其余非文档文件（文档口径沿用 docSyncHint 的 isDoc：.sillyspec/docs/、changelog、docs/*.md）；文档文件不计入两者
  return {
    fileCount,            // 全部变更文件数
    codeFileCount, testFileCount,
    moduleSpan,           // 非文档文件命中的模块去重数；degraded 时为 null
    modules: [{ id, files }],  // 命中模块清单（打印与 --json 用）
    unmappedFiles: [],    // module-map 未命中的文件（degraded 判据 + 提示）
    riskHits: [{ pattern, file }],  // 路径模式命中清单（v1 无 diff 关键词维度）
    level: 'L0' | 'L1' | 'L2',
    degraded,             // moduleIndex 缺失 → true，span 退出判级
    checks: {
      perFileNotes,       // L1：每文件注记非空（--file-notes 覆盖率：changedFiles 全集均有注记 → true）
      testDelta,          // L1 机械规则：codeFileCount ≥2 且 testFileCount === 0 → 'missing'；codeFileCount ≤1 → 'na'；其余 → 'ok'
      docClaim,           // L2：claimed（触及模块的卡片文件在 changedFiles）/ exempt-no-docs / missing
      runtimeEvidence,    // L2 风险命中：required（advisory 提示）/ na
    },
  }
}
```

## 生命周期契约表

不涉及生命周期契约（本变更不新增或修改任何流程事件定义与状态流转；quick 收尾沿用既有完成链路，scope-audit 沿用既有重放路径，均不触及生命周期事件）。

## 数据模型

无 schema/表结构变更。画像结果为运行时对象：消费路径仅 quicklog auditNotes（既有文本行）与 scope-audit --json（既有命令输出面），不落 DB、不加表。

## 兼容策略（brownfield 必填）

- **未配置 local.yaml quick-gate 段**：阈值=THRESHOLDS 代码内默认值（与纯默认行为完全一致，D-009）；**未 scan/无 module-map 的存量项目**：degraded=true，span 不参与判级（L1=≥4 文件、L2=≥8 文件或风险命中），且 advisory 不阻断——行为对存量项目零强制变化；
- **不传 --no-docs**：L2 文档认领缺失仅警告+落账（advisory），quick 完成不受阻；升级 blocking 是另立变更的显式决策（D-003）；
- **verify 侧零回归**：change-risk-profile.js 只新增数据表，detectChangeRisk 判级函数与调用点不动；
- **scope-audit 命令**：gateProfile 为新增字段，既有三态对账表/归属表/--file 出口原样保留（增量字段，消费方按存在性读取）；
- **回退路径**：整个门禁 advisory 面可整体关闭的方式=不消费（无阻断），代码回退等价于删除 Wave 2 接线三行调用；信号模块独立存在无副作用。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | advisory 提示无人消费（doc-consistency-debt §九实证：D-8 提示四次被忽略；机制自带出错面） | P1 | dogfood 一个稳定周期后核 quicklog auditNotes 消费率；不消费则按既定收手线砍提示、只留 --json 出口与阈值常量 |
| R-02 | 阈值误报/漏报（两套启发式映射下同一格子 n=8 vs n=38，切分点不稳） | P1 | Wave 3 用 sillyhub 真实 module-map 重算交叉表后定稿；阈值单点常量便于校准；advisory 阶段误报无害 |
| R-03 | 风险路径模式误命中（如 auth 前缀误中无关文件） | P2 | 表初版从窄（只收实证踩坑域：auth/permission/billing/migration/锁/调度）；命中清单随 [gate] 打印与 --json 可审计 |
| R-04 | 大仓 quick --done 耗时增加 | P2 | 画像是纯字符串运算（毫秒级），不加 git 子进程；module-map 读取复用 docSyncHint 既有加载点 |
| R-05 | 规则面改写后 agent 仍按旧习惯数文件选道 | P2 | 出口门禁兜底（选错道代价被 L1/L2 捕获）；AGENTS.md 与 init 模板同步改写消除规则源头 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 设计目标 1；总体方案 Wave 3；文件清单 AGENTS.md + templates/agents-instruction.md 行 | 已覆盖 |
| D-002@v1 | 设计目标 2/5；总体方案 Wave 1-2；接口定义 THRESHOLDS/checks；非目标第 1 条 | 已覆盖 |
| D-003@v1 | 非目标第 3 条；兼容策略第 2 条；R-01 | 已覆盖 |
| D-004@v1 | 已被 D-004@v2 取代（supersedes：风险表范围收敛为路径模式，diff 关键词维度延后） | 已取代 |
| D-004@v2 | 总体方案 Wave 1（风险表扩展=路径模式 only）；接口定义 riskHits/checks.runtimeEvidence；非目标第 6/7 条 | 已覆盖 |
| D-005@v1 | 总体方案 Wave 2（未声明脏文件维持既有归属分流，不并入 docClaim）；quick-audit.js 行说明 | 已覆盖 |
| D-006@v1 | 总体方案 Wave 3（校准任务）；THRESHOLDS 初值；R-02 | 已覆盖 |
| D-007@v1 | 总体方案 Wave 1（独立纯函数模块）；接口定义；非目标第 2 条 | 已覆盖 |
| D-008@v1 | 设计目标 4；总体方案 Wave 2（scope-audit 双出口）；文件清单 scope-audit.js + index.js 行；R-01 应对（--json 出口） | 已覆盖 |
| D-009@v1 | 接口定义 resolveGateThresholds；文件清单 config-schema.js + local.yaml.example 行；兼容策略第 1 条 | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=large）
- [x] 引用所有当前版本决策：D-001@v1~D-003@v1、D-004@v2（supersedes v1）、D-005@v1~D-008@v1（决策追踪表逐条覆盖，无未解决项）
- [x] 生命周期关键词核对：正文含「quick 会话」表述但不涉及 lifecycle 事件——已写紧邻豁免短语「不涉及生命周期契约」
- [x] UI 原型分级核对：纯 CLI/后端变更，无任何界面文件——跳过原型（原因已在 Step 5 输出声明）
- [x] 字段数据流标注：gateProfile 为新增对外字段，producer→consumers 三跳已在文件清单 scope-audit.js 行交代
- [x] 自审存疑项已消：test/scope-audit.test.mjs 已确认存在（2026-09-14 核实），文件清单该行按现状修改处理

## 阈值校准记录（task-05）

**执行日**：2026-09-14。**定稿**：THRESHOLDS 四值（L1_SPAN=2 / L1_FILES=4 / L2_SPAN=4 / L2_FILES_DEGRADED=8）与初值一致，**维持不调**；回写面为注释定稿化（src/quick-gate-profile.js THRESHOLDS 头注释、.sillyspec/local.yaml.example quick-gate 段注释），常量值与判级逻辑零改动，test/quick-gate-profile.test.mjs 边界用例（≥2/≥4/≥4/≥8）原样通过。

### 一、重放执行（task-03 ScopeAuditGateExit 契约消费）

驱动脚本（系统临时目录，未提交）枚举 sillyhub（multi-agent-platform 仓）quick 会话 67 个（quick-sessions/ 遗留 guard 目录 50 + quicklog/patches/ 冻结记录 17，无交集），逐个调 worktree CLI `scope-audit --change quick-<id> --json --spec-dir <sillyhub>/.sillyspec --allow-worktree-cwd`：

- **17 条冻结记录**（2026-09-11~09-14，guard 已清理）走记录态路径：旧格式无 gateProfile 冻结值 → rows 现算（设计预期路径），画像真实产出（L0=9 / L1=3 / L2=5）；
- **50 条遗留 guard** 走实时态路径——审计的是**当前**工作区窗口（会话自身改动早已提交，窗口内容为并行会话的在途文件），对历史校准是污染数据，**排除出交叉表**（其中 2026-09-14 的 1 条为在途活跃会话）；
- **附带发现**：67 条画像 **全部 degraded=true（moduleSpan=null）**——sillyhub 五份 module-map（SillyHub/backend/frontend/sillyhub-daemon/multi-agent-platform）并立时 pickModuleMapProject 按「归属得分唯一最高」消歧，而 map 路径大量使用 `/**` glob（SillyHub 44/49、backend 35/39、根视图 9/15），字面前缀匹配全部落空 → 各 map 得分并列 → null → 降级档。即 sillyhub 当前运行态门禁实际按**降级档语义**（文件数+风险）判级，span 阈值主要作用于单 map 仓——该校准事实已计入 L2_FILES_DEGRADED 的定稿论证。

### 二、交叉表重算（真实图谱）

**基座**：sillyhub quicklog 全部 QUICKLOG-*.md 共 989 条，其中 919 条有可解析文件清单（新式 bullet 行 + 旧式行内式 527 行——、，,;；分隔/全角括注/反引号均清洗；残余不可解析 25 条 span=0、5 条无文件段）。近期口径 P3（≥2026-09-01）n=215（独立 quick 196/215），全量 n=919。

**moduleSpan 口径**（brainstorm 期为启发式映射，本次为真实图谱）：五份真实 _module-map.yaml 合并索引共 217 模块——glob 路径截为目录前缀、backend map 项目相对路径补 `backend/` 前缀、模块 id 加项目前缀防跨图重名，顺序细粒度 per-project → SillyHub 合并视图 → 根视图（first-match-wins，与 computeGateProfile.matchModuleForFile 同语义）；span/testFileCount/risk 经 worktree **computeGateProfile 原函数**计算（产品同一代码路径）。文档同步率口径与 brainstorm 同：文件行触及 `.sillyspec/docs/` 或 changelog。

**交叉表关键数字**（近期 n=215 / 全量 n=919，格式 同步率%(n)）：

| span\files | ≤3 | 4-6 | 7-10 | 11+ |
|---|---|---|---|---|
| 1 | 33.3%(81) / 13.8%(470) | 74.2%(31) / 52.4%(84) | 55.6%(9) / 60%(15) | — / 25%(4) |
| 2-3 | 5.9%(17) / 7.4%(94) | 26.3%(38) / 27.2%(125) | 45.5%(11) / 44.1%(34) | 80%(5) / 45.5%(11) |
| 4+ | — | 0%(4) / 12.5%(16) | 14.3%(14) / 9.1%(33) | 80%(5) / 36.4%(33) |

- 纯文件剖面（降级档全人口）：近期 ≤3=28.6%(98) / 4-6=45.2%(73) / 7-10=35.3%(34) / 11+=80%(10)；全量 12.8% / 35.6% / 32.9% / 37.5%；
- 风险命中：近期 n=21 同步率 47.6%（全量 n=83 22.9%），均低于人口均值，风险→L2 维度成立；
- 全量与近期数字差主要是文档纪律的时期演化（6-8 月行内式老条目几乎不触文档），边界判定以近期为准、全量作稳健性对照。

**交叉验证**：17 条冻结记录 rowCount 与 quicklog 同 qlId 条目 fileCount 16/17 在 ±2 内；近期关键格（span1×4-6=74.2% 等）在两轮独立解析迭代间复现一致。

### 三、逐阈值判定（定稿理由）

1. **L1_SPAN=2 维持**：断崖恰在 span 2——近期 ≤3 文件档 span1=33.3% → span2-3=5.9%（5.6 倍落差）；「span≥2 且 <4 文件且无风险」这 17 条近期条目（旧规则亲手放行、降级档必漏的人群）同步率 5.9%，恰是 L1_SPAN 独有捕获面。
2. **L2_SPAN=4 维持**：span4+ 在所有出现档位都是最差格（近期 4-6 文件 0%(4)、7-10 文件 14.3%(14)，对照 span2-3 同档 26.3%/45.5%）；「span≥4 且 <8 文件且无风险」纯 span 驱动的 L2 边际人群近期 5 条、同步率 0%。span=3 位置在两口径间不稳定（近期 16%(25) vs 全量 20%(80)，且 span4 单点 28.6% 回弹）——不构成稳定的边界前移证据，不升级改值。
3. **L1_FILES=4 维持**：文件维度无同步率断崖（同步率随文件数上升：28.6%→45.2%）——正是本变更「文件数量错了维度」论点的复核实证；4 取旧规则「≤3 文件」边界的连续性作为轻仪式（每文件注记+测试增量）绊线，数据无任何替代切分点信号。
4. **L2_FILES_DEGRADED=8 维持**：降级档（sillyhub 当前实际运行态）最差文件桶为 7-10（32.9-35.3%），≥8 恰覆盖该桶主体；11+ 桶同步率回升（80%）即已自觉同步、docClaim=claimed 时 advisory 自然消解，不构成误报负担；逐文件数 7 与 8 无可分差异（50%(8) vs 33.3%(12)，n 不足）。

**判级载荷参考**（advisory 负载面）：近期条目按正常态（span 可用）L0=36.7% / L1=47.0% / L2=16.3%；按降级态 L0=44.7% / L1=33.0% / L2=22.3%——两级均在可消费范围。

### 四、遗留观察（非本任务改动面，供后续变更参考）

- pickModuleMapProject 对 `/**` glob 路径的前缀匹配失效导致多 map 仓恒降级——影响 sillyhub 实际运行态走降级档判级（advisory 语义无错，span 信号暂时缺位）；如需激活 span 维度，另立变更处理 glob 匹配或 map 收敛，不在本变更 scope；
- QUICKLOG 旧式行内「文件：」格式（527 行）与「等约 N 个」省略式记录是重放数据面的历史噪音源，新式 bullet+per-file 括注格式（现行）无此问题。
