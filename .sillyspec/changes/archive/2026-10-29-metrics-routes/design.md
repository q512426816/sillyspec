---
author: flow-machine-draft
created_at: 2026-10-28T23:16:47.116Z
---
# 设计记录（Design Record）— 2026-10-29-metrics-routes

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

用户指出 2026-10-29-open-metrics-gate 的单命令指标门在多语言/多框架仓需手写 wrapper 路由，不符合本仓「机制用批类别/路径集合、不枚举语言框架」纪律（modules 块先例）。方案：新增 `metrics_routes` 路由形态作为单命令门的兄弟机制——verify-postcheck.js 新增 `extractMetricsRoutes`（modules 块同风格行扫描：inline flow / 子块展开 / 任意非零缩进）与 `runVerifyMetricsRoutesCheck`（变更文件面 ∩ paths 段全等前缀路由 → 仅执行命中 gate，逐 gate 注入其命中子集到 SILLYSPEC_CHANGE_FILES、逐 gate 超时链与 CNF 降档复用单命令门语义），挂在单命令 metrics 之后执行；两形态可共存，结果同走 persistLintResult section 'metrics' 证据链（路由对象 kind: 'routes' + gates 数组）。选这个方案因为：路由面数据（变更文件面）CLI 本来就有（SILLYSPEC_CHANGE_FILES 同源），路径前缀匹配与 modules 块同口径——多语言与大仓增量在机制层一次解决，polyglot 仓不再需要手写路由 wrapper。

接口面：quick-audit.js 与 verify-quality-scan.js 双道挂载点复用单命令门同一位置（其后追加路由执行与 failed 归并）；config-schema.js 注册 parametrized 键（modules 先例）；引导面三处同步。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `local.yaml` 新段 `metrics_routes:`：`<name>.paths`（路径前缀集合，inline 数组 `["a/", "b/"]` 或逗分裸串 `a/, b/` 均可）、`<name>.command`（shell 命令）、可选 `<name>.timeout_sec`（数字，秒）。未配置整段=现状零变化。
- `src/verify-postcheck.js` 新增 export `extractMetricsRoutes(yamlText)` → `Record<name, {paths: string[], command: string, timeoutSec: number|null}>|null` 与 `runVerifyMetricsRoutesCheck({ cwd, specBase, timeoutMs, changeFiles })` → `{ status: 'passed'|'failed'|'skipped', kind: 'routes', gates: [{name, status, command, exitCode, durationMs, outputTail, reason, matchedFiles}], command: null, exitCode, durationMs, outputTail, reason }`（顶层字段对齐单命令结果形态，printQuickTestLintGate 的通用循环直接可用）。
- `src/run/quick-audit.js` runQuickTestLintGate：单命令 metrics 执行后追加路由执行；failed 归并——任一形态红只 push 'metrics' 一次；gate.metrics 证据链两结果并存（路由对象携带 kind 区分）。
- `src/run/verify-quality-scan.js` 厚道同款挂载（snap.changeFiles 路由源）。
- `src/config-schema.js` 注册 `metrics_routes.<name>.paths` / `.command` / `.timeout_sec` 三 parametrized 键 + renderExample 注释态路由示例；templates/agents-instruction.md 规则 4 metrics 句补路由提及。
- 路由留痕文案（零命中/未配置）提及路由形态可用（引导面）。
- 无对外 CLI 命令、无破坏性变化；package.json 零依赖变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

路由结果是收口时点的执行快照（无事件流语义），gate 串行执行、顺序按配置声明序稳定（YAML 块序）——结果确定性不依赖到达顺序。超时=该 gate failed 拦门非静默。断点续幂等：重跑路由门整体重执行（每 gate 独立幂等，命令自身状态性是用户命令责任，与单命令门同边界）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

继承单命令门全边界：隔离快照内执行不触碰主仓、无 tally 共享写面、verify-runs 时间戳目录天然分仓分时。多 gate 刻意**串行**执行（放弃并行）：并行进程会放大指标工具的 CPU/IO 峰值并与并行会话的实测互扰，秒级 gate 串行总时长可控。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

收口中途中断 → 断点续重跑，路由门整体重执行幂等；快照 cleanup/证据回拷/resultPath 重映射链路对路由对象同样生效（聚合对象挂 gate.metrics 走既有链）。gate 中途超时被杀不污染其余 gate（各 gate 独立进程独立结果单元）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

命令与路由配置只来源本仓 `.sillyspec/local.yaml`（信任边界同 lint/test/metrics）；paths 为仓根相对前缀，路径匹配前双侧 POSIX 归一（Windows 反斜杠变更文件与配置路径同归一，跨平台一致）；worktree 会话跳快照直接实测（既有判定继承）；跨仓冻结面不涉（门只对主仓执行）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：**前缀误蹭/漏配**——路径段边界匹配写错会让 frontend/ 误吃 frontend-v2/ 的变更（假门红）或深路径漏命中（假跳过）。缓解：匹配算法钉死段全等语义（`file === p || file.startsWith(p.endsWith('/') ? p : p + '/')`），正反两向专测（误蹭负例 + 深路径命中正例）；解析器缩进语义随 modules 块坑史（任意非零缩进，不硬编码空格数）。

放弃的方案：① glob/通配路径——前缀集合已覆盖 monorepo 目录形态（modules 先例同口径），glob 引入 Windows 通配语义与转义复杂度，收益不成比例；② gate 并行执行——秒级 gate 串行总时长可控，并行放大资源峰值且输出交错难归因；③ 按语言扩展名自动路由（.ts→eslint、.java→PMD）——枚举开放世界违反规约 00（新语言要改 CLI），路径集合是仓主声明的中性事实；④ 路由复用 modules 块（modules.<name>.metrics 键）——modules 块语义是测试子集映射，混入指标门职责耦合两个机制的生命周期，独立段更清晰。

已知取舍：gate 命中子集注入 SILLYSPEC_CHANGE_FILES 是**该 gate 的命中文件**（非全变更面）——gate 内工具天然只看自己的域；需要全量的命令仍走单命令形态（共存）。
