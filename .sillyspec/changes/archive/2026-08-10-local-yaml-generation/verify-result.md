---
author: qinyi
created_at: 2026-08-11T01:35:00+08:00
---

# 验证报告（Verify Result）

> 变更：`2026-08-10-local-yaml-generation`（local.yaml 配置体系改造，方案C revision 1）
> 验证时间：2026-08-11
> verify run：基于 main 工作区（worktree 已 apply/cleanup，deliverable 物理落地 main）

## 结论

**PASS WITH NOTES**

实现完整符合 design.md（revision 1）设计决策，12/12 task 全部完成，全量测试零回归。2 处 design 文档漂移（行号 / scope 描述）不影响实现正确性，记录如下供文档维护。

## 任务完成度

**12/12 = 100%**

| task | 内容 | 证据 |
|---|---|---|
| task-01 | detect 核验增强（nodejs scripts 逐键 + gradle gradlew） | `src/local-detect.js:59-77` nodejs 逐键核验 + `:92-102` gradle gradlew；单测 35 PASS |
| task-02 | detect 测试 Case1/3/3b + nodejs-scripts | `test/local-detect.test.mjs` 35 PASS（Case1/1b/1c/3/3b） |
| task-03 | readMcpConfig helper 新增 | `src/sillyhub-mcp/config.js`（js-yaml + env fallback，best-effort） |
| task-04 | client.js 构造签名加 cwd | `src/sillyhub-mcp/client.js:36-52` `{cwd,url,token,timeoutMs}` 优先级链 |
| task-05 | probe.js configFingerprint/no-config 改读源 | `src/dispatch/probe.js:19/65/147/160` 全改 readMcpConfig |
| task-06 | execute.js hasConfig + 兜底 | `src/stages/execute.js:7/459/122/241` hasConfig 改 readMcpConfig + 兜底 |
| task-07 | path-a-probe 5处构造零回归 | `test/dispatch/path-a-probe.test.mjs` 59 PASS |
| task-08 | sync.js connect 写 platform+mcp 段 | `src/sync.js:226-229` `if(!config.mcp)` 守卫 + writeLocalYaml |
| task-09 | scan Step6 补策略 + 引导 + Step11 | `src/stages/scan.js:191/201-205/237` detect 调用 + platform/dispatch/mcp 引导 |
| task-10 | verify.js 行69/167 兜底 | `src/stages/verify.js:69/167` 两处兜底字面一致 |
| task-11 | doctor.js 行353 修正 | `src/stages/doctor.js:353` `sillyspec local detect` |
| task-12 | 文档同步（镜像 + file-lifecycle + skills） | `docs/prompt/{scan,execute,verify,doctor}.md` extract 一致 + `file-lifecycle.md:133-136` mcp 段 + skills 纯净 grep=0 |

## 设计一致性

实现符合 design.md §5（Wave1-6）/ §6（文件变更清单 9 源码+测试+文档全落地）/ §7.1-7.5（接口签名）/ §9（兼容 env fallback 零回归）/ §10（R-06~10 风险应对）。

**零回归核心实证**（R-07/R-08）：
```
readMcpConfig(sillyspec cwd, 无 .sillyspec/local.yaml, env 未设 SILLYHUB_MCP_URL/TOKEN) = null
→ hasConfig = !!null = false
→ getDispatchMode 返回 'local'（与改前字节一致，buildWavePrompt 不注入派发段）
```

## 探针结果

- **探针1（未实现标记）**：0 真实标记。grep TODO/FIXME/HACK/XXX 命中 `execute.js:268`/`scan.js:495`/`verify.js:174,231` 全为 prompt 引导文本（「grep TODO/FIXME」指令），非未实现标记。
- **探针2（关键词覆盖）**：design 能力词 readMcpConfig/configFingerprint/mcp 段/platform connect/兜底/detect 核验全在源码实现（锚点 grep 实证）。
- **探针3（测试覆盖）**：task-01/02 → `local-detect.test.mjs`（35 PASS）；task-03~07 → `path-a-probe.test.mjs`（59 PASS）；task-08~12 → 现有套件覆盖（npm test exit 0）。
- **探针4（决策闭环）**：D-001~007@v1 → FR-01~08 → task 全映射，无悬空决策，无 P0/P1 unresolved。
- **探针5（契约对齐）**：SillyHubMcpClient 构造签名（design §7.3）由 task-07 5处显式构造测试验证（59 PASS，显式 url/token 覆盖优先级最高保零回归）。
- **探针6（质量扫描）**：lint 243 files 通过（src 76 + test 167）；npm test exit 0。

## 决策追踪（D-001~007@v1 闭环）

| 决策 | 内容 | 覆盖任务 | 实证 |
|---|---|---|---|
| D-001@v1 | detect 核验策略——读真实构建文件，命令缺失不写键 | task-01, task-02 | local-detect.js nodejs scripts 逐键 + 35 PASS |
| D-002@v1 | detect 与 local.yaml platform 段边界——detect 不碰 platform | task-01（边界） | detect 仅生成 commands/project，不碰 platform/mcp 段 |
| D-003@v1 | scan Step6 agent 补字段清单——机器做事实，agent 做策略 | task-09 | scan.js:191 调 detect + :201-205 补策略引导 |
| D-004@v1 | execute/verify 读 local.yaml 缺失兜底 | task-06, task-10 | execute.js:122/241 + verify.js:69/167 兜底 |
| D-005@v1 | MCP 凭据读源迁移——env→local.yaml mcp 段（+ env fallback） | task-03,04,05,06,07 | readMcpConfig + client/probe/execute 三消费点 + 59 PASS |
| D-006@v1 | platform connect 统一写法——写 platform+mcp 段（同源假设） | task-08 | sync.js:226-229 if(!config.mcp) 守卫 |
| D-007@v1 | scan Step6 agent 引导外部连接范围——platform/dispatch/mcp 段检查提示 | task-09 | scan.js:201-205 三类引导 + 示例 yaml:237 |

无悬空决策，无 superseded 被下游引用，无 P0/P1 unresolved/blocking。

## 变更风险等级

**CLI detectChangeRisk 关键词判定 = `integration-critical`**（命中 daemon / session / lease / agent_run / lifecycle / state_transition / claim / heartbeat）。

**属关键词误伤**——这 8 个词全部来自 design §7.6 的**否定声明**（「本变更不涉及运行时生命周期契约：不触发 session / lease / agent_run / daemon / lifecycle / state_transition / claim / heartbeat 任何事件」）。detectChangeRisk 是机械字面匹配、不认否定语境，把「不涉及 X」的 X 全部计为命中。

**risk_level 由 design frontmatter 显式声明 = `unit-sufficient`**（覆盖关键词判级 integration-critical 误伤）。理由：
- design §7.6 明确声明不涉及运行时 lifecycle contract（local.yaml 是静态文本配置文件）
- 本变更为纯 fs detect 核验 + 配置读源迁移（env→local.yaml mcp 段，env fallback 保留）+ prompt 文案调整
- MCP 协议层（client.js 网络/fetch/SSE/JSON-RPC）未改，仅改凭据读源
- 无 daemon 启动、无跨进程调用、无状态机变更
- 单测覆盖充分（local-detect 35 PASS + path-a-probe 59 PASS + 全量 npm test exit 0），零回归已实测

留痕（防逃逸）：本变更用了 design frontmatter `risk_level: unit-sufficient` 显式声明覆盖 detectChangeRisk 的 integration-critical 关键词误判；豁免可审计（见 design.md frontmatter + 本 section 理由）。

## Runtime Evidence

**N/A**（unit-sufficient 级，无需运行时集成证据）。design §7.6 明确声明本变更不涉及运行时生命周期契约——local.yaml 是静态文本配置文件，不触发 session / lease / agent_run / daemon / lifecycle / state_transition / claim / heartbeat 任何事件。本变更为纯 fs detect 核验 + 配置读源迁移 + prompt 文案，无 daemon 启动、无跨进程调用、无状态机变更。

## 文档漂移（不影响实现，记录供维护）

1. **design §6 sync.js 行号**：写「`sync.js:150-167`」，实际 `connect` 写 mcp 段逻辑在 `src/sync.js:202-229`（`if(!config.mcp)` 守卫 :226）。漂移原因：platform-progress-sync 并行变更推进了 sync.js 行号。实现正确（task-08 锚点 :226-229 实证）。
2. **design §12 scope 描述**：写「撞 sync.js connect/readLocalYaml 函数」，实际 platform-progress-sync 改的是 `connect/sync/resolvePlatformUser`（非 readLocalYaml/_getPlatform）。plan §风险应对 R-03 已核验 **moot**（platform-progress-sync 改动已 commit，task-08 改 post-落地 connect() 在 platform.user 块后追加 config.mcp，函数级无并发冲突）。

两处均为文档描述瑕疵，不影响 design 设计决策与实现一致性。

## 测试对账

- `npm test`：exit 0（apply 后 main 工作区全量，含本变更 17 deliverable + platform-progress-sync staged 共存）
- `npm run lint`：243 files 通过
- `test/local-detect.test.mjs`：35 PASS / 0 FAIL
- `test/dispatch/path-a-probe.test.mjs`：59 PASS / 0 FAIL
- verify --done CLI 测试对账：local.yaml 不存在（sillyspec 自身）→ CLI 跳过对账（已在 apply 后手动 npm test exit 0 实证）
