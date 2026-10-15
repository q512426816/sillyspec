---
author: flow-machine-draft
created_at: 2026-10-14T23:31:43.981Z
---
# 需求规格（Requirements）— 2026-10-15-pitfall-batch-clearance

> 来源：消费仓 multi-agent-platform 六篇坑文件（2026-10-15，变更 2026-10-14-admin-server-status 实证）
> docs/sillyspec/{verify-close-gate-staggered-exposure, stage-review-dir-naming-mismatch,
> task-review-retired-archive-mismatch, wt-commit-auto-tick-unimplemented-tasks,
> distill-rejected-field-late-hint, probe-noise-and-commit-suggest-quality}.md——成功标准为坑文件
> 修复建议的逐条转写，非本变更自拟。

## 功能需求

### FR-01: 矩阵锚点正则对称化：design接口表# 锚点路径字符类同时排除中文左右括号与半角括号，锚点后紧跟中文左括号注记不再吞字空指（测试断言捕获路径=声明路径）

- 必须：接口验证覆盖矩阵证据列 design接口表# 锚点的路径捕获，在中文左括号（、中文右括号）、半角左右括号处终止——`design接口表#GET /api/x（注记）` 捕获 `/api/x`，与解析面端点命中，不再产生「未命中解析面（空指）」。

#### 场景：中文左括号注记

Given design.md 接口段解析面含 `GET /api/system-status`，矩阵证据列写 `design接口表#GET /api/system-status（design.md 接口定义节端点一致）` When judgeApiCoverageMatrix 校验 Then 无空指违规（锚点捕获=声明的端点）。

#### 场景：既有分隔形态不回归

Given 注记使用右括号收尾、中文逗号/句号/分号或空格分隔的既有写法 When 校验 Then 行为与现状一致（仍正常终止/命中）。

### FR-02: 空指报错附诊断：锚点未命中解析面时文案附 facts 实际解析到的端点集

- 必须：design接口表# 锚点空指时，错误文案附 facts 实际解析到的端点集（为空时显式标注「解析面为空」），使「锚点吞字」与「design 缺表」一眼可辨。

#### 场景：空指诊断

Given 解析面含 2 个端点、锚点吞字不命中 When 校验 Then 报错文案含这两个端点字样。

### FR-03: verify 收口纯文档门一次性全列：探针一致性/draft 篡改/ceremony 双跑三门并入 docGateFailures 收集汇总，不再逐门 fail-fast 连撞

- 必须：verify --done 收口的探针一致性、draft 篡改门禁、ceremony 双跑三道纯文档门与既有文档校验器同轮收集（docGateFailures），在检查点 A 一次性全列后统一回滚——三门问题在实测门之前暴露，不再逐门 fail-fast 连撞。

#### 场景：三门同时不满足

Given 三门各自触发条件同时不满足 When verify --done Then 三门问题同轮全部列出后统一回滚（一轮往返见全部文档面问题，且不先跑实测门）。

### FR-04: verify-probes --init 落 apiFace 键（与 --done backfill 同源同形），re-init 保留已回填固化键不再抹除

- 必须：--init 生成的 verify-facts.json 含 apiFace 键（取 runVerifyProbes 结果的 apiFace，与 --done backfill 同源同形）；re-init 分段合并时保留既有固化键（含 apiFace），不再只保留五段白名单。

#### 场景：init 即含解析面

Given design.md 接口段已表格化 When verify-probes --init Then 落盘 facts 含 apiFace.endpoints。

#### 场景：re-init 保回填

Given facts 已含回填的 apiFace When 重跑 --init Then apiFace 键保留（值随本次结果刷新）。

### FR-05: 对账零内容 diff 忽略：纯行尾差异文件（--ignore-cr-at-eol 对照判定）剔出 undeclared 面，软警告留痕

- 必须：verify 对账 actual 面剔除「纯行尾差异」文件（tracked 文件不在 `git diff --name-only --ignore-cr-at-eol` 真实变更集者），剔除以软警告/注记留痕（eolOnly），不再进 ②missing/③undeclared 面；未跟踪与删除文件不受影响；探测失败时不过滤（fail-open）。

#### 场景：gen 重写行尾

Given tracked 文件仅行尾被改写（porcelain M 但不在 --ignore-cr-at-eol 变更集）When 收口对账 Then 该文件不进 undeclared，结果含 eolOnly 留痕。

### FR-06: stage-review 目录归一：裸 runId 目录与双前缀目录读侧容错命中，refresh-hash 对错位文件可用；三份 SKILL.md 口径统一

- 必须：stage-review 读侧（gate 校验/refresh-hash/autoRefresh）在规范目录 `<stage>-<runId>` 无 review.json 时按「双前缀 `<stage>-review-<runId>` → 裸 `<runId>`」顺序容错探测并命中；三份 SKILL.md 的目录口径统一为「目录名 = `<stage>-` + marker 值原样（runId 自带 review- 前缀，勿再拼一层）」。

#### 场景：错位目录命中

Given review.json 落在 `stage-reviews/review-<ts>/review.json`（marker 值命名的裸目录）When gate 校验 Then 按该文件正常校验（docHash 失配仍走既有自动重算）。

#### 场景：refresh-hash 可用

Given 同上错位 When register-stage-review --refresh-hash Then 定位到既有 review.json 完成重算，不再报「无对应 run」。

### FR-07: execute 批量完成自动补 per-task review 草稿（机械生成幂等），批量完成复核循环与 archive 完成度判定不再全量缺失

- 必须：detectExecuteBatchFinish 在代码证据核验通过后、per-task 复核循环前，对缺 review.json 的已勾 task 调 generateTaskReviewDrafts 机械补草稿（既有幂等生成器：已存在不覆盖）；草稿在场后批量复核循环自然通过与 archive step2 真相源（review.json verdict）天然在场。

#### 场景：批量完成不再全缺

Given tasks 全勾、代码证据非零、4 个 task 均无 review.json When execute --done 批量完成 Then 草稿自动补齐、复核循环不再报「review 缺失」全量阻断。

### FR-08: 自动勾选加实现事实锚：代勾改为提交 subject 含 task-NN 且 diff 与该卡 allowed_paths 交叠（无卡面时仅 subject token）才勾，正文散文提及不勾

- 必须：execute --done 的 full-autopilot 代勾证据源收敛为提交 subject 行（%s）中的 task-NN token，且该 task 卡 allowed_paths 存在时要求提及该 task 的提交触及面与 allowed_paths 交叠；提交正文（body）散文提及的 task 号一律不作为代勾证据。

#### 场景：正文提及不勾

Given task-01 提交正文提及「(task-02)(task-03)」而 subject 仅含 task-01 When execute --done Then 只代勾 task-01，task-02/03 保持未勾。

#### 场景：subject 亦不交叠不勾

Given 某提交 subject 含 task-02 但其 diff 与 task-02 卡 allowed_paths 零交叠 When execute --done Then task-02 不代勾（无实现事实锚不勾）。

### FR-09: 决策模板骨架含 否决理由/复潮条件 字段行（标注 rejected 必填），distill needsWait 报错附可复制补丁样例

- 必须：brainstorm「对话式探索」步注入模板与四件套落盘模板（BRAINSTORM_ARTIFACT_TEMPLATES_MD）的决策骨架含 `- 否决理由:` / `- 复潮条件:` 字段行并标注 status=rejected 时必填；archive distill needsWait 报错附可复制补丁样例（两字段行样例）。

#### 场景：模板含字段

Given 渲染 brainstorm 注入模板/读取四件套模板 Then 骨架含两字段行且带 rejected 必填标注。

#### 场景：报错附样例

Given rejected 条目缺两字段 When distill Then 报错文案含「否决理由：」「复潮条件：」可粘贴补丁样例行。

### FR-10: 探针矩阵归属测试文件列截断前 5+共 N 个折叠，单元格转义

- 必须：验收×测试覆盖矩阵「归属测试文件」列最多展示 5 个文件（经 mdEscapeCell 转义），超出折叠为「…共 N 个」一行；收集面同步设帽（probe7 testFiles 上限）。

#### 场景：82 文件截断

Given 归属测试文件 82 个 When 渲染骨架 Then 单元格 ≤5 项 + 「共 82 个」计数，不再单格数千字符。

### FR-11: commit 建议 type 加权：QUICKLOG 在场不再硬推 fix，subject 已列条目不进 body 重复

- 必须：QUICKLOG 条目仅在其 quicklog 文件属于本次提交变更集时计入建议来源（并行会话 quick 噪声不污染）；归档产物含已勾 task（changes/archive/<变更>/tasks.md）时 task 面在场 → type=feat；task+quick 混合时 feat 优先；subject 已列出的 quick 标题不进 body 重复；纯阶段产出去掉「quick 修复」字样。

#### 场景：归档提交不再误判 fix

Given 暂存面含归档产物（含已勾 tasks.md）+ 并行会话 QUICKLOG 新条目（其文件不在变更集）When sillyspec commit 建议 Then type=feat，subject/body 无「quick 修复」凭空字样、无与 subject 重复行。

### FR-12: 平台 409 回显折叠为一行摘要

- 必须：sync 推送/拉取遇非 2xx 时本地回显一行摘要——409 冲突体解析出 conflict 标识与时间戳/变更标识打一行，不再回显响应体片段（text.slice(0,200) 密排 JSON）。

#### 场景：409 单行

Given 平台返回 409 + conflict JSON（含 platform_progress 大对象）When sync Then 输出单行 `→ 409 conflict …` 摘要，无响应体回显。

### FR-13: 全量测试与 lint 绿

- 必须：全量测试套件通过、lint 无 hard fail。

#### 场景：收口实测

Given 全部实现落地 When 跑 `npm test` 与 lint Then 全绿退出码 0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/pitfall-anchor-paren.test.mjs「中文左括号注记不再吞字空指／既有分隔形态不回归」
FR-02: test/pitfall-anchor-paren.test.mjs「空指报错附解析面端点集」
FR-03: test/pitfall-gate-collect.test.mjs「三门同轮收集一次性全列」
FR-04: test/pitfall-facts-apiface.test.mjs「init 落 apiFace 键／re-init 保留回填键」
FR-05: test/pitfall-reconcile-eol.test.mjs「纯行尾差异文件剔出对账面并留痕」
FR-06: test/pitfall-stage-review-dir.test.mjs「错位目录容错命中／refresh-hash 对错位文件可用」
FR-07: test/pitfall-batch-review-backfill.test.mjs「批量完成前自动补 per-task 草稿」
FR-08: test/pitfall-autotick-anchor.test.mjs「正文提及不勾／subject+allowed_paths 交叠才勾」
FR-09: test/pitfall-rejected-fields.test.mjs「模板骨架含两字段行／distill 报错附补丁样例」
FR-10: test/pitfall-probe7-noise.test.mjs「82 文件截断为 5+计数」
FR-11: test/pitfall-commit-suggest.test.mjs「QUICKLOG 不在变更集不计入／归档 task 面 feat／body 去重」
FR-12: test/pitfall-sync-409.test.mjs「409 冲突折叠单行摘要」
FR-13: 不适用：流程性验收——由全量测试套件 + lint 命令覆盖（无独立单测面）
