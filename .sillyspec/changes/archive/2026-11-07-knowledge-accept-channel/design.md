---
author: flow-machine-draft
created_at: 2026-11-06T16:51:35.827Z
---
# 设计记录（Design Record）— 2026-11-07-knowledge-accept-channel

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

proposed/ 待审区只进不出（CLI 侧核查实证：classify 只吃 uncategorized.md，proposed 零消费方，SKILL.md「仅用户明确要求才合并」指向不存在的命令）。方案：在 src/knowledge-classify.js 新增导出 `acceptProposedEntry` + CLI 入口 `cmdKnowledgeAccept`（stages/knowledge.js 二级路由挂 `accept` case）——读 proposed/<slug>.md 解析 frontmatter（category）/ `#` 标题 / 正文（剥 cmdPropose 生成的尾注分隔行），迁移原语全部复用 classify 既有私有件（normalizeTargetFile/categoryForTarget/resolveKeywords/detectEol/insertRouteLine + 同款追加块与 duplicate 判定，src/knowledge-classify.js:198-296），落盘顺序沿用「先追加后删除」（条目不丢可手工 revert），源清理=删除整个 proposed 文件（区别于 classify 删 uncategorized 段）。选复用而非改 classifyUncategorizedEntry 签名：该函数强耦合 uncategorized 寻址/删段（三通道寻址 qlId），扩参会牵动既有契约；平行函数共享私有件零回归。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 CLI 子命令：`sillyspec knowledge accept --id proposed/<slug> [--file <目标>] [--keywords a,b] [--section <覆盖标题>] [--dry-run]`；输出 JSON（ok/appendedTo/anchor/keywords/skippedReason/dryRun.plan）。--id 容错裸 slug（自动补 proposed/ 前缀）。
- 新增导出：`acceptProposedEntry({ knowledgeDir, id, targetFile, keywords, sectionTitle, dryRun, runtimeDir })`（src/knowledge-classify.js）；`cmdKnowledgeAccept(dir, args, opts)` 同文件。
- 行为变化：`knowledge inbox`（cmdKnowledgeInbox）输出新增 proposed 待审清单段（slug+标题+积压天数，目录为空零输出）；`knowledge digest`（collectKnowledgeDigest）新增 proposed 积压信号项（>0 info、≥6 warn——阈值取本仓当前积压实证量级，对齐既有信号风格）。
- 既有 classifyUncategorizedEntry/cmdKnowledgeClassify：签名与行为零变化。
- SKILL.md：proposed 规则行改指向 accept；命令表加 accept 行。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：成立。accept 是单条目原子的同步命令（读→校验→追加→INDEX→删源一次完成），无事件流；重复执行走 duplicate-title 幂等；--id 与 --file 均为确定性寻址。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：与 classify 同款语义——追加块 append-only（appendFileSync 原子性由 OS 单 write 保证，块内完整）；INDEX 与源删除走 writeAtomicSync；并发 accept 同一条目时后到者读到源文件已删 → 结构化报错 proposed_not_found（无重复追加路径）；并发 accept 不同条目到同一目标文件为两个 append 竞争，块完整性由单 write 保证，INDEX 行插入冲突窗口与 classify 既有窗口一致（未引入新面）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全。落盘顺序先追加后删源（中断最坏态=条目已进目标文件但 proposed 残留 → 重跑 accept 走 duplicate-title 收尾，无丢失路径）；INDEX 写在追加后删源前，中断最坏态=路由行已加但源未删 → 重跑幂等收敛。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会。knowledgeDir 由调用方（stages/knowledge.js 解析 dir/specDir）既有作用域逻辑决定，本函数只在其内操作；proposed/<slug> 路径来自 --id 归一（剥 '../' 类越界输入由 join 后的前缀校验拒绝——id 含路径分隔时仅接受 proposed/ 前缀形态）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：合并进目标文件的知识质量无门（proposed 正文自由文本，accept 不做语义判断）——治理上以「用户确认条目后才跑 accept」纪律约束（SKILL.md 规则），四段模板校验属 K 形态契约变更（治理路径序 2），本变更不越位。放弃的方案：① 扩展 classifyUncategorizedEntry 加 proposed 源——三通道寻址（qlId/尾注/模糊）对 proposed 无意义且扩参牵动既有契约与测试面，放弃；② 平台侧合并为主 CLI 为辅——平台合并写服务器镜像，本地 git 仓无回路（平台侧核查结论），本地真相源语义下 CLI 侧必须有等价命令，放弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-classify.js | 新增 acceptProposedEntry 导出 + cmdKnowledgeAccept CLI 入口（复用私有件）；cmdKnowledgeInbox 补 proposed 清单段；digest 信号集补 proposed 积压 |
| 修改 | src/stages/knowledge.js | cmdKnowledge 二级路由挂 case 'accept'；--help 子命令清单与用法行同步 |
| 修改 | .claude/skills/sillyspec-knowledge/SKILL.md | proposed 规则行指向 accept；命令表加 accept 行 |
| 新增 | NEW:test/knowledge-accept-channel.test.mjs | T1~T7 七组用例（主路径/category 路由与报错/duplicate 幂等/dry-run/inbox+digest/SKILL 同步/病态文件） |
