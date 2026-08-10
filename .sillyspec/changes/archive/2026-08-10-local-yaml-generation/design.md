---
author: qinyi
created_at: 2026-08-10T21:49:44+08:00
change: 2026-08-10-local-yaml-generation
scale: large
revision: 1
risk_level: unit-sufficient
---

# 设计文档（Design）— local.yaml 配置体系改造（生成范式 + 外部连接统一 + agent 引导）

> **revision 1（方案C 扩范围）**：原范围「local.yaml 生成范式改造」（detect 核验 + scan 补策略 + 兜底 + doctor）经用户决策扩展为「local.yaml 配置体系改造」——新增 ① MCP 凭据 env→local.yaml mcp 段迁移（dispatch 子系统）② platform connect 统一写 platform+mcp 段 ③ scan Step6 agent 引导 platform/dispatch/mcp 段。原四改动点保留。规模从 light 升 full（10+ task，跨 local-detect/scan/execute/verify/doctor/sync/sillyhub-mcp/dispatch 多模块）。

## 1. 背景

`local.yaml`（`.sillyspec/local.yaml`，被 `.gitignore` 忽略）是 SillySpec 各阶段（brainstorm / plan / execute / verify / quick）反复 `cat` 读取的**项目构建/测试/lint 命令权威配置**，也是 verify `--done` 测试对账、worktree-deps install 推断、scan-postcheck 命令有效性校验的数据源。

### 1.1 detect 生成范式问题（原范围）

当前唯一生成入口 `sillyspec local detect`（`src/index.js:1414` 路由 + `src/local-detect.js` `detectLocalYaml()`）采用纯 fs 嗅探项目类型后**写死默认 commands**：

- nodejs → 一律 `build:"npm run build"` / `test:"npm test"` / `lint:"npm run lint"`
- maven / gradle / make 同理写死 mvn / gradlew / make 系命令

问题在于 detect **不读 `package.json` 的 scripts 字段核验命令是否真实存在**，闭眼填三件套。实证 bug：sillyspec 自己的 `package.json` 只有 `test`/`lint`（无 `build` 脚本），但生成的 local.yaml 第 6 行仍写 `build:"npm run build"`，执行报 `Missing script: build`。

衍生缺口：① detect 不核验真实构建文件 → commands 不准；② doctor 漂移（`src/stages/doctor.js:353` 提示 `sillyspec init` 重新生成，但 `src/init.js` 不生成 local.yaml，应是 `sillyspec local detect`）；③ execute/verify 读 local.yaml 缺失无兜底（`src/stages/execute.js:121/240`、`verify.js:69/167` 均 `cat ... 2>/dev/null` 静默跳过）。

### 1.2 外部连接配置分散问题（revision 1 新增）

local.yaml 已承载 platform 段（`src/sync.js:150-167` `platform connect` 写入 url/token/last_connected，用于 sync progress/documents/approval），以及 dispatch 调参段（`dispatch.probe_ttl_ms` / `poll_interval_ms` / `worker_timeout_ms`，手填）。但 **SillyHub MCP 连接凭据（dispatch worker 子系统）走环境变量** `SILLYHUB_MCP_URL` / `SILLYHUB_MCP_TOKEN`（`src/sillyhub-mcp/client.js:34-35`），不在 local.yaml。

配置入口分散在三处（local.yaml platform 段 + env MCP + 手填 dispatch 段），且 scan 阶段无任何 agent 引导配置这些外部连接。用户诉求：**统一 local.yaml 为外部连接配置入口 + agent 引导配置**。

MCP 凭据 env 耦合面（迁移改动面，均已核验）：
- `client.js:34-35` 构造函数读 env（**构造函数无 cwd 参数**，要读 local.yaml 须破坏构造签名加 cwd）
- `probe.js:64` `configFingerprint()` 用 env URL 作负面缓存 key
- `probe.js:145` `probeSillyHub` no-config 快速路径检查 env（零回归关键——不发网络）
- `execute.js:458` `getDispatchMode()` `hasConfig = !!(process.env.SILLYHUB_MCP_URL && SILLYHUB_MCP_TOKEN)`——**业务逻辑点**，决定派发三态（local/local-fallback/sillyhub），决定 `buildWavePrompt` 是否注入派发段
- `execute.js:602` dispatchSection 文案引用 env 变量名
- 5 处测试 `test/dispatch/path-a-probe.test.mjs` 显式 `new SillyHubMcpClient({url,token})`

## 2. 设计目标

**生成范式（原）**：
- detect 核验真实构建文件，生成 commands 骨架（纯 fs 确定性，零 token，零 AI 软判定）
- scan Step6 引导 agent 补**非确定性策略字段**（机器做事实判定 + agent 做策略，分工清晰）
- execute/verify 读 local.yaml 缺失时引导先 `sillyspec local detect` 生成
- 修正 doctor 漂移提示

**外部连接统一（revision 1 新增）**：
- 统一 local.yaml 为外部连接配置入口（platform + mcp 段并列）
- MCP 凭据从 env 迁 local.yaml `mcp` 段（env fallback 兼容旧部署/测试）
- scan Step6 agent 引导检查/配置 platform / dispatch / mcp 段（缺失则提示配置方式）
- `platform connect` 统一写 platform + mcp 段（假设同源 sillyhub 实例，mcp 段可手填覆盖）

## 3. 非目标

- **不让 agent 填 commands**——commands 存在性是确定性能判定的事实，归机器（原非目标保留）
- **不改 MCP 协议层**——client.js 网络/fetch/SSE/JSON-RPC 逻辑不变，只改凭据**读源**（env → local.yaml mcp 段 + env fallback）
- **不强制移除 env**——保留 env fallback 兼容旧部署与现有测试（零回归）
- **不改 dispatch 业务逻辑**——`getDispatchMode` 三态语义（local/local-fallback/sillyhub）不变，只改 `hasConfig` 判定源
- **不自动探测 platform/mcp 外部连接**——detect 是纯 fs 本地嗅探，无法知道用户的平台地址/token；外部连接凭据由用户提供（`platform connect` 命令或 agent 引导手填），detect 不碰
- 不改 DB schema（local.yaml 是文本配置，非 SQLite）
- 不引入新依赖（js-yaml 已被 `probe.js:17` 引入，复用；client.js 加 js-yaml 不算新依赖）
- 不自动修正已存在的旧 local.yaml（detect「已存在则跳过」不变）
- **不改 `src/index.js` 入口文件**——local case yaml 序列化（`:1432-1454`）已具备条件写（`if (c.build)` / `if (c.test)` / `if (c.lint)` 于 `:1440-1442`），detect 核验后少键自然少写；local 命令路由（`:1414`）+ 已存在则跳过（`:1427`）+ test_strategy 注入（`:1445`）均维持现状。**src/index.js 不需要修改/不变/无需修改**（本变更不触及入口接线路径，序列化层条件写已覆盖核验语义）

## 4. 拆分判断

单 change 完成，不拆分、不批量。revision 1 承认主题从「local.yaml 生成范式」扩展为「local.yaml 配置体系」（生成范式 + 外部连接统一 + agent 引导），仍单 change 的依据：围绕 **local.yaml 单一配置文件**高耦合——producer 侧（detect 生成 commands 骨架 / sync connect 写 platform+mcp 段 / agent 手填策略与 dispatch 调参）→ consumer 侧（各阶段 cat 读 commands / dispatch 子系统读 mcp 段 / probe 读 dispatch 调参）。MCP 凭据迁移虽触及 dispatch 子系统 6 处源码，但改动性质统一（凭据读源 env→local.yaml），非业务逻辑变更。规模从 light 升 full（10+ task）。

## 5. 总体方案（分 Wave，plan 阶段细化任务）

- **Wave 1 地基（纯本地，可独立测）**：detect 核验增强（`src/local-detect.js`）+ 测试更新
- **Wave 2 MCP 凭据迁移（dispatch 子系统）**：抽共享 `readMcpConfig(cwd)` helper（js-yaml 读 local.yaml mcp 段，best-effort，env fallback）→ `client.js` 构造函数加 cwd 参数读 mcp 段 → `probe.js` `configFingerprint`/no-config 改读源 → `execute.js` `getDispatchMode` hasConfig 改读源 + dispatchSection 文案 → 5 处测试核验
- **Wave 3 platform connect 统一（sync.js）**：`connect(url, token)` ping `${url}/api/health`（现状）+ 写 platform 段 + **mcp 段**（mcp.url=url, mcp.token=token，同源假设）
- **Wave 4 scan Step6 agent 引导扩展（生成侧）**：Step6 prompt 加 agent 补策略字段引导（原）+ **platform/dispatch/mcp 段检查提示**（缺失则提示 `platform connect` / 手填 dispatch 调参 / 手填 mcp 段或设 env）；Step6 示例 yaml 同步；Step11 第 10 条「标记 unavailable」调整为复查（detect 已核验）
- **Wave 5 消费侧兜底**：`execute.js` + `verify.js` 读 local.yaml 处加缺失兜底引导 + `doctor.js:353` 修正
- **Wave 6 文档同步**：跑 `node docs/prompt/_extract.mjs` 刷新镜像 + `docs/sillyspec/file-lifecycle.md` + `.claude/skills/` 检查

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | `src/local-detect.js` | nodejs 分支读 `package.json` scripts 核验 build/test/lint 存在性；gradle 核验 gradlew 决定 `./gradlew` vs `gradle`；命令缺失=不写该键；JSON.parse 失败 throw 中文 |
| 修改 | `src/stages/scan.js` | steps[5] Step6(行186-214) prompt 加 agent 补策略字段引导 **+ platform/dispatch/mcp 段检查提示**；示例 yaml 同步；steps[10] Step11 第10条(行541) 改复查 |
| 修改 | `src/stages/execute.js` | 行121/240 读 local.yaml 兜底；**`getDispatchMode`(:458) hasConfig 改读 local.yaml mcp 段 + env fallback**；dispatchSection(:602) 文案改 |
| 修改 | `src/stages/verify.js` | 行69/167 读 local.yaml 兜底 |
| 修改 | `src/stages/doctor.js` | 行353 `sillyspec init` → `sillyspec local detect` |
| 修改 | `test/local-detect.test.mjs` | Case1 空 `package.json {}` 期望值改；Case3 改造补 gradlew + 新增 Case3b；新增 nodejs 有 scripts case |
| **新增** | `src/sillyhub-mcp/config.js` | `readMcpConfig(cwd)` 共享 helper（js-yaml 读 local.yaml mcp 段 + env fallback，best-effort 不抛） |
| **修改** | `src/sillyhub-mcp/client.js` | 构造函数加 cwd 参数，读 local.yaml mcp 段（via readMcpConfig）；优先级：显式 url/token > local.yaml mcp 段 > env fallback；注释 :6-9 配置来源更新 |
| **修改** | `src/dispatch/probe.js` | `configFingerprint`(:64) 改读 local.yaml mcp.url（+ env fallback）；`probeSillyHub` no-config(:145) 改读 local.yaml mcp 段 + env；`new SillyHubMcpClient()`(:158) 传 cwd |
| **修改** | `src/sync.js` | `connect`(:150-167) 写 platform 段 + **mcp 段**（同源假设，mcp.url/mcp.token 复用 platform） |
| **修改** | `test/dispatch/path-a-probe.test.mjs` | 5 处 `new SillyHubMcpClient({url,token})` 核验（显式覆盖仍可，零回归） |
| 修改 | `docs/sillyspec/file-lifecycle.md` | local.yaml 生成逻辑 + mcp 段描述更新 |
| 镜像 | `docs/prompt/{scan,execute,verify,doctor}.md` | 改源码后跑 `node docs/prompt/_extract.mjs` 自动刷新 |
| 检查 | `.claude/skills/*/SKILL.md` | 对应 skill 是否需同步（SKILL 对外纯净性） |

**数据流标注**：

- **commands 数据流（原）**：producer `local-detect.js`（核验驱动）→ `index.js:1432-1454` yaml 序列化 → agent via scan Step6（补策略字段）→ consumer `verify-postcheck.js` extractXxx + execute/verify prompt。detect 核验版使 commands 键存在性变为 scripts 驱动，consumer 侧 `extractTestCommand` 对无 test 键返回 null（`verify-postcheck.js:47`）→ 降级 warning 不阻断，**consumer 零回归**。
- **mcp 凭据数据流（revision 1 新增）**：producer `sync.js connect`（写 local.yaml mcp 段，假设同源）或 agent 手填 → `readMcpConfig(cwd)` helper（js-yaml 提取 mcp.url/mcp.token，env fallback）→ consumer 三处：① `client.js` 构造函数（`_url`/`_token`/`_configured`/`_endpoint`）② `probe.js` `configFingerprint`（缓存 key）+ no-config 快速路径 ③ `execute.js` `getDispatchMode` hasConfig（派发三态判定）。
- **env fallback 链路**：`readMcpConfig` local.yaml mcp 段缺失 → 回退 `process.env.SILLYHUB_MCP_URL/TOKEN`（兼容旧部署 + 现有测试不设 env 场景）。env 与 local.yaml 任一源齐全即视为 configured。

> 注：本变更同步 `docs/sillyspec/file-lifecycle.md`（文件生命周期文档），但**不涉及运行时生命周期契约（lifecycle contract）**——local.yaml 是静态配置文件（见 §7.5）。

## 7. 接口定义

### 7.1 detectLocalYaml（原，签名不变）

`detectLocalYaml(workdir)` 函数签名不变，返回结构形状不变 `{ project: { type }, commands: { build?, test?, lint? } }`，但 **commands 各键的存在性改为核验驱动**：

```
nodejs  → commands.build  当且仅当 package.json scripts.build 存在
          commands.test  当且仅当 scripts.test 存在
          commands.lint  当且仅当 scripts.lint 存在
gradle  → commands.{build,test,lint} 前缀 = gradlew 存在 ? './gradlew' : 'gradle'
maven   → 不变（mvn lifecycle 级，pom.xml 存在即可）
make    → 不变（已解析 Makefile test 目标）
generic → 不变（commands={}）
```

`src/index.js` local case yaml 序列化（`if (c.build)` 等条件写，:1440-1442）无需改。`test_strategy: module` 由 `index.js:1445` 序列化模板注入（detect 函数不涉及，Grill X7 归属澄清）。JSON.parse 失败 `throw new Error('package.json 解析失败：<path>')`（CONVENTIONS #4）。

### 7.2 readMcpConfig 共享 helper（revision 1 新增）

```
readMcpConfig(cwd) → { url: string, token: string } | null
```
- js-yaml 读 `<cwd>/.sillyspec/local.yaml` 的 `mcp` 段（mcp.url / mcp.token）
- **env fallback**：local.yaml 无 mcp 段或缺键 → 回退 `process.env.SILLYHUB_MCP_URL/TOKEN`
- best-effort：文件不存在/解析失败 → 回退 env；env 也缺 → 返回 null
- url 尾部斜杠归一（去 `/+$`，与 client.js:37 一致）
- 不发网络（fs 读 only），保 probe no-config 快速路径「不发网络」保证

### 7.3 SillyHubMcpClient 构造签名（revision 1 变更）

```
new SillyHubMcpClient({ cwd?, url?, token?, timeoutMs? })
```
- **优先级**：显式 url/token 参数 > `readMcpConfig(cwd)`（local.yaml mcp 段 + env fallback）> 兜底空串
- cwd 默认 `process.cwd()`（与 SillySpec CLI 主仓库根惯例一致）
- 显式传 url/token（5 处测试用法）仍覆盖一切，零回归
- `_configured = Boolean(_url && _token)` 不变；缺则所有方法降级不发网络（现状契约保留）

### 7.4 sync.js connect 行为（revision 1 变更）

`connect(url, token)` 现状 ping `${url}/api/health` + 写 platform 段。变更后：ping health（现状）+ 写 **platform 段 + mcp 段**（mcp.url=url, mcp.token=token，假设同源 sillyhub 实例）。mcp 段可由用户手填 local.yaml 覆盖（不同源场景，R-09）。

### 7.5 local.yaml mcp 段结构（revision 1 新增）

```yaml
mcp:
  url: https://hub.example.com
  token: <bearer>
```
与 platform 段并列（platform 用于 sync HTTP API，mcp 用于 dispatch worker MCP 协议，语义独立虽可能同源）。

## 7.6 生命周期契约表

**本变更不涉及运行时生命周期契约（lifecycle contract）。** local.yaml 是静态文本配置文件，不触发 session / lease / agent_run / daemon / lifecycle / state_transition / claim / heartbeat 任何事件。文中 `file-lifecycle.md` 指「文件生命周期文档」（描述文件何时创建/归档/清理的文档），非运行时 lifecycle 机制。

## 8. 数据模型

不涉及 DB schema 变更。local.yaml 文本结构（`.gitignore` 忽略）：`project.type` / `commands.{build,test,lint,install?}` / `test_strategy` / `modules` / `known_failures` / `env` / `platform`（sync） / **`mcp`（revision 1 新增）** / `dispatch`（调参）。

## 9. 兼容策略（brownfield）

**生成范式（原）**：
- 已有 local.yaml 的项目：detect「已存在则跳过」不变，**不会覆盖**（含 platform/mcp/agent 补字段）
- 无 scripts 的 nodejs 项目：detect 不再写 build/test/lint 键 → `verify-postcheck.extractTestCommand` 对无 test 键返回 null → 降级 warning（与 unavailable 行为一致，`verify-postcheck.js:9-10,47`）→ 不阻断 verify
- agent 手动读 local.yaml：commands 无某键比该键值=`"unavailable"` 更安全（不误 spawn）
- platform 段：`sync.js` connect 全量 read-modify-write 再序列化（`sync.js:55-77`，writeFileSync 非原子 `:76`），detect 不碰
- maven/make/generic 项目：detect 行为完全不变，零回归

**MCP 凭据迁移（revision 1 新增）**：
- **env fallback**：`readMcpConfig` local.yaml mcp 段优先，缺失回退 env。旧部署只设 env 不破；现有测试不设 env 且无 local.yaml mcp 段 → `getDispatchMode` hasConfig=false → 'local'（零回归，与现状字节一致）
- **client.js 构造签名变**：加 cwd 参数（默认 process.cwd()）。5 处测试 `new SillyHubMcpClient({url,token})` 显式覆盖仍可（cwd 默认值不影响显式 url/token）；production 调用点 `probe.js:158` 加 cwd=process.cwd()
- **getDispatchMode hasConfig 改读源**：`hasConfig = !!readMcpConfig(cwd)`（readMcpConfig 内含 env fallback）。三态语义（local/local-fallback/sillyhub）不变；测试不设 env/无 mcp 段 → 'local' 零回归
- **platform connect 同源假设**：connect 写 mcp 段 url/token 复用 platform。不同源（platform 与 MCP 不同实例/凭据）场景：用户手填 local.yaml mcp 段覆盖（connect 写后被手填覆盖，或 connect 前已手填则 connect 的全量再序列化会覆盖手填——须 connect 检测已有 mcp 段则保留，R-09 缓解）

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | detect 改逻辑后，删已有 local.yaml 重 detect 的 commands 会变（少 build 键） | P2 | 非阻断：少键=命令本不该存在；verify-postcheck 兼容无键（warning）；doctor 提示 |
| R-02 | scan Step11 第 10 条（标记 unavailable）与 detect 核验重叠 | P1 | Step11 改「复查 detect 核验结果」措辞，不重复核验 |
| R-03 | 并行变更 platform-progress-sync task-08 改 sync.js readLocalYaml/_getPlatform，两变更都碰 local.yaml + sync.js | P1 | 边界隔离：detect 只生成 commands/project/test_strategy；sync 全量再序列化 platform 段；本 revision 1 也改 sync.js connect（写 mcp 段）——**两变更撞 sync.js connect 函数**，plan 须排 execute 顺序或合并；detect「已存在则跳过」保护已生成文件 |
| R-04 | agent 在 scan Step6 补 install/env 字段时编造命令 | P2 | Step6 铁律「只写能从 package.json/lockfile 确定的，不确定留空或注释」 |
| R-05 | run-command-design 变更范围重叠？ | P2 | 已查证：无关，不撞 |
| **R-06** | **client.js 构造签名变（加 cwd）破坏调用链 + 5 处测试** | P1 | cwd 默认 process.cwd() 保零回归；显式 url/token 覆盖优先级最高；5 处测试逐处核验（显式传参不受 cwd 影响）；production 调用点仅 probe.js:158 |
| **R-07** | **probe.js no-config 快速路径改读源，「不发网络」保证可能破** | P1 | readMcpConfig 纯 fs 读（js-yaml local.yaml）+ env 读，均不发网络；local.yaml 无 mcp 段 + env 缺 → no-config（不发网络保证保留）；readMcpConfig best-effort 不抛 |
| **R-08** | **execute.js getDispatchMode hasConfig 业务逻辑判定源变** | P1 | hasConfig 改 readMcpConfig + env fallback，三态语义不变；测试不设 env/无 mcp 段 → 'local' 零回归；buildWavePrompt 输出与改前字节一致（无配置场景） |
| **R-09** | **platform connect 同源假设（platform+mcp 同 url/token）** | P2 | connect 写 mcp 段前检测已有 mcp 段则保留（不覆盖用户手填）；mcp 段可手填覆盖；connect 后提示用户 probe 首次 dispatch 验证 MCP 连通 |
| **R-10** | **mcp.token 落盘 local.yaml（secret）** | P2 | local.yaml .gitignore 已忽略（与 platform.token 同级安全）；文档提示 token 轮换；env fallback 允许用户选择不入盘（只设 env） |

## 11. 决策追踪

- **D-001@v1** detect 核验策略 → §5 / §6 / §7.1 / §9 覆盖
- **D-002@v1** detect 与 platform 段边界 → §6 / §9 / R-03 覆盖
- **D-003@v1** scan Step6 agent 补字段清单 → §5 / §6 覆盖
- **D-004@v1** execute/verify 兜底 → §5 / §6 覆盖
- **D-005@v1**（revision 1）MCP 凭据读源迁移（local.yaml mcp 段 + env fallback）→ §5 Wave2 / §6 / §7.2-7.3 / §9 / R-06/R-07/R-08 覆盖
- **D-006@v1**（revision 1）platform connect 统一写法（platform+mcp 段，同源假设）→ §5 Wave3 / §6 / §7.4 / §9 / R-09 覆盖
- **D-007@v1**（revision 1）scan Step6 agent 引导范围（platform/dispatch/mcp 段检查提示）→ §5 Wave4 / §6 覆盖
- 无未解决 D 决策；R-02/R-03/R-06/R-07/R-08 的细化留 plan 阶段

## 12. 自审

- [x] 必填章节齐全（背景 / 设计目标 / 非目标 / 拆分判断 / 总体方案 / 文件变更清单 / 接口定义 / 风险登记 / 兼容策略 / 决策追踪 / 自审）
- [x] 生命周期契约：不涉及，已声明豁免（§7.6 紧邻 lifecycle contract 否定短语）
- [x] 文件变更清单含 producer→consumer 数据流标注（§6 commands 流 + mcp 凭据流双标注）
- [x] 所有 D-001~007 被 design 章节覆盖（§11），无悬空决策
- [x] 兼容策略覆盖 brownfield（已有 local.yaml / 无 scripts / platform+mcp 段 / env fallback / 构造签名变 / maven-make-generic 零回归）
- [x] revision 1 扩范围经用户决策（方案C），MCP 迁移 6 处源码改动面已在 §1.2 逐项核验（client 构造无 cwd / probe configFingerprint+no-config / execute hasConfig 业务点 / 5 测试）
- ⚠️ **自审存疑 R-03 升级**：revision 1 也改 sync.js connect（写 mcp 段），与并行变更 platform-progress-sync task-08（改 sync.js readLocalYaml/_getPlatform）**撞 sync.js connect/readLocalYaml 函数**。plan 阶段须排 execute 顺序，或确认两变更 connect 改动点不重叠（本变更改 connect 写 mcp 段，platform-progress-sync 改 readLocalYaml 解析 + _getPlatform 读 platform.user——函数级可能不重叠，须 plan 逐行核验）
- ⚠️ **自审存疑 R-09**：platform connect 同源假设——若 sillyhub 实际部署 platform（/api）与 MCP（/mcp/）不同源或不同 token，connect 统一写会填错 mcp 段。缓解：connect 检测已有 mcp 段则保留；但首次 connect 仍假设同源。plan 阶段须确认 sillyhub 部署模型（同源？），或 connect 只写 platform 段、mcp 段单独引导（退回保守）
- [x] 接口签名：detectLocalYaml 向后兼容（仅键存在性语义变）；SillyHubMcpClient 构造签名变（加 cwd，显式参数优先级最高保零回归）；readMcpConfig 新增共享 helper
- [x] **Design Grill（tier=independent 独立子代理）**：revision 1 大改后须重跑（新 docHash），审 MCP 迁移改动面准确性 + R-03 sync.js 撞函数 + R-09 同源假设 + env fallback 零回归链路
