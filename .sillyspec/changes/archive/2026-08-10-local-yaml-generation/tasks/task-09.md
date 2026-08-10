---
id: task-09
title: scan Step6 补策略 + platform/dispatch/mcp 引导 + Step11 复查
title_zh: scan Step6 改造
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P1
depends_on: [task-01]
blocks: [task-12]
requirement_ids: [FR-02, FR-08]
decision_ids: [D-003@v1, D-007@v1]
allowed_paths:
  - src/stages/scan.js
provides: []
expects_from:
  task-01:
    - contract: DetectResult
      needs: [project.type, commands]
---

## goal
scan.js Step6(steps[5], 行185-214) 调 `sillyspec local detect` 生成核验骨架后，加 agent 补策略字段引导 + platform/dispatch/mcp 段检查提示 + 铁律段；示例 yaml(行195-208) 同步注释；Step11(steps[10], 行541) 第10条「标记 unavailable」改复查（detect 已核验）。

## implementation
- Step6(steps[5], 行185-214) prompt：detect 生成后加补策略字段引导——`commands.install` / `env` / `test_strategy`(detect 未注时) / `modules`(module_paths) / `known_failures`，键视项目实际填，不确定留空
- platform/dispatch/mcp 段检查提示(FR-08)：platform 缺→`sillyspec platform connect <url> <token>`；dispatch 调参缺→手填示例 `probe_ttl_ms`/`poll_interval_ms`/`worker_timeout_ms`；mcp 缺→`platform connect`(统一) 或手填 `mcp.url`/`mcp.token` 或设 env `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN`
- 铁律段(R-04)：「只写能从 package.json/lockfile/构建文件确定的事实，不确定留空或注释，不编造命令」
- 示例 yaml(行195-208) 同步：注释标 commands 键视 scripts 存在而异(detect 核验，可能仅 test/lint 无 build)；补 install/env/modules/known_failures 注释骨架
- Step11(steps[10], 行541) 第10条改复查措辞：「复查 detect 核验结果——commands 键已由 detect 核验 scripts 存在性，agent 无需重复核验或标 unavailable，仅确认 local.yaml 与 detect 产出一致」(R-02)

## 验收标准
- Step6(steps[5]) prompt 含：补策略字段引导(install/env/test_strategy/modules/known_failures) + 外部连接引导(platform/dispatch/mcp 三段缺提示) + 铁律段（对照 FR-02/FR-08）
- 示例 yaml(行195-208) 注释标键存在性视 scripts 而异 + 补策略字段注释骨架
- Step11(steps[10], 行541) 第10条改复查措辞(detect 已核验，不标 unavailable)(R-02)
- grep 核对 Step6 prompt 含：`platform connect` / `probe_ttl_ms` / `mcp.url` / `SILLYHUB_MCP_URL` 关键字
- 读源核对真实行号：steps[5]=行185-214 / 示例 yaml=行195-208 / steps[10] 第10条=行541（已核对，与 design §6 一致）

## verify
- npm run lint（触及 src/stages/scan.js）
- 镜像刷新由 task-12 统一跑 `node docs/prompt/_extract.mjs`（本 task 不跑）
- 人工核对 Step6 prompt 三类引导 + 铁律齐全

## constraints
- 仅改 src/stages/scan.js（allowed_paths 单文件）
- Step6 不改 detect 调用方式（detect 仍唯一核验源）；铁律防 agent 编造命令(R-04)
- Step11 不重复核验(detect 已核验, R-02)
- 依赖 task-01 detect 核验语义（commands 键存在性由 package.json scripts 驱动）
