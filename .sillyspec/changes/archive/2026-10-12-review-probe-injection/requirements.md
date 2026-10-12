---
author: flow-machine-draft
created_at: 2026-10-12T13:04:18.145Z
---
# 需求规格（Requirements）— 2026-10-12-review-probe-injection

## 功能需求

### FR-01: local.yaml 新段 review_probes：条目 {id: 自由文本标识, scope: thin|thick|all 缺省 all, lines: 自由文本清单行数组, command: 可选命令串（stdout 追加清单行）}——零内容枚举、零语言/框架绑定（内容全开放，命令任意 shell）；缺省/未配置=两面任务书与现状逐字一致（零回归）

- local.yaml **必须**支持顶层段 `review_probes`，条目结构为：`id`（自由文本标识，非空）、`scope`（thin | thick | all 三选一，缺省 all——这是 CLI 自有的两个任务书面，非内容枚举）、`lines`（自由文本清单行数组，与 `command` 至少其一非空）、`command`（可选命令串，stdout 非空行追加为清单行）。内容**禁止**任何枚举约束：清单行写什么、命令跑什么完全开放（不绑定语言/框架/生态）。未配置该段或段为空时，两面任务书输出**必须**与现状逐字一致（零回归）。

#### 场景：未配置零注入

Given local.yaml 无 review_probes 段；When 渲染 thin 任务书与 thick 任务书；Then 输出与改动前逐字一致（无探针段）。

### FR-02: 新模块 src/review-probes.js：解析+装载+行解析纯函数（校验容错 fail-soft：单条目坏跳过并告警，不拦流程）；容量帽（条目≤16、每条行≤12、单行≤300 字符、命令超时 10s、命令输出≤2KB/≤20 行，超帽截断并留痕）

- **必须**新增 src/review-probes.js：`parseReviewProbes(raw)`（校验+归一，坏条目跳过并收集告警，不抛不拦）、`loadReviewProbes(specBase)`（读 local.yaml 段，IO 容错缺省空）、`resolveProbeLines({ probes, scope, runCommand })`（scope 过滤 + lines/command 合并出清单行数组，附 provenance 溢出信息）。容量帽**必须**执行：条目 ≤16、每条 lines ≤12 行、单行 ≤300 字符、command 超时 10s、command 输出 ≤2KB 且 ≤20 行——超帽截断并在返回值留痕（不在任务书静默吞）。command 失败/超时**必须** fail-soft（跳过该命令行源，其余探针照常），不阻断任务书渲染。

#### 场景：坏条目 fail-soft

Given review_probes 含 1 条坏条目（如缺 id）+ 2 条好条目；When loadReviewProbes；Then 返回 2 条好条目 + 1 条告警，零异常抛出。

### FR-03: 注入面一：flow-review.js renderReviewerTaskbook 增可选 probeLines 参数，在【检查单】后渲染【项目评审探针】段（flow.js 调用点接 local.yaml 装配）

- `renderReviewerTaskbook({ change, changeDir, head, probeLines })` **必须**接受可选 probeLines（数组）；非空时在【检查单】段之后渲染独立段【项目评审探针（local.yaml review_probes 注入——CLI 单源生产，项目特有面必查）】，逐行列出并要求逐条作答；缺省/空数组时输出与现状逐字一致。flow.js 的调用点（renderReviewerTaskbook 处）**必须**接 `resolveProbeLines({ probes: loadReviewProbes(specBase), scope: 'thin' })`。

#### 场景：thin 注入

Given local.yaml 配 1 条 scope:thin 探针（2 行）；When flow done 触发评审任务书渲染；Then 任务书含【项目评审探针】段且含该 2 行；未配置时无该段。

### FR-04: 注口面二：review-dispatch.js buildReviewerTaskBook 增可选 probeLines 参数，在审查清单后渲染同款段（两处调用点接装配）

- `buildReviewerTaskBook({ stage, changeDir, reviewRunId, channelPriority, probeLines })` **必须**接受可选 probeLines；非空时在「## 审查清单」之后渲染「## 项目评审探针（local.yaml 注入）」同款段（逐条 pass/gap/fail 口径与清单一致）；缺省/空数组零变化。review-dispatch.js 两处调用点（真实派发与 shadow 派发）**必须**接 `resolveProbeLines({ probes: loadReviewProbes(specBase), scope: 'thick' })`（调用点已有 specBase 在域）。

#### 场景：thick 注入

Given 配 1 条 scope:thick 探针；When buildReviewerTaskBook({ stage:'brainstorm', probeLines });Then workerPrompt 含项目评审探针段；probeLines 缺省时 workerPrompt 与现状逐字一致。

### FR-05: config-schema.js 登记 review_probes 段（读键/示例/说明，遵循既有条目格式）

- config-schema.js **必须**登记 `review_probes` 段条目（path/type/readers/desc/example 齐全，desc 说明开放世界定位：内容零枚举、语言/框架无关、CLI 只管装配）。

#### 场景：登记在场

When 读 config-schema.js；Then 存在 review_probes 条目且 readers 指向 src/review-probes.js。

### FR-06: 新增单测：解析校验/scope 过滤/容量帽/命令 fail-soft 与超时/thin 任务书注入段在场与未配置零注入/thick 任务书同款

- **必须**新增 test/review-probes.test.mjs 覆盖：parseReviewProbes 校验与 fail-soft、scope 过滤（thin/thick/all）、容量帽截断留痕、command 失败与超时 fail-soft、renderReviewerTaskbook 注入段在场/未配置零注入、buildReviewerTaskBook 同款；全绿。

#### 场景：主路径

When `node --test test/review-probes.test.mjs test/flow-review.test.mjs`；Then 全部 pass。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/review-probes.test.mjs「未配置零注入（thin/thick 双面与现状逐字一致）」
FR-02: test/review-probes.test.mjs「解析校验 fail-soft + 容量帽截断留痕 + 命令超时/失败 fail-soft」
FR-03: test/review-probes.test.mjs「renderReviewerTaskbook 注入段在场/缺省零变化」
FR-04: test/review-probes.test.mjs「buildReviewerTaskBook 注入段在场/缺省零变化」
FR-05: test/review-probes.test.mjs「config-schema 登记在场」
FR-06: test/review-probes.test.mjs「全量用例 + flow-review 回归」
