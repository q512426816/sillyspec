---
author: flow-machine-draft
created_at: 2026-10-10T01:07:42.802Z
---
# 决策记录（Decisions）— 2026-10-10-quick-refs-purge

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：测试计数漏改（command-cards.test.mjs 中 8/16/7 等硬编码计数分散在 5 处）——对策：逐处核对并在收口实测跑该文件。放弃方案：①连 src 存量收尾机制一并删除（src/stages/quick.js + run/command.js quick 分支 + doctor/quick-sessions 运行时清理）——升级前在途会话将失去 --done/--cancel 收尾通道，且牵动 docs/prompt 镜像再生成，属 CLI 功能级变更，超出「指引面清除」的用户诉求边界；②保留墓碑卡/注记做存量会话指路——用户明确否决（「仅存量收尾注记也不要，直接去掉」）。
