---
author: flow-machine-draft
created_at: 2026-10-08T01:03:04.661Z
---
# 需求规格（Requirements）— 2026-10-08-thin-done-dirty-gate-and-paren-attribution

## 功能需求

### FR-01: 全角/半角/混合括号与 thin 前缀形态的变更名提交都能被 parseChangeNamesFromSubject 解析；detectPatchDrift 对全角括号交付提交正确判 drifted

- `parseChangeNamesFromSubject`（foreign-declared.js，归属解析单一真相源）**必须**兼容：半角 `(<名>)`（既有形态零回退）、全角 `（<名>）`、混合闭合 `（<名>)`/`(<名>）`、括号内 `thin ` 前缀与名字后附注文本（`（thin <名>；quick）` 形态）；变更名本体模式（`YYYY-MM-DD-[A-Za-z0-9._-]+`）**禁止**放宽。detectPatchDrift 经同一解析链对全角括号交付提交**必须**判 drifted=true。

#### 场景：全角惯例提交

- Given：提交信息 `fix: 评审处置（thin 2026-10-08-foo；quick）`
- When：parseChangeNamesFromSubject / detectPatchDrift
- Then：解析出 `2026-10-08-foo`；freezeHead..HEAD 含该提交时 drifted=true（漂移重冻结触发）

### FR-02: flow done 在 dirtyWarned>0 且无显式处置时停在 patch 子步（exit 1、半态可重入、不归档）；--freeze-dirty 并入照旧；新增 --accept-dirty-gap 显式接受缺口（缺口数随 change-patch.json 留痕）

- flow done 的 patch 子步在 dirtyWarned>0 且未带 `--freeze-dirty`/`--accept-dirty-gap` 时**必须**阻断收口：`reportMidFail('patch')` + exit 1，patch 子步不标 done（重跑重入全量冻结/漂移检测），不进 archive；`--freeze-dirty` 行为修正性保留（**必须**以 `--untracked-files=all` 采集 dirty 面——旧口径全新目录折叠成 `dir/` token，声称并入却漏目录内交付文件）；`--accept-dirty-gap` **必须**放行并在 change-patch.json 落 `acceptedDirtyGap: <N>` 增量键 + console 留痕。

#### 场景：三态门与目录折叠

- Given：thin 变更交付 src 未提交（含置于全新目录的形态），flow done 收口
- When：裸跑 / 带 --freeze-dirty / 带 --accept-dirty-gap
- Then：裸跑 exit 1 停在 patch（change 仍 active、无归档）；--freeze-dirty 冻结面含该文件（全新目录内文件逐文件并入，不折叠漏采）；--accept-dirty-gap 完成收口、change-patch.json 含 acceptedDirtyGap=1、冻结面不含该文件

### FR-03: 提交后重跑：patch 子步重跑自动并入已提交 src（漂移/全量冻结路径均可）

- 阻断后用户提交 src（信息尾缀带变更名，全角/半角均可）再重跑 flow done：patch 子步**必须**重跑并把该文件并入冻结面（首次阻断时 patch 未标 done → 全量冻结路径；已冻结后补提交 → 漂移重冻结路径）。

#### 场景：阻断→提交→重跑

- Given：FR-02 场景的阻断态
- When：提交 src（`fix: x（<变更名>）`）后重跑 flow done
- Then：收口推进，change.patch 含该 src 文件

### FR-04: 全量测试绿；flow-protocol ⑥b 的旧行为断言按新门语义更新（行为变更是本变更目的，非迁就）

- 本变更**必须**新增测试：解析单测（全角/混合/thin 前缀/附注）、detectPatchDrift 全角单测、dirty 门三态 e2e、阻断→提交→重跑 e2e；flow-protocol ⑥b 的 wip-dirty 用例**必须**改走新门语义（首次阻断 + --accept-dirty-gap 完成），其冻结面断言保留；全量套件绿。

#### 场景：全量门

- Given：新增 test/thin-done-dirty-gate.test.mjs + commit-attribution-split 增量断言
- When：npm test
- Then：全量绿

### FR-05: 不做归档态 --refreeze 入口（阻断门从源头消除坏状态；存量坏归档由各仓协议重入处理，后续如需另开变更——设计留档）

- 本变更**禁止**实现归档态 flow done --refreeze 入口：阻断门（FR-02）使「带缺口归档」无法再产生，存量坏归档已有验证过的协议重入修法（坑记录修复路径 1-4 步）；归档态重入口涉及对终态件的重写面，如确需另开变更设计。本条为设计留档，无测试面。

#### 场景：范围声明

- Given：本变更合入
- When：审视交付面
- Then：无归档态重冻结代码；坑记录与 decisions 留档指向后续可选变更

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/commit-attribution-split.test.mjs「全角/混合/thin 前缀/附注形态解析（增量断言）」
FR-01: test/thin-done-dirty-gate.test.mjs「detectPatchDrift 全角括号提交判 drifted」
FR-02: test/thin-done-dirty-gate.test.mjs「dirty 门三态：裸跑阻断（exit 1 @ patch 不归档）/--freeze-dirty 并入/--accept-dirty-gap 留痕完成」
FR-03: test/thin-done-dirty-gate.test.mjs「阻断→提交（全角括号）→重跑：冻结面含 src」
FR-04: test/flow-protocol.test.mjs「⑥b wip-dirty 按新门语义：首次阻断 + --accept-dirty-gap 完成（断言更新）」
FR-04: test/run-tests.mjs「全量套件跑绿」
FR-05: 不适用：设计留档条目（无代码无测试面）——裁决与理由见 design 风险节
