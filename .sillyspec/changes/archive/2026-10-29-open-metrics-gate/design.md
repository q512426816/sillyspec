---
author: flow-machine-draft
created_at: 2026-10-28T16:03:46.900Z
---
# 设计记录（Design Record）— 2026-10-29-open-metrics-gate

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

采纳 ub-mode（Uncle Bob 2026-10-25 agent 技能仓）两个核心价值进本仓：**确定性质量门**与**测试有效性纪律**。思路是「lint 门的第三个 sibling」——不造新机制，把 metrics 做成与 commands.lint 逐条同构的开放命令门：verify-postcheck.js 新增 `runVerifyMetricsCheck`（对齐 runVerifyLintCheck 的提取/执行/超时/降档语义），quick-audit.js 的 runQuickTestLintGate 在 lint 之后同 cwd/specBase（隔离快照内）执行，非零退出计入 failed 阻断收口；结果经 persistLintResult 同款合并语义落 verify-runs 证据（kind: 'metrics'）。厚道 verify 质量扫描（verify-quality-scan.js）同款挂载，两条道语义一致。配置面完全复用 lint 的 fail-open 哲学：未配置/unavailable → skipped 留痕不阻断，缺省零成本零回归。命令内容开放——CLI 只负责「隔离快照内执行 + 非零=红 + 证据落盘」，填 crapper/dryer/自写脚本均可（工具中立规约 00）。

第二面：ub-mode「Test Behavior, Not Implementation」（若每个函数返回空测试仍全绿则测试无效）与「Fix Root Causes」（只藏崩溃的 guard 不是修复）两条纪律转写进收口评审任务书检查单（renderReviewerTaskbook 新增一条判据项）与测试厚度 advisory（buildTestSurfaceAdvisory 附一句）——评审从「测试存在且绿」升级到「测试有效」。选这个方案因为挂载点全是既有机制（lint 门同构、检查单数据驱动、advisory 既有文案），改动面最小且每个环节有既有测试锚点。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `local.yaml` 新键：`commands.metrics`（string, optional）、`commands.metrics_timeout_sec`（number, optional）——注册进 LOCAL_YAML_SCHEMA commands 段，renderExample 与 {LOCAL_COMMANDS} 注入经既有机制自动带出。
- `src/verify-postcheck.js` 新增 export `runVerifyMetricsCheck({ cwd, specBase, timeoutMs, changeFiles })` → `{ status: 'passed'|'failed'|'skipped', command, exitCode, durationMs, outputTail, reason }`（签名与返回形态对齐 runVerifyLintCheck，增可选 changeFiles；执行时经 execSync env 注入 SILLYSPEC_CHANGE_FILES——POSIX 相对路径换行分隔，大仓增量门只扫变更面；无 tally、无 failureFiles——指标输出无标准路径形态，不做归属鉴定）。
- `src/run/quick-audit.js` runQuickTestLintGate 返回对象新增可选字段 `metrics`；failed 数组可含 `'metrics'`；printQuickTestLintGate 汇总行加 metrics 状态。gate 早退路径（env skip/空清单/纯 doc）metrics 为 null——与 test/lint 同款短路。
- `src/run/verify-quality-scan.js` 质量扫描新增 metrics 实测步（lint 同款 noAI 语义，未配置/unavailable → 跳过留痕）。
- `src/flow-review.js` renderReviewerTaskbook 检查单新增一条判据项（纯文案，无签名变化）；`src/run/quick-audit.js` buildTestSurfaceAdvisory 返回文案追加一句（负例返回 null 不变）。
- 引导面三处：`templates/agents-instruction.md` 核心规则 4 并列 metrics 语义句（经 init 版本机制下发）；runVerifyMetricsCheck 的 skipped reason 自带一句配置引导；local.yaml.example 注释（renderExample desc 自动带出，见上）。
- verify-runs 证据新增 kind: 'metrics' 结果件（复用 persistLintResult 的合并/独立落盘语义）。
- 无对外 CLI 命令、无文件格式破坏性变化；package.json 零依赖变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

metrics 结果是收口时点的执行快照，不参与状态机推进（无事件流语义），乱序不存在。超时（最迟形态）= failed 拦门而非静默丢弃。收口中断重跑断点续：metrics 门幂等重执行，结果件走 verify-runs/<时间戳> 新目录，无乱序合并问题（与 test/lint 同款）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

metrics 在门禁隔离快照内执行（HEAD + 本会话文件 overlay），不触碰主仓工作区——并行会话脏文件不污染（继承既有快照语义）。多会话并行各自快照、各自 verify-runs 时间戳目录，无共享写面。不新建 tally 文件（lint 的 verify-lint-tally 是共享写面，metrics 首版不建——观察期数据无消费方，省一个并发面）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

收口中途中断 → 快照 cleanup 走既有 finally；FAIL 时证据回拷（copySnapshotVerifyRuns）对 metrics 结果件同样生效（verify-runs 目录整拷）。用户命令自身若有状态（如写报告文件）属用户命令责任，CLI 侧超时护栏兜底；worktree 会话跳快照直接实测（shouldSkipGateSnapshotForWorktree 既有判定，自动继承）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

命令只来源于本仓 `.sillyspec/local.yaml`（信任边界与 lint/test 同源）；local.yaml 系 gitignored 仓级配置，跨仓/多实例天然不串台；跨仓冻结面（JSON-only）收口的交付 diff 在 change-patch.json，metrics 门只对主仓执行，不涉跨仓执行语义。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：存量仓首配即红——指标工具对全仓历史代码报红，配置者第一次启用就被拦，治理成本突袭。缓解：desc 写明「通过标准由命令自身定义——建议命令只扫变更面/自带阈值」，且不配置零影响；这是声明的采用边界（用户渐进采用，CLI 不替人清存量债）。

放弃的方案：① 绑定 crapper/dryer/mutator 内置集成——违背工具中立纪律且引入新依赖，改开放命令门；② metrics 做 lint 同款 ownership triage（存量债降级 advisory）——依赖「失败输出含文件路径」提取前提，指标工具输出形态千差万别（分数表/JSON/正文），归属鉴定不可靠，误判比不判更糟，范围控制责任交给用户命令；③ 复用 commands.lint 塞复合命令（`lint && crap-check`）——超时语义混用、证据面不分 kind 无法对账、存量 lint 配置被动改变行为；④ metrics 失败 advisory 不阻断（学 lint 观察期先例）——lint 当年观察期是因外部数据未足，而 metrics 的非零退出语义由用户命令自定义（用户写 `crap-check --fail-over 10 src` 就是他的标准），首版即硬门才配得上「确定性质量门」的采纳初衷，且 fail-open 缺省已保证不配置零影响。

已知取舍：超时=failed 对慢工具会假红——desc 明示慢工具提帽（metrics_timeout_sec）或放 pre-push/CI 层，不在每变更收口跑。
