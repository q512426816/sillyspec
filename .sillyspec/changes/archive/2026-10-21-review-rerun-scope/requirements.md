---
author: flow-machine-draft
created_at: 2026-10-21T00:00:00.000Z
---
# 需求规格（Requirements）— 2026-10-21-review-rerun-scope

## 功能需求

### FR-01: 评审任务书复跑口径节（必须）

renderReviewerTaskbook 必须新增「复跑口径」节，含五要素：①评审实测按「变更测试面」复跑（新测试+直接受影响既有文件）；②多文件合并一次 node --test 跑（逐文件跑每次付 ~10s 启动税）；③全量套件禁止——ledger 收口实测已跑变更面、pre-push 门会跑全量，评审内重复跑全量是三重保险费（引 2026-10-20 会话画像实证：单次评审内两轮全量 8.4min）；④材料包含 ledger 测试回执时以回执为基线抽验复核，勿整体重跑；⑤长输出落 `.sillyspec/.runtime/logs/` 日志回看尾部。节位置在检查单之后、纪律之前；任务书其余内容逐字不变。

#### 场景：主路径——评审员读任务书

Given 评审子代理收到任务书
When 执行检查单第 1 条（测试真存在且断言该行为）
Then 按变更测试面合并复跑+回执抽验，不跑全量。

### FR-02: 材料包 ledger 测试回执子源（必须）

flow-review-pack.js 必须新增：①`findLatestTestReceipt(verifyRunsDir, changeName)`——扫描 verify-runs 各 runId 目录的 test-result.json，取 change 匹配的最新一条（目录名时间序），fail-soft 缺席返回 null；②`assembleReviewPack` 增 `testReceipt` 参数——在场时机械渲染回执行（ran_at/status/exit_code/耗时/命令面截断），缺席零注入；体积帽语义不变。flow.js review 子步装配时以 runtimeRoot 下 verify-runs 调用并传入。

#### 场景：主路径——收口评审带回执

Given ledger 刚实测完（verify-runs 有本变更 test-result.json）
When review 子步渲染任务书+材料包
Then 包内含回执行，评审员抽验复核而非重跑。

#### 场景：边界——回执缺席

Given verify-runs 无匹配（首次/被清理）
Then 包零回执行，口径节仍指引按变更测试面复跑。

### FR-03: 测试覆盖与 scoped 自验（必须）

新增测试必须断言：任务书五要素锚；findLatestTestReceipt 取最新匹配/缺席 null/坏 json fail-soft；assembleReviewPack 回执行在场/缺席零注入。变更测试面+lint 必须绿（不跑全量）。

#### 场景：主路径

Given 改动落盘
When node --test 新测试 + 受影响面 + lint
Then 全过零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/review-rerun-scope.test.mjs「任务书复跑口径五要素锚」
FR-02: test/review-rerun-scope.test.mjs「回执扫描取最新+装配在场/缺席」
FR-03: test/review-rerun-scope.test.mjs（scoped 自验：变更面+lint）
