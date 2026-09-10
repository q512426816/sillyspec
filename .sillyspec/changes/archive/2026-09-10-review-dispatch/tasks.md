---
author: qinyi
created_at: 2026-09-10T13:46:36+0800
---

# tasks

- [x] task-01: 审查清单单源化（checklist 常量 + stages 三件改引 + 一致性测试）
- [x] task-02: client getWorkerResult 封装 + 单测
- [x] task-03: review-dispatch 核心模块（任务书/在途记录/停滞/artifacts 回收/中断分支）+ 单测 (depends_on: task-01)
- [x] task-04: 命令注册三形态 + probe 前置 + 降级指引 (depends_on: task-03)
- [x] task-05: gate 在途区分报错 + 契约 platform 描述更新 (depends_on: task-03)
- [x] task-06: 配置面 budget_usd/stall_ms/timeout_ms + local.yaml.example (depends_on: task-03)
- [x] task-07: 端到端 mock 全链路测试（派发→轮询→停滞→回收→幂等→中断） (depends_on: task-01,task-02,task-03,task-04,task-05,task-06)
- [x] ql-20260910-007-124c 修驾驭小结三负面：①exec-run runId 同秒碰撞致并行会话误写 per-task review.json（排他认领+随机后缀）②verify-probes --init 平台模式回显 hub 镜像路径显示混乱（补主仓同步位置注记）…
- [x] ql-20260910-008-6d84 修驾驭小结第二批三负面：①apply 校验依赖被归档自身回收的取证——resolveApplyAllowSet/assess 读 changes/<name>/ 的 design/tasks 在归档后移位致 Gate1 整批误拦（archi…
- [x] ql-20260910-010-d973 scope-audit baseAnchor 修复：形态 B 分支已删时用审计 tag sillyspec-audit/<branch> 算 merge-base（worktree.js:1065 既有 tag，gc 安全锚），恢复真锚点与…
