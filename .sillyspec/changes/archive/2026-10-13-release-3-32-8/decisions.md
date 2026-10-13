---
author: flow-machine-draft
created_at: 2026-10-13T05:34:57.356Z
---
# 决策记录（Decisions）— 2026-10-13-release-3-32-8

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：钉扎 IP 失效（Cloudflare 池轮换，3.32.3 用 104.16.19.35 → 3.32.4 起 104.16.x.34 段）导致预核验假败——缓解为发布前 DoH 直连重解析刷新 PIN，预核验失败不发布。死路：系统级改 hosts 绕劫持——零系统改动纪律排除；npm mirror 镜像发布——非官方源不作发布通道。
