---
author: flow-machine-draft
created_at: 2026-09-30T08:22:34.672Z
---
# 设计记录（Design Record）— 2026-09-30-snapshot-symlink-store-subdir

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-snapshot-symlink-store-subdir 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
detectSymlinkStoreLayout 扩展子目录 lockfile 探测：根判据（pnpm-lock.yaml/bun.lockb|bun.lock/lerna.json）之后、packageManager 字段判据之前，扫一层非隐藏子目录的同类 lockfile，命中返回带 subdir 标签（如 pnpm(subdir:frontend)）。createVerifyGateSnapshot 既有消费零改动——命中即打跳快照警告返回 null 回退主仓实测。动机实证：multi-agent-platform（apps 型 monorepo：frontend/ 与 sillyhub-daemon/ 各自 pnpm-lock.yaml、根目录无 lockfile）漏检 → 质量扫描/门实测每轮 ~160s 纯烧快照构建/junction（290s 轮中 test 85s + lint 43s）。packages/* workspace 型不扫（该形态 lockfile 在根，根判据已覆盖）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-snapshot-symlink-store-subdir 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/run/gate-snapshot.js detectSymlinkStoreLayout(cwd)：返回值新增 pnpm(subdir:<名>)/bun(subdir:<名>)/lerna(subdir:<名>) 形态；既有返回值（pnpm/bun/lerna/pnpm(packageManager)/yarn(packageManager)/bun(packageManager)/null）逐字不变，根判据优先级不变。调用方（createVerifyGateSnapshot 布局拦截、测试）零改动——返回值只进警告文案与 null 判定。readdirSync 一层 withFileTypes，微秒级，node_modules/隐藏目录跳过。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-snapshot-symlink-store-subdir 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：纯同步探测（单次 readdirSync+existsSync 序），无时序面。
2. 并发写：探测只读不写；多会话并发探测同仓结果确定性相同（文件系统快照语义内的稳定判据）。
3. 切换/中断：无状态无清理面——探测失败（根不可读）落 packageManager 判据再落 null，与既有 fail 链同构。
4. 作用域：探测以 cwd 为根，一层子目录边界天然限定单仓；subdir 标签带目录名便于跨项目诊断；不递归（packages/* 型明确不扫）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-snapshot-symlink-store-subdir 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：误报面扩大——子目录有 bun.lock 但根是标准 npm 且快照本可用 → 被跳快照回主仓（牺牲隔离性换布局安全）。裁决为可接受：与既有「宁可主仓口径」同向（本仓 sillyspec 自身即 pnpm 根判据跳快照运行，主仓口径+污染归属鉴定兜底是已验证形态）；且 apps 型子目录 lockfile 意味着该 app 的 node_modules 符号链接网在 junction 快照内跨根失效，跳过是正确方向。已放弃方案：a) 递归扫两层——packages/* workspace 型 lockfile 在根、一层已覆盖 apps 型，递归徒增误报面与 I/O，弃；b) 探测 node_modules/.pnpm 目录存在性代替 lockfile——node_modules 是 gitignored 可变面（装/卸依赖瞬时态），lockfile 是 tracked 稳定判据，弃。残留边界：子目录仅 yarn（无 pnpm/bun/lerna 判据）不命中——yarn classic 无 symlink store 坑（PnP 另算），维持现状。
