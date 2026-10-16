---
author: flow-machine-draft
created_at: 2026-10-16T07:44:31.079Z
---
# 设计记录（Design Record）— 2026-10-16-probe7-prefill-noise-fix

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 src/verify-probes.js 单文件（探针 7 预填链），不动探针 3/8-12 与门禁侧（stage-contract.js 契约复用）。

核心动作四件：
1. **命中分级**：`buildAcceptanceHints` 的命中锚点从「关键词首现行号」升级为「测试名行判定」——逐词扫归属文件行，行匹配测试名形态（Python `def test_*` / `class Test*`；JS 系 `test|it|describe` 含链式变体）且含该词 → 记入 `nameAnchors{term,file,line,name}`（name 取 def 名/引号字符串）；否则仅记入通用 terms/files（正文级）。原 `anchors`（首命中行号）删除——被本记录显式判定为空心锚点缺陷，唯一消费方即 prefillMatrixCells。
2. **预填判定链七级**（FR-05）：`prefillMatrixCells` 重写为固定优先级：①nameAnchors→covered（锚点=测试函数行+测试名，≤3 条）；②条目命中 `PROBE7_NONTESTABLE_RE`→non-testable（带「部署/文档类条目」注记）；③无归属→uncovered；④候选 >`PROBE7_CANDIDATE_CAP`(5) 且无 name 命中→uncovered「候选 N 个——归属不可判定，交人工核验」；⑤正文级命中（terms 非空无 nameAnchors）→partial「正文级命中——待人工核验」+反引号首命中文件；⑥waveFiles（同波次新增/修改归属测试）非空→covered「同波次新增/修改——待人工复核」；⑦有归属零命中→partial（现状文案）。证据全部按 stage-contract 三形态构造（反引号/file:line/.test.）。
3. **归属源收窄**：全 acceptance 条目命中 NONTESTABLE 正则的卡（docs/deploy 卡）跳过 `frLinkedExisting` 注入（缺陷一：compose 卡灌 130+ 文件）；候选 >5 且无测试名级命中时判定交人工（第④级）；归属列折叠文案与命中提示列展示帽（files ≤5 + 共 N 个）双管，禁止长清单进单元格。
4. **同波次提升信号**：`readReviewChangedTestFiles` 加 `wide` 选项（`isProbe7TestPath` 过滤替代 `test/` 前缀，覆盖嵌套 tests/ 目录）；逐卡收集 `waveFiles = 本卡 review 测试形态 changedFiles ∪ 直接下游卡同款`（与 fromDependents 同口径）；`prefillMatrixCells` 第⑥级消费。review.json 缺失 → waveFiles 空 → 落回 partial（fail-safe，不假升格）。

选道理由：修复建议 1「归属源收窄四选一」——现状结构归属已实装 allowed_paths 测试形态 ∪ review changedFiles ∪ 下游卡三源（即四选一中的 a/c/d 面）；真正产生缺陷的是 FR 索引回退池的无差别 join，故收窄落在「回退池仅代码任务开 + >5 交人工」两点，(b)「verify 命令点名测试」不引入（任务卡无此独立字段，卡 allowed_paths 即声明面）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `buildAcceptanceHints(...)` 返回 hint 形态变更：`{terms, files, nameAnchors}`——`anchors` 字段删除（内部函数，非导出；唯一消费方同步改）。terms/files 键语义不变（既有消费方零回归）。
- `prefillMatrixCells(item, testFiles, hint, opts)` 内部函数签名加第四参 `{waveFiles}`；返回 `{verdict, evidence}` 形态不变，枚举值域不变。
- `readReviewChangedTestFiles(runtimeRoot, runId, taskId, {wide})` 加可选参，缺省行为与现状字节级一致（`test/` 前缀）。
- `probe7.tasks[]` 元素新增 `waveFiles: string[]` 键（advisory 数据面；trace 落盘、facts 消费不改）。
- `renderProbe7Lines` 输出：判定/证据两列按新链；段头「预填说明」注释文案更新；>5 折叠文案更新。行数/列数/表结构不变。
- 对外可见性：verify-result.md 骨架与缺段补齐两条路径共用 renderProbe7Lines——预填质量提升对消费者仓可见；门禁（extractAcceptanceMatrixSlots）零改动。
- 无 CLI 命令、配置、文件格式的对外变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 答：review.json 在 verify 时点可能尚未落盘/仅部分落盘（execute 中断）——waveFiles 取「能读到多少算多少」：读不到 → 空集 → 第⑥级不触发，落 partial（安全方向），不报错不阻断。runId marker 双路解析（marker → mtime 扫描）保证迟到 run 目录仍被找到。FR 池注入与否只依赖卡文本（acceptance/allowed_paths），与到达时序无关。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 答：本变更只读 src 测试文件与 review.json，无写竞争面；骨架写盘沿用既有 ensureAcceptanceMatrixSection 幂等路径（段在场 no-op）。多 agent 并行：探针运行在各自 change 的 verify 时点，各自独立；trace 落盘沿用既有 writeChangeTrace（按 change 隔离）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 答：预填只在「骨架生成」与「缺段补齐」两条新写路径生效（agent 已填内容永不覆盖——既有保障不变）；本次判定链变化不影响该幂等边界。中断恢复：runVerifyProbes 纯读无状态，重跑幂等。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 答：跨仓卡测试内容读取沿用双根+local.yaml repos 多根回退（探测 8 同款）；waveFiles 的 review changedFiles 是仓根相对路径（跨仓卡读同一 runtime runId 下 review.json，路径不混根——证据引用的 file 与归属列同源）。单仓 in-place（wtRoot=null）与跨仓未注册场景行为与现状一致（fail-open 空集）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **最大风险：提升信号（第⑥级）方向从「宁 partial」翻向「宁 covered」**——若 review changedFiles 噪声大（如 rebase/工具重写导致无关测试入 changedFiles），会出现新的假 covered。缓解：lift 仅覆盖「零字面命中」格（有正文命中仍封顶 partial）；≥5 候选不触发 lift（第④级在前）；证据显式带「待人工复核」注记供复核者降级；review.json 缺失时不升格。若实测仍噪，回退开关即删除第⑥级（单点）。
- 试过但放弃：a) 只做「正文命中→partial」不引入测试名判定——不能解决锚点空心，covered 仍来自 docstring 行号；b) 用「测试文件被 diff 触碰」全量提升——会连未归属的改动测试一起升格，过宽；c) FR 池按 acceptance 词过滤收窄——池本身与卡粒度错配（130 文件来自整变更面），过滤后仍可能残留无关文件，不如「代码任务 + >5 交人工」两刀干净；d) 保留 anchors 仅改证据文案——词法层未变，hints.files 仍会把 docstring 命中当承接提示，治标不治本。
- 兼容风险：acceptance-matrix-probe / testpath-anchor 既有断言按旧契约（注释级命中→covered）钉死——属本记录显式判定的缺陷面，测试按新契约改写（非「改测试绕逻辑」，是契约修订）。

## 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | 探针 7 预填链重写：命中分级（nameAnchors）/七级判定链/FR 池收窄/同波次提升信号/展示帽 |
| 新增 | test/probe7-prefill-noise.test.mjs | 四缺陷新契约锁定（6 用例：FR-01~05 + 门禁 round-trip） |
| 修改 | test/acceptance-matrix-probe.test.mjs | 注释级命中断言按新契约改写（covered→partial 等）+ task-06 uncovered 行 |
| 修改 | test/probe7-anchor-testfile.test.mjs | FR-09 多根断言按新契约改写（正文级命中证据） |
| 修改 | test/pitfall-probe7-noise.test.mjs | >5 候选 uncovered 交人工断言补充 |
| 修改 | test/probe7-fr-prefill.test.mjs | P4 全部署类条目卡不注入 FR 池用例 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | 模块卡 verify-probes 条目补预填四缺陷修复摘要 + 最近变更头 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.changelog.md | 变更索引追加行 |
