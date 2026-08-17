---
author: qinyi
created_at: 2026-08-16T23:20:00+08:00
updated_at: 2026-08-16T23:20:00+08:00
plan_level: light
---

# 轻量计划（Light Plan）：并发状态分裂三坑修复

## 来源

brainstorm 四件套（design.md 方案决策 D-001/002@v1 / FR-01~03）已确认，用户裁决单变更合并 + Grill 两 P1 已修订闭环。

## 范围

7 src + 3 test。见 design.md「文件变更清单」。

## Tasks

- [x] task-01: #1 四处 marker 写入点原子化（src/run/stage.js:96-112 主点 + gates.js:444 + prompt.js:518 + task-review.js:795）mkdir 先于 marker + 分层 fail 语义（D-001@v1）+ test/execute-run-dir-fail-loud.test.mjs（覆盖：FR-01, D-001@v1）
- [x] task-02: #2 applyByMerge 预对齐（四条件过滤集：`git diff baseHash..baselineCommit` 已提交口径 ∩ main 已推进 ∖ 分支已变更 ∖ 工作区 dirty；checkout main + commit；失败降级原 merge 路径）（D-002@v1）+ test/worktree-merge-baseline-align.test.mjs（覆盖：FR-02, D-002@v1）
- [x] task-03: #3 docsCheckHint 扩展 livingDocDrift（collectDocRefs 复用提取 platform-interface-map 引用源码集 ∩ changedFiles 交集非空提示；local.yaml living-docs 可配）+ test/docs-living-drift-hint.test.mjs（覆盖：FR-03）
- [x] task-04: 全量验证（npm test 全绿 + docs check 无新增失效）+ 文档同步（file-lifecycle marker 机制描述 / troubleshooting 登记三坑闭环）+ 显式 pathspec 提交（覆盖：全 FR）

任务依赖：task-01/02/03 相互独立可并行；task-04 依赖全部。

## 验收

- AC-01: execute 启动（任何路径写 marker）后 execute-runs/<runId>/tasks/ 必然存在；分层 fail 语义有测试（stage throw / gates 阻断 / prompt 留痕 / task-review 去静默）
- AC-02: 模拟 baseline 含并行文件场景 apply --merge 成功（预对齐生效）；工作区 dirty 文件不被 checkout 覆盖（测试覆盖）
- AC-03: 审计 touched 活文档映射文件时输出 livingDocDrift 提示；无关文件不误报
- AC-04: npm test 全绿（211+ 新增）；docs check 无新增失效
- AC-05: 提交显式 pathspec 未夹带并行会话改动

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | AC-01 |
| D-002@v1 | task-02 | AC-02 |
