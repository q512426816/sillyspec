---
author: flow-machine-draft
created_at: 2026-10-23T06:38:18.963Z
---
# 决策记录（Decisions）— 2026-10-23-py-runner-flags

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：风险=消费仓误配 flags 致 pytest 参数错（如无 xdist 配 -n auto 报错）——显式配置责任在仓主，报错可见可改；放弃：缺省自动加 -n auto（xdist 未必安装，默认加会打挂无 xdist 仓，弃）。
