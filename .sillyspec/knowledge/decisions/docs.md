# 决策知识 — docs

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-unmapped-299@v1 收割器机器自动拆 rejected 条目
状态：rejected
变更：2026-10-09-rejected-write-side
原编号：D-002@v1
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——拆条留在 agent 侧（D-001 路线）
否决理由：收割器是纯机械转写器，判不了「放弃方案」分界；槽4 模板问题文本每变更一字不差，照抄进条目零检索价值
复潮条件：槽4 作答先结构化（如模板化字段）使「放弃方案」出现可稳定解析的机械判据时可复潮

## D-unmapped-300@v1 distill 侧从 confirmed 散文解析死路自动拆条
状态：rejected
变更：2026-10-09-rejected-write-side
原编号：D-003@v1
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——语义判断后移到无 LLM 的层是更差的位置
否决理由：把语义判断后移到无 LLM 的纯函数层，散文「放弃方案①②③」形态解析脆弱，误拆漏拆都无兜底
复潮条件：decisions.md 作答全面结构化后（拆条在写侧完成成为前提），蒸馏层才有机械判据——彼时本方案反而无必要

## D-unmapped-301@v1 只修厚道不动轻量道
状态：rejected
变更：2026-10-09-rejected-write-side
原编号：D-004@v1
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——两道同修
否决理由：两道死路埋法同构（轻量收割模板必然埋散文），只修一半防复潮覆盖减半且 agent 行为指引不一致
复潮条件：轻量道废弃或槽4 收割机制下线时本裁定点自然消失

## D-unmapped-436@v1 存量 40+ 种散值 type 追溯清洗归档件
状态：rejected
变更：2026-10-20-decision-caliber-unify
原编号：D-002@v1
锚点：未记录
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71
理由：是否把历史手写散值条目（risk/term/premise/design 等）批量迁移为正典值？
否决理由：归档件是审计事实当时提名不追改（仓则）；散值条目本就解析保留不入选，清洗零收益且蒸馏行为难保零漂移，大面积改写归档件风险无限大
复潮条件：知识库检索对散值条目产生真实召回需求且可证明增量收益时（须先出干跑对照）

## D-docs-001@v1 2026-11-07-explore-logic-prototype——对照 mattpocock /prototype skill 三方分析（主分析+独立分析+证伪）终局结论：SillySpec 原型体系 UI-only，逻辑/状
状态：implemented
变更：2026-11-07-explore-logic-prototype
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-07-explore-logic-prototype/design.md
文件：docs/prompt/_extracted.json, docs/prompt/explore.md, src/stages/explore.js
最近确认：7098403292e3eb3b9f6fd925a3209d8f7ac451c3
理由：对照 mattpocock /prototype skill 三方分析（主分析+独立分析+证伪）终局结论：SillySpec 原型体系 UI-only，逻辑/状态模型类歧义缺「可交互证据」模态；但 brainstorm 侧不动（孤儿产物论证——下游 execute/gates/verify 三件套全是 UI 语义，逻辑原型在 brainstorm 生成无任何下游消费），explore 粗选件框架天然适配（手绘合法/不进变更目录/仅用户明确要求），零下游配套。 本变更只改 `src/stages/explore.js`「HTML 原型生成」节 prompt 三处：① 首句扩触发面（+状态机/流程/时序类歧义）；② 新增逻辑形 bullet（三要素+非 JS 复刻失真声明+不进变更目录）；③ 新增对比判据 bullet（结构性分歧+真实数据密度）。随后机械同步 docs/prompt 镜像与 skills 文档。

## D-docs-002@v1 2026-11-09-legacy-red-fixes——三类归因三类修法，全部锚定「修被误伤面，不改测试迁就错误」（AGENTS 规则 5 例外说明：FR-05 的测试断言更新属「测试锚定对象本身有意演进」——锚的不
状态：implemented
变更：2026-11-09-legacy-red-fixes
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-09-legacy-red-fixes/design.md
文件：docs/sillyspec/platform-interface-map.md, test/backlog-batch-e.test.mjs, test/prompt-golden.json, test/runtime-relayout.test.mjs, test/spec-dir-home-guard.test.mjs, test/thin-user-decision-record.test.mjs
最近确认：2fb976f8fef83434e51e49b6bb206579f8672b5c
理由：三类归因三类修法，全部锚定「修被误伤面，不改测试迁就错误」（AGENTS 规则 5 例外说明：FR-05 的测试断言更新属「测试锚定对象本身有意演进」——锚的不是逻辑是文案，文案演进提交 a556e117 是应然，故改测试是正确方向）： 1. **知识 SKILL 误回退恢复（FR-01）**：`git checkout 2b1fd2fb^ -- .claude/skills/sillyspec-knowledge/SKILL.md` 原样恢复 2026-11-07 三知识变更累积版（accept 命令行/refresh 退役/propose --body-file/K 形态四段模板）。选恢复而非改测试：SKILL 文档是功能面（accept 命令是 6a68770c 根因修复的对外入口），回退是 2b1fd2fb 的误伤（项目地图变更与知识 SKILL 无关），测试断言正确地拦住了它。 2. **残渣治理（FR-02）**：backlog-batch-e ③ MCP gate 段首尾加 `process.chdir` 到隔离 tmp 目录并复原——gate 的 `_pathWithDir` mkdir-p 语义决定了「cwd 落哪 runtime 目录建哪」，源头修掉；spec-dir-home-guard Test 5 前对 `test/.sillyspec` 做前置 rmSync 防护（auto-pull-throttle 残渣的源头未必只有一处，防护保证该测试不再依赖仓内整洁态）。顺手删除现存残渣（不进 git 的运行产物）。 3. **文案/行号锚对齐（FR-03/04/05）**：doc-ref 行号按当前源码实测更新（890→895/839、1217/1068/1144→1254/1282/1353、942→947、spec-sync.js:56→120、936 核对）；prompt-golden 走官方 `SILLYSPEC_REGEN_PROMPT_GOLDEN=1` 再生成（diff 随提交可审）；thin-record 断言更新到 a556e117 演进后的现行句。

## D-docs-003@v1 2026-11-12-knowledge-recall-gap-observe——在 `docs/troubleshooting.md` 追加第三条条目，登记「意图查询无法召回历史裁决」缺口。
状态：implemented
变更：2026-11-12-knowledge-recall-gap-observe
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-12-knowledge-recall-gap-observe/design.md
文件：docs/troubleshooting.md
最近确认：5da372df2670ba19a5e7b05fc3274fe198251a1c
理由：在 `docs/troubleshooting.md` 追加第三条条目，登记「意图查询无法召回历史裁决」缺口。不改任何代码——本变更只做观察项留痕，缺陷修复另立变更。 实证来源：2026-11-12 本会话先输出「架构级立项做生成式当前行为契约快照」的建议，事后 grep 才命中 `.sillyspec/changes/archive/2026-10-15-fr-chain-l3-adjudication/decisions.md` 的 D-001@v1——该能力已于四周前（28 天）被证伪冻结。 核查后根因比初始判断精确：该裁决按入选规则（`type=scope` 且 status 非 rejected → 不入库；值集见 `src/decision-values.js:31`，判定见 `src/decision-distill.js:100-106`）从未进入 `knowledge/decisions/`，同变更的 3 条 FR 已正常入 `knowledge/fr/core-engine.md`，唯独决策缺席。即问题不在召回算法，在决策根本没进召回池。 选 troubleshooting.md 而非 ROADMAP：ROADMAP 收规划面，本条已有实证后果（一次错误建议），符合 troubleshooting「撞过的问题」定位（CLAUDE.md 规则 18 同时点名两处，按性质择一）。
