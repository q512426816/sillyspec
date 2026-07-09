---
id: task-05
title: src/sync.js 实现 platform approve/reject（HTTP + approvals 表）
author: qinyi
created_at: 2026-07-09 19:58:30
priority: P1
depends_on: []
blocks: [task-07, task-08]
allowed_paths:
  - src/sync.js
provides:
  - contract: platform-approval-api
    fields: [approve, reject]
goal: |
  把 sync.js 中仅打印"尚未实现"的 approve/reject 替换为真实实现：调用平台 API 并更新本地 approvals 表。
implementation: |
  改 src/sync.js（现有 approve/reject 存根在 416-422 行附近，index.js 已有路由，签名保持
  approve(changeName, cwd) / reject(changeName, reason, cwd) 不变）：
  1. 读平台配置（沿用模块内既有 loadPlatformConfig/连接检查逻辑）；未连接平台 → 可读错误 + exit 1
     （显式动作 fail-visible，不同于 best-effort sync 的静默 warning，decisions.md D-006@v1）。
  2. approve：POST {platform.url}/api/changes/{encodeURIComponent(changeName)}/approval
     body {decision:'approved'}；reject 同端点 body {decision:'rejected', reason}。
     复用模块内既有 fetchJson 超时风格；端点形态标记 TBD-hub-api（注释 + 契约文档对账）。
  3. HTTP 成功后更新本地 approvals 表：调 ProgressManager 的 _updateApprovalStatus
     （approved/rejected、approved_at、rejection_reason）。
  4. 网络/平台错误：console.error 可读原因，process.exitCode = 1，不抛未捕获异常。
acceptance: |
  - 对 mock HTTP 端点（node http.createServer）approve 发出正确 POST 且 approvals 表状态变为 approved
  - reject 携带 reason 且表状态变为 rejected、rejection_reason 落库
  - 未连接平台 / HTTP 500 → exit code 1 且 stderr 有可读错误，approvals 表不变
verify: |
  task-07 中用本地 mock server 覆盖三条 acceptance；实现时先写 mock server 测试（红）再实现（绿）。
constraints: |
  - 只改 src/sync.js；index.js 路由与调用签名不动
  - 端点 URL/body 单点封装（顶部常量或独立函数），TBD-hub-api 对齐时只改一处
  - 零新增外部依赖
---

# task-05: platform approve/reject 实现

## 目标

打通审批闭环——driver 模式下平台控制 execute 前进/停止的抓手（design.md §4.1）。

## 实现蓝图

见 frontmatter implementation。

## 验收标准

见 frontmatter acceptance（3 条）。

## TDD/验证

见 frontmatter verify。
