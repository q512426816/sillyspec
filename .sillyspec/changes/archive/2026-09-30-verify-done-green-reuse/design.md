---
author: flow-machine-draft
created_at: 2026-09-30T06:52:12.313Z
---
# 设计记录（Design Record）— 2026-09-30-verify-done-green-reuse

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-verify-done-green-reuse 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两处修复：①stage-contract.js 接口矩阵锚点泛化报错文案——原文案「证据缺用例依据锚点」中「用例依据」恰为矩阵第 3 列列名，而校验（apiEvidenceHasAnchorForm）只查第 5 列证据列；一周内两次把 agent 引向错列各卡三轮（2026-09-23 分诊只修了 design接口表# 分叉）。改为点名「证据列（矩阵第 5 列）缺锚点」并明示第 3 列不计。②gates.js runStageCompletionGates 的 verify --done test/lint 实测路径接入 R8 green-cache 同指纹复用（原只挂 machine-interface gate verify 模板）：指纹=主仓 HEAD+代码脏面（文档面剔除）+local.yaml，30min TTL，优先级 P2 账本>P0-1 质量扫描>green-cache>真跑，fail-open。实证来源：multi-agent-platform 2026-09-30 tool-report-activation 收敛循环码态恒定（12:59-14:15 零 commit）下 test 实测 10 轮 ×~290s 全真跑——账本 miss 即裸奔，本层兜住后 10 轮变 1 真跑+9 复用。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-verify-done-green-reuse 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- src/stage-contract.js judgeApiCoverageMatrix：泛化分支错误文案变更（「证据缺用例依据锚点（五形态之一）」→「证据列（矩阵第 5 列）缺锚点（五形态之一）——锚点只认证据列，写在第 3 列『用例依据』不计」）；判定逻辑零变化（ok/errors 集合不变，纯文案）。
- src/run/gates.js runStageCompletionGates（verify 专属块）：新增 green-cache 查询/复用/记绿三处接线——test 段优先级链插 greenHit 分支（合成 testCheck：status=passed + cached:true + reason=greenCacheNotice）、真跑 passed 后 storeGreenCache(kind:'test')；lint 段同款（P0-1 复用之后、真跑之前插命中分支，真跑 passed 后记绿 kind:'lint'）。对外 CLI 命令签名零变化；新增可观测输出行「♻️ … green-cache 同指纹复用」。
- 逃生阀复用 green-cache 既有 env：SILLYSPEC_GREEN_CACHE_OFF=1 / SILLYSPEC_GREEN_CACHE_TTL_MIN。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-verify-done-green-reuse 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：缓存写入在实测 passed 同步完成后（P2 记账旁），无乱序窗口；lookup 在真跑前单点查询，同进程内无迟到问题。
2. 并发写：两个会话同仓并发 --done——green-cache 文件为 per-change 单 JSON（green-cache/<change>.<kind>.json），storeGreenCache 整文件 writeFileSync 覆盖写：同指纹并发写内容幂等（同指纹同结果）；异指纹并发最后写者胜——败者下次 miss 重跑，fail-open 方向安全（最坏多跑一轮，绝不误复用）。
3. 切换/中断：--done 中途死→缓存未写→下次真跑（fail-closed）；缓存已写而后续门（parity/deletion）拦→rollback 后重入——缓存命中跳过的是 test/lint 实测本身，其余门照常重判，无状态残留（缓存 TTL 30min 自然过期兜底）。
4. 作用域：缓存文件落 resolveRuntimeRoot（per-project .sillyspec/.runtime），scope=changeName 隔离——跨仓/跨工作区不串台；快照模式下指纹取主仓 cwd/specBase（快照目录每轮不同不入指纹，快照内容=HEAD+变更 overlay 由主仓指纹等价描述）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-verify-done-green-reuse 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：缓存绿被误复用——「本次没跑但结论是绿的」若指纹口径有洞（如 local.yaml 恰好在两次 --done 间被改）会吃旧绿。防线：local.yaml 整文件哈希入指纹（改命令必 miss）+ TTL 30min + 文档面剔除只影响「文档改动不击穿」（代码改动必击穿）+ OFF 逃生阀。已放弃方案：a) verify 收口实测结果全量缓存（不过期）——违背 fail-closed，环境漂移（DB/网络态）会吃陈旧绿，弃；b) 只修文案不接缓存——文案消掉三轮试错但 10 轮 ×290s 的实测重复真跑原样保留（本次实证的大头），弃。已知残留：multi-agent-platform .runtime/green-cache/ 下有 0 字节 'change' 文件（14:13 产物），非本仓代码与项目代码所写（双仓 grep 零命中），不影响 lookup（文件名精确匹配永远 miss），留观察不入本变更。
