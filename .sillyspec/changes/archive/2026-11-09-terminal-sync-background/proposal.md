---
author: flow-machine-draft
created_at: 2026-11-09T06:41:23.072Z
---
# 提案书（Proposal）— 2026-11-09-terminal-sync-background

## 动机

任务原话转写：终态同步后台化三态marker补报免卡前台
flow done 终态强校验(triggerSyncTerminalStrict)内联等待平台文件树推送确认,预算 max(env,45s);多会话并行仓冻结面常含并行提交,change.patch 达 MB 级(2026-11-09 实证 5.66MB×1Mbps 链路),45s 必熔断→exit 1+🚨,收口体感 hang。改终态推送走既有 detached 后台通道+三态 marker+下条命令补报;平台 backend 零改动。

成功标准:
- flow done/complete/change-delete 终态同步不再内联等待:写 pending marker+转后台,命令秒级收尾,exit code 不因终态推送未确认置 1
- SILLYSPEC_SYNC_BG=0 逃生阀保留内联强校验旧行为;后台 spawn 异常降级内联
- bg 子进程轮后对 pending marker 补推并按 sync treeOk 写 ok/failed;pending 超 10min 无更新按失败补报
- 下一条命令扫 marker:ok 静默清理;failed/超时 pending 打横幅+自救命令
- sillyspec 仓全量测试绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. flow done/complete/change-delete 终态同步不再内联等待:写 pending marker+转后台,命令秒级收尾,exit code 不因终态推送未确认置 1
2. SILLYSPEC_SYNC_BG=0 逃生阀保留内联强校验旧行为;后台 spawn 异常降级内联
3. bg 子进程轮后对 pending marker 补推并按 sync treeOk 写 ok/failed;pending 超 10min 无更新按失败补报
4. 下一条命令扫 marker:ok 静默清理;failed/超时 pending 打横幅+自救命令
5. sillyspec 仓全量测试绿

## 成功标准（可验证）

1. flow done/complete/change-delete 终态同步不再内联等待:写 pending marker+转后台,命令秒级收尾,exit code 不因终态推送未确认置 1
2. SILLYSPEC_SYNC_BG=0 逃生阀保留内联强校验旧行为;后台 spawn 异常降级内联
3. bg 子进程轮后对 pending marker 补推并按 sync treeOk 写 ok/failed;pending 超 10min 无更新按失败补报
4. 下一条命令扫 marker:ok 静默清理;failed/超时 pending 打横幅+自救命令
5. sillyspec 仓全量测试绿
