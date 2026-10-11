---
author: flow-machine-draft
created_at: 2026-10-11T14:09:42.350Z
---
# 决策记录（Decisions）— 2026-10-11-resurrect-guard-verify-hardening

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：答：最大风险是幽灵守卫误拦「归档后重开」的合法同名变更——用「库内有活跃行即放行」消解（test 用例②钉住）。fail-open 语义分两层：外层守卫异常 fail-open 不阻断正常流程；内层库列举失败按无活跃行处置（fail-closed 保守向，评审 P2-2 修正披露）——误拦合法重开的代价是重跑一次，漏放幽灵的代价是幽灵行推上平台，两害取其轻。死路（试过放弃）：doctor 侧建议 --align-execute-progress 给幽灵补戳——等于给幽灵态背书，放弃（只报不治 + 显式勿用警示）；对账锚直接用 HEAD 短路 mb==HEAD 形态——会把 in-place 主分支形态的 diff 面清空，放弃（三重守卫保守退旧区间，只窄不宽）。
