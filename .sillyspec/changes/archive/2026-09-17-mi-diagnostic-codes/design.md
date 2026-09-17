---
author: qinyi
created_at: 2026-09-17 22:05:44
generated_by: sillyspec-design-init
scale: large
risk_level: unit-sufficient
---
<!-- risk_level 覆盖说明：自动判级命中「server.js」系误伤——design 非目标节提及 mcp-server.js 是显式不改（信封透传已覆盖）；实际改动面（machine-interface.js 加法式字段/新码表模块/契约文档/测试）无 daemon/session/启动入口，单测可证。 -->

# 设计文档（Design）— 2026-09-17-mi-diagnostic-codes

## 背景

machine-interface 族（`sillyspec gate / derive / progress show --json`）是 SillySpec↔SillyHub 的机器消费面，但信封里 `errors`/`warnings` 是自由文本中文句子（「变更不存在: X」「测试失败: <原因>」），程序化消费方无法按错误类型稳定分支——提示语改一个字就是一次静默破坏性变更。同时对账基准文档 `docs/sillyspec/interface-contract.md`（D-005@v1 冻结）已与实现漂移三处：check 枚举缺 `design-file-list`、命令面缺 `progress show`、§2.3 transition `informational` 语义与代码反向漂移（实现有意改为参与综合 ok 以防 gate/run 判定分裂，契约未跟）。

本变更为 2026-09-17 OpenSpec 源码对比三轮评审定稿的②号能力项：加法式诊断码表 + 三项契约对账 + parity 测试（OpenSpec 无文档↔代码 parity 测试，此为其已实证弱点，本变更反超）。

## 设计目标

1. machine-interface 族自产错误获得稳定 snake_case 诊断码，消费方可按码分支，不再匹配中文散文。
2. interface-contract.md 三处漂移对账销账，恢复「契约==实现」单一真相。
3. 码表↔契约文档双向 parity 测试上线，漂移在 CI 即红。
4. 加法式零破坏：既有键、退出码、中文 message 全保留，schema_version 不升。

## 非目标

- `errors` 对象化 / schema_version 2（迁移纪律：破坏语义才升版，另行变更）。
- warnings 级码化（首期只码错误路径）。
- stage-contract 校验器散文逐条码化（码标识失败面，不标识每条消息）。
- doctor / validate / scope-audit 面（形态分裂，一次不吞——评审 guardrail）。
- mcp-server.js 自有 JSON-RPC 错误面（信封透传已覆盖）。
- SillyHub 侧任何改造（消费方忽略新字段，零协同成本）。

## 拆分判断

三项内容（码表 / 对账 / parity）是完整性单元，不拆批：只做码表不对账 → parity 上线即把已知漂移焊红；只对账不码化 → 契约无稳定锚点。单变更承载，Wave 内任务按「码表+信封 → 契约+parity」两段排布。

## 总体方案

**Phase 1 码表与发射**：新模块 `src/diagnostic-codes.js` 导出冻结表 `DIAGNOSTIC_CODES`（码 → {surface, exit 语义, 触发条件}），首批 10 码：信封级 4（`db_missing`/`change_not_found`/`unknown_facet`/`internal_error`，均 exit 2 面）+ check 级 6（`artifacts_invalid`/`design_file_ref_invalid`[直承 design-facts 既有稳定码]/`transition_blocked`/`execute_evidence_unchanged`/`task_reviews_invalid`/`verify_test_failed`）。`machine-interface.js`：`buildEnvelope` 增可选 `codes` 参（!== undefined 才挂，optional-once 约定）；gate 的每个 check 恒挂 `code`；顶层 `codes: string[]` 按失败 check 顺序去重聚合，信封级错误路径（db 缺失/变更不存在/非法 facet/internal）单码直挂。

**Phase 2 契约与 parity**：interface-contract.md ①§2 check 表补 `design-file-list` 行（brainstorm 条件性 check，fail-open 语义）②§1 命令面新增 `progress show` 子节（编号按现有小节顺延——现 §1.3/§1.3b 已被 docs check/docs gate 占用，不得撞号）③§2.3 transition 从 informational 重写为参与综合 ok（与 completeStep 硬阻断一致），161-173 行旧示例替换，并**全文清扫 informational 残留**（check 枚举表 :123 行「仅 transition 标 true」、退出码表 :135/:241 行等）。新增两节：诊断码目录（表格：码/面/退出码语义/触发条件，与 registry 单一源对账）+ v1 存续期语义变更记录（transition 条目：日期/旧语义/新语义/SillyHub gate.py exit_code 三分支实证——旧语义非法转移会被判「推进」，改约对消费方有利）。模块卡 `modules/machine-interface.md` :28 行仍述「transition(informational，不参与综合 ok）」——第三真相源，同步改写并补 codes 契约摘要。`test/diagnostic-codes-parity.test.mjs`：双向核对（注册码 ⊆ 文档目录 ∧ 目录码 ⊆ 注册表）+ 运行时发射抽查（fixture 证三个信封级码 + check.code 恒在场）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/diagnostic-codes.js | 码表单一源：冻结表 DIAGNOSTIC_CODES + checkCode 辅助映射（check id → 失败码）；producer=本模块，consumer=machine-interface.js 发射侧 + parity 测试对账侧 |
| 修改 | src/machine-interface.js | buildEnvelope 加 codes 可选参；gate checks 逐个挂 code；四个信封级错误路径 + derive unknown facet 挂码；顶层 codes 聚合。既有键/退出码/message 零改动 |
| 修改 | docs/sillyspec/interface-contract.md | 对账三项（progress show 子节顺延编号/design-file-list 行 + transition 行与 §2.3 重写 + 示例替换 + :123/:135/:241 informational 残留清扫）+ 新增码目录节与语义变更记录节 + frontmatter updated_at |
| 修改 | .sillyspec/docs/sillyspec/modules/machine-interface.md | 模块卡第三真相源同步：:28 行旧 informational 说法改写 + 契约摘要补 codes 键语义 |
| 新增 | NEW:test/diagnostic-codes-parity.test.mjs | 双向 parity（码表↔文档目录锚定解析）+ 发射抽查（tmp fixture：db_missing/change_not_found/unknown_facet/gate check.code 在场） |
| 修改 | test/machine-interface.test.mjs | 既有断言零回归确认 + codes 键行为增补（可选键约定：错误路径在场/成功路径可缺省） |

数据流向：DIAGNOSTIC_CODES（单一源）→ machine-interface.js 发射进信封 → SillyHub/外部消费方按码分支；同一源 → interface-contract.md 诊断码目录节（人工对齐，parity 测试钉死；节编号在 execute 期按契约现状顺延确定）→ 漂移即红。

## 接口定义

```js
// src/diagnostic-codes.js
export const DIAGNOSTIC_CODES = Object.freeze({
  // 信封级（exit 2 面）
  db_missing:           { surface: ['gate','derive','progress show'], exit: 2, trigger: '进度库不存在（只读不建库）' },
  change_not_found:     { surface: ['gate','derive'],                  exit: 2, trigger: '变更名在进度库无记录' },
  unknown_facet:        { surface: ['derive'],                         exit: 2, trigger: 'facet ∉ FACETS' },
  internal_error:       { surface: ['gate','derive','progress show'], exit: 2, trigger: '内部异常兜底' },
  // check 级（gate 失败面）
  artifacts_invalid:          { surface: ['gate','derive'], exit: 1, trigger: 'runValidators 失败（gate artifacts check 与 derive artifacts facet 同源）' },
  design_file_ref_invalid:    { surface: ['gate'], exit: 1, trigger: 'design 文件清单行级核验失败（直承 design-facts 既有码）' },
  transition_blocked:         { surface: ['gate'], exit: 1, trigger: 'checkTransition 不允许（含 failed_post_check 门控）' },
  execute_evidence_unchanged: { surface: ['gate','derive'], exit: 1, trigger: 'base..head 无代码变更' },
  task_reviews_invalid:       { surface: ['gate','derive'], exit: 1, trigger: 'validateTaskReviews 失败' },
  verify_test_failed:         { surface: ['gate','derive'], exit: 1, trigger: 'commands.test 实测失败' },
});
export function checkCode(checkId) { /* check id → 失败码，表外 id 返回 undefined */ }
```

信封增量（加法式，schema_version 仍 1）：

```jsonc
{
  "schema_version": 1, "command": "gate", "change": "…", "ok": false,
  "codes": ["artifacts_invalid", "transition_blocked"],   // 顶层聚合：按失败 check 顺序去重（artifacts check 先于 transition push，machine-interface.js:164/:203）；信封级错误路径单码
  "errors": ["…中文 message 不变…"],
  "checks": [ { "id": "transition", "code": "transition_blocked", "ok": false, "errors": […], "warnings": [] }, … ]
}
```

`check.code` 恒在场（通过时也在场，身份码非失败标志；失败判定唯一看 `ok`）。

## 生命周期契约表

本设计不涉及生命周期契约——machine 接口为无状态单次调用（原契约 D-007@v1：无生命周期契约），本变更仅加被动字段，不引入 session/lease/heartbeat/状态转移语义。

## 数据模型

无 schema 变更（不触 sillyspec.db；信封 schema_version 保持 1，仅加可选键）。

## 兼容策略（brownfield 必填）

- 未配置/不感知新键的消费方（现网 SillyHub）：只读 exit_code + errors（gate.py 实证），`codes`/`check.code` 被忽略，行为零变化。
- 回退路径：删除发射侧挂码即回到现状，信封既有键从未动过。
- 不改变的契约面：退出码 0/1/2 语义、errors/warnings 类型与文案、FACETS 枚举、只读纪律、optional-once 键约定（codes 遵循同一约定：!== undefined 才挂）。
- 契约文档消费方：诊断码目录节锚定标题 + 码 token 格式固定，parity 测试钉死格式防解析脆断。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 消费方把顶层 codes[] 误读为与 errors[] 逐下标 1:1 | P2 | 契约明示「按失败 check 序去重聚合，非 1:1」；需逐条归因时读 checks[].code |
| R-02 | parity 解析对文档表格格式变化脆断 | P2 | 码目录节用固定锚定标题 + 行内码 token 格式，测试同步钉格式；格式改动走变更 |
| R-03 | check.code 恒在场被误当失败标志 | P2 | 契约明示「身份码恒在场，失败唯一看 ok」；成功示例带 code 展示 |
| R-04 | 语义变更记录节被误用为杂物堆 | P3 | D-005 退役判据：只录语义级变更，格式勘误不入节 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 / 总体方案 Phase 1 / 接口定义（加法式 keys） | 已落实 |
| D-002@v1 | FR-02 / 非目标四条 / 接口定义（恰 10 码） | 已落实 |
| D-003@v1 | FR-04 / 总体方案 Phase 2 对账三项 / D-005 记录节 | 已落实 |
| D-004@v1 | FR-02 / FR-03 / 总体方案 parity / 接口定义单一源 | 已落实 |
| D-005@v1 | FR-04 / 总体方案 语义变更记录节 / 风险 R-04 | 已落实 |

无未解决决策；无剩余风险挂账。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1 ~ D-005@v1 全入决策追踪）
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语（豁免短语在节内）
- [x] UI 原型分级核对（纯 CLI/契约/测试改动，无前端文件，原型跳过）
- [x] 不确定的问题标注「⚠️ 自审存疑」（无存疑项；SillyHub 消费面已实证非推测）
