---
author: flow-machine-draft
created_at: 2026-10-03T06:48:48.936Z
---
# 设计记录（Design Record）— 2026-10-03-voluntary-task-tick

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-voluntary-task-tick 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三层自愿路径，零新增拒收门（用户裁决：勾选走自愿+正反馈，不做验证强制——簿记缺失升格拒收会诱发打回重做循环）：
① 顺手动词：新增 `sillyspec task tick --change <名> --task task-NN`（src/task-tick.js 纯函数 + index.js 分派）——翻格幂等，回显「✅ N/M｜下一任务：task-XX」，watcher 既有 task-done 事件链自动上平台（纯反馈闭环，OpenSpec apply 循环闭环确认的本地对等物，自愿使用不违 D-007）。
② 常驻提示：flow start 执行循环文案、tasks.md 机器稿头注（flow-draft.js）、AGENTS.md（模板+仓实例）四处钉「做一件→测试绿→当场勾一格」并点名 harness TodoWrite 类工具不替代 tasks.md。
③ 收口自愈（不阻断）：flow done 哨兵区——勾选缺失 advisory 去掉「区间有提交」前提（0/12 事故根因之一：零提交全程静默）；任务面仍为机器镜像稿且全未勾且有交付（提交∨脏文件非空）→ 机器代勾全部镜像行（沿用 governance-autopilot 的 autopilot_ticked 留痕与节奏门降级机制，新增 mirror_autotick 标记供重入跳过假勾判定）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-voluntary-task-tick 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- 新命令：`sillyspec task tick --change <名> --task task-NN`（exit 0=翻格/幂等；exit 2=未知 id/缺 tasks.md/已归档）。与既有 task start/done/finish/list 同分派点，无 review/verdict 仪式（轻动词）。
- 新纯函数：`sentinel-assertions.js#isMirrorUntouchedFace({tasksMd, baselineTasksMd}) → {untouched, claimTotal}`；`task-tick.js#tickTasksMd({tasksMd, taskId}) → {kind:'ticked'|'already'|'unknown', tasksMd, checked, total, next|available}`。
- flow done 行为变化：advisory 触发条件收窄为 status='none'∧claimTotal>0∧checked===0（去掉 commitMessages.length>0 前提）；新增镜像未认领代勾分支（写 tasks.md + flow-state 增 mirror_autotick/autopilot_ticked 键——向后兼容，旧变更无键走原路径）。
- flow-state 新键：`mirror_autotick: true`（仅机器代勾时写；哨兵消费）。
- 文案面：flow start 输出段、tasks.md 机器稿头注、AGENTS.md 模板 templates/agents-instruction.md 与仓根实例——各加一处，不改既有门语义。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-voluntary-task-tick 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：代勾发生在 done 进程内哨兵判定之后，单进程顺序写无乱序面；watcher 事件迟到不判（节奏门 autopilot_ticked≥跳格数即降 advisory，读不到流 fail-open）。
2. 并发写：tasks.md 代勾走 writeAtomicSync（与 governance-autopilot 同款）；tick 动词同款原子写。两执行体同拍 tick 同一格：正则替换幂等（先写者翻格，后者见已勾走 already 分支）。与并行变更互不触碰（各 change 目录隔离）。
3. 切换/生命周期：done 代勾后若后续子步失败、agent 重跑 done——flow-state.mirror_autotick 留痕使哨兵跳过假勾判定（否则全勾+零提交会误判 fake 拒收，重入安全）；tick 动词无状态（幂等），中断零残留。
4. 作用域：tick/代勾均锚定 --change 目录；specBase 解析复用 resolvePlatformSpecDir（平台托管目录同规）；无跨仓写。归档后的 change tick 拒收（归档件只读）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-voluntary-task-tick 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：代勾被误读为「机器替 agent 撒谎」（勾了 agent 没勾的格）。边界已钉死：仅镜像未认领面（与机器稿逐字相同=agent 从未认领该任务面）且有交付证据才代勾，时间线/输出显式标注「收口代勾」来源；agent 已覆写任务面（认领过）绝不代勾——那是真漏账，走 advisory。次风险：存量在途变更（本变更之前 start 的）flow-state 无 mirror_autotick 键——重入走原判据（向后兼容零迁移）。
死路（已试弃）：① done 门硬拒收未认领面（用户裁决否——打回重做循环，agent 应对是补票行为而非纪律）；② per-task 时序配对硬门（2026-09-29-flow-task-heartbeat 弃案1 沿用否决——误伤一提交多 token 合法场景）；③ 中途强制心跳协议调用（违 D-007 thin 两调用形状）。
