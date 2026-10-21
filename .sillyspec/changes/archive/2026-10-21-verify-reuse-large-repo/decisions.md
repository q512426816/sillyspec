---
author: flow-machine-draft
created_at: 2026-10-21T15:15:29.062Z
---
# 决策记录（Decisions）— 2026-10-21-verify-reuse-large-repo

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：FR-3 的面漂移假阻断——记录实测面 X 后 agent 手动补了测试绑定（面 X+Δ），dedupKey 不含测试面 → 复用可能拦下「其实新面能过」的收口。缓解：30min TTL 收敛窗口 + RERUN=1/force 逃生阀 + 阻断信息给四出路；错拦后果是「多等一轮人工确认」不是假通过（fail-closed 方向）。FR-2 资格先行理论上有「报告刚就绪、亲测本可在本步顺路跑掉却延后」的调度次优——接受（实测本来就该归亲测步，中间步顺路跑正是本次要消灭的浪费）。 试过放弃的方案：① dedupKey 无 git head 时回退「变更文件集内容哈希」——根因查明后不需要（maxBuffer 修复后主路径恢复，兜底代码纯增维护面）；② 收口门复用不带 TTL（与 noAI 闸完全对称）——面漂移风险无界，放弃；③ 把 gate verify CLI 也接快照口径判定——CLI 门本就主仓口径只读跑，接快照是语义扩张，超出本次修复面。
