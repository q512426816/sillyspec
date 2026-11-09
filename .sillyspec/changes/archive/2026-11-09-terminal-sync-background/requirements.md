---
author: flow-machine-draft
created_at: 2026-11-09T06:41:23.072Z
---
# 需求规格（Requirements）— 2026-11-09-terminal-sync-background

## 功能需求

### FR-01: flow done/complete/change-delete 终态同步不再内联等待:写 pending marker+转后台,命令秒级收尾,exit code 不因终态推送未确认置 1

- 终态强校验（triggerSyncTerminalStrict）在后台通道可用时必须转后台执行：先落 pending 态终态 marker 再委托既有 detached 后台通道推送，命令必须立即返回（不得内联等待平台文件树推送确认），返回值必须携带 `delegated: 'background'`；exit code 禁止因终态推送未确认而置 1。平台 backend 必须零改动（纯 CLI 端机制）。

#### 场景：终态转后台秒回

Given 平台已连接且本地 DB 该变更为 archived，When flow done 调用终态强校验且后台通道 spawn 成功，Then 命令不等待推送完成即返回、runtime 目录出现 pending marker、返回 `delegated:'background'`、exit code 未被置 1。

### FR-02: SILLYSPEC_SYNC_BG=0 逃生阀保留内联强校验旧行为;后台 spawn 异常降级内联

- `SILLYSPEC_SYNC_BG=0` 时终态强校验必须保留内联旧语义（前台有界等待 + 🚨 告警 + 自救命令 + exitCode=1 的失败显性化契约不变）；后台 spawn 异常或不可用（spawned/coalesced 之外的任何结果）时必须降级走内联旧语义，禁止因后台化机制自身故障丢失终态推送或静默吞错。

#### 场景：逃生阀与降级

Given `SILLYSPEC_SYNC_BG=0` 且终态推送通道失败，When 终态强校验执行，Then 行为与改造前完全一致（🚨 + 自救命令 + exitCode=1）；Given spawn 抛异常，When 终态强校验执行，Then 降级内联完成推送且失败仍显性化。

### FR-03: bg 子进程轮后对 pending marker 补推并按 sync treeOk 写 ok/failed;pending 超 10min 无更新按失败补报

- 后台子进程主轮收尾后必须扫描 pending 态终态 marker，对每个 pending 变更补推一次并按 sync 返回的 `treeOk` 把 marker 收敛为 ok（true）或 failed（false 及错误详情）；pending marker 超过 10 分钟无状态更新时，后续命令必须将其视为未收敛——验证性同步成功则静默清理，失败则按失败补报，禁止 pending 悬挂永无下文。

#### 场景：后台收敛与悬挂自愈

Given 存在 pending marker 且 bg 子进程完成主轮同步，When 子进程收敛扫描执行，Then marker 按真实推送结果写 ok/failed；Given pending marker 时间戳超过 10 分钟且后台进程已死，When 下一条命令扫描，Then 先验证性同步再清理或补报，不留悬挂 pending。

### FR-04: 下一条命令扫 marker:ok 静默清理;failed/超时 pending 打横幅+自救命令

- 命令侧同步入口必须消费终态 marker：ok 必须静默清理（零噪音）；failed 必须打 🚨 横幅 + 幂等自救命令（`sillyspec platform sync --change <名>`）后清理；超时 pending 按验证结果处置。消费动作必须容错（marker 读写/解析失败只跳过不阻断主命令）。

#### 场景：补报消费

Given 上一次归档的终态推送 failed marker 在场，When 用户跑下一条任意带同步入口的命令，Then 该命令输出 🚨 终态同步补报横幅与自救命令，且 marker 被清理（不重复骚扰）。

### FR-05: sillyspec 仓全量测试绿

- sillyspec 仓全量测试套件必须全绿——改造不得破坏既有同步/强校验行为契约（既有 terminal-sync-strict 用例按新契约改造后必须全数通过）。

#### 场景：全量回归门

Given 改造合入后，When 跑 sillyspec 仓全量测试，Then 退出码 0 零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/terminal-sync-strict.test.mjs「终态+后台可用→pending marker+delegated background+不置 exitCode」
FR-02: test/terminal-sync-strict.test.mjs「SYNC_BG=0 内联旧语义回归」+「spawn 异常降级内联」
FR-03: test/final-sync-marker.test.mjs「bg 收敛按 treeOk 写 ok/failed」+「超时 pending 验证后清理/补报」
FR-04: test/final-sync-marker.test.mjs「ok 静默清理/failed 横幅+自救命令+清理」
FR-05: test/run-tests.mjs「sillyspec 全量 node --test 全绿」
