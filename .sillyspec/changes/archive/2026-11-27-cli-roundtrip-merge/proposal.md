---
author: t
created_at: 2026-11-27T08:05:00
---
# 提案书（Proposal）— 2026-11-27-cli-roundtrip-merge

## 动机
平台库实测长会话 ~20% 轮次是 CLI 协议往返（渲染 + --done 两次调用），本设计省掉其中一次。

## 关键问题
1. 每步两次 CLI 调用（独立渲染 + --done 步进）是流程固有税
2. wt-commit 每次 task 显式调用进一步叠加

## 变更范围
- --done 尾接下一步渲染（~15 行 complete.js）
- execute prompt 加 wt-commit 合并引导（~5 行）

## 不在范围内（显式清单）
- 不做 wt-commit 自动化机制
- 不动 flow start/done 协议
- 不做心跳事件补偿

## 成功标准（可验证）
- --done 完成后 stdout 含下一步 prompt 尾接段（含分隔线标记）
- 旧 run <stage> 单独渲染幂等兼容
- execute prompt 含合并引导段
- watcher 事件密度减半且平台投影正确
