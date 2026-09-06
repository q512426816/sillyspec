---
author: qinyi
created_at: 2026-09-07T03:55:00+08:00
---

# 模块影响分析（Module Impact）— IR 五阶段 P3b

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 说明 |
|---|---|---|---|
| core-engine | src/verify-probes.js | 修改 | buildVerifyFacts + --init 落盘 verify-facts.json + 骨架层标注 |
| core-engine | src/verify-postcheck.js | 修改 | checkProbeConsistency 纯函数 + 锚点常量导出 |
| runtime | src/run/gates.js | 修改 | verify 块一致性检查接线（reconcile 之后） |
| stages | src/stages/verify.js | 修改 | Step 7 prompt 纪律两条 |
| （测试域） | test/verify-probes-facts.test.mjs | 新增 | 测试套件 |

## 未匹配文件

| 文件 | 处置说明 |
|---|---|
| （无） | — |

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/core-engine.md` | 更新模块卡（verify-probes facts + 一致性检查） | done |
| `modules/runtime.md` | 更新模块卡（gates 一致性接线） | done |
| `modules/stages.md` | 更新模块卡（verify Step7 prompt 纪律） | done |
| `_module-map.yaml` | 无变化 | skipped |
