---
author: qinyi
created_at: 2026-08-10 22:01:44
change: 2026-08-10-local-yaml-generation
revision: 1
---

# 提案书（Proposal）— local.yaml 配置体系改造（生成范式 + 外部连接统一 + agent 引导）

## 动机

`local.yaml` 是 SillySpec 各阶段（brainstorm/plan/execute/verify/quick）反复 `cat` 读取的项目构建/测试/lint 命令权威配置，也是 verify `--done` 测试对账、worktree-deps install 推断的数据源。但生成入口 `sillyspec local detect` 纯 fs 嗅探后**写死默认 commands**，不核验真实构建文件，生成的 local.yaml 常含坏命令——实证 sillyspec 自己的 `build:"npm run build"` 但 `package.json` 无 build script，执行报 `Missing script: build`。

**revision 1 扩范围**：local.yaml 已承载 platform 段（sync progress/docs/approval）与 dispatch 调参段，但 SillyHub MCP 连接凭据（dispatch worker 子系统）走环境变量 `SILLYHUB_MCP_URL/TOKEN`，配置入口分散在三处（local.yaml platform 段 + env MCP + 手填 dispatch 段），scan 阶段无 agent 引导配置外部连接。用户诉求：统一 local.yaml 为外部连接配置入口 + agent 引导配置。

## 关键问题（现有方案为什么不够）

1. **detect 闭眼写死 build/test/lint 三件套**，不读 `package.json` scripts 核验 → 含坏命令（sillyspec 实证 build 键执行即报错）
2. **doctor 漂移**：`src/stages/doctor.js:353` + 镜像提示用 `sillyspec init` 生成 local.yaml——但 `init.js` 只删/忽略 local.yaml，从不生成
3. **execute/verify 无兜底**：读 local.yaml 失败就静默，verify `--done` 测试对账在 local.yaml 缺失时直接跳过，无引导生成
4. **MCP 凭据配置分散（revision 1）**：SillyHub MCP 连接凭据走 env（`client.js:34-35`），platform 在 local.yaml platform 段，dispatch 调参手填——三处入口分散，agent 无引导配置；且 `execute.js:458 getDispatchMode hasConfig` 业务逻辑点直读 env

## 变更范围

**生成范式（原）**：
- detect 增强（`src/local-detect.js`）：nodejs 读 scripts 核验；gradle 核验 gradlew；命令缺失不写键
- scan Step6 改造（`src/stages/scan.js`）：调 detect 生成核验骨架 + 引导 agent 补非确定性策略字段 + 同步示例 yaml
- execute/verify 兜底（`src/stages/execute.js` + `verify.js`）：读 local.yaml 失败引导先 `sillyspec local detect`
- doctor 修正（`src/stages/doctor.js:353`）：`sillyspec init` → `sillyspec local detect`

**外部连接统一（revision 1 新增）**：
- MCP 凭据 env→local.yaml mcp 段迁移：新增 `readMcpConfig(cwd)` 共享 helper（js-yaml + env fallback）→ `client.js` 构造加 cwd 读 mcp 段 → `probe.js` configFingerprint/no-config 改读源 → `execute.js getDispatchMode hasConfig` 改读源 + dispatchSection 文案 → 5 处测试核验
- platform connect 统一（`src/sync.js`）：connect 写 platform + mcp 段（同源假设，已有 mcp 段保留）
- scan Step6 agent 引导扩展：检查 platform/dispatch/mcp 段缺失 → 分别提示 `platform connect` / 手填 dispatch 调参 / 手填 mcp 段或设 env

**横切**：文档同步（镜像 `_extract.mjs` + `docs/sillyspec/file-lifecycle.md` + `.claude/skills/` 检查）

## 不在范围内（显式清单）

- 不让 agent 填 commands（确定性归机器，避免软判定违背 SillySpec 流程控制器定位）
- **不改 MCP 协议层**（client.js 网络/fetch/SSE/JSON-RPC 逻辑不变，只改凭据读源）
- **不强制移除 env**（保留 env fallback 兼容旧部署与现有测试）
- **不改 dispatch 业务逻辑**（getDispatchMode 三态语义 local/local-fallback/sillyhub 不变，只改 hasConfig 判定源）
- **不自动探测 platform/mcp 外部连接**（detect 纯 fs 本地，外部凭据由用户提供）
- 不改 DB schema（local.yaml 是文本配置）
- 不引入新依赖（js-yaml 已被 probe.js 引入，复用）
- 不自动修正已存在的旧 local.yaml（detect「已存在则跳过」不变）

## 成功标准（可验证）

- detect 对无 build script 的 nodejs 项目不再生成 build 键（test 验证）
- 旧 local.yaml 已存在则 detect 跳过不覆盖（含 platform/mcp 段兼容）
- local.yaml 无 test 键时 verify `--done` 降级 warning 不阻断（consumer 零回归）
- doctor 提示指向 `sillyspec local detect`（grep 无残留 `sillyspec init` 生成 local.yaml 措辞）
- execute/verify 读 local.yaml 失败时 prompt 含兜底引导
- **MCP 凭据 readMcpConfig + env fallback 零回归**（`test/dispatch/path-a-probe.test.mjs` 5 处 `new SillyHubMcpClient({url,token})` 构造过；不设 env 且无 mcp 段 → getDispatchMode 'local' 与现状字节一致）
- **platform connect 写 platform + mcp 段**（已有 mcp 段保留不覆盖）
- **scan Step6 含 platform/dispatch/mcp 段引导**
- `npm test` + `npm run lint` 通过
