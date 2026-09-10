---
author: qinyi
created_at: 2026-09-10T13:44:38+0800
---

# requirements

## FR-01 派发命令
`sillyspec review-dispatch --change <名> --stage <brainstorm|plan|execute>`：probe 三层前置（no-config/daemon-unreachable/daemon-offline 任一 → 非零退出 + 按 channel_priority 打印剩余通道指引）；create_mission(orchestration_mode=external, budget_usd≤review_dispatch.budget_usd 默认 1.0)；dispatch_worker(read_only=true, worker_prompt=单源审查清单+契约+期望路径+禁 commit)；成功即打印 missionId + --status 指引并退出（不阻塞等待）。

## FR-02 在途记录与幂等
派发状态落 .sillyspec/.runtime/review-dispatch-<change>.json（O_EXCL 创建+原子替换）；已有 in-flight 记录时拒绝重复创建并指引 --status/--kill；dispatch_worker 失败/进程崩溃的中断分支 → abandoned + 处置指引（生命周期表 dispatch 中断条目）。

## FR-03 状态查询与停滞检测
`--status`：list_workers 更新 lastState/lastStateAt；queued 不计时；running 后超 review_dispatch.stall_ms（默认 15 分钟）零状态迁移 → ⚠️ 三选项提示（继续等/--kill/降级），不自动处置；总时长默认无上限（timeout_ms=0）。

## FR-04 终态回收
worker completed → get_worker_result（client 新增 getWorkerResult 封装）→ artifacts 提取 review JSON（kind 匹配优先 + summary JSON 提取兜底）→ CLI 校验 schema+docHash（复用 validateStageReview 机械面）→ 落既有 stage-reviews/<stage>-<runId>/review.json + reviewer.channel="platform"+missionId 落款；failed/killed → error_code + 降级指引 + 清在途记录。

## FR-05 审查清单单源化
三 stage 审查清单从 stages/*.js prompt 文本抽 src/stage-review-checklist.js 常量；prompt 渲染与 worker_prompt 同源消费；逐字迁移 + 一致性测试钉死。

## FR-06 Gate 在途区分
Stage Review Gate 缺 review.json 且存在在途记录 → 报错区分「平台审查在途（mission/state/最近进展）」+ 处置指引，而非笼统缺件。

## FR-07 显式处置
`--kill`：清本地在途记录 + 平台侧处置指引（无专用 kill tool 时 fail-open 不阻塞本地降级）。

## FR-08 配置
review_dispatch 段扩 budget_usd/stall_ms/timeout_ms（local.yaml.example 同步）。
