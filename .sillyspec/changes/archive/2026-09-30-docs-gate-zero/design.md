---
author: flow-machine-draft
created_at: 2026-09-30T02:10:52.595Z
---
# 设计记录（Design Record）— 2026-09-30-docs-gate-zero

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-docs-gate-zero 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
279 处失效分四类清偿，全部走既有机制、零 src 改动：
① 本仓漂移 55 处：`docs check --fix` 自动重锚 53 处（classifyFix 唯一/严格领先命中口径）；prompt-control-debt.md 两处 `complete.js:579` 人工改写——该草稿兜底调用点已随 2026-09-26-task-review-retire 退役（complete.js:661 注释在盘），改指现址 `src/index.js:992`（backfill-reviews 同源兜底）。
② 跨仓引用 211 处：spec 归位主仓（30c81434「docs/{SillyHub,backend,frontend,multi-agent-platform,sillyhub-daemon}——spec 归位主仓」）带来的外部项目文档裸路径引用，本仓解析必失败；按 2026-09-04 既定先例（docs-check.js:110-111 注释「跨仓 .py 引用改 repo:// 前缀」）统一改 `repo://sillyhub/<路径>` 前缀——docs-check 原生跨仓协议，本机 local.yaml cross_repo_roots 已配映射（sillyhub → multi-agent-platform），映射后走与本地引用完全相同的层1（行界）+层2（关键词窗口）校验。预演验证：197 处直转层1+层2 全过；14 处行号漂移按 token 在目标仓的现位置重锚。
③ 人工消歧 12 处：hub 仓结构变迁（daemon 单 router.py 已拆 router/ 子目录、model/service 行号漂移、daemon.ts spawn env 位置移动、[cid] 页注释移位等）逐条定位现址改写。
④ sdk.d.ts 死锚（SDK 类型声明在 node_modules 依赖包内，原锚 1092 行）：依赖文件不入锚（存在性随 npm install 状态漂移，非稳定锚点），去行号留正文提及（证据链其余锚 repo://sillyhub/sillyhub-daemon/src/interactive/claude-sdk-driver.ts:407 转 repo:// 保留）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-docs-gate-zero 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
零 src/test 改动。改写面 = ①文档引用行（.sillyspec/docs/ 跨项目域 scan/modules/flows + .sillyspec/knowledge/{decisions,fr,uncategorized,conventions} + docs/sillyspec/）——只动 file:line 引用串的路径前缀与行号段，正文语义不动（prompt-control-debt 两处退役调用点除外，属事实性改写）；②`.sillyspec/docs-check-baseline` 372→0（docs gate --init-baseline 产物）；③local.yaml cross_repo_roots 段过时注释更正（「本仓当前无 repo:// 引用」已失真——local.yaml 为 gitignored 机器本地配置，不入库）。docs check / docs gate 命令行为与用法不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-docs-gate-zero 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：不适用——纯文档静态改写无事件流。文档引用与目标仓快照的时点差由 ratchet 兜底：hub 仓后续漂移 → 失效数>0 → gate 拦截，属设计内语义（漂移可发现）。
2. 并发写：文档非多进程竞争的运行时文件（docs-check.js design §9 既定口径，applyFixes 普通 writeFileSync）；多会话并行下本变更交付走显式 pathspec 提交，他侧在途编辑不夹带（AGENTS.md 第 11 条）。
3. 切换/生命周期：不适用——无会话/请求状态。批量改写用 applyFixes 按 docLine+行内偏移定点替换，同一行多 fix 降序处理防挤偏（R-04 契约）。
4. 作用域：跨仓引用显式 repo://sillyhub 前缀后不再按本仓路径解析（消除与本仓同名文件的误命中面）；未配 cross_repo_roots 映射的设备自动跳过不计失效（docs-check.js:112-115 契约，跨设备零误报），多设备行为一致。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-docs-gate-zero 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：repo:// 转换后本仓 docs gate 与 sillyhub 仓漂移耦合——hub 侧后续演进使已转换引用失效时，配置了映射的设备上本仓推送被 gate 拦。这是 ratchet 的设计内语义（279→0 的清偿本身证明引用当前全部有效；失效即可见即修），未配映射设备零影响。
弃案：① local.yaml skip 藏数——与「真欠账清零」相反，且 local.yaml 是 gitignored 机器配置不随仓传播，他设备失效数反弹；② doc_type: snapshot 豁免——这批是活文档（spec 主场文档），冻结语义失真且豁免面随文档新增不可控；③ 让 docs-check 支持裸路径跨仓自动解析——引入路径猜测歧义（本仓与目标仓存在大量同名 router.py/service.py，预演实测 service.py 86 候选/router.py 86 候选），repo:// 显式前缀正是为消歧而设的既有机制，不应绕过。
