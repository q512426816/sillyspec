---
author: flow-machine-draft
created_at: 2026-09-27T16:20:57.122Z
---
# 设计记录（Design Record）— 2026-09-28-archive-timeline-bake

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-archive-timeline-bake 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
在 runArchiveChain（src/run/complete-handlers.js，flow done 与 run archive 双入口共用的归档执行链）的目录搬移成功之后、unregisterChange 与窄化 git add 之前，插入「时间线烤制」步骤：用与 `watcher timeline` CLI 完全相同的合成面（readWatcherEvents 读事件流 × loadChangeTasks/readBirthTs/flow-state tier × resolveCommitAnchors(gitQuiet) → renderTimeline），把渲染结果写为 destDir/timeline.md，原始事件 jsonl 字节副本写为 destDir/watcher-events.jsonl（带尺寸帽，超帽只烤 timeline.md 并在文件头注记）。烤制整体 try/catch fail-open，一行警告不阻断归档。另给 `watcher timeline` 命令加回退：本机 .runtime 无事件流时读归档包内副本并输出来源注记行。选此方案：零新落盘协议（纯归档链内一次性旁产物）、复用既有合成纯函数、不新增模块（模块图已覆盖 timeline.js/watcher.js，避新模块登记面）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-archive-timeline-bake 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- src/timeline.js 新增导出 renderBakedTimeline({ change, events, tasks, anchors, birthTs, tier, bakedAtIso, eventsCopySkipped }) → string（timeline.md 全文：快照头注记 + renderTimeline 输出）。
- src/watcher.js readWatcherEvents 增加可选 path 直读形态：传 path 时按该路径解析（同一坏行容忍语义），供 CLI 回退读归档副本。
- src/run/complete-handlers.js runArchiveChain 链内新增烤制步骤；新增导出 bakeArchiveTimeline（读事件流→合成→写两文件，供测试直调）。
- 归档目录新文件形态：archive/<变更名>/timeline.md 与 watcher-events.jsonl（随既有窄化 git add 进暂存，跨机进 git）。
- CLI 行为变化：`sillyspec watcher timeline --change <已归档>` 在 .runtime 无事件流且归档包有副本时，由 exit 2 改为输出完整时间线 + 「事件源：归档包烤制快照」注记行。其余命令面零变化。

文件变更清单（收口自声明——区间提交全部 15 文件均属本变更，无并行会话夹带）：
src/timeline.js（renderBakedTimeline 新增）、src/watcher.js（readWatcherEvents path 形态）、src/run/complete-handlers.js（bakeArchiveTimeline + runArchiveChain 接线）、src/index.js（timeline 回退）、test/archive-timeline-bake.test.mjs（新测试）、package.json（test:core 纳入）、package-lock.json（版本字段 3.29.6→3.31.0 对齐，npm install 顺带校正）、docs/sillyspec/platform-interface-map.md（complete-handlers.js 锚 2553→2615 位移修准）、.sillyspec/docs/sillyspec/modules/sync.md（接口表 3 行）、.sillyspec/docs/sillyspec/modules/sync.changelog.md（登记）、.sillyspec/changes/2026-09-28-archive-timeline-bake/{design,requirements,proposal,tasks,flow-state.yaml}（本变更工件面）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-archive-timeline-bake 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：事件流是 append-only jsonl，watcher 终拍（含「目录已移入 archive」）可能晚于烤制落盘——timeline.md 文件头显式注明「快照烤制于归档链中，末尾事件可能未入快照」，诚实注记而非数据错误；烤制后 watcher 仍照常写 .runtime 原文件，副本只是时点快照。
2. 并发写：destDir 在 rename 成功后归本链独占，timeline.md/watcher-events.jsonl 是新文件名无覆盖竞争；.runtime jsonl 烤制时只读；多 agent 并行归档不同 change 各自目录不串台。同一 change 的归档链本身有 destDir 存在即 fail 的既有互斥。
3. 切换/生命周期：烤制失败 fail-open（一行警告）不阻断归档，归档主流程语义零变化；烤制位于 rename 之后不可能重复执行（destDir 已存在校验先行）；无事件流时跳过烤制并输出注记（不产出空壳 timeline.md）。
4. 作用域：runtimeRoot 解析复用 resolveRuntimeRoot(resolvePlatformOpts(cwd), specBase)（平台指针 > specBase/.runtime），与 spawnWatcher 写侧同链——平台模式下事件流在平台 runtime 目录也能读对；CLI 回退读的是 tSpecBase 下归档目录，与 .runtime 无路径耦合。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-archive-timeline-bake 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：平台/漂移模式下 runtimeRoot 与 specBase/.runtime 分裂，烤制读错目录 → 静默漏烤。缓解：编排内用 resolvePlatformOpts + resolveRuntimeRoot 与既有消费者同链；跳过/失败均输出注记行保持可观测；测试用 fixture runtimeRoot 直验。次风险：巨型事件流污染 git——尺寸帽 2MiB 超帽只烤 timeline.md 并注记。
放弃的方案：①watcher 活跃期直接把事件写进 changes 目录（放弃——改写侧协议面大，且活跃期事件属 .runtime 隐私/排除边界，D-002 语义不动）；②CLI 回退时把归档副本反向重建到 .runtime（放弃——制造两份真相源，违背「本地 jsonl 唯一真相源」既有口径）。

评审留痕（独立评审 PASS 2×P3 清偿）：P3-1 副本读源失败时头注记虚报副本在场——已修（eventsCopySkipped 扩读源失败形态，注记文本改为「尺寸超帽或读源失败」与实际产出一致，补测试）；P3-2 「与 spawnWatcher 写侧同链」对 flow.js 各拉起位在平台极端漂移下存在既有分裂面——措辞修正：烤制的 runtimeRoot 解析与既有消费链（resolvePlatformOpts>resolveRuntimeRoot）同源，平台模式下若写读目录分裂属既有面，本设计的兜底是跳过时输出注记行保持可观测、非静默漏烤。
