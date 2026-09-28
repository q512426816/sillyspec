---
author: flow-machine-draft
created_at: 2026-09-28T14:14:25.941Z
---
# 设计记录（Design Record）— 2026-09-28-sentinel-mirror-waiver

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-mirror-waiver 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：sentinel-assertions.js 加任务来源维度——mirroredTaskIds（当前 tasks.md 与机器稿基线逐字相同的任务行 id 集）＋detectFakeCheckCompletion 增 baselineTasksMd 参数（镜像勾选免 per-task 证据、missing 只含覆写任务、返回增 mirrored 列）。消费方三处接线：flow done 哨兵（readBaselineTasks 读 route-hindsight-baseline 快照，拒收文案不变＋镜像豁免 info 行；勾选节奏 advisory 仅在非镜像任务面存在时提示）、quick-audit 同判同基线、watcher R1 人判警告过滤镜像翻格。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-mirror-waiver 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：detectFakeCheckCompletion({changeDir, tasksMd, commits, baselineTasksMd?, opts?}) → {status, claimTotal, checked, missing, mirrored: string[]}；mirroredTaskIds({tasksMd, baselineTasksMd}) → Set<string>（纯函数导出）；route-hindsight 新导出 readBaselineTasks({specBase, change}) → string|null（缺件 null=fail-safe 从严）。无基线快照时行为与旧版逐字节一致（fail-safe）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-mirror-waiver 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：纯函数判据＋收口时点单趟只读（基线快照首写者胜幂等，watcher 侧判别 best-effort 读失败按无豁免从严）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-mirror-waiver 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：①agent 故意不覆写任务面借镜像豁免绕 per-task 证据——镜像任务即成功标准镜像，其交付由实测门/patch/review 整体背书，绕的是重复记账不是交付门（守卫语义不弱化：覆写任务仍拒收无证据勾选，Drill 2 实证）；②基线快照缺失（旧变更/快照失败）→ fail-safe 全量从严（旧行为）；③比对经行分割与 trim 归一——行尾/首尾空白漂移仍判镜像（宽松面有界：任何内容改写即判非镜像从严）。死路=给镜像任务也造 per-task 证据仪式（改写任务+amend token——本会话三连 workaround 实证是纯仪式）。退役判据=镜像豁免面出现真实假勾选逃逸案例（实测门绿但成功标准未兑现且无 review 拦截）。
