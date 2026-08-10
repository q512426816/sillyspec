---
plan_level: full
author: qinyi
created_at: 2026-08-10 22:55:00
change: 2026-08-10-local-yaml-generation
revision: 1
---

# 实现计划（Plan）— local.yaml 配置体系改造（revision 1 方案C）

## 来源

直接引用 design.md（truth source，revision 1）§5 Wave 划分 + tasks.md 17 task 骨架合并为 12 task。design 已通过 tier=independent Design Grill revision 1（specVerdict/qualityVerdict=pass，无 P0/P1，R-03 经核验 moot / R-09 P2 缓解充分）。

## 范围

涉及文件/模块清单（design §6）：
- `src/local-detect.js` — detect 核验增强（cli-entry）
- `src/sillyhub-mcp/config.js` — **新增** readMcpConfig helper（sillyhub-mcp）
- `src/sillyhub-mcp/client.js` — 构造签名加 cwd 读 mcp 段（sillyhub-mcp）
- `src/dispatch/probe.js` — configFingerprint/no-config 改读源（dispatch）
- `src/stages/execute.js` — getDispatchMode hasConfig 改读源 + 行121/240 兜底（stages）
- `src/stages/verify.js` — 行69/167 兜底（stages）
- `src/stages/scan.js` — Step6 补策略 + 外部连接引导 + Step11 复查（stages）
- `src/stages/doctor.js` — 行353 修正（stages）
- `src/sync.js` — connect 写 platform+mcp 段（runtime）
- `test/local-detect.test.mjs` + `test/dispatch/path-a-probe.test.mjs` — 测试
- `docs/prompt/{scan,execute,verify,doctor}.md` 镜像 + `docs/sillyspec/file-lifecycle.md` + `.claude/skills/`

## Wave（按 depends_on + allowed_paths 不重叠）

### Wave 1：detect 核验增强（纯本地，地基，可独立测）
- [x] task-01: detect 核验增强——nodejs 读 scripts + gradle 核验 gradlew（覆盖：FR-01, FR-05, D-001@v1, D-002@v1）
- [x] task-02: detect 测试契约更新（覆盖：FR-01）

### Wave 2：MCP 凭据迁移（dispatch 子系统，readMcpConfig 链）
- [x] task-03: 新增 readMcpConfig 共享 helper（覆盖：FR-06, D-005@v1）
- [x] task-04: client.js 构造签名加 cwd 读 mcp 段（覆盖：FR-06, D-005@v1）
- [x] task-05: probe.js configFingerprint/no-config 改读源（覆盖：FR-06, D-005@v1）
- [x] task-06: execute.js getDispatchMode hasConfig 改读源 + 行121/240 兜底（覆盖：FR-03, FR-06, D-004@v1, D-005@v1）
- [x] task-07: path-a-probe.test.mjs 5 处构造零回归核验（覆盖：FR-06, D-005@v1）

### Wave 3：platform connect 统一（独立，sync.js）
- [x] task-08: sync.js connect 写 platform+mcp 段（覆盖：FR-07, D-006@v1）

### Wave 4：scan Step6 改造（依赖 task-01 detect 核验语义）
- [x] task-09: scan Step6 补策略 + platform/dispatch/mcp 引导 + Step11 复查（覆盖：FR-02, FR-08, D-003@v1, D-007@v1）

### Wave 5：消费侧兜底（独立 prompt 改）
- [x] task-10: verify.js 行69/167 读 local.yaml 兜底（覆盖：FR-03, D-004@v1）

### Wave 6：修正与文档同步（依赖源码改完）
- [x] task-11: doctor.js 行353 修正（覆盖：FR-04）
- [x] task-12: 文档同步——镜像 + file-lifecycle + skills

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | allowed_paths | 说明 |
|---|---|---|---|---|---|---|---|
| task-01 | detect 核验增强 | W1 | P0 | — | FR-01, FR-05, D-001, D-002 | src/local-detect.js | nodejs 读 scripts / gradle 核验 gradlew |
| task-02 | detect 测试 | W1 | P0 | task-01 | FR-01 | test/local-detect.test.mjs | Case1/3/3b/nodejs-scripts |
| task-03 | readMcpConfig helper | W2 | P0 | — | FR-06, D-005 | src/sillyhub-mcp/config.js | 新增，js-yaml + env fallback |
| task-04 | client.js 构造签名 | W2 | P0 | task-03 | FR-06, D-005 | src/sillyhub-mcp/client.js | 加 cwd 读 mcp 段 |
| task-05 | probe.js 改读源 | W2 | P0 | task-03, task-04 | FR-06, D-005 | src/dispatch/probe.js | configFingerprint/no-config |
| task-06 | execute.js getDispatchMode + 兜底 | W2 | P0 | task-03 | FR-03, FR-06, D-004, D-005 | src/stages/execute.js | hasConfig 改读源 + 行121/240 兜底 |
| task-07 | path-a-probe 零回归 | W2 | P0 | task-03~06 | FR-06, D-005 | test/dispatch/path-a-probe.test.mjs | 5 处构造核验 |
| task-08 | sync.js connect 统一 | W3 | P1 | — | FR-07, D-006 | src/sync.js | 写 platform+mcp 段 |
| task-09 | scan Step6 改造 | W4 | P1 | task-01 | FR-02, FR-08, D-003, D-007 | src/stages/scan.js | 补策略 + 外部连接引导 |
| task-10 | verify.js 兜底 | W5 | P1 | — | FR-03, D-004 | src/stages/verify.js | 行69/167 兜底 |
| task-11 | doctor.js 修正 | W6 | P1 | — | FR-04 | src/stages/doctor.js | 行353 |
| task-12 | 文档同步 | W6 | P1 | task-01~11 | — | docs/prompt/* + file-lifecycle + skills | 镜像 extract + mcp 段描述 |

## 关键路径

- **MCP 迁移核心链**：task-03（readMcpConfig）→ task-04（client 构造）→ task-05（probe）→ task-07（测试零回归）。readMcpConfig 是地基，client/probe/execute 三消费点依赖它。
- **detect 链**：task-01 → task-02（短，纯本地）
- **scan 链**：task-01（detect 语义）→ task-09 → task-12（文档）
- 最长路径：task-03 → task-04 → task-05 → task-07（4 跳），决定最短交付周期

## 全局验收标准

- [ ] `npm test` 全量通过（含 test/local-detect.test.mjs Case1/3/3b/nodejs-scripts + test/dispatch/path-a-probe.test.mjs 5 处构造零回归）
- [ ] `npm run lint` 通过
- [ ] **MCP 迁移零回归**：不设 env 且无 mcp 段 → `getDispatchMode` 返回 'local'（与现状字节一致）；buildWavePrompt 不注入派发段
- [ ] **detect 核验**：sillyspec 自身（无 build script）不再生成 commands.build 键
- [ ] **platform connect**：写 platform + mcp 段（已有 mcp 段保留不覆盖）
- [ ] **scan Step6**：含补策略字段引导 + platform/dispatch/mcp 段检查提示 + 铁律段
- [ ] execute/verify 读 local.yaml 兜底引导；doctor 提示指向 `sillyspec local detect`
- [ ] 镜像与源码一致 + file-lifecycle.md 核验版含 mcp 段描述 + skills 纯净（无内部路径泄漏）
- [ ] （brownfield）已有 local.yaml detect 跳过不覆盖（含 platform/mcp 段）；env fallback 兼容旧部署

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-02 | detect 核验 + 命令缺失不写键（Case1/3/3b 测试） |
| D-002@v1 | task-01（边界） | detect 已存在则跳过，不碰 platform/mcp 段（index.js:1427） |
| D-003@v1 | task-09 | scan Step6 agent 补策略字段清单 |
| D-004@v1 | task-06, task-10 | execute/verify 读 local.yaml 兜底 |
| D-005@v1 | task-03, task-04, task-05, task-06, task-07 | MCP 凭据读源迁移（readMcpConfig + env fallback，5 处构造零回归） |
| D-006@v1 | task-08 | platform connect 统一写 platform+mcp 段 |
| D-007@v1 | task-09 | scan Step6 agent 引导外部连接（platform/dispatch/mcp） |

## 风险应对（plan 阶段细化 design R-06~10 + Grill gap）

- **R-03**（sync.js 撞 platform-progress-sync）：经 Design Grill 核验 **moot**——platform-progress-sync 的 sync.js 改动已 commit 进 main（改 connect/sync/resolvePlatformUser），task-08 改 post-落地 connect() 当前态（在 platform.user 块后追加 config.mcp），实际无并发冲突
- **R-06**（client 构造签名变）：task-04 cwd 默认 process.cwd()，显式 url/token 优先级最高；task-07 核验 5 处测试显式传参不受影响
- **R-07**（probe no-config 不发网络）：task-05 readMcpConfig 纯 fs + env 读（不发网络），no-config 快速路径保证保留
- **R-08**（execute hasConfig 业务点）：task-06 三态语义（local/local-fallback/sillyhub）不变，task-07 零回归核验
- **R-09**（同源假设）：task-08 connect 检测已有 mcp 段则保留；**plan 阶段 Grill gap 2 待确认 sillyhub 部署模型**（platform /api 与 MCP /mcp/ 是否同源）——若不同源，task-08 退保守（只写 platform，mcp 段单独引导）
- **R-10**（secret 落盘）：local.yaml .gitignore 已忽略（与 platform.token 同级）；env fallback 允许用户选择不入盘
- **Grill gap 1**（design §12 并行变更 scope 描述有误）：task-12 文档同步时更正 design §12（readLocalYaml/_getPlatform → connect/sync/resolvePlatformUser），消除与 R-03 矛盾
