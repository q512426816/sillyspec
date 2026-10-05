---
author: flow-machine-draft
created_at: 2026-10-05T01:08:10.544Z
---
# 决策记录（Decisions）— 2026-10-05-status-empty-guide

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：文案与未来选道入口漂移（若 flow start 参数形态变更，引导文案会悄悄失效）——以 FR-01 断言「含 flow start 子串」钉住最小锚，入口大改时测试会显式红。放弃的方案：读取本仓 spec 状态做「智能下一步建议」（如检测 .sillyspec/docs 存在性给不同建议）——空态分支的定义就是 progress 无数据可读，智能层没有可靠输入反而引入误判面，且跨仓语义不通用，故弃。
