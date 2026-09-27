---
author: flow-machine-draft
created_at: 2026-09-27T14:15:28.923Z
---
# 设计记录（Design Record）— 2026-09-27-watcher-push-endpoint

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-watcher-push-endpoint 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
watcher 事件推送端点从废弃分支的批量 /api/observation/events（ObservationEventIn 六键契约）切换到平台 HEAD 现端点 POST /api/changes/{name}/events（单条 ChangeEventPushRequest）。映射函数 toObservationEvents → toPlatformChangeEvents（stage 以「stage · note」前缀并入 detail 文本——平台 timeline 任务面推断与人类可读双用）；pushEventsToPlatform 由批量分块改逐条 POST（失败即弃语义不变，本地 jsonl 兜底）。修复后已全量回填主仓 30 变更约 760 条历史事件到远程平台库实证链路通。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-watcher-push-endpoint 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/watcher.js：导出 toObservationEvents 更名 toPlatformChangeEvents（签名去 changeName 参数——新契约 change 名在 URL 路径）；pushEventsToPlatform 签名不变（行为面：URL/请求体/逐条）。OBSERVATION_BATCH_MAX 常量删除（批量闸随批量端点消亡）。模块头注释同步。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-watcher-push-endpoint 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：不适用——推送是 fire-and-forget 单事件，无顺序依赖；平台端 dedup_key（无 id 回退 ts+rule）幂等吸收重推。
2. 并发写：watcher 单飞锁（既有机制）保证单进程推送；平台侧唯一约束兜底并发重推。
3. 切换/生命周期：失败即弃剩余批次（旧语义不变）——丢的事件仍在本地 jsonl 真相源，回填/重推可恢复；5s/条超时防挂死。
4. 作用域：change 名在 URL 路径逐变更隔离；workspace 由 shpsync token 派生（平台侧），无串台面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-watcher-push-endpoint 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：平台端点再次演进（本仓注释曾指向已消亡的 observation 端点）——缓解：模块头注释锚定端点出处变更名（change-events-r18-full）可追溯；推送失败恒 warn 可见不静默吞。放弃方案：平台侧加 /api/observation/events 兼容层（在平台仓加死代码面更大，放弃）；恢复批量端点（平台已是单条契约且恒 200 语义，放弃）。
