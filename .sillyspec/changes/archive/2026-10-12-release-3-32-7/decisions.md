---
author: flow-machine-draft
created_at: 2026-10-12T15:27:50.187Z
---
# 决策记录（Decisions）— 2026-10-12-release-3-32-7

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：答：最大风险：钉扎 IP 失效或 DoH 通道本身被劫持——缓解：发布前预核验（钉扎 npm view 返回 latest=3.32.6）先行证明通道存活；IP 失效时经腾讯 DoH 重解析更新 PIN 后再核验，仍失败即停不带病发布。试过放弃（3.32.4~3.32.6 同款）：①改 hosts 钉扎——动系统配置，放弃；②未钉扎 npm view 核验——劫持环境数据不可信，放弃；③跳过核验直接发布——违背 3.32.2 起 latest 双核验惯例，放弃。
