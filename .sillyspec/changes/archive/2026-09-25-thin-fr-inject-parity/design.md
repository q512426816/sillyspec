---
author: flow-machine-draft
created_at: 2026-09-25T09:43:19.036Z
---
# 设计记录（Design Record）— 2026-09-25-thin-fr-inject-parity

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-inject-parity 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
src/flow.js 新增三个导出函数并接线五处：①flowKnowledgeDigest（触达域 active FR digest + matchKnowledge 否决/知识命中）注入 flow start 三路径简报尾部（fresh=--input 路径样 token 域路由、resume=基线 diff、adopt=design.md 交付清单，均走 resolveTouchedDomains filesOverride 旁路与 distill 同口径）；②rotSuspectFlow 接 ledger 子步（quick-done 钩子迁移：归属文件面→域→active FR 打待复核标记+遥测）；③frDupGateFlow 接 distill 子步 indexRequirements 前（brainstorm --done bigram≥0.6 判据迁移，advisory 双出路）。零新解析器——readActiveFrDigest/markFrNeedsReview/frTitleOverlap/matchKnowledge/discoverModuleIndex/appendKnowledgeHit 全部既有机制接线。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-inject-parity 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow.js 新导出：flowKnowledgeDigest({specBase,change,changeDir,input,filesOverride})→{lines,summary}、rotSuspectFlow({specBase,change,changeDir,files})、frDupGateFlow({specBase,change,changeDir,files})（JSDoc 在场）。CLI 可见面：flow start 简报尾部新增「🧠 知识注入」段 + json 输出新增 knowledgeDigest 字段；flow done ledger/distill 子步新增两类 advisory warn 与 fr-rot-suspect/fr-duplicate-warning 遥测事件（source=flow-done）。协议调用数不变（恒 2）；既有简报段与子步顺序零改动；printRecoveryBriefing 签名加可选 digestLines 参数（默认 []，既有调用零感知）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-inject-parity 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：注入段是 start 时点快照，干活期知识库变化不追发——resume 简报按基线 diff 重算域是刷新点；rot 打标在 done 时点执行，检测语义本就要求晚于干活。
2. 并发写：markFrNeedsReview 幂等（同 ref 跳过），多会话同域并发 done 重复标无害；appendKnowledgeHit 纯 appendFileSync 追加；rot（ledger 子步）与 indexRequirements 写（distill 子步）同一次 done 内严格有序不并发；注入段纯读零状态。
3. 切换/中断：三函数均 fail-open try/catch 包裹，异常零阻断协议面；中断重入时 rot 标记幂等、注入段重算纯读，无半态残留。
4. 作用域：specBase 由 CLI 传入（--spec-dir 外置根同口径）；测试夹具用临时目录验证隔离（buildSpecRoot 独立 tmp）；不触他仓知识库。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-inject-parity 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：--input 路径提取是启发式（可能误提取 URL 片段）——只作域路由输入，无模块前缀匹配即空域+一行诚实提示，无误伤面；bigram 0.6 阈值沿用 brainstorm 侧已校准判据（误报/漏报基线与厚道一致而非新造）。死路①：fresh 全量注入所有域 FR——信息量爆炸稀释注意力，弃；按域路由+空态提示是正确力度。死路②：把注入做成硬门（无命中阻断 start）——违反 2 调用协议精神，注入是读取面增强非门，弃。死路③：rot/dup 判定复制 quick-done/stage-contract 代码——复制即漂移（本次修的正是漂移病），全部 import 复用，弃。
