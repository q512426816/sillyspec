---
author: qinyi
created_at: 2026-08-18T15:00:00+08:00
updated_at: 2026-08-18T16:20:00+08:00
---

# 决策台账 — platform-interface-map 锚点自动生成（revision 2）

## D-001@v1: 本次调研边界
- type: boundary
- status: superseded
- source: user
- question: 本次调研是否以落地实现为目标？
- answer:（已废弃）只调研，产出可行性评估 + 设计草案，不进入实现。
- normalized_requirement:（已废弃）
- impacts: []
- evidence: brainstorm step3 用户回答 "1"（首轮）
- priority: P0

## D-001@v2: 进入落地实现
- type: boundary
- status: accepted
- supersedes: D-001@v1
- source: user
- question: 调研完成后是否落地？
- answer: 用户裁决 revision 2 方案 A 后推进 plan → execute 落地实现。
- normalized_requirement: 按 design.md（revision 2）+ plan.md 执行代码实现与测试。
- impacts: [plan, execute, verify, archive]
- evidence: 用户 "继续" 指令推进 plan 阶段（2026-08-18）；plan-review 子代理推荐修正 #1
- priority: P0

## D-002@v1: 采用源码注释锚标记
- type: architecture
- status: superseded
- source: code-analysis
- question: 用什么方式在源码侧声明锚点？
- answer:（已废弃）结构化单行注释 // #doc:namespace:anchor。
- normalized_requirement:（已废弃）
- impacts: []
- evidence: 首轮方案比较；revision 2 用户裁决弃用
- priority: P0

## D-002@v2: 零侵入自动重锚
- type: architecture
- status: accepted
- supersedes: D-002@v1
- source: user
- question: 锚点维护机制采用哪条路线？
- answer: 零侵入：给 docs check 加 --fix，按 suggestLines 的 token 搜索结果自动改写失效行号。源码零注释、文档零改造。
- normalized_requirement: 修复机制只依赖现有 token 断言层产出；不得引入源码侧锚标记协议。
- impacts: [FR-01~FR-05, design.md §5]
- evidence: revision 2 方案谱系比较（A/B/C），用户选择 A；决策依据——token 已是现成语义锚且大多唯一，锚名命名空间与 token 职能重复，且锚标记未消除事后跑脚本动作反而引入锚注释静默漂移新失败模式。
- priority: P0

## D-003@v1: 文档占位符格式（{{...}} 形态）
- type: architecture
- status: superseded
- source: code-analysis
- question: 文档中如何表达待生成的行号？
- answer:（已废弃）file.js:{{namespace:anchor}}——经 Design Grill 实测发现不被 REF_RE 匹配，静默跳过致 fail-closed 失效。
- impacts: []
- evidence: 首轮 review.json P1 blocker
- priority: P0

## D-003@v2-rev1: 文档占位符格式（file.js:0#ns:anchor 形态）
- type: architecture
- status: superseded
- source: design-grill
- question: 占位符如何兼容 REF_RE？
- answer:（已废弃随 rev1 方案）file.js:0#namespace:anchor，被 REF_RE 匹配为行号 0 超界实现 fail-closed。技术结论有效但随方案 B 弃用。
- impacts: []
- evidence: 首轮实测 collectDocRefs 匹配到 start=0
- priority: P0

## D-003@v2: 文档保持标准 file:line
- type: architecture
- status: accepted
- supersedes: D-003@v2-rev1
- source: user
- question: 文档引用形态是否改变？
- answer: 不改。文档永远是人类最易读的标准 file:line；不存在中间态占位符。
- normalized_requirement: 任何方案不得要求文档先改造为占位符/符号引用形态。
- impacts: [FR-01, design.md §5.1]
- evidence: revision 2 方案 A 核心属性
- priority: P0

## D-004@v1: 生成脚本与现有校验的关系
- type: compatibility
- status: accepted
- source: code-analysis
- question: 自动修复是否替代 docs-check？
- answer: 不替代。--fix 是 docs check 的增量 flag；校验逻辑、ratchet 门、pre-push 链路零改动。
- normalized_requirement: 无 --fix 时 CLI 行为与现状完全一致。
- impacts: [FR-04, design.md §9]
- evidence: docs-gate ratchet 机制；flag 缺省即旧路径
- priority: P0

## D-005@v1: 不引入 AST 解析依赖
- type: boundary
- status: accepted
- source: design-discipline
- question: 是否需要解析源码定位锚点？
- answer: 不需要。token 子串搜索（suggestLines 已实现）足够；方案 A 天然满足。
- normalized_requirement: 零第三方新增依赖，零新脚本文件。
- impacts: [design.md §3]
- evidence: 技术栈纯 JS 无构建；suggestLines 现成
- priority: P1

## D-006@v1: 多命中歧义保守处理
- type: boundary
- status: accepted
- source: design-discipline
- question: token 多处命中时自动选哪个？
- answer: 默认不自动修，报告候选列表交人工；--force 逃生口默认关闭。
- normalized_requirement: 自动修复只发生在 suggest 恰好单命中的确定性场景。
- impacts: [FR-03, design.md §5.1/§10 R-01]
- evidence: revision 2 设计新增；保守优先于方便
- priority: P1
