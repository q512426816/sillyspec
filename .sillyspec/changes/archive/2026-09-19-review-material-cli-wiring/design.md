---
author: qinyi
created_at: 2026-09-19 16:35:00
scale: medium
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-19-review-material-cli-wiring

## 背景

归档变更 2026-09-19-review-material-pack 交付了评审材料包的组装单点（src/review-material-pack.js buildReviewMaterialPack 四形态）与注入位（src/run/prompt.js:1473/:1482 的 {REVIEW_MATERIALS} join——现恒空串）、四阶段 prompt 模板已改写为材料包基准面语义。遗留 Gap 1（archive verify-result.md 移交项）：**buildReviewMaterialPack 生产调用点为零（仅测试调用）**——包组装靠主代理派发时照模板散文指引手工做，CLI 机械保证断一半：素材半边（design digest/热区/diff 摘要）本可机械抽取，却留给主代理自由发挥，偷懒/漂移无兜底。

本变更把包组装接进 CLI 侧（照 src/stages/execute.js:979-1023 的 design 热区直抽先例：CLI 提取「非目标/兼容策略」节直供、勿整读全文），让派发 prompt 时 {REVIEW_MATERIALS} 被真实包内容填充。

## 设计目标

1. **CLI 机械注入**：prompt.js 既有 tier 注入链内按 stageName 组装材料包并填充 {REVIEW_MATERIALS}（D-001）——三阶段（Grill 首轮/plan 审/execute QA）走 MATERIALS 槽；再审走 {PRIOR_REVIEW_FACTS} 不动（两槽互斥铁律，stage-review.js 不含 MATERIALS 槽）。
2. **混合组包**（D-002）：CLI 抽素材半边（机械可抽取：designDigest/fileList/硬约束/diff 摘要/热区/checklist），主代理点名半边（五交叉点/plan 差量判定）留位不预填——包内对应节渲染既有缺件提示，模板散文指示派发前补位。
3. **可证伪验收**：装配函数三形态非空断言（fixture 直测）＋ prompt.js 接线源码钉；既有两原语绝迹钉/包形态钉/排他语钉零改动保持绿（D-003）。

## 非目标

- 不改 buildReviewMaterialPack 的四形态 schema（已归档契约不回改；re-review 形态仍仅供 {PRIOR_REVIEW_FACTS} 渲染体拼装）。
- 不动 {PRIOR_REVIEW_FACTS} 注入机制与 renderPriorRoundFindingsMd（再审面零改动）。
- 不改评审轮次与 ceremony 定价（tier 判定/菜单不动）。
- 不把主代理点名半边机械化（五交叉点是语义判断——若实测补位率过低再评估，见 D-002 退役判据）。
- token 节省比例不作验收（观测注记）。

## 拆分判断

单变更：一个断点（生产调用点为零）一次接齐——装配函数/注入链/模板槽三件互为同一契约的切面，拆开必漂移。无批量特征（三阶段模板加槽是同一机械动作的三处实例化，非三份独立设计）。

## 总体方案

### Wave 1：装配函数（core-engine）

src/review-material-pack.js 新增导出 `assembleStageReviewMaterials({ stage, cwd, changeName, specBase })`（async，best-effort）——CLI 半边素材机械收集后调 buildReviewMaterialPack 渲染：

- **grill-first**：designDigest＝design.md 章节行号索引（`L<行> ## <节名>` 全列，同 execute.js:1011 先例）＋「背景」「设计目标」两节正文（复用 extractDesignHotZone，clamp 4000 内）；fileList＝design.md「文件变更清单」表路径列机械解析（`|` 表行第 2 列剥 `NEW:`/`MOD:` 前缀，仓根相对路径口径）；crossPoints 恒不传（留位）。
- **plan-review**：hardConstraints＝design.md「## 全局硬约束」节的编号/圆点行 → `[{id:'HC-<n>', text}]`（cap 10）；缺节时 fallback decisions.md 的 P0/P1 条目（`## D-xxx@vN: <标题>` 行＋其下 `- priority:` 行配对，cap 10）；planDelta 恒不传（留位——逐约束「一致/偏离/未覆盖」判定是主代理半边）。
- **execute-qa**：diffSummary＝既有 extractDiffSummary({ cwd, changeName, specBase })（base 解序委托 resolveVerifyChangedFiles——**硬约束：禁独立解 base**）；designContent＝design.md 全文读入（热区抽取由 buildReviewMaterialPack 内部的 extractDesignHotZone 完成）；checklist＝REVIEW_CHECKLISTS.execute（stage-review-checklist.js 既有导出）。
- 未知 stage/必素材全缺 → 返回空串（与占位符缺失同态，prompt join 空串零残留）。

### Wave 2：注入链与模板槽（runtime + stages）

1. prompt.js tier 注入块（`['brainstorm','plan','execute'].includes(stageName) && promptText.includes('{REVIEW_TIER}')` 分支）：组装 `reviewMaterialsMd`（stageName→stage 映射：brainstorm→grill-first、plan→plan-review、execute→execute-qa；specBase 显式传 :1382 的 tierSpecBase——块内唯一解析源，Grill 审查意见②吸收）后 `.split('{REVIEW_MATERIALS}').join(reviewMaterialsMd)`；组装 try/catch best-effort，失败 join('')（降级语义与占位符缺失同态，模板散文兜底）；降级 catch 分支（既有 e 分支）保持 join('') 不动；:1473 既有注释「包由派发侧组好后再经本链二次替换」语义已反（CLI 组装取代派发侧手组）——task-02 同步改写，防 stale comment 误导（Grill 审查意见①吸收）。
2. 三阶段模板加 `{REVIEW_MATERIALS}` 槽（置于既有 {REVIEW_TIER}/{REVIEW_JSON_CONTRACT} 同段）＋主代理补位指引一行（「包内『五个交叉点/plan 差量』节派发前由你补齐——file:line 锚，留空则评审者按 cannot_verify 列缺件」）：
   - src/stages/brainstorm.js Grill 步「### 输入材料」节：槽注入实际包体，散文从「主代理派发时组装」改为「CLI 已注入素材半边；点名半边派发前补」。
   - src/stages/plan.js stepReviewPlan「tier=independent 时：启动 plan-review 子代理」段：同款改写。
   - src/stages/execute.js acceptance「对照设计检查」步「### 操作（材料包口径）」节：同款改写。
3. 改 src/stages/*.js 后跑 docs/prompt 三步流水线（**硬约束**）：`node docs/prompt/_extract.mjs` → `_sync.mjs` → `_verify.mjs`。

### Wave 3：验收钉（test）

test/review-material-pack.test.mjs 新增组四（既有组一/二/三零改动）：
1. 装配函数三形态非空断言：临时 fixture（mkdtemp 建 changeDir：design.md 含背景/设计目标/非目标/兼容策略/全局硬约束/文件变更清单表 + decisions.md）→ assembleStageReviewMaterials 三 stage 各返回非空且含阶段特征节（grill=文件清单+章节索引；plan=硬约束行；execute-qa 经真实 git 仓本仓调用返回字符串形态）。
2. 接线源码钉：prompt.js 源含 assembleStageReviewMaterials 调用且主链 join 目标为该调用结果（非 '' 字面量）；降级分支 join('') 保持。
3. 留位钉：assembleStageReviewMaterials 产出不含预填交叉点/差量判定（crossPoints/planDelta 半边为留位缺件提示形态）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/review-material-pack.js | 新增 assembleStageReviewMaterials 装配函数（CLI 半边素材机械收集） |
| 修改 | src/run/prompt.js | tier 注入块内组装并填充 {REVIEW_MATERIALS}（主链 join 包体；降级分支保持 join('')） |
| 修改 | src/stages/brainstorm.js | Grill 输入材料节加 {REVIEW_MATERIALS} 槽＋补位指引 |
| 修改 | src/stages/plan.js | 审查步 independent 段加槽＋补位指引（填卡步 :500 不动） |
| 修改 | src/stages/execute.js | acceptance 对照设计检查操作节加槽＋补位指引 |
| 修改 | test/review-material-pack.test.mjs | 新增组四：装配函数三形态非空＋接线源码钉＋留位钉 |
| 修改 | docs/prompt/_extracted.json | 三步流水线镜像再生（_extract.mjs 产物） |
| 修改 | docs/prompt/brainstorm.md | Grill 输入材料节镜像（含 {REVIEW_MATERIALS} 槽） |
| 修改 | docs/prompt/verify.md | 流水线诚实回同步（先于本变更的既存漂移，非本变更模板面——提交 741f707 披露） |
| 修改 | docs/prompt/plan.md | 审查步 independent 段镜像（同上；属 DYNAMIC 豁免面，实际未变） |
| 修改 | docs/prompt/execute.md | acceptance 操作节镜像（同上；属 DYNAMIC 豁免面，实际未变） |

## 接口定义

- `assembleStageReviewMaterials({ stage, cwd, changeName, specBase }) → Promise<string>`：stage ∈ {grill-first, plan-review, execute-qa}（re-review 不在本函数面——走 {PRIOR_REVIEW_FACTS}，槽位分权铁律）；返回注入文本（含基准面语义头），素材全缺/未知 stage 返回 ''。
- {REVIEW_MATERIALS} 占位符：注入机制零改动（split/join 框架沿用），仅填充值从恒 '' 变为装配结果。

## 生命周期契约表

不涉及生命周期契约（prompt 组装与注入，无 session/lease/daemon/state 语义）。

## 数据模型

零 schema 变更（包仍是 prompt 时字符串，不落盘；assembleStageReviewMaterials 输入输出均为内存对象/字符串）。

## 兼容策略（brownfield 必填）

- 装配失败/素材缺失 → 空串注入（与现状恒 '' 同态）——CLI 版本与模板缓存不同步时不炸。
- 模板不含 {REVIEW_MATERIALS}（如旧缓存 skill 面）→ join 无命中零副作用。
- 既有测试组一/二/三断言面零触碰（组二的 joins≥2 源码钉在主链 join 语义变化后仍成立——主链 join 目标从 '' 字面量变为变量，`'{REVIEW_MATERIALS}'` 字面量出现次数不降）。
- 回退路径：prompt.js 主链 join 目标回退 '' 字面量即回到现状（无状态迁移、无落盘产物）。

## 风险登记

| 编号 | 风险 | 等级 | 应对 |
|---|---|---|---|
| R-01 | 装配引入 git/fs IO 拖慢 step 渲染 | P1 | diff 摘要仅 execute-qa 需要；safeGit 超时既有；整体 try/catch best-effort，失败零注入不阻断 |
| R-02 | fileList/硬约束表解析对表格变体脆弱 | P2 | 解析 best-effort，失败降级「（无）」行＋评审者自检列缺件兜底（与 R-04 同款防线） |
| R-03 | docs/prompt 镜像漏同步 | P1 | 文件清单显式列三步流水线；gate doc-ref-check 兜底 |
| R-04 | 主代理仍不补点名半边 | P2 | 留位缺件提示＋评审者 cannot_verify 自检（归档 R-04 防线原样保留）；实测补位率过低再机械化（D-002 退役判据） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | Wave 2 注入点（tier 注入链同链填充） | 已覆盖 |
| D-002@v1 | Wave 1 混合边界（CLI 素材半边/主代理点名半边留位）＋Wave 2 补位指引 | 已覆盖 |
| D-003@v1 | Wave 3 可测拆分（装配函数单测＋源码钉） | 已覆盖 |

## 自审

- [x] 章节齐全（背景/目标/非目标/方案/清单/接口/风险）
- [x] frontmatter 含 risk_level: unit-sufficient（**先于完成门落盘**——本变更在评审域，防自己的 brainstorm 门按旧关键词定顶格把要省的钱先花掉；CLI 内 prompt 组装注入，零部署/运行时集成面，装配函数单测＋本会话 dogfood 即冒烟）
- [x] 引用全部当前版本决策（D-001~D-003 入追踪）
- [x] 生命周期关键词核对——正文此类词均为讨论对象非实现对象，「生命周期契约表：不涉及」豁免在案
- [x] UI 原型分级——纯后端 prompt 工程，跳过
- [x] 不确定问题标注——designDigest 的机械形态（章节索引+背景/目标节）为最小可用版，执行期以 Grill 反馈收敛
