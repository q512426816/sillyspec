# sillyhub-mcp 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。

- 2026-08-07-sillyhub-mcp-dispatch | 新建 SillyHubMcpClient（MCP streamable HTTP best-effort，5 方法）。被 dispatch/probe.js 消费 probeDaemon。无配置降级零回归。
- 2026-08-10-local-yaml-generation | 凭据读源迁移 env→local.yaml mcp 段（+ env fallback 保零回归）：新增 config.js readMcpConfig 共享 helper；client 构造加 cwd 参数经 readMcpConfig 读 mcp 段。probe/execute 改读源。
- ql-20260819-012-66fc | client.js 构造函数删除冗余 _token 赋值
- ql-20260819-014-0082 | _initialize 成功后补发 notifications/initialized（MCP 2025-11-25 协议要求；FastMCP 实测不强制，best-effort 失败仅 warn 不阻断），防未来 server 强校验拒掉所有 tools/call
