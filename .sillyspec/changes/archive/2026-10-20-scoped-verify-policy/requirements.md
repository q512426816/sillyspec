---
author: flow-machine-draft
created_at: 2026-10-20T15:00:00.000Z
---
# 需求规格（Requirements）— 2026-10-20-scoped-verify-policy

## 功能需求

### FR-01: AGENTS 规则自验口径句（必须）

`AGENTS.md` 与 `templates/agents-instruction.md` 的核心规则 4 必须同步追加一句自验口径：自验＝变更测试面（新增测试+受影响既有面）+ lint 即收口证据——全量套件归 pre-push 门，勿每变更重复手跑（共享仓全量红先做归属判别，非本变更引入如实留痕不阻断）；跑批输出落 `.sillyspec/.runtime/logs/` 日志回看尾部，勿整段吞掉。两文件措辞必须逐字一致（模板随 init 传播所有用仓）。

#### 场景：主路径——agent 收口前自验

Given agent 完成实现准备收口
When 读 AGENTS.md 规则 4
Then 按变更测试面+lint 自验；全量留给 pre-push，不再每变更手跑。

### FR-02: runner 失败面机制（必须）

`test/run-tests.mjs` 必须实现：①失败清单落盘 `.sillyspec/.runtime/test-last-failures.txt`（全绿时自清；路径可经 env `SILLYSPEC_TEST_FAILURE_LIST` 覆写——防并行套件互踩与测试污染）；②`--failed` 启动参数读清单过滤本轮跑面（清单缺失=全量照常；清单项不在当前文件集=warn 跳过；空交集=No test files found 退出 0）；③存在失败时汇总区打印复跑指引 `node test/run-tests.mjs --failed`。过滤与落盘逻辑必须提为 `test/runner-failure-face.mjs` 纯函数模块（parseFailureList / filterToFailedFace / persistFailureList）。

#### 场景：主路径——失败后复跑

Given 上一轮全量 4 文件失败，清单落盘
When node test/run-tests.mjs --failed
Then 只跑 4 个失败文件；全过后清单自清。

#### 场景：边界——清单含已删测试

Given 清单含 zzz.test.mjs（已不存在）
When --failed
Then warn 跳过该项，其余照常；全空交集时 No test files found exit 0。

### FR-03: 测试覆盖与新口径首验（必须）

新增测试必须覆盖：parseFailureList/filterToFailedFace/persistFailureList 纯函数（空行/去重/缺失 warn 集合/全绿删除）+ flag E2E（env 指向临时清单跑真 runner，断言 warn 与 No test files found）。本变更自身必须按新口径自验——只跑变更测试面+lint，不手跑全量（全量归本变更 pre-push/后续推送门）。lint 必须绿。

#### 场景：主路径

Given 改动落盘
When node --test test/test-runner-failed-face.test.mjs + lint
Then 全过零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/test-runner-failed-face.test.mjs「AGENTS 双文件口径句逐字一致」
FR-02: test/test-runner-failed-face.test.mjs「纯函数三件+flag E2E（env 临时清单）」
FR-03: test/test-runner-failed-face.test.mjs（本变更按新口径自验：变更面+lint，全量不手跑）
