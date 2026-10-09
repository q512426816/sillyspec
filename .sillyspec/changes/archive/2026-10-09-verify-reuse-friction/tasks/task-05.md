---
id: task-05
title: W3/FR-05 required-evidence 与 target_files 对账门前移
title_zh: W3/FR-05 required-evidence 与 target_files 对账门前移
wave: W3
status: draft
depends_on:
  - task-02
goal: 声明缺失秒级失败：纯事实门先于 3.5 分钟实测门
implementation: gates.js verify 段将 required-evidence 门与 reconcileTargetFiles 门移动到文档面收集阶段（实测门前、R16 聚合内）；移动前复核调用链无实测数据依赖
verify: node --test test/gates-verify-cheap-gates-first.test.mjs（声明 ②类缺失时零测试执行秒级拦截）
constraints: D-004@v1 安全边界：PASS 封顶/parity 等实测依赖门不动；发现隐藏依赖即回退该门原位并记录
acceptance:
  - ②类声明缺失：对账门先于实测门拦截，零测试执行
  - 前移门并入 R16 聚合清单
  - 调用链无实测依赖实证（有依赖回退并记录）
target_files:
  - src/run/gates.js
  - test/gates-verify-cheap-gates-first.test.mjs
allowed_paths:
  - src/run/gates.js
  - test/gates-verify-cheap-gates-first.test.mjs
---

