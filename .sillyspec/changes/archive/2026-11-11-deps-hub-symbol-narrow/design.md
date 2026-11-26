---
author: flow-machine-draft
created_at: 2026-11-11T04:55:01.365Z
---
# 设计记录（Design Record）— 2026-11-11-deps-hub-symbol-narrow

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

现行 import 依赖回归面（`discoverModuleDependentTests`，src/verify-postcheck.js:1180）按**模块路径子串**匹配：变更枢纽模块任一导出，全部引用该路径的测试入面（「只可能多跑不漏」——2026-09-26-dynamic-test-inference 契约），枢纽模块（依赖方众多的 mcp_tools 类）单符号改动拖全量面。本变更加一层**符号收敛**：从变更 diff 提取「触达导出符号集」，模块路径命中且命名导入不含任何触达符号的依赖测试出面。收敛只在枢纽面激活（模块路径命中数 > 8，常量 `DEPS_SYMBOL_NARROW_HUB_MIN`，无配置键——默认零配置可用纪律）；所有不确定形态 fail-open 保留（多跑侧不变量只在「命名导入且全不触达」这一可判定形态上放开，该放开正是本变更的目的、用户显式决策）。语言面：JS/TS 适配器先行；Python 等其他语言无符号信息 → 整体回落模块路径匹配（不锁死语言，新增语言加提取适配即可）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- **新增 `src/deps-symbol-narrow.js`**（叶子模块，只依赖 node 内建，无反向依赖）：
  - `extractTouchedExports(content, diffText)` 纯函数：解析当前内容的 export 声明 span（`export function/class/const/let/var/interface/type/enum NAME` + `export { a, b }` 列表，字符串感知花括号配对定 span），与 diff 的新侧 hunk 行 span 求交集 ∪ 差异行（+/− 行）上的导出名 `\b` 词法命中 → `string[]`。
  - `namedImportEvidence(code, srcRel, symbols)` 纯函数 → `'hit' | 'miss' | 'unknown'`：扫描剥注释后代码中 source 含 srcRel 的 import/require 解构语句；命名清单含任一触达符号 → hit；存在无命名清单的引用形态（default/star/动态 import/require 整体赋值）或无 import 语句 → unknown；全部命名且均不触达 → miss。
  - `collectTouchedExportSymbols({ cwd, changeName, specBase, changedFiles, gitFn })`：anchor 取 `.sillyspec/changes/<change>/flow-state.yaml` 的 `baseline_commit`（宽松行匹配；缺失 → 仅脏面），diff = `git diff <anchor>..HEAD -- <file>` ∪ `git diff HEAD -- <file>`（untracked → 全文件视为全符号触达）；逐文件 `extractTouchedExports`，空集不进结果。**任何失败返回 null**（fail-soft，调用方回落现状）。
- **修改 `discoverModuleDependentTests`（src/verify-postcheck.js）**：新可选参数 `touchedExportSymbols`（Object<posixPath, string[]>，缺省 null）与 `hubMinDependents`（缺省 8，测试注入用）。判定改两阶段：先按现行口径算「模块路径命中」与每文件的命中测试数；带符号且命中数 > 阈值的文件，其命中测试经 `namedImportEvidence` 二次裁决——`miss` 出面、`hit`/`unknown` 保留。**参数缺省时判定路径与现状逐字一致。**
- **三个调用点接线（fail-soft try/catch，收集失败静默回落现状）**：flow done 收口动态子集（verify-postcheck.js:2490）、`runModuleSubset` deps 面（verify-postcheck.js:3811）、quick 任务开工受影响测试族前移（index.js:1078）——各加一次 `collectTouchedExportSymbols` 并传参。
- 对外命令面/配置面/输出格式：**无变化**（无新配置键、无新命令；收口日志的 deps 计数自然变小）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   不适用——纯静态同步计算（读文件 + git diff），无事件流；diff 文本按调用时点工作区/HEAD 现态取，无时序假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   本设计**只读**（git diff、源文件、flow-state.yaml），不写盘；并行会话对同一文件的未提交改动会进入 diff 文本 → 触达符号集偏大 → 收敛变弱（多跑侧），安全方向；收口执行期快照只隔离执行不改文件面（faceOverride 既有口径），符号计算与文件面同源不竞争。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   无持久状态，每轮收口/任务开工全量重算——中断重入幂等；增量重跑档（test-incremental-rerun）以增量输入重算三源，符号收敛同样按当轮变更面计算，无跨轮残留。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   git 操作固定在产生 changedFiles 的同一仓（调用方 cwd——closeout 权威面在主仓 cwd 算好传入，快照仅执行隔离）；平台双根模式下 flow-state.yaml 按 specBase 优先 + cwd/.sillyspec 兜底双候选读（与 resolveMainChangedFiles 同口径）；worktree 形态下符号 diff 与文件面同 gitDir，不跨仓串台。anchor 解析失败 → 仅脏面 → 无脏面则无符号 → 整体回落，不误收窄他变更的符号。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **最大风险：收敛漏测**——「命名导入全不触达」的测试被出面后，若被触达符号的行为变化经模块内其他导出间接可见，该测试本可兜底。这是本变更的**显式设计取舍**（用户决策：回归面收敛优先），非缺陷；缓解三层：只放开这一个可判定形态（其余全 fail-open）、只在枢纽面激活（>8 命中才收敛）、Python/异常形态零收敛。评审/实测若证取舍过宽，回退路径=调高常量或不传参数（缺省零收敛，单点回退）。
- **试过但放弃①**：在 discoverModuleDependentTests 内部直接跑 git 提符号——函数失去纯性、单测被迫上 git fixture、且收口执行期快照 cwd 未必有同形 git 面；改为符号集参数注入 + 独立收集器（调用方决定窗口），纯函数可测。
- **试过但放弃②**：复用 resolveMainChangedFiles 的 anchor（merge-base 化守卫）——该逻辑为 verify-postcheck 私有，新模块 import verify-postcheck 会成环（后者要 import 前者纯函数）；退 flow-state baseline_commit 直锚。方向安全：anchor 偏旧只会放大符号集（多跑侧）；merge-base 收窄属优化不属正确性，留后续。
- **试过但放弃③**：全模块通用收敛（无枢纽阈值）——小模块行为跟着变，既有 fixture 测试面与全部既有调用方暴露在不必要的行为变化下；阈值收紧到痛点面（枢纽），既有面零回归（FR-04）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | src/deps-symbol-narrow.js | 纯函数（extractTouchedExports/namedImportEvidence）+ 收集器 collectTouchedExportSymbols |
| 修改 | src/verify-postcheck.js | discoverModuleDependentTests 加 touchedExportSymbols/hubMinDependents 参数与两阶段判定；closeout 与 runModuleSubset 两调用点接线 |
| 修改 | src/index.js | task-start 受影响测试族前移调用点接线 |
| 新增 | test/deps-symbol-narrow.test.mjs | FR-01~05 fixture 测试 |
