---
author: flow-machine-draft
created_at: 2026-10-15T09:40:04.345Z
---
# 设计记录（Design Record）— 2026-10-15-plan-review-focus

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

本变更只改 `src/stages/plan.js` 的 prompt/模板文本 + 重跑派生件提取管线 + 新增一个测试文件，不新增步骤、不动状态机、不动门禁代码。四处落点：

1. **light 模板**（FR-01）：在「验收」节后加「Review Focus 盲区清单（隐含面）」节要求——规格/设计隐含但无任务测试覆盖的输入/失效模式，≤5 条、按最可能坑到人排序、每条带承接落点（task 的 acceptance/测试）、空节须写「已检查，无」。
2. **full 模板**（FR-01）：在「全局验收标准」节后加同节（口径与 light 一致；承接落点对齐任务总表编号）。
3. **light/full 约束列表**（FR-02）：各加一条比例自检——计划产物与 spec/design 相称，整段可粘贴代码=转录不是计划，用签名+测试断言+规格精确值承载决策。
4. **审查计划步 prompt**（FR-03）：在「module-impact.md 首版」节之前加「补充复查」节三项（Review Focus 承接复查 / 比例自检复核 / 共享面预扫留表）。

对照来源：obra/superpowers writing-plans 的 Review Focus 节（v6.4.1，eval 实证驱动）与比例自检（v6.4.2，计划 token 1/3、时间 1/4 且质量探针不退化）。选纯文本方案的理由：与上一变更（brainstorm-interaction-refine）同判——盲区是语义判断，机械校验只会逼出占位式合规；且 plan.md 结构被 plan-postcheck 与 execute 解析消费，新增节的**在场性硬门**会破坏存量在途变更（向后兼容），留作后续机械面决策。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- **无新增函数、无命令、无文件格式 schema 变更**。`src/stages/plan.js` 的模板字符串内容变化是唯一对外可见面。
- **不改 `src/stage-review-checklist.js`**：该文件是清单单一来源，条目被 plan-postcheck、review-dispatch worker_prompt 字面引用，且被 `test/stage-review-checklist.test.mjs` 快照钉死（文件头注释明示"改写即漂移"）。补充复查三项直接写进 plan.js 审查步 prompt 的独立小节，宁可接受与清单来源的双处表述，不动字面引用面。
- **派生件**：`docs/prompt/plan.md` 与 `docs/prompt/_extracted.json` 由 `docs/prompt/_extract.mjs`/`_sync.mjs` 机械提取（README 声明逐字一致），本变更改源后重跑管线并提交派生件——这是本变更唯一需要同步的生成物。
- 步骤名与顺序不变（`复杂度分类与上下文加载 / 生成分级计划 / 审查计划 / 生成 TaskCard / Wave 重排与可行性校验`），`plan_level` 三档语义不变，none 档零加厚。
- **交付文件面自声明**（供收口提交面对账）：`src/stages/plan.js`（唯一源改动）、`test/plan-review-focus.test.mjs`（新增）、`docs/prompt/plan.md` + `docs/prompt/_extracted.json`（本变更派生件，管线重跑产物）、`docs/prompt/verify.md`（**非本变更语义**——既有已提交源 `src/stages/verify.js` 的派生件滞后同步，本变更跑 `_extract`/`_sync` 时顺带收敛，纯机械同步零语义变更，一并提交以免派生件长期脏挂共享树）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stages/plan.js | light/full 模板加「Review Focus 盲区清单」节 + 比例自检约束 + 审查计划步补充复查节 |
| 新增 | NEW:test/plan-review-focus.test.mjs | 6 用例锁 FR-01~05 产物面（模板分段断言 + 派生件一致性） |
| 修改 | docs/prompt/plan.md | 派生件——_extract/_sync 管线重跑产物（plan 段 4/4 一致） |
| 修改 | docs/prompt/_extracted.json | 派生件——同上 |
| 修改 | docs/prompt/verify.md | 派生件滞后同步——既有已提交源 src/stages/verify.js 的机械同步，零语义变更（出处说明见接口契约节自声明行） |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. **乱序/迟到到达**：无新输入面。模板与约束是静态文本，plan_level 由上一步落盘 frontmatter 锚定（既有机制），本变更不改变读取时序。
2. **并发写**：plan.md 由主代理在生成分级计划步单写；审查计划步独立审查不改写（生成与审查分离是既有设计）。多会话共享仓下，本变更对 plan.js 的编辑遵循显式 pathspec 提交（AGENTS.md 规则 11）；会话期间检测到并行会话占用 plan.js 则先重读再改（规则 9）。
3. **切换/生命周期**：plan 阶段步骤态在进度库；prompt 重渲染不依赖内存，重入（`run plan --change` 续跑）后新文本自动可见。存量在途变更的 plan.md 没有 Review Focus 节——它们不走本变更的模板重生成路径（生成步只在首次进入或重做时执行），不受影响；补写属 agent 自愿，非强制回填。
4. **作用域**：纯 prompt 文本与派生文档，无数据层。派生件提取管线是本仓自有（docs/prompt/），不跨仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **最大风险：盲区清单的填写质量不可机械验证**（与上一变更同款风险）。盲区是"没人想到要声明的东西"，agent 填不出真盲区时会写占位行。缓解：①要求每条必须带承接落点（task 的 acceptance/测试）——空承接的行在审查步会被抓；②「已检查，无」显式出口让"没找到"合法，降低编造动机；③审查计划步把"每行有承接测试"列为复查项，双层。
- **次风险：≤5 条上限被当作目标凑满**。缓解：模板文本明确"上限不是配额——写不出第 4 条就停，宁缺毋滥"；审查复查项盯"编造低价值行"。
- **与既有「禁止泛泛风险分析」约束的表观张力**：Review Focus 行若写成"并发场景需注意"就是泛泛风险分析——文本里明确要求行=具体输入/条件+可判定预期行为，与泛泛风险互斥；这条张力是设计意图（盲区行是具体化的风险，不是风险登记表的复制）。
- **放弃的方案**：
  - *在 `src/stage-review-checklist.js` 加三条清单项*：快照测试与字面引用面（plan-postcheck/worker_prompt）使任何改动都要连锁更新多处——收益不成比例；prompt 侧独立小节零连锁。
  - *给 plan-postcheck 加 Review Focus 在场性 warning*：向后兼容面（存量在途变更的 plan.md 无此节会新增告警噪声）+ 需要新代码与测试；留作观察一批后再决定是否机械化的后续决策。
  - *把 Review Focus 放进 TaskCard frontmatter 新字段*：卡片 frontmatter 被 plan-postcheck 硬校验（缺字段阻断），新字段=格式破坏性变更；plan.md 一节零 schema 面。
