---
author: flow-machine-draft
created_at: 2026-10-20T02:06:01.406Z
---
# 需求规格（Requirements）— 2026-10-20-thin-user-decision-record

## 功能需求

### FR-01: flow start 横幅含执行期用户决策落盘纪律行（含 decisions add 命令样例与承诺面同步提示）

- 新建轻量变更时 flow start 横幅必须包含执行期用户决策落盘纪律行：行内必须给出 `decisions add --change/--id/--title` 命令样例，且必须提示「改变承诺面须同步 design/tasks 对应节」。
- 纪律行必须只在全新 start 横幅输出；重入恢复简报禁止注入新纪律行（恢复面读盘面，保持既有形态）。

#### 场景：主路径

Given 一个全新轻量变更执行 `flow start`
When 横幅渲染完成
Then stdout 含 /decisions add/ 与 /承诺面|design\/tasks/ 的纪律行，且恢复重入时简报不含该行

### FR-02: 断点②行含汇报对账半句（执行期用户决策随汇报对账，无则说明无）

- 断点②「执行断点」行文必须包含汇报对账半句：向用户汇报测试结果时必须顺带对账执行期用户决策（decisions 条目列出，无则说明无）。
- 行文必须保留「执行断点」关键词与既有语义（等用户确认再跑收口），只允许追加不允许改写既有句。

#### 场景：主路径

Given 全新轻量变更 flow start 横幅
When 三断点纪律段渲染
Then 断点②行可匹配 /执行断点/ 且含 /对账|decisions/ 的对账半句

### FR-03: task tick 回显在 decisions.md 缺席时附落盘提示行，decisions.md 在场时零新增行（条件 gating，纯提示不阻断不改 exit code）

- `task tick` 回显必须在变更目录 decisions.md 不存在时追加一行落盘提示（含 `decisions add` 命令样例）；decisions.md 存在时禁止输出该提示行。
- 提示必须是 advisory：禁止改变 tick 的 exit code、翻格结果与既有回显行；存在性判定读盘即时作出（读取失败静默降级为不提示）。

#### 场景：主路径

Given 在途轻量变更且无 decisions.md
When `task tick` 成功翻格
Then stdout 含 /decisions add/ 提示行且 exit 0
When 同变更创建 decisions.md 后再 tick
Then stdout 不含该提示行且既有回显不变

### FR-04: 新增测试套件覆盖以上三面且全绿；既有 approve-gate-tick / task-tick / flow-checkpoints / flow-order-canon 套件零回归

- 新增 test/thin-user-decision-record.test.mjs 必须覆盖 FR-01/FR-02/FR-03 行为断言且全绿。
- 既有 approve-gate-tick、task-tick、flow-checkpoints、flow-order-canon 四套件必须零回归（既有断言不改）。

#### 场景：主路径

Given 本变更交付完成
When `node --test` 跑新套件与四既有套件
Then 全部 pass、零 fail

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-user-decision-record.test.mjs「① 横幅纪律行」
FR-02: test/thin-user-decision-record.test.mjs「② 断点②对账半句」
FR-03: test/thin-user-decision-record.test.mjs「③ tick 条件提示」
FR-04: test/thin-user-decision-record.test.mjs「④ 既有套件零回归」
