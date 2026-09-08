---
author: qinyi
created_at: 2026-09-08 09:32:00
plan_level: light
---

# 轻量计划（Light Plan）：docs 修复能力五件套

## 来源

design.md（Design Grill 复审 pass 后定稿）、requirements.md（FR-01~FR-07）、decisions.md（D-001~D-006）。技术方案见 design.md §总体方案，本计划只做任务编排，不重抄设计。

## 范围

- src/docs-check.js（修改）：REF_RE 展开循环形、fuzzy skip、豁免插点、candidates
- NEW:src/docs-migrate.js：planDocsMigrate/runDocsMigrate
- src/index.js（修改）：docs 分派 migrate flag 分流 + --no-exempt 白名单 + FR-5 报告段 console.error→console.log
- test/docs-check-fix.test.mjs（修改）：FR-5 通道断言改造（S7 + 15+ 处 stderr 断言）
- NEW:test/docs-fix-capability.test.mjs、NEW:test/docs-migrate.test.mjs
- .sillyspec/docs/sillyspec/modules/docs-consistency.md（修改）：模块文档同步

## 验收

- AC-01：`frontend/src/app/(dashboard)/ppm/shared.tsx:21` 全量提取且真实校验；`[t](foo.js:12)` 提取 `foo.js:12` 零回归；长 token 无 `:N` 线性耗时（evil 用例）
- AC-02：含 `...` 路径引用跳过校验计 skippedFuzzy；`a.py:21、b.py:63` 拆两条独立引用
- AC-03：`docs migrate --from A --to B` dry-run 输出计划零写盘 exit 0；`--apply` 写盘+postCheck 复核，unverified>0 或失效 → exit 1
- AC-04：archive/finished 路径段或 `doc_type: snapshot` 文档不计 invalid（skippedExempt 计数）；`--no-exempt` 恢复全量
- AC-05：--json 输出 fix.candidates 数组（tie 歧义 {file,line} / 带 / 路径文件不存在 {file}）；旧字段不删
- AC-06：docs check 失败时 stdout 含失效清单、stderr 仅 ⚠️ 诊断；--json 与 exit code 逐字节不变；test/docs-check-fix.test.mjs 全绿
- AC-07：npm test + npm run lint 全过；dogfood 基线复核（豁免后 invalid 只减不增）

## Wave 划分

> src/index.js 被 task-02/03/05 共享，须分 Wave 串行（同 Wave 共享文件会被 execute 强制并行互相覆盖）。

### Wave 1
- task-01

### Wave 2
- task-02

### Wave 3
- task-03

### Wave 4
- task-04

### Wave 5
- task-05

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 范围边界 | 全部 | 非目标零实现（无置信度/交互/新门控） |
| D-002@v1 migrate 语义 | task-02 | AC-03 |
| D-003@v1 豁免双通道 | task-01 | AC-04 |
| D-004@v1 薄新模块复用 | task-02 | docs-migrate.js import docs-check 导出（无正则复制） |
| D-005@v1 报告出口 stdout | task-03、task-04 | AC-06 |
| D-006@v1 REF_RE 展开循环形 | task-01、task-04 | AC-01（evil 用例线性耗时） |
