---
author: flow-machine-draft
created_at: 2026-09-29T06:55:43.118Z
---
# 提案书（Proposal）— 2026-09-29-heartbeat-d007-incontext

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:881dd0936c133437a6250cf7200a20032674dc129d7d78a255e8615dd2d316bb:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-heartbeat-d007-incontext 留痕重锚 -->
任务原话转写：动机：2026-09-29-flow-task-heartbeat 的协议文案犯了方向错误——把「每任务重跑 flow status」写成准必需协议调用，违反 D-007（thin 道中间零协议必需交互，2 次调用省钱省 token 是轻量流程的立身之本）。openspec 的逐任务循环实为 skill 文本驱动的上下文内循环（agent 直读 tasks.md 做一件勾一格继续下一条），CLI 只在交互边界调用。纠正：进度源回归 tasks.md 文件本身，status 恢复自愿查看/恢复面语义（心跳渲染保留——恢复/查进度一次调用拿指针仍有价值），五处协议文案去「重跑本命令」口径。

成功标准：
- flow start 简报两路、tasks.md 头部、AGENTS.md、status 心跳指引行五处文案改为「以 tasks.md 为进度源：做一件→勾一格→继续下一条；flow status 自愿查看（非协议必需，D-007）」口径，不再出现「每勾一格重跑 flow status」类指引
- status 心跳渲染本体保留（下一任务指针/进度/全勾指 done——恢复场景价值不变），仅指引文案改口径
- 相关测试钉同步（flow-status-heartbeat/tick-loop-nudge），flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:f9ce00898c75eb49e670f3c3b1d082dc749f5ff2838e600a0afca1e1c8cf6317:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-heartbeat-d007-incontext 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. flow start 简报两路、tasks.md 头部、AGENTS.md、status 心跳指引行五处文案改为「以 tasks.md 为进度源：做一件→勾一格→继续下一条
2. flow status 自愿查看（非协议必需，D-007）」口径，不再出现「每勾一格重跑 flow status」类指引
3. status 心跳渲染本体保留（下一任务指针/进度/全勾指 done——恢复场景价值不变），仅指引文案改口径
4. 相关测试钉同步（flow-status-heartbeat/tick-loop-nudge），flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:96298e8f441a3380781022ad128c82f991ea84d7bb27e79aa2f4e7cbd7bc8f9c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-heartbeat-d007-incontext 留痕重锚 -->
1. flow start 简报两路、tasks.md 头部、AGENTS.md、status 心跳指引行五处文案改为「以 tasks.md 为进度源：做一件→勾一格→继续下一条
2. flow status 自愿查看（非协议必需，D-007）」口径，不再出现「每勾一格重跑 flow status」类指引
3. status 心跳渲染本体保留（下一任务指针/进度/全勾指 done——恢复场景价值不变），仅指引文案改口径
4. 相关测试钉同步（flow-status-heartbeat/tick-loop-nudge），flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
