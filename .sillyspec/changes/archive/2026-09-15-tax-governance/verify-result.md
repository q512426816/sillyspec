# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS（探针 7 矩阵 11 行 unfilled=0/missingEvidence=0 自举核验、全量 481/0、execute 独立审查 3 FR 全 pass、字段端到端双证据成立——本变更 D-001@v2 归档蒸馏将作活体观察）

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（2/2 task 均 pass）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
- claim: 字段链套件全绿 | command: node test/tax-governance-fields.test.mjs | exit: 0 | log: .sillyspec/.runtime/verify-logs-tax/fields.log
- claim: 台账套件全绿 | command: node test/tax-governance-ledger.test.mjs | exit: 0 | log: .sillyspec/.runtime/verify-logs-tax/ledger.log
- claim: 全量套件 | command: npm test | exit: 0 | log: .sillyspec/.runtime/verify-logs-tax/full.log

## 任务完成度 [层：人工判断]
- task-01: 完成（6c388b6d）review pass
- task-02: 完成（85d7b554，含 _module-map 补录欠账）review pass
- 主仓合入（10 文件）

## 设计一致性 [层：人工判断]
一致（取舍已记档：prune 同步契约走无锁 mergeFrictionEntrySync——async 锁进不了同步函数，并发丢失按 R-02 P3 容忍+原子写保无半截；字段命名按卡权威口径 failureMode/retireWhen）

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stage-contract.js:722` // 证据槽 <TODO>；列表防御行（卡无 acceptance…）与不适用行无槽不计。
- ⚠️ `src/stage-contract.js:727` const MATRIX_EVIDENCE_TODO = '<TODO>'
- ⚠️ `src/stage-contract.js:762` * 行级证据口径：covered/partial 须非 TODO 且含测试锚点；non-testable 须非 TODO 且非空
- ⚠️ `src/stage-contract.js:768` if (e === '' || e === MATRIX_EVIDENCE_TODO || e.startsWith('<待填')) return true
- ⚠️ `src/stage-contract.js:769` if (verdict === 'non-testable') return false // 非 TODO 且非空即合规（理由一句话）

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src/stages、src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-02: 模块目录（src、src/run、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles 结构归属承接面（每条 acceptance 由哪些测试承接）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 含「故障面/退役判据」字段的 decisions.md 条目经解析后 entry.failureMode/entry.retireWhen 有值且 FIELD_LABEL_RE 白名单命中（不落 raw） | `test/tax-governance-fields.test.mjs` | 故障面、退役判据、decisions（`test/tax-governance-fields.test.mjs`） | covered | test/tax-governance-fields.test.mjs 双 case 解析+白名单对照断言 |
| 端到端（AC-2 机器验收）——fixture 条目归档蒸馏后 knowledge/decisions 渲染输出含「故障面：」「退役判据：」精确行，两行均仅非空渲染 | `test/tax-governance-fields.test.mjs` | 机器验收、knowledge（`test/tax-governance-fields.test.mjs`） | covered | test/tax-governance-fields.test.mjs fixture 蒸馏断言（含字段→两精确行/无字段→零变形/幂等字节稳定） |
| 存量条目（无两字段）渲染输出与改动前字节级一致——零迁移、幂等重归档不添空行 | `test/tax-governance-fields.test.mjs` | 存量条目、零迁移、幂等重归档不添空行（`test/tax-governance-fields.test.mjs`） | covered | test/tax-governance-fields.test.mjs 零迁移断言 + decision-file-field.test.mjs 11/11 回归 |
| 「锚点：」行与「文件：」行相对顺序不变，test/decision-file-field.test.mjs 既有断言保持绿 | `test/tax-governance-fields.test.mjs` | 锚点、行与、文件、test（`test/tax-governance-fields.test.mjs`） | covered | test/tax-governance-fields.test.mjs 行序红线断言（文件Idx===anchorIdx+1） |
| 软警告——architecture+accepted 缺字段条目产生含条目 ID 的 warning 且不产生 error；非 architecture 条目与 definition 类条目不产生该警告；「存量可忽略，新决策建议补齐」文案在场 | `test/tax-governance-fields.test.mjs` | 软警告、architecture、accepted、warning（`test/tax-governance-fields.test.mjs`） | covered | test/tax-governance-fields.test.mjs 软警告三分支断言（warning 含 ID 不 error） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 构造非零 tally 走 complete verify 收尾 consume 路径——台账按 change merge 正确落盘；同 change --reopen 重跑二次 consume 合并非双计（merge-by-change） | `test/tax-governance-ledger.test.mjs` | tally、complete、verify、收尾（`test/tax-governance-ledger.test.mjs`） | covered | test/tax-governance-ledger.test.mjs merge-by-change 双 consume 合并非双计断言 |
| 台账超 200 条掐头留最新；坏台账文件按空数组起不抛；空 counts 跳过写不落空条目 | `test/tax-governance-ledger.test.mjs` | counts（`test/tax-governance-ledger.test.mjs`） | covered | test/tax-governance-ledger.test.mjs 掐头/坏 JSON/空 counts 三断言 |
| 台账读写任何失败 fail-soft——不阻断 verify 收尾/归档/doctor（红线） | `test/tax-governance-ledger.test.mjs` | fail、soft、不阻断、verify（`test/tax-governance-ledger.test.mjs`） | covered | test/tax-governance-ledger.test.mjs sync+async 不可写路径不抛断言 |
| prune 兜底——归档时残余 tally merge 进台账且条目落 archivedAt；返回值含 ledgerAppend，既有 {ok, removed} 消费方不受影响 | `test/tax-governance-ledger.test.mjs` | prune、兜底、tally、merge（`test/tax-governance-ledger.test.mjs`） | covered | test/tax-governance-ledger.test.mjs 残余 merge+archivedAt 落定+ledgerAppend 返回 13 项 |
| doctor self_maintenance_tax 四态——活跃非零 tally 列示、聚合（近 90 天 top5+累计总量）、单变更 total≥3 记 WARNING、台账缺失渲染「无台账数据」不告警；聚合展示 pass:true 不拉低 overall_status | `test/tax-governance-ledger.test.mjs` | doctor、self_maintenance_tax、四态、活跃非零、tally（`test/tax-governance-ledger.test.mjs`） | covered | test/tax-governance-ledger.test.mjs doctor 四态 16 项断言（含 pass:true 不拉低） |
| 台账只落 .runtime 树内永不落 changes/（隐私红线同 tally） | `test/tax-governance-ledger.test.mjs` | runtime、changes（`test/tax-governance-ledger.test.mjs`） | covered | test/tax-governance-ledger.test.mjs .runtime 落点红线断言 |

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3] + artifact 0), 0 frontend calls [scope: change-diff (6 files @ scan-root)] | 2 backend endpoints unused by frontend
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
- npm test（主仓）：481/0（+2 新测试文件；apply 后 doc-ref 漂移经 --fix 重锚复绿）
- fields 5/5、ledger 9 组、lint 通过
- known_failures 豁免：无

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03 | task-01、task-02 | 本报告探针 7 矩阵 + fields 5/5 + ledger 9 组 | 已闭环 |
| D-001@v2 | FR-02、FR-03 | task-02 | ledger 测试 merge-by-change/锁/掐头断言 | 已闭环 |

## 技术债务 [层：人工判断]
- 探针 1 命中为模板/测试源码文本（预填段）非债务

## 变更风险等级 [层：人工判断]
integration-critical（收尾链+doctor 接线；证据面：三份 CLI/套件回执 + 探针 7 自举 + 独立执行审查实测）。无显式声明，接受判级。

## Runtime Evidence [层：人工判断]
- 长驻进程/端点/HTTP：不涉及
- 核心路径：wt-commit 两笔真实提交（6c388b6d/85d7b554）+ apply 后全量 481/0
- 日志：verify-logs-tax/ 三份 exit 0
- 终态断言：矩阵 11 行 0/0；无服务进程
- 失败模式排除：台账 fail-soft（不可写不抛）/空 counts 跳过/坏 JSON 空数组起——均有断言

## 代码审查 [层：人工判断]
- execute 独立审查：3 FR pass、非目标守住（friction-tally 零 diff 实证/quick :1677 未动）
- 总体：软警告+台账双轨按 D-001 落地，字段端到端双证据（fixture 机器验收+本变更活体观察）
