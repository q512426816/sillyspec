---
author: flow-machine-draft
created_at: 2026-10-12T13:04:18.145Z
---
# 设计记录（Design Record）— 2026-10-12-review-probe-injection

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新模块 src/review-probes.js 承载「项目评审探针」的解析/装载/行解析：local.yaml 顶层 `review_probes` 段声明探针（id 自由文本、scope 选任务书面、lines 自由文本清单行、command 可选命令产出追加行），CLI 在两面评审任务书注入为独立必答段——轻量面 flow-review.js renderReviewerTaskbook（【检查单】后）、厚档面 review-dispatch.js buildReviewerTaskBook（审查清单后），两处调用点各自装配。选数据驱动而非 CLI 内置探针库：dogfood 实证三个漏检缺陷全是项目特有面（dva 双注册互斥、MyBatis typeAliases 扫描撞名、原型表头保真），任何 CLI 预设清单都无法枚举开放世界的项目风险面（用户红线：不枚举定义开放世界、不绑语言框架）——CLI 只做装配与容量治理，内容主权归项目配置。未配置=零注入零回归，与 ceremony/docs-check 等 local.yaml 段同一消费哲学（读键容错、缺省空）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- local.yaml 新顶层段 `review_probes`：数组条目 `{ id: string 非空≤64, scope?: thin|thick|all（缺省 all）, lines?: string[], command?: string }`（lines/command 至少一非空）。
- 新导出（src/review-probes.js）：`parseReviewProbes(raw) → { probes: [{id,scope,lines,command}], warnings: string[] }`（坏条目跳过+告警，零抛出）；`loadReviewProbes(specBase) → { probes, warnings }`（无段/读失败=空，warning 透出）；`resolveProbeLines({ probes, scope, runCommand }) → { lines: string[], provenance: string[] }`（scope 过滤+静态行+命令行合并；provenance 记截断/跳过留痕）。
- `renderReviewerTaskbook({ change, changeDir, head, priorFindings 注入不变, probeLines })`——新增可选参数，缺省/空数组输出与现状逐字一致；非空时在【检查单】段后渲染【项目评审探针】段。
- `buildReviewerTaskBook({ stage, changeDir, reviewRunId, channelPriority, probeLines })`——新增可选参数，缺省零变化；非空时在「## 审查清单」后渲染「## 项目评审探针（local.yaml 注入）」段。
- config-schema.js 新增 review_probes 段登记（文档面，无运行时消费者变化）。
- 容量帽常量（模块内）：MAX_PROBES=16、MAX_LINES_PER_PROBE=12、MAX_LINE_CHARS=300、COMMAND_TIMEOUT_MS=10000、COMMAND_OUTPUT_MAX_BYTES=2048、COMMAND_OUTPUT_MAX_LINES=20。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| A | src/review-probes.js | 解析/装载/行解析（纯函数为主，spawnSync 仅注入式 runCommand 缺省） |
| M | src/flow-review.js | renderReviewerTaskbook 增 probeLines 参数与注入段 |
| M | src/flow.js | 任务书渲染调用点接 loadReviewProbes(scope thin) 装配 |
| M | src/review-dispatch.js | buildReviewerTaskBook 增 probeLines 参数；两处调用点接装配（scope thick） |
| M | src/config-schema.js | 登记 review_probes 段 |
| A | test/review-probes.test.mjs | 解析/帽/过滤/命令 fail-soft/双面注入/零回归 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   探针在任务书渲染时点一次性快照装配（渲染后 local.yaml 再改不影响已派发任务书）；命令行源每次渲染重跑——无迟到消费方，顺序语义不适用。n/a 面为主，快照时点即语义。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   只读 local.yaml（js-yaml load，与其他读者同款）；命令执行 spawnSync 同步串行无共享态；任务书是渲染产物非持久文件（thin 打印/thick 组 prompt），无并发写面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   无持久状态——探针是每次渲染即时装配的纯读；中断无半态（命令超时 fail-soft 跳过该行源）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   local.yaml 是工作区级（.sillyspec/local.yaml，gitignored 逐机配置），探针只注入本工作区的任务书；跨仓变更的任务书面同样由主工作区 specBase 装配，无跨仓读取。scope 枚举（thin/thick/all）是 CLI 自有任务书面集合（封闭小集，非内容枚举），内容层（lines/command）零约束。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：命令行源（command）在任务书渲染路径同步执行——恶意/误配命令可拖慢渲染或产出注入文本。缓解：超时 10s + 输出帽 2KB/20 行 + fail-soft + provenance 留痕；local.yaml 本就是逐机可信配置面（与 commands.test/lint 同信任级），不新增信任边界。

试过但放弃：① CLI 内置常用探针库（启动冒烟/类名冲突 grep 等）——违反开放世界红线（内置清单永远追不上项目特有面，且天然带语言倾向），只配示例进 config-schema desc 不进运行时；② 探针产物缓存复用——渲染频率低（每评审一次），缓存引入失效复杂度不值；③ 允许探针声明 severity/FR 映射等元数据——YAGNI，第一版只要清单行，元数据等真实需求出现再加。
