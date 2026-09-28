---
author: flow-machine-draft
created_at: 2026-09-28T07:20:54.455Z
---
# 决策记录（Decisions）— 2026-09-28-flow-date-gate

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：既有 ~46 处 flow start 测试调用点用非日期名（fc-1 / flow-h2-t1 / sw-fake 等），过门后假红——逐文件把名字适配为日期前缀形态（固定 2026-09-01- 前缀，日期不验当天）。次风险：报错文案被测试断言（validateChangeName 非法名用例仍先触发、文案不变）。试过放弃：自动补前缀（名字漂移见槽1）；门放 cmdFlowStart 内部（会拦 mcp/平台工具直调与库调用，违背「门只在 CLI 边界」既定决策）。
