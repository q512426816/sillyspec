---
author: t
created_at: 2026-11-21 23:21:35
generated_by: sillyspec-design-init
scale: small  # 单上下文可吞吐：CLI verify 门内聚面 ~5 文件，无 Wave 编排需求——flow start 收编
---

# 设计文档（Design）— 2026-11-21-verify-gate-scope-speed

## 背景

实测门（收口 flow done 时 CLI 亲自跑测试）是 SillySpec 的亮点语义（防作弊：结果必须真实），也是当前最严重的缺陷面：范围太大、经常跑半天。根因（代码实证）：

1. deps 命中口径是字符串 includes（src/verify-postcheck.js:1248），枢纽模块（引用方众多的底层文件）单点改动命中面冲到配额帽，枢纽符号收敛（src/deps-symbol-narrow.js）收集失败即 fail-open 回落全保留。
2. 配额帽 CAP=30（src/verify-postcheck.js:3329）只帽普通依赖，本变更自身测试豁免帽无限进面。
3. 跨仓仓恒跑 full npm test（src/verify-postcheck.js:2780），不参与动态子集。
4. 批次串行+每批 runner 启动税，单批 timeout 10 分钟（src/verify-postcheck.js:78）叠加成小时级。

用户裁决（D-001~D-007）：收口必过门收窄到「本变更测试∪直接依赖测试」，间接回归面（FR 层+枢纽扩散面）移出收口阻断归 pre-push 门；收窄为缺省行为，逃生阀回旧；交付范围纯分层门（提速项留后续）。

## 设计目标

1. 收口阻断面（缺省）= 本变更测试 ∪ 非枢纽依赖命中测试；间接面收口只披露不执行。
2. 阻断面构成可审计：披露行（自身 X / 依赖直接 Y / 间接 Z 归 pre-push / 总时长）+ ledger 落盘。
3. 时长护栏：阻断面超预算（沿用 TEST_TIMEOUT_MS 缺省 600s）转留痕不阻断+loud 披露；block 策略逃生回旧行为。
4. 全语言同口径：枢纽判定用语言无关的命中计数，不做符号级分流（Python 仓同样生效）。
5. 命中算法/批次调度/缓存指纹三面零改动（D-005 约束）；「只可能多跑不漏」契约在阻断面内保持。

## 非目标

- 不做命中口径升级（AST/真 import 图）——留后续变更（D-005）。
- 不做批次并行、runner 并发 flag 缺省注入、缓存粒度下探（D-005）。
- 不动 pre-push 执行面（间接面 ⊂ 既有 pre-push 全量套件门，自然承接，零改动）。
- 不动跨仓仓测试策略（跨仓恒 full 的治理留后续）。
- 不新增第二套时长配置键（预算沿用 TEST_TIMEOUT_MS，D-003）。

## 拆分判断

单上下文可吞吐：改动集中在 verify-postcheck.js 面组装段+config-schema 两键+专项测试，~5 文件无并行簇，不拆分不批量。

## 总体方案

### Phase 1：面归因出参（命中逻辑零改动）

`discoverModuleDependentTests`（src/verify-postcheck.js:1181）命中匹配逐字不动，新增 opt-in 归因出参：调用时传 `withAttribution: true` 返回 `{ files, attribution, hitCountBySrc }`（files=现有数组语义逐字一致；attribution=Map 测试文件→命中源列表；hitCountBySrc=Map 源文件→命中测试数）；不传时返回数组（逐字现状，三个既有消费点零变化）。两条既有路径（无参字符串路径、symMap 两阶段路径）都产出归因。

### Phase 2：阻断面/披露面拆分（runVerifyTestCheck 组装段）

- 枢纽判定 = `hitCountBySrc.get(src) > hubMinDependents`（复用 DEPS_SYMBOL_NARROW_HUB_MIN，src/deps-symbol-narrow.js 既有常量，语言无关）。
- **阻断面** = changedFiles 中的测试文件 ∪ 仅命中非枢纽源的依赖测试。
- **间接面** = 命中任一枢纽源的依赖测试 ∪ FR 关联回归层（即使 fr_regress_cap 开启也只进披露，D-001/D-004 统一）。
- 间接面收口不执行（D-004）：披露行列出构成与去向；清单落 ledger（供 pre-push 对账）。
- 逃生阀（D-006）：local.yaml `verify: gate_scope: lean`（缺省）`| legacy`；legacy 态三源全阻断面逐字对齐现状行为。
- runModuleSubset 收窄后的阻断面经既有 changedFiles/frPre 入参传入（执行层零改动）；quick 存量门（src/index.js:1075）不消费归因保持现状（quick 已退役，零回归）。

### Phase 3：时长护栏（阻断面执行外层）

- 预算 = TEST_TIMEOUT_MS（缺省 600s，不新增平行键，D-003）。
- 超预算（timeout 到期且 `isTimeoutOnlyTestFailure` 判定命中，src/verify-postcheck.js:1756）→ 缺省策略 `verify: timeout_policy: degrade`：结果改判 `degraded-timeout`（不阻断收口），loud 披露「阻断面超预算未跑完，转 pre-push/CI 门」+ ledger 留痕；`block` 策略回旧行为（超时=失败阻断）。
- 护栏与 gate_scope 正交（组合矩阵见兼容策略）。

### Phase 4：schema + 测试

- src/config-schema.js 新增 `verify.gate_scope` / `verify.timeout_policy` 两键 schema（缺省值+文案）。
- 专项测试：面归因正确性、枢纽/非枢纽切线分类、披露行构成、gate_scope 三态（无键收窄/legacy 全量/坏值 fail 行为）、护栏 degrade/block 两态、既有消费点 opt-in 零回归。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-postcheck.js | discoverModuleDependentTests 新增 withAttribution 归因出参（命中逻辑逐字不动）；runModuleSubset/runVerifyTestCheck 组装段阻断面/间接面拆分（lean/legacy 两态）+披露行+ledger indirectFace；纯超时护栏 ledger degradedTimeout 留痕+loud 披露 |
| 修改 | src/run/quick-audit.js | 纯超时降档段（:673 先例）接 timeout_policy：degrade（缺省）=现状降档+留痕口径文案补「转 pre-push/CI 门」；block=超时计 failed 硬拦（收口门消费面——读代码阶段实证的消费点，Phase 3 落点修正） |
| 修改 | src/config-schema.js | 新增 verify.gate_scope / verify.timeout_policy 两键 schema（producer=local.yaml 解析 → config-schema 校验归一 → consumer=verify-postcheck.js 组装段/quick-audit.js 护栏判定段读取） |
| 新增 | NEW:test/verify-gate-lean-scope.test.mjs | 分层门专项：归因/切线分类/披露行/两键三态/护栏两态/opt-in 零回归 |

## 接口定义

本变更接口面：0 端点（无接口变更）。

内部签名（非对外端点）：

```js
// discoverModuleDependentTests 新增可选 opts.withAttribution（缺省 false）
// 缺省返回 string[]（逐字现状）；withAttribution: true 返回：
// { files: string[], attribution: Map<string, string[]>, hitCountBySrc: Map<string, number> }
discoverModuleDependentTests({ cwd, changedFiles, coveredCommands, touchedExportSymbols, hubMinDependents, withAttribution = false })
```

配置键语义（producer→consumer 数据流见文件变更清单）：

```yaml
verify:
  gate_scope: lean        # 缺省；legacy = 三源全阻断面（逐字对齐旧行为）
  timeout_policy: degrade # 缺省；block = 超时判失败阻断（旧行为）
```

## 生命周期契约表

生命周期契约：无/N/A（本变更为 CLI 门禁判定逻辑，不涉及 session/lease/agent_run/daemon 等生命周期状态迁移）。

## 数据模型

无 schema 变更。ledger（.sillyspec/.runtime/test-rerun-<change>.json）新增可选字段 `indirectFace`（间接面清单）与 `degradedTimeout`（护栏降级标记），消费方=pre-push 对账与收口披露，缺字段按现状语义处理（向后兼容）。

## 兼容策略（brownfield 必填）

- 未配置新键：gate_scope 缺省 lean=收窄生效（这是本变更目的性行为变化，非兼容破坏——收口披露行首次出现时带说明；D-006 用户裁决）。
- 回退路径：`verify: gate_scope: legacy` + `timeout_policy: block` 组合=逐字对齐旧行为（阻断面构成、超时语义均还原）。
- 不改变的 API/表结构：discoverModuleDependentTests 缺省返回形态、批次执行调度、缓存指纹、pre-push 执行面、ledger 既有字段语义全部不动。
- gate_scope × timeout_policy × test_rerun 组合矩阵：legacy+block=完全旧行为；legacy+degrade=旧阻断面+新护栏（披露行说明护栏生效）；lean+degrade=本变更缺省目标态；lean+block=收窄面+超时阻断旧行为。test_rerun 增量重跑三态均正交（增量输入面=前轮失败批∪修复 delta，切线分类在其上照常执行）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | hub 阈值两侧抖动：命中数在阈值附近横跳的文件两轮收口切线不稳 | P1 | 接受：命中数在同变更内只随变更文件集变化（稳定）；披露行带 hub 命中数可观测；跨轮漂移=面构成披露可追溯 |
| R-02 | 枢纽测试移出阻断后枢纽行为破坏延迟到 pre-push 才发现 | P1 | 接受（D-004 用户裁决）：pre-push 全量门兜底+披露行显式标注「间接面未跑归 pre-push」防误读全绿 |
| R-03 | degrade 护栏降级通道被滥用为「跳过慢测试」 | P1 | loud 披露（超时未完成字样）+ledger degradedTimeout 留痕+timeout_policy: block 可切回阻断+pre-push 全量兜底 |
| R-04 | 缺省行为变化影响所有存量项目 | P1 | 版本 note+收口披露行首现说明+legacy 逃生阀（D-006）；config-schema 文案写明两态语义 |
| R-05 | timeout 改判 degraded 掩盖测试 hang 死（假绿风险） | P2 | 降级必须带「超时未完成」+ledger 留痕+pre-push 全量兜底；isTimeoutOnlyTestFailure 既有判定复用不新造口径 |
| R-06 | 无长驻进程/外部资源，生命周期面不适用 | P2 | 护栏判定与披露均为同步逻辑，无后台任务/句柄持有——显式留痕 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 设计目标 1/2、Phase 2 阻断面构成 | 已覆盖 |
| D-002@v1 | 设计目标 2/3、Phase 3 护栏+披露、FR-03/FR-04 | 已覆盖 |
| D-003@v1 | Phase 3 预算缺省 TEST_TIMEOUT_MS、非目标第 5 条 | 已覆盖 |
| D-004@v1 | Phase 2 间接面不执行+披露去向、Phase 4 pre-push 零改动 | 已覆盖 |
| D-005@v1 | 非目标 1/2/3/4、Phase 1 命中逻辑零改动声明 | 已覆盖 |
| D-006@v1 | Phase 2 gate_scope 键、兼容策略回退路径 | 已覆盖 |
| D-007@v1 | Phase 1/2 枢纽分层切线全量落地 | 已覆盖 |
| D-008@v1 | rejected 防复潮（紧度切线不采用——Python 回落退化） | 已覆盖（否决留痕） |
| D-009@v1 | rejected 防复潮（规模帽切线/融合不采用——切线任意+兜底已由护栏承接） | 已覆盖（否决留痕） |

多裁定组合推演：D-006（gate_scope）×D-002（timeout_policy）×test_rerun 三态均正交，组合矩阵已在兼容策略节逐格列出，无死锁格，无组合约束残留。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=small）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-009 全列，覆盖点逐行核对）
- [x] 生命周期豁免短语紧邻「生命周期契约」（无/N/A 形态）
- [x] UI 原型分级：跳过——纯 CLI 门禁逻辑与输出文案，无任何界面变化（纯后端/CLI 面）
- [x] 不确定的问题标注「⚠️ 自审存疑」：无存疑项——R-01/R-02 为已显式接受的已知取舍（有应对与观测面）
