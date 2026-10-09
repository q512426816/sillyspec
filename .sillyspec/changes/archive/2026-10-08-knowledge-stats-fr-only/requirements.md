---
author: flow-machine-draft
created_at: 2026-10-08T01:25:54.557Z
---
# 需求规格（Requirements）— 2026-10-08-knowledge-stats-fr-only

## 功能需求

### FR-01: --fr-only 在场时输出仅含 FR 索引段

必须：`--fr-only` flag 在场时，`sillyspec knowledge stats` 的人类模式输出仅含「FR 索引实验」段（跳过命中矩阵段和 conventions 段），`--json` 模式的 data 对象仅含 `frIndex` 键（跳过 `matrix` 和 `conventions` 键）。

#### 场景：人类模式过滤

Given 本仓有 FR 索引和知识命中数据
When `sillyspec knowledge stats --fr-only`
Then 输出包含「FR 索引实验」标题但不包含「命中矩阵」或「conventions」相关段落

#### 场景：JSON 模式过滤

Given 同上
When `sillyspec knowledge stats --fr-only --json`
Then `data` 对象有 `frIndex` 键且无 `matrix` 键

### FR-02: 不带 flag 行为零变化

必须：不传 `--fr-only` 时，`knowledge stats` 输出与改动前逐字节一致（人类模式和 --json 模式均如此）。

#### 场景：默认路径回归

Given 未传 --fr-only
When `sillyspec knowledge stats` 或 `sillyspec knowledge stats --json`
Then 输出与改动前完全一致

### FR-03: --json + --fr-only 组合 envelope 不变

必须：`--json --fr-only` 组合时 envelope 外壳（schema_version/command/ok 等顶层键）与不带 --fr-only 时完全一致，仅 data 内容被过滤。

#### 场景：envelope 完整性

Given --json 模式
When 加 --fr-only
Then 顶层键集不变（schema_version/ok 等），data.frIndex 在场

### FR-04: 测试覆盖三态

必须：测试覆盖三种调用形态（无 flag / --fr-only / --fr-only --json）且全部通过。

#### 场景：三态全绿

Given 测试套件
When 跑 knowledge-stats 相关测试
Then 三种形态断言全过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-stats-fr-only.test.mjs「--fr-only 人类模式仅含 FR 索引段」
FR-02: test/knowledge-stats-fr-only.test.mjs「不带 flag 行为零变化（字节一致）」
FR-03: test/knowledge-stats-fr-only.test.mjs「--json --fr-only envelope 不变仅过滤 data」
FR-04: test/knowledge-stats-fr-only.test.mjs「三态全覆盖」
