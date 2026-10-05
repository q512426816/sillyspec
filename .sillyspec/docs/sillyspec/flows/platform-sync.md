---
author: qinyi
created_at: 2026-10-06T00:30:00+08:00
---
# 平台同步与远端派发流程（可选集成）

## 目标

CLI 与 SillyHub 平台的单向可选集成：进度、文档、审批答复、quicklog 经 `shpsync_` workspace 级 token 上行；spec 文件树走服务器权威 manifest＋FileOp 增量同步（base_version 乐观锁）；子代理任务可派发到平台远端 worker 池执行（自动探测、失败回退本机）。不连平台功能完整——本地独立可用是产品原则。

## 参与模块

- sync.js：平台同步 facade（connect / disconnect / sync / sync-docs / status / pull / resolve / approve / reject / pointer）
- spec-sync.js：spec 增量同步（FileOp ops 上行，后台执行不阻塞命令返回）
- sillyhub-mcp/：SillyHub MCP 客户端
- dispatch/：远端派发能力探测（probe）与策略（hint），回退本机
- watcher.js：文件变更监听触发同步
- write-audit.js / timeline.js：写审计与时间线
- cross-repo-reconcile.js：跨仓对账

## 流程摘要

```
sillyspec platform connect（登记平台地址 + shpsync_ token）
  → 阶段推进 / 收口时后台 spec-sync（输出见 .sillyspec/.runtime/spec-sync-bg.log）
      → 服务端按 manifest 比对：server version ≠ base_version 且 hash 不同 → 记冲突跳过（同 hash 豁免）
  → 冲突处理：push 409 / pull 冲突双路径，血统归属判定（本人自回声不落冲突文件）
  → 子代理派发：dispatch probe 探测远端 worker 能力
      → 可用 → 任务经 SillyHub MCP 派发远端执行
      → 不可用 / 失败 → 自动回退本机执行
```

## 关键规则

- 写通道唯一 `shpsync_`（改前缀即断所有客户端）；读端点兼容 shk_live_/JWT。
- 进度上行乐观锁 base_ts（ISO 8601 字符串字典序比对）。
- 多仓共享单一进度库根：`platform pointer` 接管。
- 同步永远后台化，不阻塞协议命令返回。
