# sillyhub-mcp 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。

- 2026-08-07-sillyhub-mcp-dispatch | 新建 SillyHubMcpClient（MCP streamable HTTP best-effort，5 方法）。被 dispatch/probe.js 消费 probeDaemon。无配置降级零回归。
- 2026-08-10-local-yaml-generation | 凭据读源迁移 env→local.yaml mcp 段（+ env fallback 保零回归）：新增 config.js readMcpConfig 共享 helper；client 构造加 cwd 参数经 readMcpConfig 读 mcp 段。probe/execute 改读源。
- ql-20260819-012-66fc | client.js 构造函数删除冗余 _token 赋值
- ql-20260819-014-0082 | _initialize 成功后补发 notifications/initialized（MCP 2025-11-25 协议要求；FastMCP 实测不强制，best-effort 失败仅 warn 不阻断），防未来 server 强校验拒掉所有 tools/call
| 2026-09-10 | ql-20260910-005-fb40（quick） | 平台侧 MCP 修复（22cdf89d1）三遗留消费侧落地：① dispatchWorker 解析补 id（平台实返 {id,…}，旧解析恒 null）；② connect 经 mcp-tokens API 成对签发 gateway_url+token 覆盖写 mcp 段（scope=read+dispatch，失败降级旧口径）；③ probeSillyHub 接 get_daemon_status daemon 在线层（false→daemon-offline 不缓存，null fail-open）+ cwd 注入参数（修 dev 仓自身连平台时 no-config 测试环境泄漏）。新增 test/sillyhub-mcp-platform-fixes.test.mjs（4 组）；活体冒烟：远端 available:true + 旧 token daemonOnline:null。 |
- ql-20260912-002-57c4 | runCli 子进程超时兜底（默认 300s env 可调）+kill+isError envelope+输出 8MB 封顶；清 callTool 死代码
- ql-20260912-009-06b4 | exit 2（EXIT_UNKNOWN 合法 envelope）不再标 isError（诊断 text 不被 host 吞）
