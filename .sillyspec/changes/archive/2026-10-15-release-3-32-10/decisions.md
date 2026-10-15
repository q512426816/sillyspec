---
author: flow-machine-draft
created_at: 2026-10-15T06:06:40.145Z
---
# 决策记录（Decisions）— 2026-10-15-release-3-32-10

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：registry 通道不稳定（历史 DNS 劫持，3.32.4~3.32.9 均走钉扎）导致预核验假败或 publish 失败——缓解为发布前 npm view 预核验，失败即降级钉扎通道（腾讯 DoH 重解析刷新 PIN），预核验失败不发布。次要风险：同版本重发被 registry 拒（幂等保护），误发布需 deprecate 而非重发。死路：系统级改 hosts 绕劫持——零系统改动纪律排除；npm mirror 镜像发布——非官方源不作发布通道。
