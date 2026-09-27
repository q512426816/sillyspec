---
author: flow-machine-draft
created_at: 2026-09-27T15:03:27.240Z
---
# 决策记录（Decisions）— 2026-09-27-watcher-push-endpoint

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：平台端点再次演进（本仓注释曾指向已消亡的 observation 端点）——缓解：模块头注释锚定端点出处变更名（change-events-r18-full）可追溯；推送失败恒 warn 可见不静默吞。放弃方案：平台侧加 /api/observation/events 兼容层（在平台仓加死代码面更大，放弃）；恢复批量端点（平台已是单条契约且恒 200 语义，放弃）。
