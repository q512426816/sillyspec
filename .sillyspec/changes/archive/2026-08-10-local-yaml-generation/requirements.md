---
author: qinyi
created_at: 2026-08-10 22:01:44
change: 2026-08-10-local-yaml-generation
revision: 1
---

# 需求规格（Requirements）— local.yaml 配置体系改造

## 角色

| 角色 | 说明 |
|---|---|
| SillySpec CLI | `sillyspec local detect` 生成 commands 骨架；`sillyspec platform connect` 写 platform+mcp 段 |
| AI agent（scan/execute/verify）| 读 local.yaml 取命令；scan Step6 补策略字段 + 引导外部连接配置 |
| SillyHub MCP client（dispatch 子系统）| 经 `readMcpConfig` 读 local.yaml mcp 段（+ env fallback）连 daemon |
| 开发者 | 维护 local.yaml，触发 detect / platform connect / 手填 dispatch 调参 |

## 功能需求

### FR-01: detect 核验真实构建文件生成 commands（覆盖 D-001@v1）

Given nodejs 项目 `package.json` 含 `scripts.{build,test,lint}` 的任意子集
When 调用 `sillyspec local detect`（local.yaml 不存在）
Then 生成的 local.yaml `commands` 仅含 scripts 中真实存在的键；缺失键不写（不标 `unavailable`）

Given nodejs 项目 `package.json` 无 scripts 字段（如 `{}`）→ `commands` 为空
Given gradle 项目有 `gradlew` → 前缀 `./gradlew`；无 `gradlew` 仅有 `build.gradle` → 前缀 `gradle`
Given `package.json` 是非法 JSON → throw 中文「package.json 解析失败：<path>」（CONVENTIONS #4）

### FR-02: scan Step6 引导 agent 补策略字段 + 外部连接（覆盖 D-003@v1, D-007@v1）

Given scan Step6 调 detect 生成核验骨架后
When agent 执行 Step6
Then prompt 引导 agent 补 `test_strategy` / `commands.install` / `env` / `module_paths` / `known_failures` 五类非确定性字段；铁律段声明「只写能从 package.json/lockfile 确定的，不确定留空」；示例 yaml 同步
And prompt 引导检查 **platform/dispatch/mcp 段**：platform 缺失→提示 `sillyspec platform connect`；dispatch 调参缺失→提示手填示例；mcp 缺失→提示 `platform connect`（统一）或手填 mcp 段/设 env

### FR-03: execute/verify 读 local.yaml 缺失兜底（覆盖 D-004@v1）

Given 项目无 local.yaml
When agent 执行 execute（行121/240）或 verify（行69/167）读 local.yaml 步骤
Then prompt 含「若 local.yaml 不存在，先 `sillyspec local detect` 生成骨架再读取」引导

### FR-04: doctor 漂移修正

Given `src/stages/doctor.js:353` + 镜像 `docs/prompt/doctor.md`
When 修正后
Then 「缺少 local.yaml」提示指向 `sillyspec local detect`（非 `sillyspec init`）；grep 确认无残留错误措辞

### FR-05: consumer 零回归（覆盖 D-001 兼容性 + D-002 边界）

Given local.yaml 存在但无 `test` 键（detect 核验后 nodejs 无 test script）
When verify `--done` 执行测试对账
Then `extractTestCommand` 返回 null → `runFullCommand` skipped → `gates.js:225` 仅 failed 阻断 → 不阻断 verify（降级 warning）

Given 已有 local.yaml（含 platform/mcp 段）
When 调用 `sillyspec local detect`
Then 「已存在则跳过」，不覆盖（platform/mcp 段保留）

### FR-06: MCP 凭据读源迁移（覆盖 D-005@v1，revision 1 新增）

Given SillyHub MCP 配置在 local.yaml mcp 段（mcp.url/mcp.token）
When `client.js` 构造 / `probe.js` no-config / `execute.js getDispatchMode hasConfig` 读凭据
Then 经 `readMcpConfig(cwd)` 共享 helper 读 local.yaml mcp 段，env 作 fallback（local.yaml mcp 段优先 > env）

Given local.yaml 无 mcp 段且 env 缺 `SILLYHUB_MCP_URL/TOKEN`
When `probe.js probeSillyHub` no-config 快速路径
Then 返回 `{available:false, reason:'no-config'}` **不发网络**（零回归关键保留）

Given 5 处测试 `new SillyHubMcpClient({url,token})` 显式传参
When 构造签名变（加 cwd 默认 process.cwd()）
Then 显式 url/token 覆盖优先级最高（> local.yaml mcp 段 > env），测试零回归

Given local.yaml 无 mcp 段但 env 有 `SILLYHUB_MCP_URL/TOKEN`
When readMcpConfig 调用
Then 回退 env 返回 {url,token}（旧部署兼容）

### FR-07: platform connect 统一写法（覆盖 D-006@v1，revision 1 新增）

Given `sillyspec platform connect <url> <token>` 执行
When connect ping `${url}/api/health` 成功 + 写 local.yaml
Then 写 platform 段（url/token/last_connected，现状）**+ mcp 段**（mcp.url=url, mcp.token=token，同源假设）

Given connect 时 local.yaml 已有 mcp 段（用户手填，不同源）
When connect 写 local.yaml
Then **保留已有 mcp 段不覆盖**（R-09 缓解）

### FR-08: scan Step6 agent 引导外部连接（覆盖 D-007@v1，revision 1 新增）

Given scan Step6 agent 检查 local.yaml 外部连接段
When platform 段缺失 → prompt 提示 `sillyspec platform connect <url> <token>`
And dispatch 调参段缺失 → prompt 提示手填示例（probe_ttl_ms/poll_interval_ms/worker_timeout_ms）
And mcp 段缺失 → prompt 提示 `platform connect`（统一）或手填 mcp.url/mcp.token 或设 env

## 非功能需求

- **兼容性**：env fallback（local.yaml mcp 段优先）；client 构造签名变（显式参数优先级最高，cwd 默认 process.cwd()）；platform connect 已有 mcp 段保留；maven/make/generic detect 不变；已有 local.yaml 跳过
- **可回退**：detect 改逻辑不影响已存在 local.yaml（跳过）；MCP 迁移 env fallback 兼容旧部署；删 local.yaml 重 detect 的 commands 变化是预期
- **可测试**：`test/local-detect.test.mjs`（Case1/3/3b/nodejs-scripts）+ `test/dispatch/path-a-probe.test.mjs`（5 处构造零回归）；prompt 类改动人工验收 + grep
- **跨平台**：纯 fs + JSON.parse + js-yaml（复用 probe.js 已引），Win/Linux/macOS 一致
- **secret**：mcp.token 落盘 local.yaml（.gitignore 已忽略，与 platform.token 同级安全）；env fallback 允许用户选择不入盘

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-05 | detect 核验 + 命令缺失不写键 + consumer 零回归 |
| D-002@v1 | FR-05（兼容） | detect 不碰 platform/mcp 段（已存在则跳过） |
| D-003@v1 | FR-02 | scan Step6 agent 补策略字段清单 |
| D-004@v1 | FR-03 | execute/verify 兜底 |
| D-005@v1 | FR-06 | MCP 凭据读源迁移（local.yaml mcp 段 + env fallback） |
| D-006@v1 | FR-07 | platform connect 统一写 platform+mcp 段（同源假设） |
| D-007@v1 | FR-02, FR-08 | scan Step6 agent 引导外部连接范围 |
