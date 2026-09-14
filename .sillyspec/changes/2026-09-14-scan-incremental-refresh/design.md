---
author: qinyi
created_at: 2026-09-14 11:22:34
scale: large
---

# 设计文档（Design）— 2026-09-14-scan-incremental-refresh

## 背景

scan 产物（`docs/<project>/scan/` 7 份文档）是架构快照，基线锚在 frontmatter `source_commit`。源码持续演进后文档冻结，漂移**信号侧**四路已通：`scan-staleness`（brainstorm prompt 注入落后提示）、`sillyspec scan diff`（A/D/M/R 四分类 + staleRefs 引用过时清单）、archive-delta「scan 刷新建议」、续扫检测 last-delta 回灌提示。但刷新**执行侧无闭环**：D-7 设计稿（docs/sillyspec/design-d7-scan-lifecycle.md）落地记录明确刷新形态为「agent 按清单定点补」，而 agent 补完后没有任何机制推进 `source_commit`——漂移信号永久重报旧账（补过的和没补过的分不清）、staleness 警告不消、下轮 diff 从旧基线重算。唯一官方刷新路径是全量 `run scan --standard --force-rescan`，token 成本与增量收益不成比例。

知识库决策条目 `decisions/core-engine.md` D-001@v1（ir-stage-p3d）曾裁决「增量 scan 引擎不做（scan facts 全量幂等，**增量属 scan 域**）」——那是 delta/archive 域的范围切割，本变更即其指认的 scan 域立项承接（复潮条件满足，已在 D-001@v1 落盘）。

## 设计目标

1. 打通增量刷新闭环：`scan diff`（检出）→ `scan refresh`（定点修订工单）→ agent 手术编辑 → `scan refresh --done`（per-doc 基线推进 + postcheck + 审计）——下轮 diff 从新基线起算，账清零。
2. 保守正确优先：脏工作区 fail-closed、三硬门拒绝、软门告警可 `--force`；宁可拒增量劝全量，不把未验证状态盖章成已验证。
3. 零侵入主流程：scan 11 步注册表、quick/standard/deep 三档、staleness advisory、worktree-guard 契约均不动。

## 非目标

- **不碰模块卡 / `_module-map.yaml` 结构 / knowledge**（D-001@v1：模块卡归 archive sync-module-docs、map 结构归 `modules rebuild --force` merge 语义、knowledge 是人工追加域——refresh 越界会变成第三个写入方，重开 D-7 方案 C 双轨问题）。
- **不做自动/定期刷新**（D-7 方案 D 已排除：与多 agent 并发冲突、与覆盖保护冲突、SillySpec 是流程控制器非守护进程）。
- **不撤不改 scan-staleness advisory**（其判定语义 2026-08-16 已裁决：落后数≠文档错误；refresh 是补充不是替代）。
- **不做语义级过期检测**——无 file:line 引用的事实性论断检不出是检出极限，如实声明（D-006@v1），不试图解决。
- 不动 `scan facts`（全量幂等已裁决，refresh 顺带重跑它即可）。

## 拆分判断

单功能域（刷新闭环），三个 Wave 按依赖排布（计算层→IO/接线→文档验收），不拆分不走批量。涉及 6 个既有模块（core-engine / docs-consistency / runtime / stages 契约对齐不改 / cli-entry / hooks 契约对齐不改），属 large。

## 总体方案

**两拍交互模型**（D-002@v1，仿 scan diff 旁路形态，不动 scan 主流程）：

```
sillyspec scan refresh            # 第①拍（纯只读）
  ├─ 门控前置：dirtyCheck（git status --porcelain 限 module-map scope）
  │    in-scope 脏 → 拒绝（kind=dirty-worktree，建议提交后重试或全量 scan）
  ├─ 硬门：任一 scan 文档无 source_commit / 基线非 HEAD 祖先 / 受影响文档含 scan_depth: quick
  │    → 拒绝（--force 不可越，各附建议命令）
  ├─ 软门：漂移合计 > 100 文件 或 behindCommits > 200 → 告警建议全量（--force 可继续）
  ├─ 受影响文档集：per-doc 基线分组 diff（见下）的变更集 × 各文档 file:line 引用命中
  │    （staleRefs 语义复用 scan-diff，含 rename 旧路径与 src/ 前缀归一）
  ├─ 顺带重跑 scan facts（全量幂等，_facts.md 刷新）
  └─ 渲染手术工单：每受影响文档一节——过时引用清单（A/D/M/R 标注）+ 相关 hunks
     （每文档上限 200 行截断，超限提示 agent 自行 git diff）+ 基线后 commit messages
     （--oneline 上限 30 条）+ 编辑纪律（只动受影响小节、保留未命中内容、新引用须真实可核验）

agent 按工单定点编辑文档正文（手术编辑，非整份重写）

sillyspec scan refresh --done    # 第②拍（写面：盖章+校验+审计）
  ├─ bumpScanDocBaselines：只推进本次核对过的文档（--docs 显式点名，缺省=工单全部受影响文档）
  │    source_commit→HEAD / updated_at→now / generator→sillyspec-scan-refresh（其余键不动）
  ├─ runScanPostCheck 复跑（引用核验/路径污染/API 错误信号同款机器校验）
  └─ 审计落 .runtime/scan-refresh-<ts>.json（head、bumped/skipped、gate 结果、工单摘要）
```

**per-doc 基线分组 diff**（D-003@v1 核心机制）：scan 文档按各自 `source_commit` 分组去重（初始同批同值 → 通常 1 组），每组跑一次 `git diff --name-status --find-renames <base>..HEAD`，变更集按组归属到各文档。等价于每文档从**自己的**基线算漂移窗——已在早前 refresh 推进过的文档不会被旧窗口的已处理变更重复命中（比全仓最旧基线一刀切更准，git 调用数 = 去重基线数 ≤ 文档数）。`source_commit == HEAD` 的文档直接标 fresh 跳过。

**scan diff 基线聚合兼容**：`computeScanDiff` 的 `readSourceCommit` 从「首个命中」改为「各文档 source_commit 中提交时间最旧者」（git log 解析提交时间，fail-soft 回退首个命中）——多文档异基线后，报告口径保守化（从最旧起算不漏检），`scan diff` 自身语义不变。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/scan-refresh.js | 计算层 computeRefreshPlan（门控+分组 diff+受影响集+工单材料）+ IO 面 runRefresh/finalizeRefresh，分层仿 scan-diff.js |
| 修改 | src/scan-diff.js | readSourceCommit 聚合语义改「最旧提交时间」（D-003@v1）；导出 parseNameStatus 供 scan-refresh 复用 |
| 修改 | src/scan-postcheck.js | 新增导出 bumpScanDocBaselines（per-doc 基线推进，独立函数不动 stampScanDocHeaders 的「只补缺」契约） |
| 修改 | src/index.js | `scan refresh` / `scan refresh --done` 子命令接线（仿 scan diff 转发，specBase/projectName 同口径）+ help 文案含检出极限声明 |
| 新增 | test/scan-refresh.test.mjs | 纯函数单测（门控三硬一软/dirty fail-closed/分组 diff 归属/bump 幂等/最旧聚合）+ e2e（临时 git 仓全链路） |
| 修改 | test/scan-diff.test.mjs | readSourceCommit 最旧聚合的回归用例（存量断言按新语义改写——语义变更非测试误判，属 D-003@v1 契约面） |
| 修改 | docs/sillyspec/platform-interface-map.md | scan refresh CLI 面锚点登记 |
| 修改 | docs/sillyspec/file-lifecycle.md | scan 文档「刷新」生命周期行（source_commit 推进路径） |

无对外字段/DTO/事件 payload/配置键新增——CLI 子命令为唯一新面，producer=scan-refresh.js 计算 → consumer=index.js 渲染出口，无跨跳透传。

## 接口定义

```js
// src/scan-refresh.js
/**
 * 计算层：增量刷新计划（纯读 git + fs，无渲染无落盘）。
 * @param {{ projectRoot, specBase, projectName, force? }} opts
 * @returns {{ ok: true, head, baseGroups, affectedDocs: [{
 *    file, base, staleRefs: [{ ref, change, file }], hunks: string, commits: string
 *  }], freshDocs: string[], skippedDocs: [{ file, reason }], warnings: string[] }
 *  | { ok: false, kind: 'no-baseline'|'non-ancestor'|'quick-depth'|'dirty-worktree'|'git-error'|'missing-args', error, hint } }
 */
export function computeRefreshPlan(opts)

/** IO 面：渲染手术工单，返回退出码（0=有工单或零漂移 / 2=门控拒绝或错误） */
export function runRefresh(opts)  // opts 同上 + json?

/** 第②拍：盖章 + postcheck + 审计落盘 */
export function finalizeRefresh({ projectRoot, specBase, projectName, docs })
// → { bumped: string[], skipped: [{file, reason}], postCheck, auditPath }

// src/scan-postcheck.js 新增导出
/**
 * per-doc 基线推进（独立于 stampScanDocHeaders 的只补缺契约）：
 * 只改点名文档的 source_commit/updated_at/generator，其余键与其余文档不动。
 * @returns {{ bumped: string[], skipped: [{ file, reason }] }}
 */
export function bumpScanDocBaselines({ cwd, specDir, project, docs, headShort, generator = 'sillyspec-scan-refresh' })

// src/scan-diff.js 语义变更（签名不变）
readSourceCommit(specBase, projectName)  // 聚合=各文档 source_commit 取提交时间最旧；解析失败 fail-soft 回退首个命中
export function parseNameStatus(out)     // 由内部函数改导出（scan-refresh 复用，零拷贝）
```

退出码契约：`scan refresh` 0=工单就绪/零漂移；2=拒绝（含 reason+建议命令）。`--done` 0=盖章成功；1=postCheck failed（文档留待修复重跑）；2=参数/git 错误。

## 生命周期契约表

不涉及生命周期契约（refresh 是无状态两拍 CLI 旁路，不触 stage 状态机/会话/租约；scan 文档的 source_commit 推进是文档元数据非实体状态机）。

## 数据模型

无 schema/表结构变更。新增运行时产物 `.runtime/scan-refresh-<ts>.json`（审计快照：head/bumped/skipped/gate/workOrder 摘要，只写不读——供事后取证，对齐 verify-runs 产物惯例）。

## 兼容策略（brownfield 必填）

- 未跑 `scan refresh` 时一切不变：scan diff/staleness/主流程 scan 行为零改动（readSourceCommit 聚合变化仅在多文档异基线时产生不同报告口径——存量同批同值场景输出与旧版一致）。
- 回退路径：refresh 是旁路命令，不迁移不落配置；`--done` 盖章的 generator=scan-refresh 标记可供事后辨识，文档内容回退=git revert。
- 不改变的 API/表结构：DB schema、platform sync 契约、worktree-guard 比对逻辑（guard 消费 doc source_commit vs 会话 commit，异基线本就触发其保护语义——per-doc bump 不改该契约，D-003@v1 已论证）。
- 多 agent 并发：refresh 只读拍零风险；`--done` 写面限 7 文档 + 盖章，与 worktree-guard/他者会话无共享写面（modules/knowledge 不碰）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 检出极限误导——无引用论断过期检不出，用户误信「刷新过=最新」 | P1 | D-006@v1：文案只称「核对至 HEAD 的检出项已处理」；help/工单/审计三处显式检出极限声明；不撤 staleness advisory |
| R-02 | 脏工作区漏检——base..HEAD 不含未提交改动，盖章后未提交变更逃出漂移窗 | P0 | D-004@v1：dirtyCheck fail-closed（in-scope 脏即拒绝）；不做自动 stash/commit |
| R-03 | per-doc bump 后 worktree-guard/存量断言行为漂移 | P1 | D-003@v1 已论证 guard 契约不变；scan-diff.test.mjs 存量断言按新聚合语义改写并在 plan 中列为显式任务 |
| R-04 | 工单体积失控——大 diff 全量注入撑爆上下文 | P2 | hunks 每文档截断 200 行、commits 截断 30 条，超限降级为「提示 agent 自行 git diff」 |
| R-05 | 他者会话并发跑 refresh 双写盖章 | P2 | `--done` 只 bump 点名文档且幂等（重跑同值无害）；审计文件带时间戳不互踩 |
| R-06 | 非 git 仓/裸平台模式（specDir 外置）下行为未定义 | P2 | 门控 fail-soft 降级拒绝（kind=git-error，提示全量 scan），不抛裸异常 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-1；非目标节；总体方案（写面限界） | 已覆盖 |
| D-002@v1 | FR-2/FR-3；总体方案两拍模型；文件清单（scan-refresh.js/index.js） | 已覆盖 |
| D-003@v1 | FR-4；总体方案 per-doc 分组 diff；接口定义 bumpScanDocBaselines；R-03 | 已覆盖 |
| D-004@v1 | FR-5；总体方案 dirtyCheck；R-02 | 已覆盖 |
| D-005@v1 | FR-5；总体方案硬门/软门；退出码契约 | 已覆盖 |
| D-006@v1 | FR-6；非目标节（不撤 advisory）；R-01 | 已覆盖 |

未解决项：软门阈值 100/200 为工程默认值（D-005@v1 记录），Design Grill 复核。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@v1（D-001~D-006 全部入决策追踪）
- [x] 生命周期关键词核查——设计含「推进/刷新」但无 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 实体语义，已写紧邻豁免短语
- [x] UI 原型分级——纯 CLI 变更无界面变化，跳过（已在分段展示步骤声明，用户确认）
- [x] ⚠️ 自审存疑：软门阈值（100 文件/200 commit）为工程默认值，标注待 Design Grill 复核；`test/scan-diff.test.mjs` 存量断言改写的边界（语义变更 vs 测试妥协）已在 R-03 登记，plan 阶段列显式任务核对
