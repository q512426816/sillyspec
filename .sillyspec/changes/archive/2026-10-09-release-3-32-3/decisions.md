---
author: flow-machine-draft
created_at: 2026-10-09T15:55:13.979Z
---
# 决策记录（Decisions）— 2026-10-09-release-3-32-3

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：npm publish 凭证/2FA 环节失败（本地 npmrc 有 always-auth 告警配置）——失败则重试或转用户处理，版本面提交与推送不受影响可先行落定。放弃方案①：发 3.32.4（用户口头版本号）——线上 latest 实为 3.32.2，跳 3.32.3 违反用户自己给的准绳「最小版本加一」，选 3.32.3 并在交付说明中向用户说明差异。放弃方案②：npm version patch 自动提交——自动提交不走本仓显式 pathspec 纪律，手工两文件编辑+显式清单提交。
