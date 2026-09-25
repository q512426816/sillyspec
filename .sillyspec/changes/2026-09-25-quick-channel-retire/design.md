---
author: flow-machine-draft
created_at: 2026-09-25T15:41:34.993Z
---
# 设计记录（Design Record）— 2026-09-25-quick-channel-retire

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-quick-channel-retire 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
双层门拒新：①index.js 入口预门 refuseRetiredQuickFreshStart——拦「新会话启动形态」（旗标全在 QUICK_FRESH_START_FLAGS 集内且无 --change quick-<8hex>），在进 runCommand 之前 exit 1；必须在 entry 层拦，因为 run/command.js 对新会话的 sid 生成/owner.json 落盘/「已建立」公告/DB 行都发生在 runStage 之前，晚拦会留幻影残留；含收尾旗标（--done/--cancel/--status/…）或集合外旗标（未知旗标由 command.js 未知参数校验 exit 2，先于会话建立）的放行。②src/run/stage.js quick 块兜底网——判据与 D-003 幂等判据同源（session guard.json 文件存在性）：guard 不存在即 exit 1，兜住进程内直调 runCommand 与 --change 指向不存在会话的形态，并做幻影清理（guard.json 不存在时删空会话目录＋注销 DB 幻影行＋回收指向本 sid 的共享指针；guard.json 存在含损坏绝不清）；原新会话创建代码（ql-ID 分配/guard 落盘/QUICKLOG 条目/空壳探测等 ~170 行）随之删除。在途会话（guard 存在）渲染/续跑/--done/--cancel 原样保留，渲染时一行 ℹ️ 退役提示。
用户使用面配套（评审驱动扩面）：模板 agents-instruction.md 面向新项目重写（选道表/轻量变更两步协议与 --input 过门格式/常用命令速查/12 条规则，零 quick 表述）；本仓 AGENTS.md 与模板逐字节同源（v3.31.0 标记）、CLAUDE.md 核心规则同步；sillyspec-quick skill 与 run-quick 命令卡转退役重定向，新增 sillyspec-flow skill 与 flow 命令卡（zcode 无 skills 通道，命令卡是其快道入口）；brainstorm scale=small / auto 分类提示 / quick --status 无会话文案均改指 flow start；handoff 与 next 对 flow-state.yaml 在场（thin）变更输出 flow start 恢复/收口建议（run <stage> 会被混跑守卫拒）；版本 3.30.0→3.31.0 解锁模板传播。测试侧新增 test/helpers/quick-session-fixture.mjs（真实 allocateQuicklogEntry＋规范 guard 形状预置在途会话），~20 个新启会话测试改夹具/转拒绝断言/删除死语义，独立评审子代理两轮审核（首轮 10 findings 全清偿）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-quick-channel-retire 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
CLI 行为变化（对外可见）：`sillyspec quick` / `sillyspec run quick` 在无在途会话（guard.json 不存在）时由「创建新会话并渲染 step1」改为 exit 1＋拒绝文案；`--done`、`--cancel`、`--status`、带 `--change <在途会话ID>` 的渲染/续跑（含 `--files` 追加边界）行为不变。无函数签名增删（门是 stage.js quick 块内新分支）；模板文案与 package.json version 变化。quicklog commit / scope-audit / tests --anchor ql 零触碰。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-quick-channel-retire 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：门判据是 guard.json 文件存在性（与 D-003 幂等判据同源、跨进程可靠），与命令到达顺序无关；在途会话恢复渲染首查 guard，无新增竞态窗口。
2. 并发写：多 agent 并发 run quick 新会话→全部被拒且零写入（无半启动残留）；在途会话并发 --files 追加沿用既有 mergeQuickBoundaryFiles 原子写路径，不变。
3. 切换/生命周期：拒绝发生在任何写入之前（ql-ID 分配/guard 落盘/QUICKLOG 条目/tasks.md 挂载均在其后），不存在「被拒但留半截状态」；升级前已启动会话的生命周期（续跑→--done 或 --cancel）完整保留。
4. 作用域：门在渲染入口对所有 cwd/specDir 生效；guard 路径经 resolveQuickSessionsDir 单一解析（平台模式 runtimeRoot 与本地 .runtime 对齐，Q4），跨仓各自查各自 guard，不会串台误判他仓在途会话。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-quick-channel-retire 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险＝误伤在途会话：缓解＝判据用 existingGuard 文件存在性（幂等判据同源，且 --done/--cancel 不经 runStage 本就不受门影响）；次风险＝测试大面积依赖新启会话：缓解＝夹具辅助单一来源（test/helpers/quick-session-fixture.mjs）复刻 guard 规范形状防漂移，改造集中在 ~9 个测试文件。放弃方案：①全量删码（stages/quick.js＋run/quick-audit.js＋quicklog 家族 ~2800 行）——全球存量安装的在途会话会搁浅（thin-default-flip proposal 明示不硬拆的原因），且 quicklog.js 被 run/command.js 共用、与并行会话在改文件冲突面大，物理拆除留作后续独立变更；②env/local.yaml 逃生阀重开 quick——复辟过渡开关，与「直接退役」决策相悖。
