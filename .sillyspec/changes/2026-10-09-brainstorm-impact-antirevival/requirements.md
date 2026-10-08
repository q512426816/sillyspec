---
author: flow-machine-draft
created_at: 2026-10-08T17:13:03.280Z
---
# 需求规格（Requirements）— 2026-10-09-brainstorm-impact-antirevival

## 功能需求

### FR-01: knowledge-graph.js 新导出 impactFromDecisionsMd(graph, decisionsMd)：键=锚点：路径 ∪ 模块域：模块 id（剥 NEW: 前缀，未入图跳过）→ 逐键 graphImpact → rejectedReachable 去重合并，条目带 viaImpact 标记（parseDecisionEntries 原生形态，消费方零重解析）

- impactFromDecisionsMd(graph, text) 必须以 decisions.md 机器校验字段为键（锚点：路径 ∪ 模块域：模块 id，NEW: 前缀剥除），逐键 graphImpact 取 rejectedReachable，按 file+id+change 去重合并；条目必须为 parseDecisionEntries 原生形态 + viaImpact/impactKey 标记；键未入图必须静默跳过；空文本必须返回 []。

#### 场景：双键命中

- Given fixture decisions.md 含 `- 锚点：src/foo.js:10` 与 `- 模块域: core-engine, NEW:future-mod`；When 执行；Then rejected D-001@v1@alpha 经 src/foo.js 锚点键可达且带 viaImpact，future-mod 未入图跳过不抛。

#### 场景：模块键经交付面可达

- Given `- 模块域: core`（该模块域内有 alpha 变更交付文件）；When 执行；Then alpha 的 rejected 决策经 change-modules 强边（本体设计）进入可达集。

### FR-02: complete.js 方案步 gate：词面命中（含既有零分不弹过滤）之后并入 impact 可达集——viaImpact 条目绕过 score>0 门槛（结构可达即防复潮先验，与死路同待遇），与词面命中按 file+id+change 去重，过既有已回应不重弹过滤，渲染带 impact 可达注记；图构建 fail-soft

- complete.js 方案步 knowledge-gate 必须在词面命中之后并入 impactFromDecisionsMd 可达集：viaImpact 条目必须绕过 score>0 门槛；与词面命中按 file+id+change 去重；必须过既有已回应不重弹过滤；渲染必须带 🧭impact 可达注记；图构建异常必须 fail-soft 不阻断门。

#### 场景：保底进场

- Given 方案步 --done 时 decisions.md 有模块域键、词面三层零命中；Then 可达 rejected/死路条目仍进回显（含键与注记）。

#### 场景：fail-soft

- Given 图构建抛错；Then 门照常按词面命中面输出，无异常冒泡。

### FR-03: 测试：⑪ impactFromDecisionsMd 单元面（fixture 锚点+模块域双键命中 rejected 条目 / NEW: 前缀剥除 / 未知模块跳过 / 空文本零返回）+ gate 合并去重路径

- 测试必须覆盖 impactFromDecisionsMd 单元面：双键命中 / viaImpact 标记 / NEW: 前缀剥除 / 未入图模块跳过 / 空文本与无字段文本零返回 / 模块键经交付面可达正例（执行期实测修正：模块键可达是本体设计预期，原「无锚定→空」预期错误）。

#### 场景：回归钉

- Given 修复落盘；When node --test test/knowledge-graph.test.mjs；Then ⑫ 用例绿且既有全部用例绿。

### FR-04: 全量测试与 lint 零回归；D-004 纪律保持（键全部来自 decisions.md 机器校验字段，不解析自由文本）

- 全量测试必须绿（test:core）、lint 必须零告警；键源必须限于 decisions.md 机器校验字段（锚点/模块域），禁止解析 agent 自由文本作图查询键（D-004 纪律）。

#### 场景：纪律面

- Given 代码审查；Then impactFromDecisionsMd 仅为字段正则提取 + 图遍历，无 --output/正文自由文本入键路径。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「⑫impactFromDecisionsMd：锚点+模块域双结构键 → graphImpact 可达集（2026-10-09-brainstorm-impact-antirevival）」
FR-02: test/knowledge-gate-denoise.test.mjs「（词面过滤与已回应不重弹既有回归面——impact 并入复用同一管线，3 用例全绿）」+ 渲染注记源码断言（complete.js 🧭impact 可达渲染行）
FR-03: test/knowledge-graph.test.mjs「⑫impactFromDecisionsMd」（NEW: 剥除/未入图跳过/空文本/模块键交付面正例）
FR-04: test:core 325 全绿 + npm run lint 零告警（verify-runs 留档）
