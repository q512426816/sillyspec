---
author: flow-machine-draft
created_at: 2026-11-15T00:05:28.922Z
---
# 需求规格（Requirements）— 2026-11-15-sentinel-evidence-channel

## 功能需求

### FR-01: listReviewEvidence 扫描路径修正（现扫 changes/.runtime 错位一级，真实 execute-runs 在 specBase/.runtime——通道从未生效）

- 必须：listReviewEvidence 扫描 `specBase/.runtime/execute-runs`（变更目录的上两级 .runtime）——fixdir 在场时 execute 阶段的 per-task review（`execute-runs/<run>/tasks/<task-id>/review.json`）被哨兵认作完成证据。

#### 场景：execute-runs 证据复活

Given 变更目录 specBase/changes/x，execute-runs 产物在 specBase/.runtime/execute-runs/<run>/tasks/task-01/review.json
When detectFakeCheckCompletion 判定 task-01 完成证据（无 commit token）
Then byReview 命中（不再因错位路径扫空而恒 false）

### FR-02: 增认变更目录 review.json 文本含 task id 作为第三证据通道（轻量道收口产物即证据）

- 必须：变更目录下 review.json（存在且可读）文本含词边界 task-NN 时，对应任务认定有证据；词边界同 taskTokenRe（task-01 不证 task-010）。

#### 场景：轻量道收口 review.json 即证据

Given tasks.md 全勾、区间提交零 token、变更目录 review.json 的 checklist item 含「task-01」「task-02」字样
When detectFakeCheckCompletion
Then status=complete（三通道任一命中即认）

#### 场景：词边界不放大

Given review.json 文本含 task-011 但判定的任务是 task-01
Then task-01 不因此获证（词边界匹配）

### FR-03: 既有 sentinel 测试 11 用例零回归+新增用例覆盖两通道

- 必须：test/sentinel-unified-evidence.test.mjs 等四套既有用例零改动零失败；新增用例覆盖 FR-01 真实路径形态与 FR-02 第三通道正反例。

#### 场景：回归+新增全绿

Given 既有 11 用例全绿
When 追加新用例后全量跑 sentinel 测试面
Then 全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/sentinel-unified-evidence.test.mjs「FR-01 execute-runs 真实路径证据复活（specBase/.runtime 层级）」
FR-02: test/sentinel-unified-evidence.test.mjs「FR-02 变更目录 review.json 第三通道：文本含 task id 即认+词边界不放大」
FR-03: test/sentinel-unified-evidence.test.mjs 全套（既有 11 用例零改动+新增 2 用例全绿，含 sentinel-rules/token-shorthand/wiring 四文件面）
