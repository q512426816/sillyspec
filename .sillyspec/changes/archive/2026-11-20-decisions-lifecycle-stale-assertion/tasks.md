---
author: flow-machine-draft
created_at: 2026-11-20T00:13:11.803Z
---
# 任务注册表（Tasks）— 2026-11-20-decisions-lifecycle-stale-assertion

- [x] task-01: 原「@v2 跨域迁移」用例按域稳定语义重写并通过（v2 声明新模块域时仍在存量域就地升级，written 记 core.md@v2:supersede，目标新域文件不创建）
- [x] task-02: 新增断言显式锁定存量域优先语义（redomain 治理形态：存量段在 docs-consistency 域、号 D-unmapped-001@v1、v2 声明 core 域仍留治理后域）
- [x] task-03: test/decisions-lifecycle.test.mjs 31 用例全绿（原 30 + 新增 1）
- [x] task-04: .sillyspec/local.yaml known_failures 中该用例豁免行移除（gitignore 本地配置，不进提交面）
