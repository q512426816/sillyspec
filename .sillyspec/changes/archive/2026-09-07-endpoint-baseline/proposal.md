---
author: qinyi
created_at: 2026-09-07T08:30:00+08:00
---

# 提案书（Proposal）

## 动机
补齐 P3d 实证缺失的端点 before 基线——让变更级端点增删（archify Delta 核心内容）可计算，替代 delta.md 的「独立立项」提示行。

## 关键问题
contract-matrix 只有 provider 完成后快照（无 before），端点 added/removed 无法得出；P3d 只能条件提示。

## 变更范围
src/endpoint-baseline.js（capture 幂等快照复用 scanBackendEndpoints + diffEndpointSets 归一纯函数）+ endpoints baseline CLI（worktree 主仓锚定）+ execute Step3 指引 + archive-delta 第五源（端点增删节）+ 测试

## 不在范围内（显式清单）
不碰 contract-matrix/verify 探针；不做跨仓/schema 对比/自动钩子

## 成功标准（可验证）
- 基线幂等（首次拍、不覆盖）；worktree 模式下采集与归档读取均主仓根（防静默失效）
- 归档 delta.md 出现端点增删节（added/removed 表，changed 独立行）
- 无基线降级注记（门控 backendEndpoints>0）
