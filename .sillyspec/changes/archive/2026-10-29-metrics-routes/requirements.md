---
author: flow-machine-draft
created_at: 2026-10-28T23:16:47.116Z
---
# 需求规格（Requirements）— 2026-10-29-metrics-routes

## 功能需求

### FR-01: metrics_routes 路由门（解析与执行）

local.yaml 配置了 `metrics_routes:` 段（`<name>.paths` 路径前缀集合 + `<name>.command` + 可选 `<name>.timeout_sec`，解析形态随 modules 块先例：inline flow / 子块展开均【必须】支持）时，收口实测【必须】以变更文件面（审计∪声明口径，与 SILLYSPEC_CHANGE_FILES 同源）∩ paths 做**路径段全等前缀**匹配路由：仅执行命中的 gate（每 gate 子进程环境注入 `SILLYSPEC_CHANGE_FILES`=该 gate 命中的变更文件子集）；任一命中 gate 非零退出或超时=门红计入 failed 阻断收口；零命中（有段但与变更面无交集）【必须】skipped 留痕不阻断；未配置整段【必须】现状零变化（缺省零回归）。前缀匹配【禁止】字符级误蹭（`frontend/` 不得命中 `frontend-v2/x`——按路径段边界匹配）；路径匹配前【必须】做 POSIX 归一（Windows 反斜杠输入与配置同归一）。gate 因环境缺二进制失败（CNF 特征）【必须】降档该 gate skipped 带修复指引（复用单命令门语义）。超时链：gate.timeout_sec > commands.metrics_timeout_sec > env SILLYSPEC_METRICS_TIMEOUT_MS（毫秒） > 缺省 180s。

#### 场景：命中执行

Given metrics_routes 配置 frontend(paths:[frontend/])与 jvm(paths:[backend/])两 gate / When 变更文件面为 [frontend/src/a.js] / Then 仅 frontend gate 执行（jvm 不执行不计超时预算），frontend gate 子进程环境 SILLYSPEC_CHANGE_FILES=frontend/src/a.js。

#### 场景：段全等前缀（不误蹭）

Given gate paths 含 frontend/ / When 变更文件为 frontend-v2/a.js / Then 该 gate 不命中（零交集 → 路由门整体 skipped 留痕）。

#### 场景：部分失败阻断

Given 两个 gate 均命中 / When 其一退出码非 0、另一退出码 0 / Then 路由门整体 failed（failed 计入 'metrics'），结果对象 gates 数组逐 gate 带 status/exitCode/outputTail，失败 gate 的输出尾部可定位。

#### 场景：零命中跳过

Given metrics_routes 段在场 / When 变更文件面与所有 gate 的 paths 零交集 / Then 路由门 skipped 留痕（reason 点明零命中），不阻断。

#### 场景：未配置零回归

Given local.yaml 无 metrics_routes 段 / Then 路由门不参与（null/缺席），收口行为与 2026-10-29-open-metrics-gate 归档态逐字一致。

#### 场景：per-gate 超时

Given gate timeout_sec: 1 且命令挂起 / When 执行超帽 / Then 该 gate failed（reason 注明超时）并入整体 failed。

#### 场景：gate 环境缺件降档

Given 命中 gate 的命令二进制缺失（CNF 特征）/ Then 该 gate skipped 带修复指引；全部命中 gate 均 CNF → 整体 skipped；存在非 CNF 的 failed gate → 整体 failed 不被 CNF 掩盖。

### FR-02: 与单命令门共存与证据归并

commands.metrics 单命令形态与 metrics_routes 路由形态【必须】可共存：单命令仍无条件执行（既有语义不变），路由门按命中执行；两形态结果【必须】均落 verify-runs 证据（persistLintResult section 'metrics' 同款链路，路由结果对象 kind: 'routes' + gates 数组带 gate 名区分）；任一形态 failed 时 failed 数组【必须】归并计入 'metrics' 一次（不因两形态同时红而重复计）；打印汇总面（printQuickTestLintGate / 质量扫描日志）【必须】呈现路由门的逐 gate 状态。

#### 场景：共存执行

Given 同时配置 commands.metrics 与 metrics_routes 且均命中/配置 / Then 两者先后执行、结果均在 gate.metrics 证据链可辨（单命令与 gates 数组并存），任一红即收口阻断且 failed 只含一个 'metrics'。

#### 场景：路由证据落盘

Given 路由门实跑（至少一 gate 执行）/ Then verify-runs 证据含 kind: 'routes'（或并入节）与逐 gate 的 name/status/exitCode。

### FR-03: 配置面注册与引导面同步

LOCAL_YAML_SCHEMA 【必须】注册 metrics_routes 段（parametrized 键 `metrics_routes.<name>.paths` / `.command` / `.timeout_sec`，随 modules 块先例形态，readers 指向消费函数）；引导面【必须】同步三处：local.yaml.example 注释态路由示例（含多语言 monorepo 形态）、AGENTS.md 模板规则 4 的 metrics 句补路由形态提及、路由门零命中/未配置的留痕文案提及路由形态可用。机制【禁止】枚举语言/框架（路径集合语言中立，规约 00）；【禁止】新增 npm 依赖。

#### 场景：schema 注册可见

Then LOCAL_YAML_SCHEMA 含 metrics_routes.<name>.* 三键（path/type/readers/desc/example 齐全），renderExample 含路由示例行。

#### 场景：AGENTS 模板提及路由

Then templates/agents-instruction.md 规则 4 的 metrics 语义句含 metrics_routes 路由形态提及。

### FR-04: 测试面与零依赖

【必须】新增自动化测试覆盖：路由命中（单 gate/多 gate）/ 零命中跳过 / 段全等前缀边界（frontend-v2 不误蹭、深路径子目录命中）/ 部分失败阻断与 gates 数组形状 / per-gate 超时 / gate CNF 降档（单 CNF 与全 CNF）/ 与单命令共存及 failed 归并 / 未配置零回归 / 路径 POSIX 归一（Windows 反斜杠）；既有面（quick-metrics-gate / quick-test-gate / config-schema / verify-quality-scan 相关）【必须】回归绿 + lint 绿；package.json dependencies 集合【必须】零变化。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-metrics-gate.test.mjs「路由命中：仅命中 gate 执行、SILLYSPEC_CHANGE_FILES=命中子集、未命中 gate 不跑」
FR-01: test/quick-metrics-gate.test.mjs「段全等前缀：frontend/ 不命中 frontend-v2/、深路径子目录命中」
FR-01: test/quick-metrics-gate.test.mjs「部分失败：任一 gate 非零 → 整体 failed、gates 数组逐 gate 形状与输出尾部」
FR-01: test/quick-metrics-gate.test.mjs「零命中跳过：有段无交集 → skipped 留痕；未配置 → 缺席零回归」
FR-01: test/quick-metrics-gate.test.mjs「per-gate 超时：gate timeout_sec 帽杀 → 该 gate failed 并入整体」
FR-01: test/quick-metrics-gate.test.mjs「gate CNF 降档：单 CNF 不掩盖真 failed、全 CNF → 整体 skipped」
FR-02: test/quick-metrics-gate.test.mjs「共存：单命令 + 路由同跑、证据并存、failed 归并 'metrics' 一次」
FR-02: test/quick-metrics-gate.test.mjs「路由证据落盘：kind routes + gates 数组带 gate 名」
FR-03: test/config-schema.test.mjs「metrics_routes.<name>.* 注册与 renderExample 路由示例带出」
FR-04: test/quick-metrics-gate.test.mjs「路径 POSIX 归一：Windows 反斜杠变更文件与配置路径均可命中」+ 上述全部 + 既有 quick-metrics-gate/quick-test-gate/config-schema 回归 + lint 绿
