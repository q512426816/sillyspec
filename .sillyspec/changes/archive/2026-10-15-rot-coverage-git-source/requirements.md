---
author: flow-machine-draft
created_at: 2026-10-15T02:13:55.145Z
---
# 需求规格（Requirements）— 2026-10-15-rot-coverage-git-source

## 功能需求

### FR-01: git 可恢复变更的覆盖面经源3 恢复（name-only 文件集、.sillyspec/ 剔除、无匹配为空不编造）

- frCoverageFiles 必须增源3：git log --all --name-only --grep 变更名 的文件集并入覆盖面，剔除 .sillyspec/ 前缀（与源1/2 同一过滤契约）；无匹配提交时覆盖面必须为空（禁止编造）。

#### 场景：主路径

- Given 临时 git 仓含主题匹配提交，When frCoverageFiles 求值，Then 恢复 src/a.js 且无 .sillyspec/ 条目；无匹配变更名返回空（测试①②③）。

### FR-02: 非 git 目录 fail-soft 不抛；partitionActiveByCoverage 消费后 unknownSources 收敛

- archiveRoot 非 git 仓时源3 必须 fail-soft（覆盖面按空处理不抛异常）；原 unknown 来源变更经源3 恢复覆盖后必须转强命中或 skip、不再进 unknownSources。

#### 场景：主路径

- Given 非 git 临时目录，When 求值，Then 空覆盖面零异常（测试④）；Given git 仓 FR fixture，When partition 求值，Then hits 命中/unknownSources 空/skip 计数正确（测试⑤）。

### FR-03: fr-index 既有 4 测试文件零回归；新增测试 3 组全绿

- test/fr-index.test.mjs、test/fr-index-l2.test.mjs、test/fr-rot-precision.test.mjs、test/fr-inject-cap.test.mjs 必须零失败；test/rot-coverage-git-source.test.mjs 三组必须全绿。

#### 场景：主路径

- When 五个测试文件全跑，Then 零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/rot-coverage-git-source.test.mjs「①②③ 覆盖面 git 源：恢复文件、剔 .sillyspec、无匹配为空」
FR-02: test/rot-coverage-git-source.test.mjs「④ 非 git 目录 fail-soft」「⑤ partition 消费：原 unknown 来源恢复后转 skip/强命中，unknownSources 收敛」
FR-03: test/fr-index.test.mjs + test/fr-index-l2.test.mjs + test/fr-rot-precision.test.mjs + test/fr-inject-cap.test.mjs（零回归）+ test/rot-coverage-git-source.test.mjs（全文件）
