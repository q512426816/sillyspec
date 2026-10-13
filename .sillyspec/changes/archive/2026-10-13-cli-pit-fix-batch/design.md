---
author: flow-machine-draft
created_at: 2026-10-13T05:12:01.570Z
---
# 设计记录（Design Record）— 2026-10-13-cli-pit-fix-batch

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四例独立 CLI 摩擦坑的最小修复批（前会话实证后已写好，本变更倒推收尾记账）：①fr-index 伪域降级告警从「只给 digest 指引」升级为接专用命令 `tests --redomain` 的完整用法行（域级迁移 + `--by-change` 条目级过滤 + D-001 迁域不换号铁律），锚定域直接取告警列出的伪域文件名去 `.md` 后缀，用户从「知道有问题」到「拿到可粘贴命令」一步到位；②`worktree deps --set` 把离线环境被迫手改 meta.json 的未定义绕过通道 CLI 化，`--reason` 强制留痕写 depsOverrideNote/At 审计锚；③stage-review review.json 契约头在 changeDir 可得时附完整绝对路径行，根除子代理按裸 runId 手拼漏 `<stage>-` 前缀的错位坑；④cmdKnowledge 入口 `--help/-h` 全局拦截，帮助请求先于任何子命令分发消化。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 CLI：`sillyspec worktree deps --change <名> --set <n/a|linked|installed|failed> --reason "<必填>"`（exit 0 覆写+双留痕 / exit 2 用法门 / exit 1 meta 缺失）；meta.json 新增可选字段 `depsStatus`（既有）、`depsOverrideNote`、`depsOverrideAt`。
- `sillyspec knowledge --help|-h`：新增全局拦截面，输出帮助 + JSON `{ok:true, help:true, subcommands:[...]}` 后 return（原先会被当默认参数直落 refresh 子命令）。
- `src/fr-index.js`：伪域告警 console.warn 文案扩展（纯提示面，无结构化输出变化）；`src/stage-review.js`：renderReviewJsonContract 在 changeDir 非空时多渲染一行绝对路径提示（契约 schema 本体零变化）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：deps --set 只对已存在 meta.json 操作，meta 读取前 existsSync 门控——worktree 尚未创建/已被清理时 exit 1 指引而非写出新 meta，不产生乱序态；--help 拦截在参数解析最前，与子命令乱序组合（如 `knowledge refresh --help`）也先消化帮助、不触发副作用。
2. 并发写：deps 覆写走 writeAtomicSync 原子落盘（与其他 meta 写者同款互斥面），双留痕字段同一次 JSON 写入无撕裂窗；knowledge --help 纯读零写盘，无并发面。
3. 切换/生命周期：depsOverrideNote 记录前值与理由（审计可对账），覆写不改变 worktree 生命周期状态机（verify/archive 对账逻辑照旧读 depsStatus）；stage-review 路径行是纯渲染增量，review.json schema 版本不动，旧消费者零感知。
4. 作用域：跨仓 worktree 的 meta 在各自 specBase 下，命令显式不做自动跨仓扫描，缺 meta 时指引用 `--spec-dir` 指到对应 specBase——避免多仓注册时误写他仓 worktree；fr-index 告警的伪域名取自本变更实际 pseudoHits，不跨变更串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：deps --set 成为常态绕过通道（该验的不验直接 set linked）——缓解为 --reason 强制必填 + 覆写留痕三字段（前值/理由/时间戳），verify/archive 对账以 depsOverrideNote 为审计锚，理由不实属未定义行为（文案明示）。放弃的方案：①让 worktree deps 自动探测 node_modules 可用性免 --reason——离线环境探测本身不可靠（npm ci 超时≠不可用），且弱化留痕动机，弃；②knowledge 帮助做成独立子命令（knowledge help）——探索型调用习惯是 `--help`，拦 --help/-h 才堵得住 refresh 误触发，help 子命令留作未来增强。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/fr-index.js | 伪域降级告警接 tests --redomain 用法行 + D-001 铁律明示 |
| 修改 | src/index.js | worktree 新增 deps 子命令（--set/--reason 显式覆写通道） |
| 修改 | src/stage-review.js | review.json 契约头附完整绝对路径行（changeDir 可得时） |
| 修改 | src/stages/knowledge.js | cmdKnowledge 入口 --help/-h 全局拦截 |
| 新增 | test/worktree-deps-override.test.mjs | deps 覆写通道四形态锁定（3 用例） |
| 修改 | .idea/vcs.xml | IDE vcs 映射清理（失效目录条目摘除，前会话遗留） |
| 修改 | .sillyspec/docs-check-baseline | docs gate 基线棘轮随前会话文档推进自动重锚 5→20 |
