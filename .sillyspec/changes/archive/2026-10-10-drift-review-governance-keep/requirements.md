---
author: flow-machine-draft
created_at: 2026-10-10T04:59:37.307Z
---
# 需求规格（Requirements）— 2026-10-10-drift-review-governance-keep

## 功能需求

### FR-01: 治理面等价漂移必须保留评审结论

flow done 的 patch 漂移检测命中时（窗口内存在本变更名后缀提交），若该窗口内本变更提交触及的文件全部位于 `.sillyspec/**` 且未触及本变更的 `requirements.md`/`design.md`（承诺面），则必须保留 review.json（不隔离、不改名）且不重置 review 子步标记，同时 change.patch 必须自动重冻结吸收治理面增量（审计件覆盖最新提交面不变量不破）。

#### 场景：评审后治理文件修复不再触发重评（用户实证循环的解）

- Given：patch 已冻结、review.json 已落盘 PASS（reviewedAgainst 锚冻结时 HEAD），用户为修 P2/P3 findings 提交了只碰 `.sillyspec/changes/<名>/tasks.md` 的后缀提交
- When：重跑 flow done
- Then：漂移警告在场，review.json 原名保留、review 标记不重置，change.patch 重冻结含该治理文件，收口继续（不重印评审任务书）

### FR-02: 交付面/承诺面漂移必须维持隔离语义

窗口内本变更提交触及任何非 `.sillyspec/` 文件（交付面）或本变更 `requirements.md`/`design.md`（承诺面）时，必须维持现状：隔离旧 review.json 为 `review.json.superseded-<ts>`、重置 review 标记、重评；`reviewedAgainst` 锚定当前 HEAD 的既有保留判定必须不变；他侧后缀/裸提交不触发漂移的既有语义必须不变。

#### 场景：既有回归不破（2026-10-05-disposition-refreeze-drift）

- Given：评审 FAIL 处置涉及代码修改并以后缀提交
- When：重跑 flow done
- Then：漂移警告 + 自动重冻结 + review.json 隔离 + 重评任务书再现（既有 e2e 场景 ② 逐字不破）

### FR-03: 隔离后重评任务书必须保留复审语义

评审任务书生成时 review.json 缺席但存在 `review.json.superseded-*` 隔离件，必须从最新隔离件（时间戳后缀字典序最大）注入前轮 findings 与复审指引（「已报项只验修复+回归、预算投新增问题」）；review.json 在场时行为不变；两者皆缺席时零注入（首评形态）不变。

#### 场景：隔离不再丢失复审上下文

- Given：review.json 已被漂移隔离为 review.json.superseded-20261010T000000，内含 2 条 findings
- When：flow done 重印评审任务书
- Then：任务书含「前轮评审 findings（2 项……）——本轮是复审」段与复审优先级指引

### FR-04: 评审 PASS 带 P2/P3 findings 时收口必须打印处置提示

收口消费 review.json 为 PASS 且存在 P2/P3 findings 时，必须在既有非阻断发现清单后追加处置提示：P2/P3 非阻断可留债归档；修复只碰治理文件（`.sillyspec/**`、不动本变更 requirements/design）时不触发重评（评审保留+自动重冻结）；触及交付面或承诺面则需重评且为复审（非全量首评）。

#### 场景：提示在场

- Given：review.json PASS 含 1 条 P2
- When：flow done 消费评审
- Then：输出含「P2/P3 非阻断，可留债归档」与「只碰治理文件……不触发重评」两类指引

### FR-05: 上述判定与 fallback 必须有测试覆盖，触及 src 的实测全绿

detectPatchDrift 新字段（ownFiles/governanceOnly/touchedPromiseFace）归属三形态、任务书 superseded 回退、e2e 治理面等价保留链路必须有测试；收口实测零失败。

#### 场景：收口实测

- Given：新增/扩展测试落盘
- When：收口 CLI 亲测（本变更测试 ∪ FR 关联回归 ∪ import 依赖）
- Then：零失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/flowdone-disposition-drift.test.mjs「③ e2e：治理面等价漂移——评审保留 + 自动重冻结 + 不重评直接归档」
FR-02: test/flowdone-disposition-drift.test.mjs「① detectPatchDrift 归属三形态（扩展：文件面字段）」「② e2e：处置重入隔离链路（既有回归）」
FR-03: test/flow-review.test.mjs「② 评审任务书：superseded 隔离件回退注入前轮 findings」
FR-04: test/flowdone-disposition-drift.test.mjs「③ e2e：治理面等价漂移（断言处置提示在场）」
FR-05: test/flowdone-disposition-drift.test.mjs 全文件 + test/flow-review.test.mjs 全文件 + flow done 收口 CLI 实测
