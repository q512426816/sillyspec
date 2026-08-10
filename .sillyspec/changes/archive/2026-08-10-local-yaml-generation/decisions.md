---
author: qinyi
created_at: 2026-08-10T21:49:44+08:00
change: 2026-08-10-local-yaml-generation
---

# 决策台账（Decisions）— local.yaml 配置体系改造（revision 1）

> 本次变更的决策台账（非长期术语表）。只记录有实现/验收影响的决策。revision 1 加 D-005~007（MCP 迁移 / platform 统一 / scan 引导外部连接）。

## D-001@v1: detect 核验策略——读真实构建文件，命令缺失不写键

- **type**: architecture
- **status**: accepted
- **source**: code + user
- **question**: detect 生成 commands 时，是否核验 package.json/pom.xml 等真实构建文件？命令缺失时写不写、怎么标？
- **answer**: nodejs 分支读 `package.json` 的 scripts 对象核验——`build`/`test`/`lint` 各自当且仅当对应 scripts 键存在才写入 commands；gradle 核验 `gradlew` 存在决定前缀（`./gradlew` vs `gradle`）；maven（mvn lifecycle 级）/ make（已解析 Makefile）/ generic 维持现状。**命令缺失=不写该键**，不标 `unavailable` 字符串。
- **normalized_requirement**: `detectLocalYaml()` 对 nodejs 项目返回的 commands 仅含 scripts 中真实存在的 build/test/lint 键；gradle 项目无 gradlew 时命令前缀为 `gradle`；不产出任何 `unavailable` 字符串值。
- **impacts**: FR-01, FR-02, task-detect（Wave1）, test/local-detect.test.mjs Case1 期望值改
- **evidence**: `src/local-detect.js:57-110`（现状写死默认）；`verify-postcheck.js:9-10,32,40,45,47`（unavailable/无键均降级 warning，consumer 零回归）；sillyspec 自身 package.json 无 build script 实证
- **priority**: P0

## D-002@v1: detect 与 local.yaml platform 段边界——detect 不碰 platform

- **type**: boundary
- **status**: accepted
- **source**: code
- **question**: 并行变更 platform-progress-sync（task-08）给 local.yaml 加 `platform.user` 段（via sync.js），本变更的 detect 重新生成会不会覆盖 platform 段？
- **answer**: detect 仅生成 `commands` / `project` / `test_strategy` 骨架，不碰 `platform` 段（platform 段归 `sync.js` connect 写入）。detect 保持「已存在则跳过」，重新生成不覆盖任何已有内容。
- **normalized_requirement**: `sillyspec local detect` 在 local.yaml 已存在时直接跳过（输出「已存在，跳过」），不读写 platform 段；detect 生成的 yaml 文本不含 platform 键。
- **impacts**: 兼容 platform-progress-sync task-08；R-03 风险应对；task-detect 不涉及 sync.js
- **evidence**: `src/index.js:1427-1430`（已存在则跳过逻辑）；`src/sync.js` readLocalYaml/_getPlatform（platform 段归属）
- **priority**: P1

## D-003@v1: scan Step6 agent 补字段清单——机器做事实，agent 做策略

- **type**: boundary
- **status**: accepted
- **source**: docs + user
- **question**: 混合方案下，哪些 local.yaml 字段由 detect（机器确定性）生成，哪些由 scan Step6 引导 agent（策略性）补？
- **answer**: detect 生成确定性骨架（`project.type` + 核验过的 `commands.{build,test,lint}`）。scan Step6 引导 agent 补**非确定性策略字段**：`test_strategy`（detect 写死 module，agent 可调 full/module/skip）、`commands.install`（worktree-deps 读，按包管理器 npm/pnpm/yarn）、`env`（环境变量）、`module_paths`/`modules`（据 _module-map.yaml）、`known_failures`（据测试现状）。
- **normalized_requirement**: `src/stages/scan.js` steps[5] prompt 在「调 detect 生成」后含明确的 agent 补字段引导段，列出上述 5 类字段；detect 输出的 yaml 骨架不含这 5 类字段（仅 commands/project/test_strategy）。
- **impacts**: FR-03, task-scan（Wave2）, R-04（agent 编造应对）
- **evidence**: `src/local-detect.js`（detect 输出仅 build/test/lint，无 install/env）；local.yaml 模板注释（`src/index.js:1432-1454` 序列化的注释段列出 test_strategy/module_paths/known_failures 为「可选」）；`docs/prompt/scan.md:251-289`（Step6 现状）
- **priority**: P1

## D-004@v1: execute/verify 读 local.yaml 缺失兜底

- **type**: boundary
- **status**: accepted
- **source**: code
- **question**: execute/verify 读 local.yaml 失败时（`cat 2>/dev/null` 读不到），是否引导 agent 生成？
- **answer**: 是。在 execute.js（行121 加载上下文 / 行240 测试步骤）与 verify.js（行69 加载本地配置 / 行167 质量扫描）读 local.yaml 的 prompt 处加兜底引导：「若 local.yaml 不存在，先 `sillyspec local detect` 生成骨架再读取」。这是 prompt 引导（agent 主导），非 CLI 自动生成——保持 SillySpec 流程控制器定位。
- **normalized_requirement**: `src/stages/execute.js` 与 `verify.js` 读 local.yaml 的 prompt 段均含「缺失则先 sillyspec local detect」引导语；不新增 CLI 自动生成 local.yaml 的隐式路径。
- **impacts**: FR-04, task-execute + task-verify（Wave3）
- **evidence**: `src/stages/execute.js:121,240`（现状 cat 无兜底）；`src/stages/verify.js:69,167`（同）；memory「local.yaml 缺失则 CLI 跳过对账须手动 npm test」坑
- **priority**: P1

## D-005@v1: MCP 凭据读源迁移——env→local.yaml mcp 段（+ env fallback）

- **type**: architecture
- **status**: accepted
- **source**: user（方案C 决策）+ code
- **question**: SillyHub MCP 连接凭据（SILLYHUB_MCP_URL/TOKEN）是否从 env 迁到 local.yaml，统一配置入口？env 是否保留？
- **answer**: 迁到 local.yaml `mcp` 段（mcp.url/mcp.token），env 作 fallback（local.yaml mcp 段优先 > env）。抽共享 `readMcpConfig(cwd)` helper（js-yaml + env fallback，best-effort 不发网络）。`client.js` 构造加 cwd 参数读 mcp 段；`probe.js` configFingerprint/no-config + `execute.js getDispatchMode hasConfig` 改读源。env 保留兼容旧部署/测试（零回归）。
- **normalized_requirement**: `readMcpConfig(cwd)` 读 local.yaml mcp 段 + env fallback；client/probe/execute 三处消费点改读 readMcpConfig；不设 env 且无 mcp 段 → no-config/local（零回归）。
- **impacts**: FR-06, task-03~07（Wave2）, R-06/R-07/R-08
- **evidence**: `client.js:34-35`（env 读源）；`probe.js:64,145`；`execute.js:458 hasConfig`；5 处测试 `test/dispatch/path-a-probe.test.mjs:274,290,305,319,341`
- **priority**: P1

## D-006@v1: platform connect 统一写法——写 platform+mcp 段（同源假设）

- **type**: architecture
- **status**: accepted
- **source**: user（方案C）+ code
- **question**: `platform connect` 是否同时配 MCP（统一入口）？platform 与 MCP 是否同源？
- **answer**: connect 写 platform 段（现状）**+ mcp 段**（mcp.url/mcp.token 复用 platform url/token，假设同源 sillyhub 实例）。已有 mcp 段则保留（不覆盖用户手填，R-09 缓解）。不同源场景用户手填 mcp 段覆盖。
- **normalized_requirement**: `sync.js connect` 写 platform+mcp 段；已有 mcp 段保留不覆盖；mcp 段可手填覆盖。
- **impacts**: FR-07, task-08（Wave3）, R-09
- **evidence**: `sync.js:150-167` connect 写 platform 段；`client.js:45` MCP 端点 `/mcp/` vs platform `/api/`
- **priority**: P1

## D-007@v1: scan Step6 agent 引导外部连接范围——platform/dispatch/mcp 段检查提示

- **type**: boundary
- **status**: accepted
- **source**: user（方案C）+ docs
- **question**: scan Step6 agent 引导配置哪些外部连接段？
- **answer**: Step6 agent 检查 platform/dispatch/mcp 段——platform 缺失提示 `platform connect`；dispatch 调参缺失提示手填示例（probe_ttl_ms/poll_interval_ms/worker_timeout_ms）；mcp 缺失提示 `platform connect`（统一）或手填 mcp.url/mcp.token 或设 env。detect 不碰外部凭据（纯 fs 本地嗅探）。
- **normalized_requirement**: `scan.js Step6` prompt 含 platform/dispatch/mcp 段检查提示；detect 不生成这些段。
- **impacts**: FR-02, FR-08, task-09（Wave4）, D-003 扩展
- **evidence**: `scan.js steps[5]` Step6 现状（仅补策略字段）；`sync.js platform connect` 命令；dispatch 调参 `probe.js:34-47`
- **priority**: P1
