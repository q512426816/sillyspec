---
author: flow-machine-draft
created_at: 2026-10-05T12:03:05.695Z
---
# 需求规格（Requirements）— 2026-10-05-review-declared-unstamped-gate

## 功能需求

### FR-01: collectReviewDeclaredFiles 对 resolver 回退拿到的无戳 run 返回空声明面（不再挂无关 run 的 changedFiles）

- collectReviewDeclaredFiles 必须在 resolver 返回 runId 后校验归属戳：readExecuteRunChangeStamp(runtimeRoot, runId) 不等值 changeName（无戳或戳属他变更——resolver 无主回退形态）时必须返回空 Map，禁止把该 run 的 review changedFiles 挂为本变更声明面。

#### 场景：主路径

- Given: execute-runs 存在无戳旧 run（其 review.json 声明了与本变更无关的文件），本变更从未跑过 execute（无戳等值命中）
- When: collectReviewDeclaredFiles 解析声明面
- Then: 返回空 Map——apply 预检不再出现「review 声明了越权文件」误报

### FR-02: 戳等值命中（run 归属本变更）时声明收集行为不变

- run 归属戳等值 changeName 时声明收集必须与既有行为逐字一致：按 review.repo 切片聚合 changedFiles、过滤 .sillyspec//meta.json 运行时产物。

#### 场景：主路径

- Given: execute-runs 存在戳==本变更名的 run，其 tasks/*/review.json 声明 changedFiles
- When: collectReviewDeclaredFiles 解析声明面
- Then: 声明面与门控前逐字一致（repo 切片/产物过滤不变）

### FR-03: resolver 其他消费方（task-done/cross-repo-reconcile）语义零变化（门控只在 collectReviewDeclaredFiles 内）

- 门控必须只落在 collectReviewDeclaredFiles 内：resolveLatestExecuteRunIdWithTasks 函数体及 task-done/cross-repo-reconcile 等其他消费方的解析语义零变化（无主回退保留）。

#### 场景：主路径

- Given: 任意消费方（如 writeTaskReview 定位）经 resolver 解析 run
- When: changeName 无戳命中、存在无戳旧 run
- Then: resolver 仍返回该无戳 run（回退语义不变）——只有声明收集口按戳门控

### FR-04: 单测覆盖：无戳 run 空声明/带戳等值收集正常/带戳他变更+无戳并存仍空三形态

- 必须有单测锁定三形态：无戳 run（回退形态）空声明、带戳等值 run 收集正常、带戳他变更 run 与无戳 run 并存时（回退仍拿无戳）空声明。

#### 场景：主路径

- Given: 临时 runtimeRoot 内构造三形态 fixture
- When: collectReviewDeclaredFiles 判定
- Then: 三形态断言各自成立

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/review-declared-unstamped-gate.test.mjs「无戳 run（回退形态）声明面为空」
FR-02: test/review-declared-unstamped-gate.test.mjs「带戳等值 run 收集行为不变（切片+产物过滤）」
FR-03: test/review-declared-unstamped-gate.test.mjs「resolver 回退语义不变（无主 run 仍被解析返回）」
FR-04: test/review-declared-unstamped-gate.test.mjs「带戳他变更+无戳并存仍空（三形态齐备）」
