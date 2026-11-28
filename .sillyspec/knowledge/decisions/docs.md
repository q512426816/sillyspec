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

## D-docs-004@v1 2026-11-13-brainstorm-solution-constraint-gate——只改 `src/stages/brainstorm.js` 中「提出 2-3 种方案」步骤的 `definition.steps[].prompt`：在「操作」
状态：implemented
变更：2026-11-13-brainstorm-solution-constraint-gate
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-13-brainstorm-solution-constraint-gate/design.md
文件：docs/prompt/_extracted.json, docs/prompt/brainstorm.md, src/stages/brainstorm.js, test/brainstorm-solution-constraint-gate.test.mjs
最近确认：6150f50df9edc022c835b2fa0a70f5064c5684f7
理由：只改 `src/stages/brainstorm.js` 中「提出 2-3 种方案」步骤的 `definition.steps[].prompt`：在「操作」开头新增第 0 步「先固守约束」——把前置阶段 `[用户]` 需求点、`decisions.md` 中 accepted 的 `normalized_requirement`、用户硬边界汇总为编号硬约束清单 C1..Cn，作为候选方案的准入门槛；补充单方案如实上报、约束冲突处理、提交前自检表三段规则。随后运行 `node docs/prompt/_extract.mjs` 刷新提取产物并逐字同步 `docs/prompt/brainstorm.md`，新增测试锁住新文案。不改 CLI 代码路径、不改步骤名/waitOptions/输出契约。

## D-docs-005@v1 2026-11-14-wait-ask-tool-and-selfcheck-output——两处纯提示词/注入文本修改：① `src/stages/brainstorm.js` 方案步「### 输出」行把自检结果列为必产物（四行检查逐行打勾、✗ 回到对
状态：implemented
变更：2026-11-14-wait-ask-tool-and-selfcheck-output
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-14-wait-ask-tool-and-selfcheck-output/design.md
文件：docs/prompt/README.md, docs/prompt/_extracted.json, docs/prompt/brainstorm.md, src/run/prompt.js, src/stages/brainstorm.js, test/brainstorm-solution-constraint-gate.test.mjs, test/output-step-render.test.mjs
最近确认：0af491509194727609f0123bb9157859f570de0d
理由：两处纯提示词/注入文本修改：① `src/stages/brainstorm.js` 方案步「### 输出」行把自检结果列为必产物（四行检查逐行打勾、✗ 回到对应处理），使 FR-04 自检从过程动作升级为可审计产物——2026-11-13 变更上线实测自检表被整体跳过，根因是输出契约未包含它；② `src/run/prompt.js` outputStep 的「完成后执行」段在 requiresWait / mayNeedWait 两分支注入提问方式指引（优先 harness 交互询问工具、回答逐字带入 --answer），对齐 flow.js 三断点横幅已有的 AskUserQuestion 实践——完整流程 wait 步只给命令模板导致 agent 只发纯文字问题。auto 模式（autoMeta）跳过注入，零变化。

## D-docs-006@v1 2026-11-15-scan-audit-domain——上游变更 2026-11-14-scan-incremental 的 `_module-map` 对账存在多项目跨域污染：`computeIncremental
状态：implemented
变更：2026-11-15-scan-audit-domain
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-15-scan-audit-domain/design.md
文件：docs/sillyspec/file-lifecycle.md, src/scan-incremental.js, test/scan-incremental.test.mjs
最近确认：8f76681fb6d3515737e5b11a9c6da44838180d75
理由：上游变更 2026-11-14-scan-incremental 的 `_module-map` 对账存在多项目跨域污染：`computeIncrementalPlan` 的对账用「codegraph 索引全仓文件清单 × 本项目 scope」求未归属——多项目仓（如 multi-agent-platform 的 backend/frontend/daemon/SillyHub 子项目）里，其他项目的文件全部落在本项目 scope 之外，被误报为「未归属」（backend 项目实测误报 3296 个，真实盲区是根项目口径的 1 个）。 修复：对账按**注册项目 path 剥前缀对齐口径**——读 `projects/<projectName>.yaml` 的 `path`（子项目=其仓内目录如 `backend`；主项目 `path: .`/未注册=空前缀）：索引文件路径剥项目前缀后与 map paths（项目相对口径）比对，剥不动的文件（其他项目域内）不进对账分母与未归属（跨域污染修复）；空前缀项目（主项目/单项目仓）不剥不滤，根级散文件仍是该报的真实盲区（行为不变）。真机暴露的深层根因：子项目 map paths 是项目相对（`app/core/**`）而索引是全仓相对（`backend/app/...`）——上游「3296 未归属」本质是口径错配，本修复同时纠正覆盖判定。改动点集中在 `src/scan-incremental.js` 对账段（数行）+ 单测补正反例。 文件变更清单：`src/scan-incremental.js`（对账段剥前缀+双口径+readProjectPathPrefix 内联）、`test/scan-incremental.test.mjs`（新增域过滤 2 用例）、`docs/sillyspec/file-lifecycle.md`（scan 增量模式段补记对账口径对齐，收口补证提交 8f76681f）。

## D-docs-007@v1 2026-11-21-mattpocock-absorb-roadmap——把四子代理调研（生态分发/架构复用/方法论盲维/提示词微设计）的收敛结论作为新章节追加进 ROADMAP 文档：批次表（批 0-批 5）+ 搁置区 + 明确不抄
状态：implemented
变更：2026-11-21-mattpocock-absorb-roadmap
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-21-mattpocock-absorb-roadmap/design.md
文件：docs/ROADMAP.md
最近确认：9167bc28a3ae954abccba36f68dda69a716e7e23
理由：把四子代理调研（生态分发/架构复用/方法论盲维/提示词微设计）的收敛结论作为新章节追加进 ROADMAP 文档：批次表（批 0-批 5）+ 搁置区 + 明确不抄清单。只做登记不做实现——每个后续批次各自立项时按行引用本章条目。选纯文档追加形态：调研结论的时效价值在「可引用落盘」（防复潮：重复提案可一句引用关掉），实现动作归各批次变更，避免一个巨型变更混 doc 与 code。

## D-docs-008@v1 2026-11-21-prompt-microdesign-pack——按 docs/ROADMAP.md「mattpocock/skills 吸收路线」批 1，把五条提示词微设计直接织入阶段提示词源码：brainstorm.js
状态：implemented
变更：2026-11-21-prompt-microdesign-pack
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-21-prompt-microdesign-pack/design.md
文件：docs/prompt/_extracted.json, docs/prompt/brainstorm.md, docs/prompt/execute.md, docs/prompt/verify.md, docs/sillyspec/out-of-scope/README.md, docs/sillyspec/out-of-scope/mattpocock-skills-full-adoption.md, src/design-facts.js, src/index.js, src/stages/brainstorm.js, src/stages/execute.js, src/stages/verify.js, src/verify-probes.js, test/design-facts.test.mjs, test/prompt-golden.json
最近确认：29480fa39967e39dc9ec21c718ff9c9991660f64
理由：按 docs/ROADMAP.md「mattpocock/skills 吸收路线」批 1，把五条提示词微设计直接织入阶段提示词源码：brainstorm.js 两处（design 模板 8.5「测试 seam 约定」节+提问措辞「是=接受推荐」）、execute.js 三处（代码审查三层优先级/DEBUG 前缀/变异自证）、verify.js+verify-probes.js 一处（风险节回退门+爆炸半径字段），另建 out-of-scope 沉淀位。8.5 节采用 7.5 生命周期契约表的条件必填+豁免短语模式（不进 stage-contract-spec 硬门禁），使联动面收敛在模板×骨架×帮助文案×章节契约测试四处。提示词为数据源不是逻辑，改后机械再生 docs/prompt 镜像与 prompt 金档（设计内的快照维护通道）。

## D-docs-009@v1 2026-11-22-prompt-primitive-survey——派只读子代理全量扫描 `src/stages/*.js`（含 `templates/prompts/` 现状），识别被 ≥2 阶段/步骤复用的纪律散文段，产出结
状态：implemented
变更：2026-11-22-prompt-primitive-survey
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-22-prompt-primitive-survey/design.md
文件：docs/sillyspec/prompt-primitives-survey.md
最近确认：dddf86ff2fd0b1b145ea6c50af6439b5f05e65ef
理由：派只读子代理全量扫描 `src/stages/*.js`（含 `templates/prompts/` 现状），识别被 ≥2 阶段/步骤复用的纪律散文段，产出结构化清单落 `docs/sillyspec/prompt-primitives-survey.md`。选子代理扫描：stages 全量 ~5000+ 行，独立上下文做重复段比对不占主会话；选纯文档落盘（不动 src/）：批 3b/3c 是独立变更，本变更只供设计输入——调研与施工分离，避免一个变更既盘点又重构。

## D-docs-010@v1 2026-11-22-roadmap-loop-closure——三环闭合：①机器消费——拒绝概念与位置裁决走变更内 decisions.md 记 D-001/D-002，收口 distill 自动蒸馏进 knowledge
状态：implemented
变更：2026-11-22-roadmap-loop-closure
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-22-roadmap-loop-closure/design.md
文件：docs/ROADMAP.md, docs/sillyspec/out-of-scope/README.md, docs/sillyspec/out-of-scope/mattpocock-skills-full-adoption.md, docs/troubleshooting.md
最近确认：1bfcebf873204a5256a8c83cf495de4ca999186d
理由：三环闭合：①机器消费——拒绝概念与位置裁决走变更内 decisions.md 记 D-001/D-002，收口 distill 自动蒸馏进 knowledge decisions 域（这是工具自带的防复潮通道，批 0/批 1 误把同类内容写进无人检索的 md 是绕开了正道）；②状态推进——ROADMAP 迁入 `.sillyspec/docs/sillyspec/` 并加状态列，批 0-3a 回写已归档提交号；③位置归位——删除项目 docs/ 下的死文档（ROADMAP+out-of-scope），修正两份 CLAUDE.md 的过时指引句。归档件历史引用不追改（审计事实）。

## 拒绝 mattpocock skills 全量照搬流程形态（八条不抄与内核冲突点）

问题：是否把 mattpocock/skills（33 万 star 工程 skill 集）的流程形态整套搬进 SillySpec（纯提示词承载纪律/无状态机无门禁/Skill-tool 互调/GLOSSARY 单文件常读/配置落盘 docs/agents/frontier 整轮齐发/spec 禁写文件路径）？
答案：拒绝。SillySpec 的存在理由是机器护栏（CLI 状态机+实测门+冻结对账），纯提示词纪律上限是 agent 自觉、下限没有。
否决理由：1) frontier 整轮齐发与 brainstorm P0 逐轮逐问状态机冲突；2) spec 禁写文件路径拆掉 NEW: 前缀机器对账数据源；3) 双轴并行子代理评审的成本抵触审查经济学三律且遮蔽已由 review.json 硬门禁兜底；4) triage 状态机需绑外部 tracker 违反工具中立性规约 00；5) Skill-tool 互调不可验证，{{include:}} 模板才是同构等价物；6) GLOSSARY 取代 knowledge 会拆大仓路由机制；7) 配置落盘 docs/agents 与 local.yaml 双源漂移；8) 不发 npm/PR 关门/newsletter 漏斗不适用（护城河是进程+SQLite+实测门）。吸收的是文本工程纪律（seam 约定/三层审查优先级/微设计/原语复用），不是流程形态。
复潮条件：无（除非放弃机器护栏内核=产品重定位）。单项技术观察性吸收（wayfinder/retro）不属本拒绝范围。
来源：2026-11-21 四视角调研收敛；决策登记变更 2026-11-22-roadmap-loop-closure D-001。

## 路线规划类资产归工具工作区而非项目 docs（D-002 位置裁决）

问题：ROADMAP/规划/路线类资产放项目 docs/ 还是工具工作区 .sillyspec/？
答案：归工具工作区 .sillyspec/docs/sillyspec/ROADMAP.md；项目 docs/ 不承载工具域路线。
否决理由：项目 docs/ 下的路线文件无工具消费——不进 knowledge 检索注入（防复潮为零）、无状态回写（路线与事实脱节），是死文档；.sillyspec/ 是长期项目资产区（knowledge/模块映射/归档全在其中）非临时目录。闭环三环：拒绝概念走 decisions→distill 进 knowledge（机器检索）、路线状态随归档回写（批次表状态列）、位置归工作区与 scan 文档同域。
复潮条件：工具出现 roadmap 一等公民命令族（sillyspec roadmap add/tick）时可重评位置与形态；在那之前手工回写状态列够用。
来源：2026-11-22 用户裁决（会话原话「不写到工作目录里有什么用/工作目录肯定不是临时目录」）；决策登记变更 2026-11-22-roadmap-loop-closure D-002；路径迁移映射 docs/ROADMAP.md→.sillyspec/docs/sillyspec/ROADMAP.md、docs/sillyspec/out-of-scope/→撤销归 knowledge。

## D-docs-011@v1 2026-11-22-recommend-anchor-recorrect——三个独立小改共用一单（同属提示词纪律面+机械修复）：①brainstorm.js 第 7 条提问分型协议追加「推荐附一手依据锚」增量句（推荐答案机制的实证弱点—
状态：implemented
变更：2026-11-22-recommend-anchor-recorrect
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-22-recommend-anchor-recorrect/design.md
文件：docs/prompt/_extract.mjs, docs/prompt/_extracted.json, src/run/prompt.js, src/stages/brainstorm.js, test/brainstorm-prompt-discipline.test.mjs, test/output-step-render.test.mjs, test/prompt-extract-portable.test.mjs, test/prompt-golden.json
最近确认：1751c740c8609053d7f274fa5dc782ab61cbfb86
理由：三个独立小改共用一单（同属提示词纪律面+机械修复）：①brainstorm.js 第 7 条提问分型协议追加「推荐附一手依据锚」增量句（推荐答案机制的实证弱点——无依据推荐被用户识破，机制解=把调研深度变成推荐的硬前置）；②prompt.js 两处 wait 交互指引输出各追加一句中途纠正协议（wait-what 形态：纠正语义→停→复述目标→确认→再继续；挂两处既注入点最小扰动，autoMeta 分支不注入与既有分支条件一致）；③_extract.mjs 输出前归一化 demo 目录绝对路径（root 由 __dirname 推导，worktree 下跑渗入绝对路径——归一化函数 export 供直测，端到端双环境逐字节一致）。选此方案因为三处均为增量行/纯函数归一，不动任何既有语义，金档再生即可验证。

## D-docs-012@v1 2026-11-22-include-param-primitives——按批 3a survey（docs/sillyspec/prompt-primitives-survey.md）施工路径分两步：①扩展 `src/run/sha
状态：implemented
变更：2026-11-22-include-param-primitives
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-22-include-param-primitives/design.md
文件：docs/prompt/_extracted.json, docs/prompt/brainstorm.md, docs/prompt/execute.md, docs/prompt/plan.md, docs/prompt/verify.md, src/run/shared.js, src/stages/brainstorm.js, src/stages/execute.js, src/stages/plan.js, src/stages/verify.js, templates/prompts/foreground-sync.md, templates/prompts/material-pack-baseline.md, templates/prompts/review-subagent-discipline.md, templates/prompts/review-unsupervised-exempt.md, test/prompt-golden.json, test/prompt-include-params.test.mjs
最近确认：97c2b0a153618ea8a6f4e16a4ef4dadab9e00d9c
理由：按批 3a survey（docs/sillyspec/prompt-primitives-survey.md）施工路径分两步：①扩展 `src/run/shared.js` 的 resolvePromptIncludes——正则支持 `{{include: name|key=value|key2=value2}}` 参数段，模板文件内 `{{param:key}}` 占位被实参替换（缺参保留原样+warn；无参写法向后兼容；模板缺失保留占位符 warn 的 fail-soft 哲学不变）；②按 survey 顺序抽取四条高优原语进 templates/prompts/——高 2（前台同步禁后台，零参数直抽 ×2 处）与高 5（评审豁免，零参数直抽 ×3 处独立块，execute.js dispatchExec 段的指针句保留不动）；高 4（审查子代理纪律包，budget/scope 参数）与高 9（材料包基准面，pack 参数）参数化抽取，阶段特有差异段（既往勿重验/gate 重试修复）按最小扰动保留 stage 原文。选此方案因为共性进模板单一源+侧重走参数是 survey D 节既定路径，且每批抽取后金档可机械验证。

## D-docs-013@v1 2026-11-26-unavailable-wording-fix——只做三处文案订正，零逻辑改动： 1. `.sillyspec/local.yaml`：commands 段注释改为如实描述——`test: unavailabl
状态：implemented
变更：2026-11-26-unavailable-wording-fix
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-26-unavailable-wording-fix/design.md
文件：docs/sillyspec/file-lifecycle.md, src/stages/archive.js
最近确认：fe8f2eb82f23077004fbe816502adc814bcb7c15
理由：只做三处文案订正，零逻辑改动： 1. `.sillyspec/local.yaml`：commands 段注释改为如实描述——`test: unavailable` 仅取消显式命令，`extractTestCommand` 返回 null 后 `runFullCommand` 回退 `inferFullTestCommand` 结构推断照跑（引 `src/verify-postcheck.js:3056-3068`）；删除「unavailable→skip 逃逸」「关闭亲跑」表述。 2. `src/stages/archive.js:12`：首步注释同款订正（删除「D-008 关闭亲跑」）。 3. `docs/sillyspec/file-lifecycle.md:53`：archive 行「D-008 关闭亲跑留痕归 CI」改为如实语义。 选择「只改文字、不改配置取值」：用户明确选择「保持测试照跑 + 只订正文案」；改取值为空命令或 skip 都会改变实测行为，与选择相悖。

## D-docs-014@v1 2026-11-28-docs-anchor-repair——答：pre-push 的 docs gate 按「失效数 ≤ 基线」ratchet 拦截推送，当前工作区 155 处失效（HEAD 模式 186）— 绝大多数是
状态：implemented
变更：2026-11-28-docs-anchor-repair
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-28-docs-anchor-repair/design.md
文件：docs/sillyspec/archify-reference-analysis-2026-09-04.md, docs/sillyspec/architecture-4a.md, docs/sillyspec/doc-consistency-debt.md, docs/sillyspec/file-lifecycle.md, docs/sillyspec/platform-interface-map.md, docs/sillyspec/prompt-control-debt.md, docs/sillyspec/review-2026-08-20-full-audit.md, docs/sillyspec/sillyhub-path-a-contract.md, docs/troubleshooting.md
最近确认：3790c73790f0fafd315e9435cc9254fa62c3b255
理由：答：pre-push 的 docs gate 按「失效数 ≤ 基线」ratchet 拦截推送，当前工作区 155 处失效（HEAD 模式 186）— 绝大多数是 `repo://sillyhub/...` 跨仓引用随代码重构产生的行号漂移，以及 `2026-11-26-verify-stage-retire` 删除 verify 阶段后的过时路径。使用工具自带 `docs check --fix` 批量重锚可自动定位项（D-006 保守：歧义/无 token 线索保留待人工），一次性消除 93 处，剩余 62 处按原样留作存量（不硬改语义）。
