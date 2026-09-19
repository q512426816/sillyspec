---
author: qinyi
created_at: 2026-09-19 14:15:00
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-19-review-material-pack

## 背景

2026-09-19 成本复盘（five-cuts 变更 9.1M 子代理 token / ~200x 信息放大）的结构诊断：贵在**每次独立评审从零重建仓库认知**，不在评审次数。最尖锐的实证：复审增量机制 2026-09-16 就已进引擎——`stage-review.js:513` `renderPriorRoundFindingsMd` 注入 `{PRIOR_REVIEW_FACTS}`，明文「本次为复审，以增量为主，不重演全量审查」——但 QA 二轮仍烧 1,352,626 token 全量重读。根因是同一份 prompt 里有更高优先级的反指令：Grill 输入材料段写死「**必须读取完整 design.md**」（`src/stages/brainstorm.js:417`）与「**素材宁可多读，不要只读摘要**」（:424）；94 分钟事故后加的时间盒只限发散、没缩短必读清单。**子代理服从必读清单，不服从回灌块。**

修必读清单，不修轮次（少审这条路不通——两轮 QA 拦下的错层与假设反转的价值大于全部评审成本）。

## 设计目标

1. 四阶段评审 prompt 的输入材料契约从「必读清单」改为「材料包注入」——CLI 抽取（热区/diff/差量）＋主代理点名（交叉点），模板只留注入位（execute.js:979-1023 热区先例的泛化）。
2. `{PRIOR_REVIEW_FACTS}` 从「建议」升为再审的**唯一材料**（findings＋对应修复 diff）。
3. 可证伪验收（D-003）：①清单每条可仅凭包回答；②复审/评审 prompt 无「必须读取完整／素材宁可多读」字样（机械 grep 钉）。
4. 包是必答基准面非禁读清单（D-004）：包外可定向查证但须列明、禁全量扫读；评审者首项自检「包不足→cannot_verify＋列缺件」。

## 非目标

- 不改评审轮次与 S2/S3 菜单（ceremony 定价不动）。
- 不改填卡步骤（plan.js:500 batch 子代理另立变更——同病不同单据）。
- 不动事实面计量（checkpoint 污染已由 quick-450636f3 独立修复）。
- 不吞 verify 级联死锁（已有 postmortem ql-013）。
- token 节省比例不作验收（观测注记）。

## 拆分判断

单变更：四阶段 prompt 契约是同一处矛盾（必读清单压过注入）的四个切面，拆开必然漂移。无批量特征。

## 总体方案

### Wave 1：注入基建（src/run/prompt.js + 包组装 helper）

1. `prompt.js` 增 `{REVIEW_MATERIALS}` 注入位（与既有 `{REVIEW_JSON_CONTRACT}`/`{PRIOR_REVIEW_FACTS}` 同机制同框架——占位符缺失容错沿用）。**槽位分权（Grill 交叉点 1 落盘）**：三阶段（Grill 首轮/plan 审/execute QA）走 `{REVIEW_MATERIALS}`；**再审模板不含该槽**，走 `{PRIOR_REVIEW_FACTS}`——两槽互斥不并存。`{PRIOR_REVIEW_FACTS}` 现为双块拼接（prompt.js:1449-1451 前序 pass 段＋:1460-1465 复审基线段）：排他语只改**复审基线段**；fixDiff 经该段渲染并入（`renderPriorRoundFindingsMd` 渲染内容扩展——占位符机制零改动，渲染体扩展）。
2. 包组装 helper（新 `src/review-material-pack.js`，纯函数 + IO 抽取器）：
   - `extractDesignHotZone(designContent, sections[])`——从 execute 热区逻辑泛化（非目标/兼容策略节抽取先例 :979-1023）。
   - `extractDiffSummary(gitDir, base, head)`——**base 解序对齐既有基建**（Grill 交叉点 2 落盘）：复用 `resolveVerifyChangedFiles` 的锚点优先级（actualBaseHash/baselineCommit 优先于 baseHash，:1091-1093 既修坑序），文件名单直接委托该函数，±行数经 `git diff --stat` 叠加——不独立解 base 防重蹈 baseline 同步文件误入坑。
   - `buildReviewMaterialPack(stage, {design, plan, diff, priorFindings, crossPoints})`——按阶段组包。

### Wave 2：四阶段 prompt 契约改写

1. **Grill 首轮**（brainstorm.js Grill 步输入材料段 :415-424 替换）：材料包＝design 要点 digest＋文件清单＋五个交叉点（主代理点名）＋五点点名的源码片段（CLI 抽取）。删「必须读取完整/素材宁可多读」，改基准面语义（D-004 措辞）。
2. **plan 审**（plan 审查步的输入段）：材料包＝plan 相对 design 硬约束的差量（硬约束逐条对照＋偏差行）。
3. **execute QA**（execute 对照设计检查步）：材料包＝diff 摘要＋design 热区＋验收清单。
4. **再审**（stage-review.js 派发 prompt）：`{PRIOR_REVIEW_FACTS}` 升为唯一材料——上一轮 findings＋对应修复 diff；`renderPriorRoundFindingsMd` 的「以增量为主」从建议语改为排他语（「本材料是本轮唯一基准面」）。
5. 四处统一自检首项：「材料包是否足以逐条作答；不足→cannot_verify＋列缺件」。

### Wave 3：验收钉与镜像同步

1. 回归测试（NEW:test/review-material-pack.test.mjs）：①grep 四阶段 prompt 模板断言无「必须读取完整」/「素材宁可多读」两原语；②包组装 helper 单测（四阶段形态）；③再审排他语在场断言。
2. **prompt 镜像同步（CLAUDE.md 规则 19 合规）**：改 `src/stages/*.js` prompt 后跑**三步流水线**（Grill 交叉点 3 落盘，`_sync.mjs` 头注同款）：`node docs/prompt/_extract.mjs`（再生 `_extracted.json`）→ `node docs/prompt/_sync.mjs`（同步各 `docs/prompt/<stage>.md`——plan/execute 动态阶段被 fence 跳过的既知豁免保持）→ `node docs/prompt/_verify.mjs`（一致性核验）。`src/stage-review.js` 为根级文件不在提取面——再审文案无镜像义务（不误列）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/review-material-pack.js | 包组装纯函数＋热区/diff/差量抽取器 |
| 修改 | src/run/prompt.js | {REVIEW_MATERIALS} 注入位（缺省容错） |
| 修改 | src/stages/brainstorm.js | Grill 输入材料段→包注入＋基准面语义（:415-424） |
| 修改 | src/stages/plan.js | plan 审查输入段→差量包（审查步，非填卡步——填卡 :500 不动） |
| 修改 | src/stages/execute.js | QA 输入段→diff＋热区＋清单包 |
| 修改 | src/stage-review.js | 再审唯一材料化（renderPriorRoundFindingsMd 排他语＋派发 prompt 组装） |
| 新增 | NEW:test/review-material-pack.test.mjs | 机械钉三组：两原语绝迹/包形态/排他语在场 |
| 修改 | docs/prompt/_extracted.json 与 docs/prompt/*.md | 规则 19 镜像同步（_extract.mjs 再生产物） |

## 接口定义

- `buildReviewMaterialPack(stage, inputs) → string`（渲染为注入文本；stage ∈ {grill-first, plan-review, execute-qa, re-review}）。
- `{REVIEW_MATERIALS}` 占位符：prompt.js 注入框架同款（缺失→空串容错，不阻断）。
- 包 schema（内部）：grill-first={designDigest, fileList, crossPoints[≤5], snippets[]}；plan-review={hardConstraintDelta[]}；execute-qa={diffSummary, designHotZone, checklist}；re-review={priorFindings, fixDiff}。
- `{PRIOR_REVIEW_FACTS}` 语义升级：建议语→排他语（唯一基准面）；注入机制零改动。

## 生命周期契约表

不涉及生命周期契约（prompt 模板与注入框架扩展，无 session/lease/daemon/state 语义）。

## 数据模型

零 schema 变更（包是 prompt 时字符串，不落盘）。

## 兼容策略（brownfield 必填）

- 占位符缺失→空串（prompt.js 既有容错）——CLI 版本与 skill 缓存不同步时不炸。
- `{PRIOR_REVIEW_FACTS}` 无前轮数据→回退首轮全量包（再审首跑=首轮语义，合理）。
- 存量 review.json 产物契约零改动（schemaVersion/reviewType/verdict 不动）。
- 回退路径：四阶段 prompt 段落级 revert（无状态迁移）。

## 风险登记

| 编号 | 风险 | 等级 | 应对 |
|---|---|---|---|
| R-01 | 包太薄→确认偏差放大（评审者只见设计者点名面） | P1 | D-004 基准面语义：包外定向查证合法须列明；评审者自检 cannot_verify＋列缺件；时间盒纪律叠加 |
| R-02 | 机械钉误伤合法表述 | P2 | 钉只匹配「必须读取完整」「素材宁可多读」两个原语（正则收窄） |
| R-03 | docs/prompt 镜像漏同步 | P1 | 文件清单显式列 _extract.mjs 再生；gate doc-ref-check 兜底 |
| R-04 | 主代理点名偷懒（五交叉点凑数） | P2 | 包内五点须锚 file:line（空锚→评审者自检拦） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 全篇（契约矛盾定位＋打包判定） | 已覆盖 |
| D-002@v1 | Wave 2 四阶段包形态 | 已覆盖 |
| D-003@v1 | Wave 3 验收钉＋非目标（比例不作验收） | 已覆盖 |
| D-004@v1 | Wave 2.5 自检首项＋R-01 | 已覆盖 |
| D-005@v1 | 非目标＋镜像同步合规 | 已覆盖 |

## 自审

- [x] 章节齐全（背景/目标/非目标/方案/清单/接口/风险）
- [x] frontmatter 含 risk_level: unit-sufficient（**先于完成门落盘**——D-005 纪律：本变更在评审域，防自己的 brainstorm 门按旧关键词定顶格把要省的钱先花掉；纯 prompt 模板与注入框架扩展，零运行时集成面）
- [x] 引用全部当前版本决策（D-001~D-005 入追踪）
- [x] 生命周期关键词核对——正文此类词均为讨论对象非实现对象，紧邻豁免短语在案
- [x] UI 原型分级——纯后端 prompt 工程，跳过
- [x] 不确定问题标注——无存疑项；包 schema 的 digest 形态在执行期以 Grill 反馈收敛
