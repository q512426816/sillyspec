---
author: flow-machine-draft
created_at: 2026-09-26T15:33:23.783Z
---
# 提案书（Proposal）— 2026-09-26-dynamic-test-inference

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:f02c844aa2f4c74dc4b126fc36d4a02359ee06efa5f93fbebb7984592e4be41f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-dynamic-test-inference 留痕重锚 -->
任务原话转写：local.yaml 静态测试配置（commands.test/modules.*.test）架构性错误：写死单方向测试面，无法按变更收窄，并行变更必须互改共享配置；R22 实证缺配置时裸 fallback 造成 600s 超时×8 与 aiobotocore 假红。同时 FR 测试绑定路径形态混乱（平台仓三种混杂：根相对/frontend 前缀丢失的 cwd 相对/裸文件名），需求→用例映射不可靠。
成功标准：
- 测试门（thin+full 共用 runVerifyTestCheck）缺省走动态推断：本变更测试 ∪ FR 关联回归（active FR 覆盖面∩触碰文件→其绑定 tests）∪ import 依赖测试；runner 自项目结构推断（uv run pytest/vitest/jest/node --test），不依赖 local.yaml 测试配置
- local.yaml modules.*.test 不再消费（在场打印退役指引）；commands.test 仅显式 test_strategy: full 时生效作全量逃生阀
- FR 绑定写入侧路径归一为仓根相对（upsertFrBindings 接受 projectRoot 归一 tests）
- 新增 tests repair-paths 子命令修复存量错形路径；平台仓 multi-agent-platform 修复后 fr/*.md 内 tests: 全部可自仓根解析
- 全仓测试绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:7a9aa65872a334b78d99ed3fd369fbc685fd1cb389265d5e6c5b156d8f68acb9:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-dynamic-test-inference 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. 测试门（thin+full 共用 runVerifyTestCheck）缺省走动态推断：本变更测试 ∪ FR 关联回归（active FR 覆盖面∩触碰文件→其绑定 tests）∪ import 依赖测试
2. runner 自项目结构推断（uv run pytest/vitest/jest/node --test），不依赖 local.yaml 测试配置
3. local.yaml modules.*.test 不再消费（在场打印退役指引）
4. commands.test 仅显式 test_strategy: full 时生效作全量逃生阀
5. FR 绑定写入侧路径归一为仓根相对（upsertFrBindings 接受 projectRoot 归一 tests）
6. 新增 tests repair-paths 子命令修复存量错形路径
7. 平台仓 multi-agent-platform 修复后 fr/*.md 内 tests: 全部可自仓根解析
8. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:1c15d6acd48200d86ec714b0c74669a5877bf6b339fc57452ebf78b5ce342d72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-dynamic-test-inference 留痕重锚 -->
1. 测试门（thin+full 共用 runVerifyTestCheck）缺省走动态推断：本变更测试 ∪ FR 关联回归（active FR 覆盖面∩触碰文件→其绑定 tests）∪ import 依赖测试
2. runner 自项目结构推断（uv run pytest/vitest/jest/node --test），不依赖 local.yaml 测试配置
3. local.yaml modules.*.test 不再消费（在场打印退役指引）
4. commands.test 仅显式 test_strategy: full 时生效作全量逃生阀
5. FR 绑定写入侧路径归一为仓根相对（upsertFrBindings 接受 projectRoot 归一 tests）
6. 新增 tests repair-paths 子命令修复存量错形路径
7. 平台仓 multi-agent-platform 修复后 fr/*.md 内 tests: 全部可自仓根解析
8. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
