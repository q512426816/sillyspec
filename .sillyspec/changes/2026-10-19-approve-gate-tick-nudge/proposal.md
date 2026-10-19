---
author: flow-machine-draft
created_at: 2026-10-19T07:38:24.187Z
---
# 提案书（Proposal）— 2026-10-19-approve-gate-tick-nudge

## 动机

任务原话转写：批准门实校验与任务勾选现场提醒
动机：P1（2026-10-19-thin-order-canon）已把轻量道顺序统一为「先答 spec 面 → 批准 → 才动码」，但批准仍是橡皮章——cmdFlowApprove 只写时间戳不校验 design 四节/FR 绑定是否作答，agent 可以空文档过批；任务勾选回显也不提醒 spec 面状态，先码后文的会话在勾选时刻无任何现场信号。本变更补两个便宜机器门（四路调查 D 报告 P2/P3 优先级）：approve 复用既有 verifyThinDocsV2/verifyDesignRecordFilled 校验（没答就批=硬拒 exit 1），task tick 回显在 spec 面未齐/未批准时给一行警示（advisory 不阻断）。诚实边界：approve 校验证明的是「答在批前」，挡不住「先码后答再批」——时序证据路线已实证不可行（git 时间戳批量收口下说谎），不在此做。

成功标准：
- approve 硬校验：v2 轨复用 verifyThinDocsV2（须加 repair 只读开关——现状有 design.md 问题行回填写副作用，approve 不得写文件）、v1 轨复用 verifyDesignRecordFilled；design 四节空/FR 待撰写/绑定待填时 approve exit 1 并给修复指引；作答齐备时照常批准
- 豁免与降级：adopted_from=brainstorm 豁免 design 四节（以 brainstorm design 为准，与 done 门同口径）；draft-ledger 缺失时 fail-open 放行（跨机/存量场景）；verifyThinDocsV2 校验通过但存在 advisory 时不阻断批准
- 共享判定上移：status 内联的「design 四节已答」判定（v1 槽/v2 节双格式）抽为可复用导出，status 与 tick 同源调用，行为零变化
- task tick 提醒：勾选回显在（design 四节未答 或 未批准且非 autopilot）时附一行「先补 spec 面/先过断点①」警示，advisory 不阻断勾选、不改变回显既有行
- 测试：approve 硬拒/放行/brainstorm 豁免/repair 只读（approve 后 design.md 字节不变）/ledger 缺失放行/tick 提醒触发与静默各就位，既有 flow-status/task-tick/approve 相关测试零回归

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. approve 硬校验：v2 轨复用 verifyThinDocsV2（须加 repair 只读开关——现状有 design.md 问题行回填写副作用，approve 不得写文件）、v1 轨复用 verifyDesignRecordFilled；design 四节空/FR 待撰写/绑定待填时 approve exit 1 并给修复指引；作答齐备时照常批准
2. 豁免与降级：adopted_from=brainstorm 豁免 design 四节（以 brainstorm design 为准，与 done 门同口径）；draft-ledger 缺失时 fail-open 放行（跨机/存量场景）；verifyThinDocsV2 校验通过但存在 advisory 时不阻断批准
3. 共享判定上移：status 内联的「design 四节已答」判定（v1 槽/v2 节双格式）抽为可复用导出，status 与 tick 同源调用，行为零变化
4. task tick 提醒：勾选回显在（design 四节未答 或 未批准且非 autopilot）时附一行「先补 spec 面/先过断点①」警示，advisory 不阻断勾选、不改变回显既有行
5. 测试：approve 硬拒/放行/brainstorm 豁免/repair 只读（approve 后 design.md 字节不变）/ledger 缺失放行/tick 提醒触发与静默各就位，既有 flow-status/task-tick/approve 相关测试零回归

## 成功标准（可验证）

1. approve 硬校验：v2 轨复用 verifyThinDocsV2（须加 repair 只读开关——现状有 design.md 问题行回填写副作用，approve 不得写文件）、v1 轨复用 verifyDesignRecordFilled；design 四节空/FR 待撰写/绑定待填时 approve exit 1 并给修复指引；作答齐备时照常批准
2. 豁免与降级：adopted_from=brainstorm 豁免 design 四节（以 brainstorm design 为准，与 done 门同口径）；draft-ledger 缺失时 fail-open 放行（跨机/存量场景）；verifyThinDocsV2 校验通过但存在 advisory 时不阻断批准
3. 共享判定上移：status 内联的「design 四节已答」判定（v1 槽/v2 节双格式）抽为可复用导出，status 与 tick 同源调用，行为零变化
4. task tick 提醒：勾选回显在（design 四节未答 或 未批准且非 autopilot）时附一行「先补 spec 面/先过断点①」警示，advisory 不阻断勾选、不改变回显既有行
5. 测试：approve 硬拒/放行/brainstorm 豁免/repair 只读（approve 后 design.md 字节不变）/ledger 缺失放行/tick 提醒触发与静默各就位，既有 flow-status/task-tick/approve 相关测试零回归
