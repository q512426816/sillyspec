---
author: flow-machine-draft
created_at: 2026-11-20T00:13:11.803Z
---
# 提案书（Proposal）— 2026-11-20-decisions-lifecycle-stale-assertion

## 动机

任务原话转写：决策蒸馏跨域迁移用例过时断言修复

动机：test/decisions-lifecycle.test.mjs「@v2 跨域迁移 → 旧域文件旧版段同步移除」自 d15c2e23（2026-11-12-freeze-decision-recall R-03）起恒红。诊断结论为断言过时而非实现漂移：该提交有意引入「存量条目所在域优先于次判定」（域稳定），设计论证为回填/重跑会把经 redomain 治理的条目（D-unmapped-435/436 实证）拉回 unmapped，域迁移归 knowledge redomain 显式职责而非蒸馏副作用；测试断言停留在 2026-10-14 epoch 时代的迁移语义，且有测试全量红近 8 天无人察觉（known_failures 曾临时豁免）。修复面=测试断言对齐新语义并补锁域稳定（防未来反向改动无人察觉），实现零改动。

成功标准：
- 原「@v2 跨域迁移」用例按域稳定语义重写并通过（v2 声明新模块域时仍在存量域就地升级，written 记 core.md@v2:supersede，目标新域文件不创建）
- 新增断言显式锁定存量域优先语义（含 redomain 治理场景形态：存量在 unmapped 域、v2 声明业务域仍落 unmapped）
- test/decisions-lifecycle.test.mjs 30 用例全绿
- .sillyspec/local.yaml known_failures 中该用例豁免行移除

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 原「@v2 跨域迁移」用例按域稳定语义重写并通过（v2 声明新模块域时仍在存量域就地升级，written 记 core.md@v2:supersede，目标新域文件不创建）
2. 新增断言显式锁定存量域优先语义（含 redomain 治理场景形态：存量在 unmapped 域、v2 声明业务域仍落 unmapped）
3. test/decisions-lifecycle.test.mjs 30 用例全绿
4. .sillyspec/local.yaml known_failures 中该用例豁免行移除

## 成功标准（可验证）

1. 原「@v2 跨域迁移」用例按域稳定语义重写并通过（v2 声明新模块域时仍在存量域就地升级，written 记 core.md@v2:supersede，目标新域文件不创建）
2. 新增断言显式锁定存量域优先语义（含 redomain 治理场景形态：存量在 unmapped 域、v2 声明业务域仍落 unmapped）
3. test/decisions-lifecycle.test.mjs 30 用例全绿
4. .sillyspec/local.yaml known_failures 中该用例豁免行移除
