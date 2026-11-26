---
author: qinyi
created_at: 2026-11-26 09:41:41
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）— 2026-11-26-verify-stage-retire

## 角色

| 角色 | 说明 |
|---|---|
| 仓主 | 显式决策删除 verify 阶段与保留面（D-001~D-007 source=user） |
| agent | 通过 CLI 走四阶段完整流程；execute 期手工调试起服务时登记 PID |
| 平台镜像维护者 | 移交项接收方（multi-agent-platform stage enum 跟随，R-01） |

## 功能需求

### FR-01: verify 阶段删除与四阶段流转

Given 本变更合入后
When agent 执行完整流程
Then 阶段序列为 brainstorm → plan → execute → archive；`run verify` 报「阶段已退役」并指路 `run archive`；TRANSITION map 中 `execute → archive` 为合法边、verify 边不存在；`VALID_STAGES`/`STAGE_LABELS`/`STAGE_ORDER`/`MAIN_FLOW_ORDER`/`REVIEW_STAGES` 不含 verify。

### FR-02: archive 前置收口实测门（机制保留、本仓关闭态）

Given 变更 execute 完成、agent 调 `run archive`
When archive 第一个（noAI）步骤执行
Then 机制上 CLI 亲跑 `commands.test`（动态子集三源推断+指纹缓存，verify-quality-scan.js 更名 archive-quality-scan.js），失败阻断归档（exit 1、步骤不盖 completed、可重入断点续）；**本仓落点（D-008）**：`local.yaml` 将 commands.test 标 `unavailable → 归 pre-push/CI`，本仓收口不亲跑、留痕归 CI。lint 不在门内（归 flow done/pre-push/CI）。

### FR-03: PID 登记/回收机制随阶段退役

Given 阶段删除后 PID 登记源头（verify prompt）消失
When 本变更合入
Then `reapVerifyServices` 与 pids 文件读逻辑一并删除（不留死码）；execute 不新增登记指引；存量 `.runtime/verify-services-*.pids` 残文件无害不清理（D-008 refine D-001）。

### FR-04: verify.mode 开关退役

Given 存量 local.yaml 残留 `verify: { mode: skip }`
When 本变更合入后任意命令运行
Then 键无消费者、读到忽略不报错；`src/verify-mode.js` 及其全部 import 清零；config-schema 注册项移除。

### FR-05: 在途 verify 变更 legacy 完成路径

Given 升级时进度库存在 stage 停在 verify 的活跃变更
When 运行 `sillyspec doctor`（或阶段入口探测）
Then 检测到在途 verify 变更并提示一次性 legacy 盖完成戳（显式确认后 verify:in-progress → completed，随后走 archive）；不静默断流。

### FR-06: 不发 npm 版本

Given 本变更合入
Then package.json 版本号不变（D-003）；版本面留给后续发版批次（届时建议 semver major + 迁移说明）。

### FR-07: 验收范式降级显式声明

Given 完整流程验收强度与轻量道实测门趋同
When 任何人查阅本变更档案
Then D-007 + R-05 明示「完整流程独特价值＝plan 编排 + archive 文档同步/蒸馏，不再含更强验收」为刻意取舍（source=user），非疏漏。

### FR-08: 消费面清理护栏清零

Given 52 个 src 消费面迁移完成
When 收口验证执行 `grep -rn "verify-result\|verify-probes\|'verify'" src --include=*.js`
Then 命中仅剩白名单（归档区历史读取、历史注释），其余清零。

## 非功能需求

- 兼容性：Windows/Linux/macOS 三平台（pids 击杀按进程树跨平台语义保留既有实现）；归档区只读；存量 DB 无 schema 迁移。
- 回退：单变更对称可 revert（阶段定义/枚举/门同删同恢复）。

## 决策覆盖矩阵（如存在 decisions.md）

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-02, FR-03 | 保留面＝测试实测门+PID 回收，其余随阶段删除 |
| D-002@v1 | FR-04 | verify.mode 开关随阶段删除、读到忽略 |
| D-003@v1 | FR-06 | 不发版，版本策略延后 |
| D-004@v1 | FR-05 | 在途 verify 变更 legacy 完成路径 |
| D-005@v1 | FR-02 | 机器门内嵌 archive noAI 首步（方案 A） |
| D-006@v1 | —（rejected 防复潮） | 独立命令门落选，复潮条件已登记 |
| D-007@v1 | FR-07 | 验收范式降级为刻意取舍 |
| D-008@v1 | FR-02, FR-03 | 收口门机制保留、本仓 unavailable 关闭态；PID 回收随阶段退役（refine D-001/D-005 本仓落点） |

## 测试绑定（每条 FR 至少一行：`FR-NN: test/路径「用例名」`；不适用要写理由；flow done 空行拒收）

FR-01: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-02: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-03: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-04: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-05: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-06: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-07: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-08: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
