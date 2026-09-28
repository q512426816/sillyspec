---
author: flow-machine-draft
created_at: 2026-09-28T09:57:02.602Z
---
# 设计记录（Design Record）— 2026-09-28-watcher-signal-widen

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-watcher-signal-widen 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
四件：① buildSnapshot 增两源——verify-runs 本变更最新实测结论（目录名字典序即时序，gateRun={dir,status,durationMs}）与 specBase local.yaml mtime 事实（localConfig，gitignored 无 git 信号）；② inferEvents 增两条中性事件——gate-run（实测结论变化，含耗时；经 baseEvents 非空自然计入 ruleStall 的 lastActivityAt，停滞判定获得门活动信号）与 config-change（配置变更事实，内容不上行）；③ ruleFakeCheck 改带状态消解——无证据翻格记 fakeCheckPending 并警告，后续拍位证据补齐（提交晚到 36 秒是 guidance-principles 实证常态）发 fake-check-cleared info 事件（含提交号）并清 pending，时间线可见消解而非永挂；④ stripNestedTestEnv 抽为导出共用单点，runCrossRepoFullTest 与 runFullCommand 两处 execSync 补剥离（tap-judge 评审 P3 同族面）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-watcher-signal-widen 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
watcher.js：buildSnapshot 两源、inferEvents 两事件、ruleFakeCheck 签名加 state、createSentinelState 增 fakeCheckPending、dispatch 传 st；verify-postcheck.js：stripNestedTestEnv 导出、runOneModule 换用、两处 execSync 应用；test/watcher.test.mjs 增两用例。平台事件契约零变化（新 kind 走既有单事件上行端点）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-watcher-signal-widen 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：verify-runs 目录名字典序取最新，半写文件 JSON 解析失败跳过下轮重试。2. 并发写：watcher 只读快照 diff。3. 切换：pending 状态随水位文件持久（watcher 重启回补既有机制覆盖）；warning/info 皆 provisional。4. 作用域：gateRun 按 change 字段过滤只读本变更；localConfig 只留 mtime 不读内容。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-watcher-signal-widen 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：verify-runs 全目录逐文件 JSON 解析在运行目录多时变慢——3s 轮询周期内条目有限（实测当日 ~60 目录），必要时后续加目录名倒序早退。放弃方案：假勾选改「区间终态判定不预警」（丢失即时信号，拍位消解两全）；watcher 直读 local.yaml 内容上事件（隐私面拒绝）。
