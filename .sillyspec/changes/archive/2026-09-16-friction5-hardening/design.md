---
author: qinyi
created_at: 2026-09-16 11:09:52
generated_by: sillyspec-design-init
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-16-friction5-hardening

## 背景

2026-09-16 用户驾驭小结报 5 处门禁摩擦（正面结论：四阶段门禁质量高、分层审查省消耗设计合理；摩擦全部是「门禁口径与 agent 实际产出形态错配」类假阳性/静默失败）。逐点源码勘察确认根因：

1. **回执解析**：`src/verify-facts-schema.js:53` `RECEIPT_LINE_RE` 单行四字段严格正则——claim 含管道符、字段序调换、多行书写整行不命中 → `parseEvidenceSlots` 收 0 条回执 → integration-critical 变更误报「无绿回执」（change-risk-profile.js `checkIntegrationEvidence` 绿回执循环消费空集）。全角 ｜ 分隔与 log rest-of-line 已是两轮补丁（坑 receipt-fullwidth-parse），形态自由度未根除。
2. **TaskCard 重复键**：`src/taskcard.js` 骨架双来源反填 depends_on（tasks.md 行内注解 + plan.md Wave 兜底）；agent Edit 再填同键后——js-yaml 4 对重复映射键 throw，`src/stages/plan-postcheck.js` 四处 jsYaml.load（L179/L306/L820/L1341）的 catch 全部静默降级（repo=null / 契约空 / 命令不校验 / acceptance best-effort 跳过 = 吞字段）；`parseDependsOn` 正则取首个命中；`validatePlanFeasibility` 正则逐字段检测不到重复。
3. **Gate1 拦文档**：`src/worktree-apply.js` `resolveApplyAllowSet` 的 allow 面 = design §6（keepSillyspecDocs）∪ task allowed_paths；`filterDeliverableFiles` 明确保留 `.sillyspec/docs/` 为交付物——同一文件「filter 保交付、Gate1 拦交付」两道口径矛盾，approved 文档同步照样 BLOCKED。
4. **快照缺生成物**：`src/run/gate-snapshot.js` 快照 = HEAD worktree + 会话文件 overlay + node_modules/venv junction；gitignored 生成物（api-types/generated 类）不进 HEAD 不在会话集 → 快照内 lint/test 全环境性失败（用户实证只能 SNAPSHOT_OFF 对照）。
5. **锚点口径分裂**：`src/probe7-anchor-check.js:21` `ANCHOR_RE = /:\d+\b/` 只认 file:line；stage-contract.js `matrixEvidenceHasAnchor` 硬门认三形态（`.test.` / file:line / 反引号）——`.test.` 文件名锚过硬门仍被 advisory 提示回补（案例行号随提交漂移场景高频）。

## 设计目标

- 5 处摩擦逐一收口，全部增量式：存量合法产物的门禁判定逐一不变（零新假阴性）
- 与既有机制同源：回执 fail-closed、allowSet 单源消费、junction 环境链接、advisory 不阻断的定位均维持
- 每 FR 配直测（纯函数优先，不依赖真实 git 仓）

## 非目标

- 不做回执槽 YAML 重渲染迁移；不动 SNAPSHOT_OFF / detectSymlinkStoreLayout；不动 review 声明相交过滤（D-003 旧决策）语义；不做快照内自动跑 gen 命令；不改 stage-contract 硬门三形态口径

## 拆分判断

5 处摩擦同主题（门禁口径错配）、同批次来源（同一份驾驭小结）、共享 verify/apply 测试基建——单变更 5 任务一批推进，不拆多变更。任务间零依赖（各改各文件），Wave 内并行、收尾统一跑全量测试。

## 总体方案

### Phase R1：回执双形态解析（FR-01 / D-001@v1）

`parseEvidenceSlots`（verify-facts-schema.js）回执槽行循环重构为双形态：

1. **单行形态（存量）**：`RECEIPT_LINE_RE` 命中即收——正则与字段语义逐字节不变。
2. **多行 YAML 形态（新增）**：行首 `- claim:` 且单行正则不命中时，聚合后续缩进续行（`^[ \t]+[A-Za-z_][\w-]*:` 形态）直至遇到下一个列表项（`^- `）/ 非缩进行 / 空行 / 段落标题；按 `key: value` 收集字段（value trim、反引号剥同单行口径），**字段序无关**；`claim`（非空）/`command`（非空）/`exit`（纯数字）/`log`（非空）四字段齐才 push（fail-closed），`log` 值内若有 ｜/| 尾注取首段剥注（与单行口径一致）。
3. 混合槽段（部分单行部分多行）逐条独立判定互不干扰。

骨架侧 `backfillMissingEvidenceSlots`（verify-probes.js）与 `stages/verify.js:209` prompt 的槽行结构说明改为双形态示例（多行形态放前作推荐写法，单行保留标注「亦认」）。占位形态 `<待填：…>` 不含完整四字段 → 双形态都不命中（fail-closed 不变）。

### Phase R2：重复键检测（FR-02 / D-004@v1）

`validatePlanFeasibility`（plan-postcheck.js）每卡循环内、正则字段检查之前：对 `fm` 文本行扫描 `^([A-Za-z_][\w-]*):` 收集顶层键 → 行号列表；任一键出现 ≥2 次 → `errors.push`：`<taskId|file>: frontmatter 顶层键 <key> 重复出现 N 次（L<a>、L<b>…）——骨架已自动反填的键（如 depends_on）勿重复手填，保留正确一处删除其余`。行号相对 fm 文本（报错文案标注 frontmatter 内行号）。检测器提为可导出纯函数 `detectDuplicateTopKeys(fmText)` 供直测。块列表项（`- xxx`）与缩进子键天然不误报（不匹配行首 `^key:`）；`---` 分隔行已剥。

### Phase R3：docs 白名单（FR-03 / D-003@v2——条件加白 + declaredFace 审计口径）

`resolveApplyAllowSet`（worktree-apply.js）：

1. 先聚合原 allow 面：design §6（keepSillyspecDocs）∪ 各 task allowed_paths（按 repo 切片不变）。
2. **条件加白**（design-grill M5 修正）：仅当 main 仓声明面非空（`mainSet.size > 0`）才 `mainSet.add('.sillyspec/docs/')`——design §6 与任务卡全缺的存量变更维持原空清单 fail-open 语义（Gate1 跳过、patch 全量、step3.5 以 changedFiles 为靶），杜绝「docs-only 单条目面 → 非 docs 交付全 BLOCKED + patch 静默收窄」回归。
3. **declaredFace 快照**：加白前 `declaredFace = new Set(mainSet)`；Gate1 的 `hasAllowList` 判定与审计报备均以 declaredFace 为口径——审计报备 = 实际 changedFiles 中以 `.sillyspec/docs/` 开头且 ∉ declaredFace（design §6 ∪ allowed_paths 原面）的文件，避免 allowed_paths 已声明的 docs 文件被误报越权（M3 口径二义修正）。
4. pathMatches 目录前缀语义（`a.startsWith(b + '/')`）自动放行整目录——Gate1（`classifyAllowListViolations`）与 patch 圈定（`resolvePatchFiles`）同源消费同一 allowSet，无静默丢失。白名单条目保持尾斜杠写法 `'.sillyspec/docs/'`（step3.5 getBlobHashMap 对目录条目 inert，grill M10 实证）。跨仓切片 Map 不受影响（白名单只进 main 仓 Set——`.sillyspec/docs/` 是主仓 specRoot 概念）。

### Phase R4：快照 copy 面（FR-04 / D-002@v1）

- `src/config-schema.js` 登记键 `gate_snapshot.copy`（type array of string，optional，readers: createGateSnapshot）。
- `createGateSnapshot`（gate-snapshot.js）：环境目录链接段之后，读主仓 `.sillyspec/local.yaml`（复用读侧容错，jsYaml 或轻量行扫描——与 extractLintCommand 同风格轻量扫描）取 `gate_snapshot.copy` 数组；逐条：路径规整（反斜杠→正斜杠、拒 `..`/绝对路径），主仓存在 → `symlinkSync(src, dst, 'junction')`，junction 抛错回退递归 copy（目录）/ copyFileSync（文件），均失败 `⚠️` warn 不作废快照；主仓不存在 → warn 跳过；成功后 log 一行报备条目数。快照内已存在同名路径（会话文件 overlay 已覆盖）跳过声明不覆盖（overlay 优先=本变更最新态）。
- 未配置 `gate_snapshot.copy` → 全段空转，快照行为不变。

### Phase R5：锚点口径对齐（FR-05 / D-005@v1）

`probe7-anchor-check.js`：`ANCHOR_RE` 判定扩为 `ANCHOR_RE.test(evidence) || /\.test\./.test(evidence)`（file:line 维持原正则；`.test.` 文件名形态对齐 stage-contract 口径）。模块头注释口径句同步。`run/gates.js` advisory 文案「缺 file:line 锚点」→「缺 file:line 或 .test. 文件名锚点」，修复指引同步。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-facts-schema.js | R1：parseEvidenceSlots 双形态解析（单行正则保留 + 多行 YAML 聚合） |
| 修改 | src/verify-probes.js | R1：backfillMissingEvidenceSlots 回执骨架双形态示例（注释级文案） |
| 修改 | src/stages/verify.js | R1：verify prompt 槽行结构说明双形态 |
| 修改 | src/stages/plan-postcheck.js | R2：validatePlanFeasibility 重复键检测 + 导出 detectDuplicateTopKeys 纯函数 |
| 修改 | src/worktree-apply.js | R3：resolveApplyAllowSet docs 白名单 + applyWorktree 审计报备 |
| 修改 | test/worktree-allow-list-violations.test.mjs | R3 连带：main Set deepEqual 断言补 `.sillyspec/docs/`（plan-review 实证 :114/:152，有意语义变更的合法断言更新） |
| 修改 | test/cross-repo-apply.test.mjs | R3 连带：同款 deepEqual 断言更新（:94/:122） |
| 修改 | src/config-schema.js | R4：登记 gate_snapshot.copy 键（单一数据源，同步 renderExample 示例段） |
| 修改 | src/run/gate-snapshot.js | R4：createGateSnapshot copy 面 junction/copy 回退 |
| 修改 | src/probe7-anchor-check.js | R5：锚点口径扩 .test. + 头注释同步 |
| 修改 | src/run/gates.js | R5：probe7 advisory 文案同步 |
| 新增 | NEW:test/receipt-multiline-parse.test.mjs | FR-01 直测：多行/混合/缺字段 fail-closed/存量单行回归 |
| 新增 | NEW:test/taskcard-duplicate-key.test.mjs | FR-02 直测：depends_on 重复/无重复零误报/块列表不误报 |
| 新增 | NEW:test/apply-docs-allowlist.test.mjs | FR-03 直测：resolveApplyAllowSet 白名单 + 违规判定放行 |
| 新增 | NEW:test/gate-snapshot-copy.test.mjs | FR-04 直测：copy 面 junction/copy 回退/未配置零行为 |
| 新增 | NEW:test/probe7-anchor-testfile.test.mjs | FR-05 直测：.test. 锚不再 missingAnchors + file:line 维持 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.changelog.md | R1/R5 行为契约认领（回执双形态/probe7 锚点口径）sidecar 条目 |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.changelog.md | R2 行为契约认领（feasibility 重复键检测）sidecar 条目 |
| 修改 | .sillyspec/docs/sillyspec/modules/worktree.changelog.md | R3 行为契约认领（docs 条件白名单/declaredFace）sidecar 条目 |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.changelog.md | R4 copy 面认领 + R5 gates 文案 + R1 verify-probes 骨架文案 sidecar 条目（stages/verify.js 的 R1 文案归 stages 卡认领） |
| 修改 | .sillyspec/docs/sillyspec/modules/setup.changelog.md | R4 配置键认领（gate_snapshot.copy）sidecar 条目 |

## 接口定义

```js
// verify-facts-schema.js（内部扩展，导出签名不变）
parseEvidenceSlots(mdText) // runtimeEvidence 新增多行形态来源，返回结构不变
// 字段「非空」= trim 后非空；exit 须纯数字；首行行内剩余部分只作 claim 值（不再扫描行内 key:）

// plan-postcheck.js（新增导出）
/**
 * frontmatter 顶层键重复检测（纯函数，无 IO）。
 * @param {string} fmText frontmatter 文本（--- 之间的内容，CRLF 已归一由调用方或此处容错）
 * @returns {Array<{key: string, lines: number[]}>} 出现 ≥2 次的顶层键及其行号（1-based，相对 fmText）
 */
export function detectDuplicateTopKeys(fmText)

// gate-snapshot.js（内部扩展，导出签名不变）
createGateSnapshot({ cwd, files, sourceRoot, skipImportSmoke })
// → 快照内新增：gate_snapshot.copy 声明路径的 junction/copy 镜像
// ⚠️ junction 是活链接：快照内若再跑 gen 命令会写穿到主仓该目录——注释与配置说明明示该语义

// probe7-anchor-check.js（内部口径扩展，导出签名不变）
checkProbe7AnchorCoverage(reportText) // covered 行证据含 .test. 文件名即认锚
// 注：file:line 侧本判定宽于硬门（/:\d+\b/ vs stage-contract 文件名前缀形态），advisory 宽于硬门是设计容差
```

local.yaml 新键（R4）：

```yaml
gate_snapshot:
  copy:
    - src/generated          # 目录（递归 junction）
    - api-types.d.ts         # 单文件
```

## 生命周期契约表

不适用 lifecycle contract——本变更是门禁校验/解析逻辑与配置键扩展，不新增 session/lease/agent_run/daemon/claim/heartbeat 事件，无状态流转。

## 数据模型

无 schema 变更——进度库（SQLite）表结构与既有 JSON 产物 schema（verify-facts.json v2 等）零改动。local.yaml 新键 `gate_snapshot.copy` 是配置面扩展，config-schema.js 登记即数据源。

## 兼容策略（brownfield 必填）

- **R1**：单行 `RECEIPT_LINE_RE` 原样保留且优先匹配；多行聚合只在单行不命中且行首 `- claim:` 时触发。存量 verify-result.md（含已归档变更）解析结果逐字节不变。未填槽（占位符）双形态均不命中。
- **R2**：无重复键的卡片（全部存量）检测输出空 → 零新 error；错误仅对「实际存在重复键」的卡触发。归档变更不再过 plan 门，零回溯影响。
- **R3**：design §6 已声明 docs 路径的变更行为不变（白名单是并集增量）；越权 docs 文件从 BLOCKED 转为放行 + warnings 报备——这是有意的语义放宽（用户建议方向），审计面由报备行保住；**design §6 与任务卡全缺的空清单变更零行为变化**（条件加白，维持 fail-open，D-003@v2）。跨仓 Map 切片不变。
- **R4**：未配置 `gate_snapshot.copy`（全部存量 local.yaml）→ 全段空转，快照行为逐字节不变；junction 失败回退 copy，copy 失败 warn 不作废快照（与既有 fail-open 快照基建策略一致）。
- **R5**：file:line 锚原判定不变；只减少 advisory 误报（advisory 本就不阻断，无门禁语义变化）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | R3 白名单放宽后 `.sillyspec/docs/` 下越权改动失去 Gate1 拦截面 | P2 | apply warnings 报备实际落地 docs 文件（不在 design §6 声明者明示）；docs-check 行号校验独立兜内容质量；如需收紧后续可按报备行追认进 design |
| R-02 | R1 多行聚合误吃缩进正文（回执槽内非条目缩进行） | P2 | 聚合遇非 `key:` 缩进行即止；四字段不齐不命中（fail-closed 宁漏不误收）；占位 `<待填：*>` 不含四字段不命中 |
| R-03 | R4 junction 在跨盘（系统盘→数据盘）场景失败 | P2 | junction 失败逐条回退递归 copy；copy 失败 warn 跳过不作废快照（SNAPSHOT_OFF 逃生仍在） |
| R-04 | R2 行首 `key:` 扫描把 frontmatter 内多行标量（goal: > 折叠块）的续行误判 | P3 | 折叠块续行有缩进不匹配 `^key:`；顶格续行属罕见畸形，宁报错不漏报（fail-closed） |
| R-05 | 5 文件并行修改撞多会话冲突面（worktree-apply/gates 高频改动） | P2 | Edit 前重读最新态（AGENTS 规则 16）；每文件改动收敛在单函数/单段，减少 diff 面 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 / Phase R1 / 文件清单 verify-facts-schema+verify-probes+stages/verify | 已覆盖 |
| D-002@v1 | FR-04 / Phase R4 / 文件清单 config-schema+gate-snapshot | 已覆盖 |
| D-003@v1 | FR-03 / Phase R3 / 文件清单 worktree-apply | 已被 D-003@v2 取代（无条件加白 → 条件加白 + declaredFace 口径，design-grill M5/M3） |
| D-003@v2 | FR-03 / Phase R3 / 文件清单 worktree-apply | 已覆盖 |
| D-004@v1 | FR-02 / Phase R2 / 文件清单 plan-postcheck | 已覆盖 |
| D-005@v1 | FR-05 / Phase R5 / 文件清单 probe7-anchor-check+run/gates | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-005 全部 @v1，决策追踪表闭环）
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语（已写「不适用 lifecycle contract」）
- [x] UI 原型分级核对（纯后端 CLI 门禁逻辑+配置键，无界面变化——brainstorm Step 5 已声明跳过）
- [x] 不确定的问题标注「⚠️ 自审存疑」——R-04 折叠块边界已入风险登记，无存疑项
