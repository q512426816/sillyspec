---
author: qinyi
created_at: 2026-09-21T16:20:00
---

# 决策记录（Decisions）— R5 效率优化第 2 批

## D-001@v1: F7 缓存粒度=步骤指引静态段，动态段永不缓存
- type: design
- question: 指纹增量缓存到哪一层？整步输出 or 静态段？
- answer: 只缓存静态段（persona/prompt 模板/铁律）。动态注入段（材料包/知识命中/{DOCS_DEBT}/进度快照）每次不同，缓存即给错数据。
- normalized_requirement: outputStep 渲染按「静态段指纹 → 复入短输出+落盘路径 / 首见全量+落盘」分流；动态段独立渲染常驻。
- impacts: [run/prompt.js, .runtime/step-guides/]
- evidence: round5 P8（252KB 全量重印实测）；动态段含每次变化的数据（batch1 材料包/知识命中机制）
- 故障面: 指纹误判「未变」会给旧指引——指纹=sha256(静态段) 内容寻址，无此面
- 退役判据: R5 重跑指令注入体积未降（<50% 当前值）→ 机制化到 CLI 输出协议层

## D-002@v2: 快照分叉态=取 worktree 血统（三态显式，仅改分叉态）
- question: 双写分叉态的取材判据怎么改？
- answer: 现行=merge-base 祖先内容三方比对（源码核实，v1 的 mtime 表述系错引已废弃）。三态：①cwdDiff&&!wtDiff 取主仓（2026-09-20 保护场景不动）②wtDiff&&!cwdDiff 取 worktree（不动）③双写分叉**改取 worktree**（定向跑语义=验本变更分支交付；主仓侧同文件异动=干扰，batch1 实证）+警告补对齐指引。
- normalized_requirement: 仅改 :424-426 分叉分支取 worktree；三态各一回归钉（保护/正常/分叉）；既有 5 快照测试零回归。
- impacts: [run/gate-snapshot.js, verify 门禁]
- evidence: batch1 verify 首跑假红实证（verify-quality-scan json 首跑 failed + apply 集成后 569/569）+ Grill P1/P2-1（agent_1828171b 源码核验 :384-436）
- 故障面: 分支版本本身过期（apply 未做三方合并）→ apply 流程已处理 EXCLUDE-MISMATCH，非本判据职责
- 退役判据: 无（正确性修复）

## D-003@v1: PLAN 分组=CLI 预计算默认注入，agent 可偏离须披露
- question: 派发粒度升组，机械定还是 agent 定？
- answer: CLI 按第 1 批三条件（正交/无契约链/≤3）机械预计算推荐分组注入派发段；agent 保留裁决权，偏离须在 Wave 摘要披露理由——机械建议不夺权（歧义裁决权限既有语义一致）。
- impacts: [stages/execute.js 派发段, plan-postcheck checkBatchAdvisory]
- evidence: P13（15 卡 3 批 19min 实证）+ GSD execute_waves 文件重叠检查同款思路
- 故障面: 预分组错误（误并契约任务）→ 三条件含契约链检查，且 agent 可偏离——双层防线
- 退役判据: 重跑对撞组均交接数未降 → 检查注入面是否被 agent 无视

## D-004@v1: direct 模式=frontmatter 通道，缺省 dispatch，判据自动化留第 3 批
- question: 主代理直写通道怎么开、何时开？
- answer: plan.md frontmatter execution_mode: main|dispatch，缺省 dispatch（零回归）；main=渲染切直写指引（防线全保留：worktree/守卫/review/verify 只换宿主）。何时自动建议 main = ceremony 决策密度轴（第 3 批），本批由 agent 声明。
- impacts: [stages/plan.js frontmatter, stages/execute.js 渲染分支]
- evidence: 对撞 A 组 7′ vs B 70′；GSD 对照纠错记录（第十一节：GSD 无此模式，本通道为本仓数据结论——防误考据标注）
- 故障面: agent 滥声明 main 跳过审查 → 审查/verify 门禁与模式无关恒在；误用只损失并行收益不损失防线
- 退役判据: 重跑对撞 main 模式 token/墙钟未达 1.3×/25′ → 通道保留但缺省回 dispatch-only 文档化

## D-005@v1: 计划漏覆盖连带面归 Wave 4 task-05 收口（执行期主代理裁决，累计四项）
- type: execution-scope
- question: task-03/04/05 实现期暴露四处不在任何 task allowed_paths 的连带面：①test/verify-gate-snapshot.test.mjs:146 钉 ③态取主仓旧语义，task-02 D-002@v2 翻转（分叉取 worktree）后确定性红（Wave 1 起即失败，task-02 已翻同类 trim 套件、漏此文件）；②docs/sillyspec/platform-interface-map.md:L109 锚 execute.js:1272 行号漂移（task-04 execute.js 增行推移 dispatchMode 判定行）；③design 文件变更清单漏列 modules/runtime.md/.changelog.md（module-impact 首版「更新结果」表明确列 runtime.md 为 M1/M2 行为行 target，_module-map 映照 run/*→runtime）；④docs/sillyspec/prompt-control-debt.md:L209 锚 prompt.js:910 行号漂移（存量失效——主仓 HEAD 态即失配，关键词簇实落 ~1395；M1 增行会进一步推移，顺手重锚）——谁收口？
- answer: 均归 Wave 4 task-05（其目标本就是「docs-check 重锚收口」），执行时扩其 allowed_paths 加 platform-interface-map.md、verify-gate-snapshot.test.mjs、runtime 模块卡对、prompt-control-debt.md：①按 gate-snapshot-ancestor-trim 同款先例翻转期望（设计批准的语义变更非测试放水）；②④行号重锚到当前源码；③按 module-impact target 补 runtime 卡行为行+changelog。不回改已 review 的 task-02/03/04 diff，不在其 allowed_paths 内越界修。
- impacts: [task-05 卡 allowed_paths 扩六文件, docs/sillyspec/platform-interface-map.md, test/verify-gate-snapshot.test.mjs, docs/sillyspec/prompt-control-debt.md, modules/runtime.md+changelog]
- evidence: doc-ref-check 1/93 失效输出（execute.js:1272 关键词窗口失配）；verify-gate-snapshot 5 用例 4 过 1 红、断言文案自证为 ③态旧语义（基线 f=1 / worktree f=2 / 主仓 f=3 → 期望取主仓）；docs check 1/621 失效（prompt.js:910 关键词簇 generateExecuteRunId/readFileSync 实落 worktree :1395-1402，主仓两文件均零改动自证存量）
- 故障面: 无（文档行号重锚 ×2 + 1 条测试期望翻转 + 模块卡行为行，均有既定决策/先例/module-impact target 背书）
- 退役判据: 无（一次性收口）
