---
author: flow-machine-draft
created_at: 2026-11-24T04:28:30.659Z
---
# 需求规格（Requirements）— 2026-11-24-token-commit-change-dir-attribution

## 功能需求

### FR-01: 别的变更的 task-NN 提交不再触发本变更的审计时点漂移：带 task-NN 但无变更名的提交，在触及了其他变更的目录时不算本变更提交

来源：用户选定「由 agent 来修 CLI」时确认的修法描述。本条承接并收窄现行 FR-core-engine-275（2026-11-08-bare-commit-attribution-narrow FR-02）与决策 D-core-engine-049 中「他侧 token 提交保守 own」一项。

- 提交级归属判定（`detectPatchDrift`、`deliveryFaceAnchoredAfter`）必须使用同一规则：标题提及本变更名的提交算本变更提交；标题提及了其他变更名的提交，即使同时带 task-NN token，也禁止算作本变更提交；标题未提及任何变更名但含 task-NN token 的提交，必须按其触及的变更目录归属——触及了变更目录且其中不含本变更时，禁止算作本变更提交。
- 变更目录口径：`<变更根>/<变更名>/…` 与 `<变更根>/archive/<变更名>/…` 均记为触及该变更名；变更根为 spec 目录下的 changes 目录在仓内的相对路径（缺省 `.sillyspec/changes/`）。
- 这类提交禁止触发本变更的审计时点漂移（不因此重新冻结、不因此隔离评审）。

#### 场景：标题写着他变更名且带 task token

- Given 窗口内有一笔提交，标题为 `fix: 评审处置（thin 2026-10-08-dg-unit；task-02）`
- When 以另一个变更 2026-10-08-other-y 做漂移检测
- Then 不触发漂移（现行实现在本变更动码前即红：test/thin-done-dirty-gate.test.mjs「FR-01 detectPatchDrift：全角括号交付提交判 drifted」第 99 行，2026-11-13-flow-done-patch-refreeze-skip-on-rework 引入的回归）

#### 场景：他变更的 task 提交落地

- Given 本变更 patch 已冻结、评审已通过；窗口内另有他会话的一笔提交，标题为 `fix: 他侧交付 (task-02)`（无变更名），触及 `.sillyspec/changes/2026-10-05-other/tasks.md` 与 `src/theirs.js`
- When 重跑 flow done
- Then 不报「审计时点漂移」，评审保留，补丁不含 `src/theirs.js`

#### 场景：触及归档目录

- Given 无名 task 提交只触及 `.sillyspec/changes/archive/2026-10-05-other/…` 与源文件
- When 提交级归属判定
- Then 不算本变更提交

### FR-02: 同一条规则贯通文件级归属：这类提交触碰的文件不进本变更的 own 面与 patch 冻结面

- 文件级归属（`buildCommitAttribution` + `isForeignByCommit`，消费面为 own/foreign 切分、`filterCommittedFace` 冻结面过滤、hunk 归属）必须与 FR-01 同一规则：仅被「触及他变更目录的无名 task 提交」触碰过的文件，对本变更必须判 foreign（不进 own 面、不进 patch 冻结面）。
- 文件同时被本变更名提交触碰、或被触及本变更目录的 task 提交触碰时，必须保持 own（own 优先不变）。
- 同一文件还被「不触及任何变更目录的无名 task 提交」触碰过时，必须保持 own（无法判断归属，保守）。

#### 场景：冻结面过滤

- Given 窗口内他会话的 token 裸提交触碰了 `src/theirs.js`，并同时提交了其变更目录下的 tasks.md
- When 本变更冻结 patch
- Then `src/theirs.js` 不在冻结面；以该他会话的变更为当前变更判定时 `src/theirs.js` 为 own

#### 场景：混合触碰保守

- Given `src/mixed.js` 先后被「触及他变更目录的 token 提交」与「不触及变更目录的 token 提交」触碰
- When 对本变更做归属判定
- Then 判 own

### FR-03: 带本变更名的提交、触及本变更目录的无名 task 提交、以及不触及任何变更目录的无名 task 提交，维持原行为（仍算本变更提交）——既有回归测试（含第 ⑦ 条）保持通过

- 带本变更名的提交（半角或全角括号）必须继续算本变更提交。
- 无名 task 提交触及本变更目录（含同时触及他变更目录）时，必须继续算本变更提交。
- 无名 task 提交不触及任何变更目录时，必须继续算本变更提交（无法判断归属，保守——2026-11-13 坑 flow-done-patch-refreeze-skip-on-rework 的返工提交形态）。
- 无名且无 task token 的纯裸提交、仅提他变更名的提交（含同时带 task token），必须继续不算本变更提交。
- 既有回归测试（test/commit-attribution-split.test.mjs ①②③、test/flowdone-disposition-drift.test.mjs ①—⑦、test/hunk-gate-commit-attribution.test.mjs、test/thin-done-dirty-gate.test.mjs）禁止修改断言；除下述基线即红的一例外，必须保持通过。基线核对（本变更动码前，2026-11-24）：上述四个文件共 19 例，18 过 1 败——败的是 test/thin-done-dirty-gate.test.mjs「FR-01 detectPatchDrift：全角括号交付提交判 drifted」，根因与 FR-01 同源（他变更名提交带 task token 被误判），实现后必须转绿。

#### 场景：返工提交（不触及变更目录）

- Given 评审返工提交标题为 `fix: 评审返工修复 (task-05)`，只触及源文件
- When 漂移检测
- Then 触发漂移（现行行为保持）

#### 场景：spec 目录不在仓内或非 git 仓

- Given 变更根无法表达为仓内相对路径，或 git 不可用
- When 归属判定
- Then 退化为现行保守行为（无名 task 提交算本变更提交），不抛错

### FR-04: 补单测覆盖「他变更的 task-NN 提交不触发漂移」

- 必须新增单测覆盖：他变更的 task 提交不触发本变更漂移（提交级）；其文件出本变更 own 面与冻结面（文件级）；触及本变更目录与不触及变更目录两种形态保持 own；混合触碰保守；变更根前缀解析；以及端到端「评审 PASS 后他变更 task 提交落地，重跑 flow done 不漂移、不隔离评审、补丁不含他侧文件」。
- 新增用例必须先于实现失败（红）、实现后通过（绿）；本变更的测试面必须全绿。

#### 场景：改后自检

- Given 新增用例与实现落盘
- When 运行 test/commit-attribution-split.test.mjs 与 test/flowdone-disposition-drift.test.mjs
- Then 退出码 0

### FR-05: task tick 给出的提交命令模板带上变更名

来源：用户在批准断点选择「模板一起改」。无名 task 提交的来源是 tick 回显的提交命令模板只带 task token。

- `sillyspec task tick` 勾选成功后回显的提交命令，消息占位必须形如 `<本任务交付概括> (<变更名> task-NN)`：括号内先写本次勾选所属的变更名，再写 task token。
- 模板消息必须能被提交归属的变更名解析（`parseChangeNamesFromSubject`）解析出该变更名——与 FR-01「标题提到变更名则按名字定」同一形态，使照抄模板的提交在共享仓并行下归属无歧义。
- 其余回显（`git add` 清单、下一任务提示、未入库提醒）必须不变；幂等分支（已是勾选态）必须继续不重复打印该模板。

#### 场景：勾选回显模板

- Given 变更 2026-10-01-vtt-8 勾选 task-01
- When task tick 回显提交命令
- Then 消息占位为 `<本任务交付概括> (2026-10-01-vtt-8 task-01)`，且该占位经变更名解析得到 2026-10-01-vtt-8

### FR-06: 收口时点名「分不清」的无名 task 提交（带 task token、未写变更名、未触及变更目录、已按本变更处理）——只提示不改判定

来源：用户在执行断点选定「加一条提示」。依据：落地验证发现该形态真实存在（multi-agent-platform 最近 300 笔提交中 29 笔），误判时无从直接看出是哪笔提交所致。

- `flow done` 的 patch 子步（冻结或重冻结）必须列出 baseline..HEAD 窗口内「带 task token、标题未写变更名、未触及任何变更目录」且其文件进了冻结面的提交（短 sha 与标题），并提示处置办法：若属他侧，让该提交标题带上变更名。
- 漂移检测触发时，必须指出其中属于上述形态的提交。
- 本提示必须是 advisory：禁止改变归属判定、漂移判定、评审隔离与归档流程的任何结果，禁止阻断收口；git 不可用或读取失败时必须静默跳过。
- 窗口内没有此类提交时禁止输出该提示。

#### 场景：他侧分不清的提交进了冻结面

- Given 窗口内有一笔提交 `fix: 他侧无目录提交 (task-07)`，只触及 `src/theirs-amb.js`
- When 重跑 flow done
- Then 输出含「归属分不清」提示并点名该提交（短 sha 与标题）；漂移与评审处置与不加提示时完全一致

#### 场景：窗口内没有此类提交

- Given 窗口内的无名 task 提交都触及了变更目录
- When 重跑 flow done
- Then 不输出该提示

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flowdone-disposition-drift.test.mjs「⑧ 他变更的 token 裸提交不触发本变更漂移；触及本变更目录的 token 裸提交触发」/「⑨ e2e：评审 PASS 后他变更 token 裸提交落地——不漂移不隔离，补丁不含他侧文件」+ test/thin-done-dirty-gate.test.mjs「FR-01 detectPatchDrift：全角括号交付提交判 drifted」（既有用例，基线即红，实现后转绿；断言不改）
FR-02: test/commit-attribution-split.test.mjs「④ token 裸提交按触及的变更目录归属（纯函数）」/「⑥ 并行会话集成：他变更的 token 裸交付出本变更 own 面与冻结面」
FR-03: test/flowdone-disposition-drift.test.mjs「⑦ token 裸提交（无名有 task-NN）触发漂移；纯裸提交仍不触发；交付面锚定同口径」+ test/commit-attribution-split.test.mjs「① 解析纯函数：标题变更名提取与归属聚合」/「② 混窗集成：他侧提交文件出 own 面与 patch 冻结面」（既有回归，断言不改）
FR-04: test/commit-attribution-split.test.mjs「⑤ changesDirPrefixFor：仓内 spec 目录得相对前缀；仓外得空串」（其余覆盖面由 FR-01、FR-02 的绑定用例承担）
FR-05: test/task-tick.test.mjs「⑧ tick 回显提交命令模板与未入库提醒：命令含 task-NN 占位与 tasks.md/侧车 pathspec；已勾≥2 且 tasks.md 零提交 → 提醒；入库后提醒消失；幂等零教学重复」（既有用例，按本条更新模板断言并补「模板可解析出变更名」断言）
FR-06: test/flowdone-disposition-drift.test.mjs「⑩ e2e：分不清的无名 task 提交——漂移与隔离照旧，并点名提示（advisory）」+ test/commit-attribution-split.test.mjs「⑦ listAmbiguousTokenCommits：分不清形态清单（无名有 token 且不触及变更目录）」
