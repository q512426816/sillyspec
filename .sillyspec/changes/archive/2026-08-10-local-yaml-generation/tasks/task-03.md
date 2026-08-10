---
id: task-03
title: 新增 readMcpConfig 共享 helper（js-yaml + env fallback）
title_zh: readMcpConfig helper
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P0
depends_on: []
blocks: [task-04, task-05, task-06]
requirement_ids: [FR-06]
decision_ids: [D-005@v1]
allowed_paths:
  - src/sillyhub-mcp/config.js
provides:
  - contract: readMcpConfigResult
    fields: [url, token]
expects_from: {}
---

## goal
新增 src/sillyhub-mcp/config.js 导出 readMcpConfig(cwd) 共享 helper：js-yaml 读 <cwd>/.sillyspec/local.yaml mcp 段（mcp.url/mcp.token），env fallback（local.yaml mcp 段优先 > process.env），best-effort 不抛不发网络，url 尾部斜杠归一。为 task-04（client 构造）/ task-05（probe）/ task-06（execute getDispatchMode）三消费点提供统一读源（design §7.2 / §6 mcp 凭据数据流）。

## implementation
- 新增 src/sillyhub-mcp/config.js，export readMcpConfig(cwd) → { url, token } | null
- 读法参考 probe.js readProbeTtlFromLocalYaml（:34-47）：join(cwd,'.sillyspec','local.yaml') → existsSync 守卫 → jsYaml.load(readFileSync(p,'utf8')) → 取 doc.mcp
- 优先级：local.yaml mcp 段（url+token 齐全）> process.env.SILLYHUB_MCP_URL/TOKEN fallback；mcp 段缺或任一键缺才回退 env
- url 尾部斜杠归一：url.replace(/\/+$/,'')（与 client.js:37 / sync.js:204 一致）
- best-effort 不抛：文件不存在 / jsYaml.load 抛 / doc 非对象 全 try/catch 回退 env；env 也缺 → 返回 null
- 纯 fs 读 + env 读，绝不发网络（保 probe no-config 快速路径零回归，design R-07）

## 验收标准
对照 FR-06：
- local.yaml 有 mcp 段（mcp.url + mcp.token 齐全）→ 返回 { url: 归一后, token }（尾部斜杠去除）
- local.yaml 无 mcp 段但 process.env 有 SILLYHUB_MCP_URL/TOKEN → env fallback 返回 { url, token }
- local.yaml 无 mcp 段且 env 缺 → 返回 null
- local.yaml mcp 段仅 url 或仅 token（缺键）→ 该源视为不齐，回退 env（design §7.2「缺键 → 回退 env」）
- 全程不发网络（纯 fs + env 读），任何异常不抛穿（best-effort）

## verify
- npm test（helper 由消费端间接覆盖：task-04 client 构造 / task-05 probe no-config / task-06 getDispatchMode / task-07 path-a-probe 5 处零回归；本 task 不单独加测试）

## constraints
- best-effort 绝不抛（保 probe 铁律 R-07：探测失败保守 fallback，绝不阻断 execute）
- 不引新依赖（js-yaml 复用 probe.js:17 已引）
- 只新增 src/sillyhub-mcp/config.js，不改 client.js/probe.js/execute.js（分别归 task-04/05/06）
