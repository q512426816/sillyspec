---
author: flow-machine-draft
created_at: 2026-09-24T18:19:49.584Z
---
# 决策记录（Decisions）— 2026-09-25-thin-platform-args

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险=外置根场景下 local.yaml（flow 配置/commands/known_failures）不在 spec 根——平台 spec 根由平台生成配置时负责携带，本片只管落点正确；死路=给 flow 单独再造一套指针解析——resolvePlatformSpecDir 是全仓 fail-closed 单点，重造即状态分裂。
