---
author: qinyi
created_at: 2026-09-14 11:22:34
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-14-scan-incremental-refresh

## 背景

scan 产物（`docs/<project>/scan/` 7 份文档）是架构快照，基线锚在 frontmatter `source_commit`。源码持续演进后文档冻结，漂移**信号侧**四路已通：`scan-staleness`（brainstorm prompt 注入落后提示）、`sillyspec scan diff`（A/D/M/R 四分类 + staleRefs 引用过时清单）、archive-delta「scan 刷新建议」、续扫检测 last-delta 回灌提示。但刷新**执行侧无闭环**：D-7 设计稿（docs/sillyspec/design-d7-scan-lifecycle.md）落地记录明确刷新形态为「agent 按清单定点补」，而 agent 补完后没有任何机制推进 `source_commit`——漂移信号永久重报旧账（补过的和没补过的分不清）、staleness 警告不消、下轮 diff 从旧基线重算。唯一官方刷新路径是全量 `run scan --standard --force-rescan`，token 成本与增量收益不成比例。

知识库决策条目 `decisions/core-engine.md` D-001@v1（ir-stage-p3d）曾裁决「增量 scan 引擎不做（scan facts 全量幂等，**增量属 scan 域**）」——那是 delta/archive 域的范围切割，本变更即其指认的 scan 域立项承接（复潮条件满足，已在 D-001@v1 落盘）。

## 设计目标

1. 打通增量刷新闭环：`scan diff`（检出）→ `scan refresh`（定点修订工单）→ agent 手术编辑 → `scan refresh --done`（per-doc 基线推进 + postcheck + 审计）——下轮 diff 从新基线起算，账清零。
2. 保守正确优先：脏工作区 fail-closed、三硬门拒绝、软门告警可 `--force`；宁可拒增量劝全量，不把未验证状态盖章成已验证。
3. 最小侵入：scan 11 步注册表、quick/standard/deep 三档、staleness advisory 语义不动；worktree-guard 仅**加法扩展**（识别 refresh 会话态的新可选字段，存量 guard 行为逐字节不变）+ 顺带修 7/40 位哈希错配存量 bug（D-007@v1）。

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
sillyspec scan refresh            # 第①拍（只读 git/fs；写面=guard 握手文件 + _facts.md 重跑产物）
  ├─ 门控前置：dirtyCheck（git status --porcelain；scope 非空限 module-map scope，
  │    scope 空回退全仓源码面——排除 .sillyspec/**/node_modules/dist/build/.git，D-008@v1）
  │    in-scope 脏 → 拒绝（kind=dirty-worktree，建议提交后重试或全量 scan）
  ├─ 硬门：任一 scan 文档无 source_commit / 基线非 HEAD 祖先 / 受影响文档含 scan_depth: quick
  │    → 拒绝（--force 不可越，各附建议命令）
  ├─ 软门：scope 过滤后漂移合计 > 100 文件 或 behindCommits > 200 → 告警建议全量（--force 可继续）
  ├─ 受影响文档集：per-doc 基线分组 diff 的**全量变更集**（不经 scope 过滤——staleRefs 同语义：
  │    引用自带范围，D-008@v1）× 各文档 file:line 引用命中（含 rename 旧路径与 src/ 前缀归一）
  ├─ guard 握手（D-007@v1）：原子写 scan-guard.json 为刷新会话态
  │    { mode: 'scan-refresh', refreshDocs: [...白名单], sourceCommit: <7 位短 HEAD>, startedAt }
  │    —— hook 前置分支放行白名单内文档的手术编辑，白名单外 scan 文档保护不放松
  ├─ 顺带重跑 scan facts（全量幂等，_facts.md 刷新）
  └─ 渲染手术工单：每受影响文档一节——过时引用清单（A/D/M/R 标注）+ 相关 hunks
     （每文档上限 200 行截断，超限提示 agent 自行 git diff）+ 基线后 commit messages
     （--oneline 上限 30 条）+ 编辑纪律（只动受影响小节、保留未命中内容、新引用须真实可核验）

agent 按工单定点编辑文档正文（手术编辑，非整份重写；白名单内文档经 hook 放行）

sillyspec scan refresh --done    # 第②拍（写面：盖章+校验+审计）
  ├─ 内容比对门（D-009@v1）：逐文档比对 ①拍 guard 记录的 sha256——内容未变者默认不 bump，
  │    打印「未编辑即盖章」提示（显式 --docs 点名或 --force 才推进；工单零改动文档不吃新基线）
  ├─ bumpScanDocBaselines：只推进本次核对过的文档（--docs 显式点名，缺省=工单全部受影响文档
  │    且内容有变者）source_commit→HEAD / updated_at→now / generator→sillyspec-scan-refresh
  ├─ runScanPostCheck 复跑（specDir = platformOpts?.specRoot || null 转换后传入，
  │    对齐 executeScanFinalize 口径——本地模式不误走平台严格分支）
  └─ 审计落 .runtime/scan-refresh-<ts>.json（平台模式经 resolveRuntimeRoot 定根；head、
       bumped/skipped、gate 结果、工单摘要；guard 不清理——沿用「下次 run scan 重写」现状生命周期）
```

**per-doc 基线分组 diff**（D-003@v1 核心机制）：scan 文档按各自 `source_commit` 分组去重（初始同批同值 → 通常 1 组），每组跑一次 `git diff --name-status --find-renames <base>..HEAD`，变更集按组归属到各文档。等价于每文档从**自己的**基线算漂移窗——已在早前 refresh 推进过的文档不会被旧窗口的已处理变更重复命中（比全仓最旧基线一刀切更准，git 调用数 = 去重基线数 ≤ 文档数）。`source_commit == HEAD` 的文档直接标 fresh 跳过。

**scan diff / scan staleness 基线聚合兼容**（D-003@v2 + D-009@v1）：`computeScanDiff` 的 `readSourceCommit` 与 `computeScanStaleness` 的「任一文档代表整批」**统一改为**「全文档收集 source_commit → 对去重基线逐个 `rev-list --count` 取**落后最多**者」（拓扑序，免疫 rebase/amend 日期倒挂，且落后最多=漂移窗最大=保守目标本体；fail-soft 回退首个命中）——多文档异基线后：diff 报告口径保守化（不漏检），staleness advisory 按最坏情况计，避免 readdirSync 顺序决定读到新/旧基线的随机失真。两者自身语义（只读/advisory）不变。

**guard 握手与 7/40 位错配修复**（D-007@v1）：现状 `stage.js:291` 写 guard 用 40 位全哈希而 frontmatter 盖章 7 位短哈希，`worktree-guard.js:211` 精确比对恒不等——guard 存在时对已有 scan 文档写入恒拦（含 refresh 编辑拍）。修复两件：①比对前双方归一 7 位（`String(x).slice(0,7)`），恢复「同基线放行/异基线拦截」设计本意，带回归测试；②hook 前置分支识别 `mode==='scan-refresh'` 的 guard：目标文档 ∈ `refreshDocs` 白名单（specRoot 相对 POSIX 路径）→ 放行；白名单外 scan 文档继续原保护。存量 guard（无 mode 字段）行为逐字节不变。staleRefs 命中逻辑（fullChanged/hitChange/src 前缀归一/rename 旧路径）从 computeScanDiff 内联段抽为 scan-diff.js 导出函数，refresh 复用零拷贝（防双源漂移，Grill P1-3）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/scan-refresh.js | 计算层 computeRefreshPlan（门控+分组 diff+受影响集+工单材料+guard 握手写入）+ IO 面 runRefresh/finalizeRefresh，分层仿 scan-diff.js |
| 修改 | src/scan-diff.js | readSourceCommit 聚合改「最旧提交时间」（D-003@v2）；staleRefs 命中段抽为导出函数（refresh 复用防双源漂移）；parseNameStatus 转导出 |
| 修改 | src/scan-postcheck.js | 新增导出 bumpScanDocBaselines（per-doc 基线推进，独立函数不动 stampScanDocHeaders 的「只补缺」契约） |
| 修改 | src/scan-staleness.js | computeScanStaleness 基线收集改「全部文档→最旧」（D-003@v2，堵 readdirSync 顺序随机失真） |
| 修改 | src/hooks/worktree-guard.js | ①check-1 比对归一 7 位（修 7/40 恒拦存量 bug）②guard.mode==='scan-refresh' 前置分支放行 refreshDocs 白名单（D-007@v1，加法扩展存量行为不变） |
| 修改 | src/index.js | `scan refresh` / `scan refresh --done` 子命令接线（仿 scan diff 转发，specBase/projectName 同口径）+ help 文案含检出极限声明 |
| 新增 | NEW:test/scan-refresh.test.mjs | 纯函数单测（门控三硬一软/dirty fail-closed 含 scope 空回退/分组 diff 归属/bump 幂等/最旧聚合/guard 握手白名单与 7-40 位归一比对）+ e2e（临时 git 仓全链路） |
| 修改 | test/scan-diff.test.mjs | **新增**多文档异基线最旧聚合回归用例（存量单文档断言预期不变——Grill 核验 a 确认存量 fixture 全单文档；若 execute 实测有断言失效，按 R-03 流程核对属语义变更再改） |
| 修改 | test/scan-staleness.test.mjs | 新增多文档异基线聚合用例（存量单文档断言不变） |
| 修改 | test/worktree-guard.test.mjs | 新增归一化比对（同基线放行/异基线拦截/7-40 混合）+ scan-refresh 白名单分支用例（存量用例不删不改） |
| 修改 | docs/sillyspec/platform-interface-map.md | scan refresh CLI 面锚点登记 + worktree-guard 行为变化锚点 |
| 修改 | docs/sillyspec/file-lifecycle.md | scan 文档「刷新」生命周期行（source_commit 推进路径） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 新文件 src/scan-refresh.js 登记 core-engine paths（lint module-map 覆盖检查驱动，task-06 执行期补录） |

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

// src/scan-diff.js 变更（签名不变/新增导出）
readSourceCommit(specBase, projectName)  // 聚合=全文档 source_commit 取提交时间最旧；解析失败 fail-soft 回退首个命中
export function parseNameStatus(out)     // 由内部函数改导出（scan-refresh 复用，零拷贝）
export function collectStaleRefs(scanDir, fullChangedMap)
// staleRefs 命中段从 computeScanDiff 内联抽出：输入 scan 目录 + POSIX路径→A/D/M/R 变更映射
// （含 rename 旧路径入集），输出 [{ doc, ref, change, file }]——computeScanDiff 与 scan-refresh 共用

// src/scan-staleness.js 变更（签名不变）
computeScanStaleness(opts)  // 基线收集：任一文档 break 首个命中 → 全文档收集取最旧（落后最多者）；
                            // 异基线场景按最坏情况报，堵 readdirSync 顺序随机失真（D-003@v2）

// src/hooks/worktree-guard.js 变更（shouldBlockScanDocOverwrite 内）
// ①guard 读取后前置分支（D-007@v1）：
if (guard.mode === 'scan-refresh' && Array.isArray(guard.refreshDocs)) {
  const rel = toPosixPath(path.relative(scanDocInfo.specRoot, filePath))
  if (guard.refreshDocs.includes(rel)) return { blocked: false }  // 白名单内=本次刷新面，放行
  // 白名单外 scan 文档继续走原保护，不放松
}
// ②check-1 归一化比对（修 7/40 恒拦存量 bug）：
if (frontmatter.source_commit && guard.sourceCommit
    && String(frontmatter.source_commit).slice(0, 7) !== String(guard.sourceCommit).slice(0, 7)) { /* block */ }

// guard 握手文件（refresh ①拍原子写，schema=stage.js scanGuard 加两个字段）
{ name_zh: '增量刷新守卫', mode: 'scan-refresh',
  refreshDocs: ['docs/<project>/scan/<doc>.md'],    // specRoot 相对 POSIX 路径（hook 白名单用，字符串数组保持愚钝匹配）
  docHashes: { 'docs/<project>/scan/<doc>.md': '<①拍时内容 sha256>' },  // --done 内容比对门用（D-009@v1）
  sourceCommit: '<7 位短 HEAD>',                    // 与 frontmatter 盖章同格式
  startedAt: '<ISO>', forceRescan: false }
```

退出码契约：`scan refresh` 0=工单就绪/零漂移；2=拒绝（含 reason+建议命令）。`--done` 0=盖章成功；1=postCheck failed（文档留待修复重跑）；2=参数/git 错误。

## 生命周期契约表

不涉及生命周期契约（refresh 是无状态两拍 CLI 旁路，不触 stage 状态机/会话/租约；scan 文档的 source_commit 推进是文档元数据非实体状态机）。

## 数据模型

无 schema/表结构变更。新增运行时产物 `.runtime/scan-refresh-<ts>.json`（审计快照：head/bumped/skipped/gate/workOrder 摘要，只写不读——供事后取证，对齐 verify-runs 产物惯例）。

## 兼容策略（brownfield 必填）

- 未跑 `scan refresh` 时一切不变：scan diff/staleness/主流程 scan 行为零改动（readSourceCommit/computeScanStaleness 聚合变化仅在多文档异基线时产生不同报告口径——存量同批同值场景输出与旧版一致，Grill 核验 a 已确认存量 fixture 全单文档）。
- worktree-guard 加法兼容：存量 guard（无 mode 字段）走原路径逐字节不变；归一化比对仅把「恒拦」恢复为设计本意「同基线放行/异基线拦截」——拦截面收窄属 bug 修复，回归测试覆盖 7-40 位混合形态。
- 回退路径：refresh 是旁路命令，不迁移不落配置；`--done` 盖章的 generator=scan-refresh 标记可供事后辨识，文档内容回退=git revert；hook 分支只认显式 mode 字段，删 guard 文件即回到无保护态（与现状同）。
- 不改变的 API/表结构：DB schema、platform sync 契约。guard 文件 schema 加法扩展（mode/refreshDocs 可选字段，stage.js 写入方不写这两键——run scan 会话 guard 无 mode → hook 原路径）。
- 多 agent 并发：refresh 只读拍除 guard 握手文件外零写面；`--done` 写面限 7 文档 + 盖章，与 worktree-guard/他者会话无共享写面（modules/knowledge 不碰）；他者并发 run scan 会重写 guard（互斥语义：后写者接管会话态，refresh 工单作废重跑——可接受，工单本就应基于最新 HEAD）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 检出极限误导——无引用论断过期检不出，用户误信「刷新过=最新」 | P1 | D-006@v1：文案只称「核对至 HEAD 的检出项已处理」；help/工单/审计三处显式检出极限声明；不撤 staleness advisory |
| R-02 | 脏工作区漏检——base..HEAD 不含未提交改动，盖章后未提交变更逃出漂移窗 | P0 | D-004@v1+D-008@v1：dirtyCheck fail-closed（scope 空回退全仓源码面，不静默跳过）；不做自动 stash/commit |
| R-03 | per-doc bump 后消费方行为漂移（scan-diff / scan-staleness / worktree-guard 三处） | P1 | D-003@v2：前两者统一「最旧聚合」+回归用例；guard 走 D-007@v1 握手+归一化修复；存量单文档断言预期不变（Grill 核验 a），execute 实测有失效再按「语义变更核对」流程处置 |
| R-04 | 工单体积失控——大 diff 全量注入撑爆上下文 | P2 | hunks 每文档截断 200 行、commits 截断 30 条，超限降级为「提示 agent 自行 git diff」 |
| R-05 | 他者会话并发跑 refresh 双写盖章 | P2 | `--done` 只 bump 点名文档且幂等（重跑同值无害）；审计文件带时间戳不互踩；guard 后写者接管（见兼容策略） |
| R-06 | 非 git 仓/裸平台模式（specDir 外置）下行为未定义 | P2 | 门控 fail-soft 降级拒绝（kind=git-error，提示全量 scan），不抛裸异常 |
| R-07 | guard 握手被滥用——伪造 mode='scan-refresh' guard 绕过覆盖保护 | P1 | 白名单最小面（只含工单受影响文档）+ sourceCommit/startedAt 留审计痕迹；hook 分支只放行白名单内文档，白名单外原保护不变；guard 文件位于 .runtime/（他者会话可覆写=与 scan 会话 guard 同信任级，不新增信任面） |
| R-08 | 7/40 位归一化比对修复改变存量拦截预期（有用户依赖恒拦行为） | P2 | 该行为是 bug 非 contract（stage.js 与盖章格式同仓且从未对齐）；变更说明写入 interface-map 锚点 + 回归测试固化新语义（同基线放行/异基线拦截） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-1；非目标节；总体方案（写面限界） | 已覆盖 |
| D-002@v1 | FR-2/FR-3；总体方案两拍模型；文件清单（scan-refresh.js/index.js） | 已覆盖 |
| D-003@v2 | FR-4/FR-7；总体方案基线聚合兼容节；接口定义；R-03（supersede v1：补 scan-staleness 第三消费方+修正 guard 论证） | 已覆盖 |
| D-004@v1 | FR-5；总体方案 dirtyCheck；R-02 | 已覆盖 |
| D-005@v1 | FR-5；总体方案硬门/软门；退出码契约 | 已覆盖 |
| D-006@v1 | FR-6；非目标节（不撤 advisory）；R-01 | 已覆盖 |
| D-007@v1 | FR-3/FR-7；总体方案 guard 握手节；接口定义 hook 变更；R-07/R-08 | 已覆盖 |
| D-008@v1 | FR-5；总体方案门控/受影响集/软门口径；R-02 | 已覆盖 |
| D-009@v1 | FR-3/FR-4/FR-5；总体方案 --done 内容比对门/聚合键改落后最多/finalize specDir 口径 | 已覆盖 |

未解决项：软门阈值 100/200 为工程默认值（D-005@v1 记录，Grill 核验 f 确认有 50/14 惯例依据）——维持默认，execute 后可按实测量调整。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@v1（D-001~D-002、D-004~D-008 + D-003@v2，含 supersede 链）
- [x] 生命周期关键词核查——无 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 实体语义，已写紧邻豁免短语
- [x] UI 原型分级——纯 CLI 变更无界面变化，跳过（分段展示步骤已声明）
- [x] Grill 修复轮（2026-09-14 独立审查 4 项 blocker 全部处置）：①FR 悬空 → requirements.md/proposal.md 本轮补齐（FR-1~FR-8）；②guard 拦截链路 → D-007@v1 握手+7/40 修复；③staleness 第三消费方 → D-003@v2 最旧聚合；④scope 三口径 → D-008@v1 显式化
- [x] ⚠️ 自审存疑（残留）：7/40 归一化修复的存量影响面（R-08）依赖「恒拦属 bug 非契约」判断——已在 interface-map 锚点留变更说明；软门阈值维持工程默认值待实测量
