---
author: qinyi
created_at: 2026-09-07T23:25:00+08:00
---

# 符号影响面报告 — 2026-09-07-ir-hardening

> tasks.md 指纹锚：10 任务（task-01~10）。逐 task 结论（骨架由 symbol-impact 生成后填充）。

- task-01: 新增符号（IR_STRICT_SINCE/getChangeCreatedAt/isStrictChange）——无既有签名变更；constants/progress 为纯新增面，调用点仅 task-02/03（gate 消费），在范围内。
- task-02: checkProbeConsistency 增可选参数 strictMode（默认 false）——既有调用点 gates.js:701 单处，签名向后兼容；buildProbeConsistencyEnvelope 内部分支扩展，无外部签名变化。无其他调用点。
- task-03: reconcileTargetFiles 增可选参数 strictMode——既有调用点 gates.js:677 单处，向后兼容；返回对象 additive 字段 strictViolation，消费方 archive-delta 只读既有字段。无签名级破坏。
- task-04: 新增 validateDesignFileList 纯函数——无既有符号变更；complete.js brainstorm 末步新增调用点（决策模块域核验同点位），在范围内。
- task-05: index.js delta case 内部取值变更（project: null → progress.project）——无签名变化，buildDeltaReport 签名不动。
- task-06: buildDeltaReport 增可选 opts.withSummary（默认 undefined 返回字符串，向后兼容）；新增 writeLastDeltaSidecar；executeScanResumeCheck 内部增 advisory 分支。调用点两处（index.js/complete-handlers）同步接线，在范围内。
- task-07: docs check --fix 分支内部增回执输出——无签名变化；docs-check.js 无导出签名改动。
- task-08: scan-postcheck supportedFixes 数组文案变更——数据非代码签名；index.js --suggest 旗标解析行删除（无消费者，删除安全）。
- task-09: 纯新增测试四件——无既有符号变更。
- task-10: 纯文档与回归——无代码变更。
