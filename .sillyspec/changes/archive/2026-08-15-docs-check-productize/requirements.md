---
author: qinyi
created_at: 2026-08-15 16:10:00
change: 2026-08-15-docs-check-productize
---

# 需求（Requirements）

- FR-001 `sillyspec docs check` 在本仓跑通，platform-interface-map.md 等文档全绿
- FR-002 人为注入非法引用（file 不存在 / 行号超界）→ 报告 + exit 1
- FR-003 `--json` 输出结构化结果（ok/total/invalid/warnings）
- FR-004 local.yaml docs-check.paths 缺省（docs/**/*.md）与覆盖行为正确；平台模式 glob 锚 projectRoot
- FR-005 dogfood 测试迁移后 npm test 全绿且两层校验全开（检测力不降级）
- FR-006 纯函数单测覆盖：引用提取（全文扫描）、行号边界、候选解析三段回退、glob walker（**/* 形态、skip 排除、复杂 glob exit 2）

## 决策覆盖

- D-001@v1 独立命令（非 doctor/verify 集成）→ FR-001/FR-002
- D-002@v1 缺省 docs/**/*.md → FR-004
- D-003@v1 exit code 三档 0/1/2 → FR-002/FR-003
- D-004@v1 不做语义校验 → 全部 FR 范围边界
- D-005@v1 删 --strict → FR-002
- D-006@v1 全文扫描不排代码块 → FR-006
- D-007@v1 两层校验全保留 + keywordAssert 可配 → FR-005/FR-006
- D-008@v1 glob 手写 walker 不引依赖 → FR-006
