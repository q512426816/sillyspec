---
author: flow-machine-draft
created_at: 2026-10-07T14:50:14.029Z
---
# 需求规格（Requirements）— 2026-10-07-scope-audit-thin-patch-replay

## 功能需求

### FR-01: 归档 thin 变更（无 scope-audit.json、有 change-patch.json）跑 scope-audit：计划内文件显示「✓ 计划内」+ 冻结时点真实行数，不再恒「计划未动 0/0」；行数自冻结 patch 按段统计（binary/new/deleted 三档对齐既有口径）

- scope-audit 的已收尾（settled）分支在 execute 快照缺失时，**必须**回读变更目录的 change-patch.json + change.patch（flow done 时点冻结件）作为冻结对账记录出表：文件集取 meta.files 过 filterDeliverableFiles（与 actual 侧同口径），三态按 design 清单 pathMatches 判定（planned/unplanned/untouched 补行），行数自冻结 patch 按 `diff --git` 段统计（+/− 行计数；`new file mode`→new、`deleted file mode`→deleted、binary→null 档），baseAnchor 取 meta.baseline；行数**禁止**按当前工作树实时采集（那是被修的失真源）。

#### 场景：归档 thin 变更查询

- Given：变更已归档于 changes/archive/<名>/，目录有 change-patch.json（files/baseline/head/totals/patchSha256）与 change.patch，无 scope-audit.json（thin flow done 从不落快照），主仓工作树干净
- When：computeChangeScopeAudit / `sillyspec scope-audit --change <名>`
- Then：冻结面文件按三态出表——design 清单内文件「✓ 计划内」带冻结时点 +N/−M；清单外冻结文件「计划外」；清单内未进冻结面文件「计划未动」0/0；note 点名 flow done 冻结 patch 记录与落盘时间；不再出现「全行计划未动 +0/−0」

#### 场景：patch 采集失败留痕形态

- Given：change-patch.json 存在但 patchStatus=failed（change.patch 缺失）
- When：同上查询
- Then：文件集与三态仍按 meta.files 回放（文件集是独立冻结面），行数列为 null（—，不出伪数据），note 明示行数不可得原因

### FR-02: 冻结语义：主仓后续演进（新文件/再修改）不进回放表；基点取 meta.baseline；--file 单文件 diff 走冻结 patch 切片（sha256 校验同 A-F01）

- 回放表**必须**封闭在 flow done 时点冻结面：主仓后续新文件/再修改不得进表；`--file` 单文件 diff **必须**优先切片冻结 patch（结果带 frozenPatchPath 与 patchSha256，sha256 不匹配时按 A-F01 同款拒绝并告警），patch 不可得才退实时锚。回放结果**禁止**携带随主仓漂移的实时行数。

#### 场景：冻结后主仓演进

- Given：归档 thin 变更已回放出表，随后主仓新增 src/later.js、再修改冻结面内文件（未提交）
- When：再次跑 scope-audit 同一变更
- Then：later.js 不进表；冻结面行数不变（不随工作树漂移）

#### 场景：--file 冻结切片与篡改检测

- Given：同上变更，change.patch 完好
- When：getFileDiff（--file）查冻结面内文件
- Then：diff 取冻结 patch 切片，anchorLabel 标「冻结 patch」；若 change.patch 被改致 sha256 与 meta.patchSha256 不匹配 → 拒绝出 diff 并告警「可能被篡改」

### FR-03: 既有行为不回归：execute 快照在时快照优先；快照与 change-patch 双缺的归档仍走开放区间兜底+漂移警告（既有断言绿）

- 回退链顺序**必须**保持：execute --done 快照（scope-audit.json / runtime 存量）> change-patch.json 回放（本变更新增）> 实时开放区间兜底；双缺时兜底路径的既有 note（「快照缺失……开放区间……verify-result.md」）与既有测试断言**禁止**变化。

#### 场景：快照优先级

- Given：归档变更同时有 scope-audit.json 与 change-patch.json
- When：scope-audit 查询
- Then：出快照记录态表（note 点名 execute --done 快照），change-patch 回放不参与

#### 场景：双缺兜底不回归

- Given：归档变更既无快照也无 change-patch.json
- When：scope-audit 查询
- Then：走实时开放区间兜底，note 含「快照缺失」「开放区间」（既有断言原样绿）

### FR-04: multi-agent-platform 旧归档 2026-10-07-taskboard-tasks-md 实测：三个计划内文件（backend/app/modules/task/parser.py 等）显示计划内

- 修复后在本机 multi-agent-platform 仓对旧归档 2026-10-07-taskboard-tasks-md 实测：`sillyspec scope-audit --change 2026-10-07-taskboard-tasks-md` **必须**让 design 清单三个计划内文件（backend/app/modules/task/parser.py、backend/app/modules/task/tests/test_parser.py、backend/app/modules/spec_workspace/tests/test_task_reparse_on_sync.py）显示「✓ 计划内」而非「计划未动」，且不改该仓任何文件（纯读验收）。

#### 场景：旧归档立即受益

- Given：multi-agent-platform 仓（已发布 3.32.0 装的 CLI 不含本修复——用本仓工作区 CLI 指向该仓跑）
- When：`node <本仓>/bin/sillyspec.js scope-audit --change 2026-10-07-taskboard-tasks-md`（cwd=multi-agent-platform）
- Then：三计划内文件 verdict=planned，行数为冻结时点真值（与 change.patch 对拍），全仓零写入

### FR-05: 全量测试绿（含新增回放夹具测试）

- 本变更**必须**新增回放夹具测试（覆盖 FR-01/02/03 场景）并全量套件跑绿；**禁止**改既有测试断言来适配新行为（回归面靠既有断言守住）。

#### 场景：全量门

- Given：新增 test/scope-audit-thin-patch-replay.test.mjs 入套
- When：npm test（node test/run-tests.mjs）
- Then：全量绿，既有 scope-audit 断言零改动

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/scope-audit-thin-patch-replay.test.mjs「归档 thin 回放：快照缺失 + change-patch.json 在 → 三态真实表（计划内带冻结行数，不再恒计划未动）」
FR-01: test/scope-audit-thin-patch-replay.test.mjs「patchStatus=failed：文件集回放 + 行数 null 档不出伪数据」
FR-02: test/scope-audit-thin-patch-replay.test.mjs「冻结语义：后续演进不进表 + baseAnchor=meta.baseline + --file 冻结切片与 sha256 篡改拒绝」
FR-03: test/scope-audit-thin-patch-replay.test.mjs「优先级：快照在时快照优先；双缺走开放区间兜底（既有断言口径）」
FR-04: 不适用：跨仓实测验收（multi-agent-platform 本机仓，非本仓测试面）——验收留痕见收口前实测输出
FR-05: test/run-tests.mjs「全量套件（723 既有 + 新增）跑绿，既有断言零改动」
