---
author: flow-machine-draft
created_at: 2026-10-16T14:21:15.520Z
---
# 决策记录（Decisions）— 2026-10-16-title-range-gate

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：既有 e2e 夹具首行 <10 字的 91 处（36 文件，扫描脚本清点）会撞门——属旧契约夹具，逐一延长首行至合区间（断言不动）；漏网的由全量回归暴露后补齐。 - 放弃方案①：flow done 收口时才拦标题——拦截时点晚（工件/测试全做完才发现没命名），且 done 面夹具更多；命名时刻（fresh start）拦截成本最低。 - 放弃方案②：adopt/resume 也硬断——adopt 断点后变更已收编（flow-state 已写），硬断制造不可恢复半态；定级为 ⚠️ 强提示 + --title 修复通道（重入即改）。 - 放弃方案③：给硬门加 env/flag 逃生阀——「必须」语义被逃生阀掏空，平台 writer 形态豁免已覆盖唯一无 agent 的自动化面，不再留旁路。
