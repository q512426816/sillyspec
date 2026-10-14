---
author: flow-machine-draft
created_at: 2026-10-14T06:33:52.087Z
---
# 决策记录（Decisions）— 2026-10-14-gate-verify-apiface-preflight

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：注入后 `newPipeline`（apiFace != null）判定从 false 翻 true——对「factsExpected=true 但 facts.apiFace 缺席」的变更，矩阵段缺失从 warning 升 error（仅严格档/critical）；这与 --done backfill 后的判定完全一致（backfill 无条件落 apiFace），属预检对齐而非回归；非严格非 critical 仍 warning，存量兼容口径不变。 试过但放弃的方案： - gate 路径直接做 backfill 落盘（与 gates.js 同款调用）——违反 gate 只读契约（D-002@v1），且引入多 agent 并发 gate 时 facts.json 读改写竞争面，放弃。 - verify-probes --init 侧落 apiFace——制造双生产者且改 writeVerifyFacts 分段合并语义；且救不了存量 facts（本次平台变更正卡在 --init 后形态），把修复责任推给使用方逐变更重跑 --init，放弃。 - stage-contract 内直接 live 解析——违反消费路径铁律（本模块零 import verify-probes，verify-probes TLA 动态 import 回指 stage-contract，静态依赖成环死锁），放弃；改由壳层调用方（machine-interface，与 gates.js 同款动态 import 时点）注入。 独立评审修正（2026-10-14 review P1 清偿 + P3 清偿）：design.md 缺失/不可读态 helper 返 null（gate 注入通道不注入、facts 口径继续），不返空面——初版空面注入会覆写有效 facts.apiFace 反致误阻断，违 FR-03。P3 同步清偿：backfill 侧恒落对象面（缺失/不可读 → 空面对象，基线口径不变，`|| { endpoints: [], declared: null, writeEndpoints: [] }` 兜底）——null 只是 gate 注入通道的「不注入」信号，不得改变 backfill 落盘形态（否则「design 蒸发×矩阵段缺失×严格档/critical」窄角会从基线 error 降 warning，重构夹带行为变化）；9d 内含基线回归锚。gate/--done 在该病态窄角判定重新一致（backfill 空面 parseSet 空 → 锚点空指拦、矩阵段缺失 error 分层不变），无分叉。
