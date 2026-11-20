---
author: flow-machine-draft
created_at: 2026-11-20T00:13:11.803Z
---
# 需求规格（Requirements）— 2026-11-20-decisions-lifecycle-stale-assertion

## 功能需求

### FR-01: 跨域迁移用例按域稳定语义重写——「@v2 声明新模块域」用例必须断言存量域优先（v2 仍在存量域就地升级：written 恰为 [{core.md, D-core-001@v2, supersede}]、目标新域文件不创建、core.md 无 v1 段且含 supersedes 注记），禁止再断言 2026-11-12 前的「蒸馏时跨域迁移」旧语义

- 约束强度：必须（断言过时修复——d15c2e23 / 2026-11-12-freeze-decision-recall R-03 有意移除蒸馏侧域迁移，设计论证：回填/重跑会把经 redomain 治理的条目拉回 unmapped，域迁移归 `sillyspec tests --redomain --decisions` 显式职责）

#### 场景：v2 声明新模块域

Given D-007@v1 落 decisions/core.md（模块域：core）、decisions.md 推进到 D-007@v2（模块域：util）／When distillIntoKnowledge／Then written = [{file:'decisions/core.md', id:'D-core-001@v2', action:'supersede'}]；decisions/util.md 不存在；core.md 无 `## D-core-001@v1` 段、有 `## D-core-001@v2` 段且含 `supersedes：D-core-001@v1` 注记。

### FR-02: 存量域优先语义显式锁定——必须新增断言覆盖 redomain 治理场景形态（存量段在 unmapped 域、v2 声明业务域，蒸馏后仍落 unmapped 域），防止未来把域稳定语义反向改动而无人察觉

- 约束强度：必须（该语义 2026-11-12 起零测试覆盖，是全量红 8 天无人察觉的间接原因之一）

#### 场景：redomain 治理成果不被拉回

Given D-007@v1 存量段位于 decisions/unmapped.md（模拟已 redomain 治理的条目）、v2 声明「模块域：core」／When distillIntoKnowledge／Then 升级后的段仍在 decisions/unmapped.md（就地 supersede），decisions/core.md 不被创建。

### FR-03: 回归面全绿与豁免清偿——test/decisions-lifecycle.test.mjs 必须 30 用例全绿；.sillyspec/local.yaml known_failures 中该用例的临时豁免行必须移除（豁免失配即暴露残留红）

- 约束强度：必须（豁免是 2026-11-19 收口时的临时留痕，修复后不清理会掩盖回归）

#### 场景：全绿与豁免清理

Given 用例断言已对齐域稳定语义／When node --test test/decisions-lifecycle.test.mjs 与 收口实测门／Then 30/30 绿；local.yaml known_failures 无「@v2 跨域迁移」行。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/decisions-lifecycle.test.mjs「@v2 声明新模块域 → 域稳定优先：存量域就地升级不迁移（2026-11-12 R-03 语义）」
FR-02: test/decisions-lifecycle.test.mjs「存量段在 unmapped 域 + v2 声明业务域 → 仍落 unmapped（redomain 治理成果不被拉回）」
FR-03: 不适用：全量绿与配置行移除由收口实测门客观核验（local.yaml 为 gitignore 本地配置，无独立测试面）
