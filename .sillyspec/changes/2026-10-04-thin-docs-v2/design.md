---
author: flow-machine-draft
created_at: 2026-10-04T14:42:22.748Z
---
# 设计记录（Design Record）— 2026-10-04-thin-docs-v2

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-04-thin-docs-v2 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
双代并存而非迁移：draftAll 改产 v2 纯 markdown 稿（零指纹标记零槽注释），防篡改锚点（成功标准原文+四问文本+首版全文）搬进 .runtime 的 draft-ledger（schemaVersion:2.anchor）；flow done 工件子步按 ledger 代别双轨——v2 走 verifyThinDocsV2 文档↔锚对比（问题被删/节空答/FR 缺强度词/绑定空拒收；锚失踪出漂移 advisory），v1 在途变更走原 verifyMarkers 指纹三态零影响。spec 断点机器化：flow approve 子命令落批准留痕 + start --autopilot 显式豁免，v2 变更无两者之一在 done 拒收。摘录端退役三类静默变形（复合拆分/编号劫持/镜像行截断）；GWT 场景体预填退役（FR=标题锚+待撰写指引，行为句归 agent）；flow-review/flow-parity/status 相位/绑定门与提取按双格式分支。选此方案因为它保住三条既有不变量（问题必被问/门柱不挪/守卫在验收侧）的同时把阅读面清干净——对照 OpenSpec（排版好但零保护零漂移感知）与厚道（门禁好但薄道用不起全尺寸）各取一半。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-04-thin-docs-v2 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/flow-draft.js 新导出：DESIGN_QUESTIONS（四问单一源常量）、DRAFT_SCHEMA_V2=2、verifyThinDocsV2({changeDir,ledger,skipDesign})→{violations,advisories}；draftAll 返回值新增 schema:2、ledger 结构 v2（anchor.criteria/designQuestions + files.<file>.text）；verifyFlowDrafts 返回值新增 schema(1|2)与 advisories、签名新增 opts.skipDesign；verifyRequirementBindings/extractRequirementBindings/ensureBindingSlots 双格式（v2 纯文本绑定行 `FR-NN: 内容`）；extractSuccessCriteria 摘录语义变更（编号/复合不劫不拆，opts.numberedChannel 兼容恒无效）；v1 起草族保留供 redraft 双轨。src/flow.js 新增 cmdFlowApprove（flow approve --change [--by]）与 cmdFlowStart autopilot 参数；cmdFlowDone artifacts 子步双轨+断点门+漂移 advisory+绑定自动补全 v2 行形态；flow status 相位快检双格式。src/flow-review.js 新导出 readV2SectionAnswer、stripV2QuestionLines（v2 问题行剥离防承诺词自污染）。src/flow-parity.js harvestSlot4Decision 无槽标记时改读「风险与死路」节正文。命令族经 cmdFlow 分发零 index.js 改动；draft-ledger 是 .runtime 机器态非对外契约，无破坏性文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-04-thin-docs-v2 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：ledger 代别是文件内单值常量（schemaVersion 写定后不变），无事件序依赖；升级窗口内 v1 在途变更的 redraft/verify 按各自 ledger 代别选轨；旧 CLI 读新 v2 ledger 会走 v1 分支找不到段结构——v2 起始无存量（合入瞬间起的新代），属 schema 代际更替既知形态。
2. 并发写：draft-ledger 与四件文档均 CLI 单一写入方（writeAtomicSync 原子写）；agent 编辑文档与 CLI 校验是读时点快照关系，校验失败重跑幂等（artifacts 子步幂等跳过既有语义）；本会话与并行会话共享 flow.js 的写冲突用「stash 对方 hunks→实现→pathspec 提交→pop 还原」窗口收窄（编辑区域不重叠）。
3. 切换/生命周期：approve 留痕持久化 flow-state（断点跨会话可续）；断点拒收后重入 done 从 artifacts 子步续；漂移 advisory 非阻断不产生状态；ledger 首版全文（files.text）是漂移对比基准，amend 不覆盖。
4. 作用域：draft-ledger 按 change 名命名空间，多变更天然隔离；DESIGN_QUESTIONS 是模块级常量（进程内单例无漂移面）；approve 的 spec_approved 落各 change 自己的 flow-state，不跨仓不跨工作区；不触碰并行会话的变更目录。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-04-thin-docs-v2 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：approve 可被同机 agent 自己跑（CLI 无法区分键入者）——门的价值是仪式+留痕（谁/何时批）+评审抽查+平台侧核对，非绝对防伪；实证代批泛滥时的升级路径是把 approve 挂平台人工确认通道。次风险：v2 的 FR 质量从机器兜底退回 agent 撰写+强度词门——占位句/腰斩消失但烂行为句仍可能过门（强度词在句≠语义好），对冲是评审抽查与归档 FR 索引面。试过放弃：①在途 v1 变更全量迁移 v2（否决——改写 agent 正在作答的文档破坏书写面信任，双轨成本更低）；②openspec 式 WHEN/THEN bullet 场景行（否决——fr-index 归档解析认 Given/When/Then 行形态，收敛厚道格式零索引改动）；③断点门做成 advisory（否决——advisory 断点在 0/12 勾选事故已实证无牙，护栏#2 零 prompt 劝说）。
