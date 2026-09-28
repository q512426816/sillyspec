---
author: flow-machine-draft
created_at: 2026-09-28T06:08:30.981Z
---
# 设计记录（Design Record）— roadmap-copy-purge

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change roadmap-copy-purge 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
git rm 删除 .sillyspec/ROADMAP.md 一个文件，零代码改动。该文件是平台仓同名文件的过时污染拷贝（进仓提交 f8637765 坑5 有意提交止血、P2 延后；内容全为 SillyHub 平台变更条目，与本仓无关），status 阶段每轮 cat 进会话是误导源。CLI 侧 ROADMAP 读点全部条件化（stages/archive.js「存在→」、stages/status.js cat 带 2>/dev/null、run/next.js 绿地探测为面向用户自备文档的通用功能），删文件即自失活，无需改代码——清偿 f8637765 挂账的坑5 P2。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change roadmap-copy-purge 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
无函数/端点/命令/文件格式变更。交付面 = 删除一个 tracked 文件（.sillyspec/ROADMAP.md，git rm + 显式 pathspec 提交）。对外可见行为变化仅一处：sillyspec run status 的「项目基础信息」步第 5 条 cat 该文件从此输出空（cat 带 2>/dev/null 本就容缺），run/next.js 绿地路由分支 4 在本仓恒不可达（分支 2/3 优先命中），行为零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change roadmap-copy-purge 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到到达：不适用——纯静态文件删除，无输入/事件流；若有并行会话迟到重写该文件，会以 untracked 脏文件显式可见（不会静默复活 tracked 态）。
2. 并发写：git rm 与他会话对该文件的写竞争时，git index 操作原子；他侧若在写会冲突失败显式暴露，不产生半态。
3. 切换/生命周期：删除是单次原子 git 操作，无中间态；中断重入无残留（flow done 断点续）。
4. 作用域：仅本仓工作树一个路径，不跨仓不同步（平台仓的同名文件由变更 roadmap-retire 在彼仓独立处理，两删除互不牵连）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change roadmap-copy-purge 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：误判「无消费」——已全源码 grep 复核（ROADMAP 在 src/ 共 8 处：worktree.js×2 注释、complete-handlers×2 lite 豁免措辞、next.js×2 绿地探测、archive.js×1 条件指令、status.js×1 cat），无任何写侧、无条件不成立的读侧；.claude/skills 两处文案提及（archive 描述「+ 更新 ROADMAP」、explore cat 行）属提示面非行为面，文件缺席后自失活，留待后续产品级变更一并出清（不在本次批准面）。放弃的方案：保留但机器化维护—— lite/thin 归档豁免使其永远缺主力通道数据，且三套真源已覆盖，不值得维护。
