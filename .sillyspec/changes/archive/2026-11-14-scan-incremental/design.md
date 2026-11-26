---
author: t
created_at: 2026-11-14 22:09:09
generated_by: sillyspec-design-init
scale: large
---

<!-- scale=large 依据（Step 8 精判）：①用户任务书原话显式要求完整流程（「用 SillySpec 完整流程（brainstorm 起步）立项并实现」「从 brainstorm 开始（这是新功能非小修）」）——独立成立判据；②多阶段治理面：guard/hook 机制改动（worktree-guard 白名单分支）+ 跨仓实测验收（multi-agent-platform）需要 plan/execute/verify 分阶段治理与独立验证阶段。Wave 面：task-01（适配层）与 task-02（计划层）在 mock 注入解耦下可真并行开发；task-04（facts scope）与 task-05（文档同步）可与 task-03 后半并行——并行收益真实但非主要依据。 -->

# 设计文档（Design）— 2026-11-14-scan-incremental

## 背景

sillyspec 的 scan 文档靠 agent 通读代码库生成，成本高 → 不常重扫 → 文档腐烂。实证：multi-agent-platform 仓的 scan 基线（ba87eec）已落后源码 5352 commit / 143 天，CLI 每次警告"旧快照可能未收录新模块"；本仓（sillyspec 狗粮仓）自身 scan 文档目录为空——从未跑过全量 scan。scan-diff / scan-staleness / scan-refresh / scan-postcheck 约 1300 行都在治"过时"的**标**（引用级定点修补、漂移提示、刷新闭环），根因是全量重扫太贵。

CodeGraph 1.6.2（@colbymchenry/codegraph，全局 npm，MIT）已上线：本地代码知识索引（multi-agent-platform 实测 7.1s 索引 4067 文件、75k 符号、233k 边）。本变更为 scan 增加增量模式：借索引把"全量重扫"变成"按变化补扫"，只重写受影响模块的产物，解开腐烂循环。

## 设计目标

1. `sillyspec run scan` 在索引可用仓自动走增量路径（方案 A，D-003）：秒级探测+计划 → 只重生成受影响模块的模块卡与映射增量、跳过结构未变篇章；耗时与 token 相比全量显著下降（multi-agent-platform 实测给数）。探测在 scan 命令启动入口层执行，quick/standard/deep 三档统一生效；例外回退：受影响文档含 `scan_depth: quick` → 全量（浅文档应全量升级，与 refresh quick-depth 硬门同语义）。
2. `_module-map` 对账：索引全量文件 vs 模块 paths 覆盖 → 未归属文件清单报告，暴露映射盲区。
3. 基线推进兼容：增量完成后基线记录推进至 HEAD，既有 staleness 语义（per-doc source_commit + 落后最多聚合，src/scan-staleness.js:49-53）保持兼容——增量后 staleness 判定 fresh。
4. 降级零回归（D-002）：未装 CodeGraph / 无索引 / 探测失败 / 超时 → 自动回退现行全量 scan，行为与现行版本一致，绝不阻断。

## 非目标

- **不改动 scan-refresh**（命令面/行为/guard 协议均不动）——refresh 是引用级定点修补通道，与增量 scan（模块级重生成）互补不互替（D-001）。
- **不改 scan 文档契约与消费方**：7 份文档结构、frontmatter 字段、docs-check 校验、modules rebuild、进度库按路径读取——全部原样。
- **不做模块归属语义自动化**：索引只供结构事实（文件清单/依赖边/受影响测试），模块划分仍按 `_module-map` 既有规则，新文件归属由 agent 补扫时判断（回应知识 D-unmapped-150「枚举开放世界是错误方向」）。
- **不引入 codegraph 依赖安装/索引维护编排**（init/index/sync 的完整生命周期管理不在本变更——增量判定只做只读探测，索引的建立与维护是用户/平台的既有职责）。
- 不做 scan 文档的内容质量改进（成文质量仍由 workflow check + postcheck 机器校验把关）。

## 拆分判断

单一功能域（scan 增量化），不拆分；非批量模式（无模板×数据形态）。跨仓验证（sillyspec 实现 + multi-agent-platform 实测）是验收面不是拆分理由——代码只落 sillyspec 仓。

## 总体方案

四个 Phase（实施顺序即依赖顺序）：

### Phase 1 — codegraph 适配层（NEW:src/scan-codegraph.js）

CodeGraph CLI 统一封装，纯 CLI 层零 daemon 依赖：

- **命令解析**：`resolveCodegraphCommand()` 返回 `{command, baseArgs}`——Windows 下 npm 全局 `.cmd` shim 先解析出真实 node 入口再 `execFile`（防 ENOENT：execFile 无 PATHEXT 解析 + Node≥18.20 拒无 shell 调 `.cmd`，daemon 参考 D-013 实证坑）；非 Windows 直接 `execFile('codegraph', args)`。全程参数数组，禁止 shell 拼接（本仓惯例，src/worktree-deps.js:260 注释）。
- **统一 env**：`CODEGRAPH_DIR=.sillyspec-codegraph`（单段目录名，cwd=root 执行）+ `CODEGRAPH_TELEMETRY=0` + `DO_NOT_TRACK=1`。
- **分级超时**（对齐 daemon 参考实现 src 参考：sillyhub-daemon/src/codegraph/cli.ts:48-60）：version/status 5s、query 10s、affected 15s、sync 60s。1.6.2 发布包无 `--local-only`/`--no-telemetry` 参数（已实测），禁止携带。
- **探测函数** `probeCodegraph(root)` → `{available, reason, status?}` 三态：命令不存在（ENOENT）/ 未 init（`initialized:false`）/ 索引未完成（`index.state !== 'complete'`）/ 超时 / 输出不可解析 → `available:false` + 原因；全程 fail-soft，任何异常返回不可用，绝不抛出阻断。
- **形状映射**（2026-11-14 本机实测 1.6.2，防御式解析——字段缺失降级不 throw）：
  - `status <root> -j` → `{initialized, fileCount, pendingChanges:{added,modified,removed}, index:{state, reindexRecommended}}`
  - `files -p <root> --format flat -j` → `[{path, language, nodeCount, size}]`（path=仓库相对 POSIX）
  - `affected -p <root> -j <files...>` → `{changedFiles[], affectedTests[]}`（受影响测试截断 200，truncated 标记）

### Phase 2 — 增量计划计算层（NEW:src/scan-incremental.js）

纯计算层 `computeIncrementalPlan({projectRoot, specBase, projectName})`，秒级预算（status 一次 + git diff 一次 + 形状映射）：

1. **基线锚**：复用 `computeScanDiff` 的聚合锚语义（per-doc source_commit 落后最多者，src/scan-diff.js:370-398）。无基线（绿地）→ 全量。
2. **变化文件集**：`git diff <base>..HEAD --name-status --find-renames`（`parseNameStatus` 单源复用，src/scan-diff.js:447-464）。
3. **归属**：`matchFilesToModules` 单源复用（src/docs-debt.js）→ 受影响模块集 + unmapped 新文件。
4. **codegraph 补强**（`probeCodegraph.available` 时）：unmapped 新文件的 import 归属**线索**（`query` 按文件名查符号 → 所属文件 → 反查其模块归属，仅作 agent 判断的输入不作结论）；`affected` 受影响测试清单（截断 200，注入给重生成子代理作回归提示）。
5. **`_module-map` 对账**：`files` flat 全量清单（**显式排除清单**：`estimateSourceSize` skipDirs 同源集合 + `.sillyspec-codegraph/` 索引目录自身——skipDirs 是精确匹配集合不含该名，Grill P1-2；排除常量定义在 scan-incremental.js 单点，供对账/变化集过滤共用）vs 全模块 paths 覆盖集 → 未归属文件清单，落盘 `docs/<project>/scan/_module-map-audit.md`（`_` 前缀＝非基线载体；staleness 全 .md 收集会读到它但 max 口径无实害——它本次生成即带 source_commit=HEAD，是全集里最新的，Grill 确认）。**索引目录隔离**：探测发现 `.sillyspec-codegraph/` 存在但未进 `.gitignore` → warnings 提示建议登记（不自动改写用户 .gitignore）；本仓（dogfood）自身 .gitignore 补登记一行（文件清单）。CODEGRAPH_DIR 不能改落 `.sillyspec/` 下（其只接受项目根单段目录名，基础设施约束）。
6. **篇章影响映射**（保守规则，产出 docsToRegenerate / docsToSkip）：
   - 缺省：7 份篇章全部跳过（增量只重生成模块卡 + 映射增量更新）
   - 结构信号升级：变化集触及模块边界（module-map 差集：新增/删除模块路径；或 unmapped 新文件落地为新目录）→ STRUCTURE.md + ARCHITECTURE.md 入重生成集
   - 路由信号：受影响模块 diff 触及路由/端点文件（entrypoints 引用文件命中变化集）→ INTEGRATIONS.md 入重生成集
   - 证据不明确时保守归入重生成集（宁多勿漏，R-02 对冲）
7. **软门**：漂移过大（scope 内变更文件数 > 100 或落后 > 200 commit，对齐 `REFRESH_SOFT_GATE` 语义 src/scan-refresh.js:41）→ 计划返回全量建议（`--force-incremental` 可越，缺省尊重）。
8. **产出 IncrementalPlan**：`{ok, mode:'incremental'|'full', reason, base, head, behindCommits, affectedModules[], unmappedFiles[], docsToRegenerate[], docsToSkip[], audit:{uncoveredFiles[], coverageRatio}, affectedTests[], warnings[]}`。

### Phase 3 — scan 编排增量分支（改 src/stages/scan.js + src/run/scan-profile.js + src/run/command.js + src/run/stage.js + src/hooks/worktree-guard.js）

- **探测落点＝scan 命令启动入口层**（非「断点续扫检测」步——该步在 standard 档被 skipNames 跳过、quick 档 3 步表无此步，挂在步内则自动增量仅 deep 档生效，见 src/run/scan-profile.js:116-193；Grill P1-1）：探测在 scan 阶段启动段（src/run/stage.js scan 启动路径，写 scan-guard 的同段）执行 `probeCodegraph` + `computeIncrementalPlan`，三档（quick/standard/deep）统一生效；输出「本次路径：⚡增量（N 模块受影响 / M 篇章跳过 / 对账 X 未归属）或 全量（原因：无索引/无基线/软门超限/探测失败/quick 深度）」——路径与原因必答一次给全（CLI 输出文案自足纪律）。增量计划落盘 `.sillyspec/.runtime/scan-incremental-plan.json`（编排各步与 finalize 共读；断点续扫时计划仍新鲜可复用，scan 结束后保留一份供审计、下次覆盖）。
- **guard 握手（Grill P0-1，增量主路径的物理可用性前提）**：scan 启动本就无条件写 scan-guard（src/run/stage.js:322-344，forceRescan 仅由 `--force-rescan` 置 true）——增量模式下 guard 写为 `{mode:'scan-incremental', incrementalDocs: <重生成面白名单=docsToRegenerate + 受影响模块卡 + _module-map.yaml + _module-map-audit.md + _facts.md>, docHashes, sourceCommit: headShort, startedAt, forceRescan:false}`；worktree-guard 白名单新增 mode='scan-incremental' 分支（仿 mode='scan-refresh' 先例，src/hooks/worktree-guard.js:223-226）：**白名单内放行编辑、白名单外照常拦截**——guard 从拦截者转为增量「未受影响面零触碰」的执行保护机制（子代理越界改未受影响文档会被 hook 拦下）。`--force-rescan` 存在时探测跳过、guard 走现行 forceRescan 全放行语义（不变）。
- **`--incremental` flag**（src/run/command.js）：显式请求增量（探测不可行→警告留痕+回退全量，不 exit 非 0——C1 不阻断）；登记进 flag 白名单（src/run/command.js:749 一带）与帮助文本（src/run/command.js:261），防「报错指引指向未登记 flag」死路（known-issue）。`--force-rescan` 语义不变（显式全量重扫，探测跳过）。
- **步骤增量分支**（stages/scan.js prompt 注入增量计划段；注入段显式声明压制既有「已存在则跳过」规则——增量模式下该规则对计划内受影响面不适用，Grill P2-1）：
  - 「构建环境探测」：`scan facts` 限受影响面（受影响模块 paths 为范围参数）
  - 「深度扫描 7 份文档」：子代理只为 `docsToRegenerate` 命中的篇章启动；docsToSkip 篇章明确跳过并在输出报状态；未受影响模块文档零触碰
  - 「生成模块映射」：不重建——增量更新受影响模块条目（paths/entrypoints/main_symbols 按变化重抽）+ unmapped 新文件给出归属**建议**（agent 判断后写入）
  - 「生成模块卡片」：只为 `affectedModules` 重生成模块卡（保留人工备注区 MANUAL_NOTES 块原样迁移）；**conditionalWait 覆盖等待在增量模式下豁免**（Grill P1-3）——授权载体=增量计划本身（D-003 缺省自动判定的用户授权 + 启动时路径判定输出明示重生成面），未受影响模块卡不在重生成面、天然无覆盖风险；非增量模式（含 --force-rescan）conditionalWait 行为原样。
- **quick 深度回退**（Grill 补充，与 refresh quick-depth 硬门同语义 src/scan-refresh.js:159-165）：计划计算发现受影响文档含 `scan_depth: quick` → `mode:'full'`（浅文档本就该全量升级，增量不处理浅文档）。
- **收口基线推进**（`executeScanFinalize` src/run/scan-profile.js:356 增量分支，bump 在 stamp 之后执行使 generator 终态正确）：重生成文档由 `stampScanDocHeaders` 盖章（只补缺不覆盖）；**随后未受影响文档统一 bump**（复用 `bumpScanDocBaselines` src/scan-postcheck.js，docs=全部 SCAN_REQUIRED_DOCS 基线载体文档）——增量 scan 核对了整个漂移窗口（受影响者重写、未受影响者经验证），基线统一推进至 HEAD，staleness 判定转 fresh（C6）。模块卡不在盖章面（stamp/bump/staleness 均只扫 scan/ 目录基线载体，模块卡基线语义=无独立基线、跟随 _module-map.yaml 的 source_commit——现状确认，非本变更改变）。

### Phase 4 — 测试与跨仓验证

- **单测**（mock 注入，不真 spawn codegraph / 不真跑 git）：scan-codegraph（探测三态/超时降级/形状映射防御式/cmd-shim 解析）、scan-incremental（计划计算：归属/篇章映射/对账/软门/无基线绿地）。
- **既有测试零回归**：scan-diff / scan-staleness / scan-refresh / scan-postcheck 现有测试文件零改动零失败（C8）。
- **跨仓实测验收**（multi-agent-platform 仓，已有就绪索引）：增量 scan 产物 diff 对比全量（未受影响模块文档零变化）；耗时与 token 实测数字；临时空仓（无 codegraph）行为与现行版本一致；对账报告与人工抽查一致。

```
run scan 启动（入口层，quick/standard/deep 三档统一；--force-rescan 时跳过探测走现行路径）
  ├─ probeCodegraph(root) ──不可用──→ 全量路径（警告留痕）＝现行行为（C1）
  ├─ computeIncrementalPlan（git diff + matchFilesToModules + 对账 + 篇章映射 + 软门 + quick 深度检查）
  │       └── 回退条件（软门超限/quick 深度/无基线）→ 全量路径（原因留痕，软门可 --force-incremental 越）
  └─ 增量路径：计划落 .runtime/scan-incremental-plan.json + guard 握手
        （mode='scan-incremental' + guardDocs 白名单 + docHashes——白名单外照常拦截）
        └─ 11 步编排按计划收窄（子代理只处理受影响面；conditionalWait 覆盖等待豁免）
              └─ executeScanFinalize：stampScanDocHeaders（重生成面盖章）
                 → bumpScanDocBaselines（全部基线载体统一推进至 HEAD）
```

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/scan-codegraph.js | codegraph CLI 封装：resolveCodegraphCommand（Windows cmd-shim）/ probeCodegraph 三态 / 形状映射（status、files flat、affected）/ 分级超时 / fail-soft。数据流：producer=本模块 execFile 子进程 → consumer=scan-incremental.js 计算层与探测步 |
| 新增 | NEW:src/scan-incremental.js | computeIncrementalPlan 计算层：基线锚（复用 scan-diff 语义）/ 变化集（parseNameStatus）/ 归属（matchFilesToModules）/ 篇章影响映射 / 对账（落盘 _module-map-audit.md）/ 软门。数据流：producer=本模块 → consumer=stages/scan.js prompt 注入（经 .runtime/scan-incremental-plan.json）+ executeScanFinalize bump 决策 |
| 新增 | NEW:test/scan-codegraph.test.mjs | 封装层单测：execFile/命令解析器 mock 注入，探测三态×降级路径×形状防御式解析 |
| 新增 | NEW:test/scan-incremental.test.mjs | 计划层单测：git（safeGit mock）+ codegraph（探测 mock）注入；归属/篇章映射/对账/软门/绿地无基线 |
| 新增 | NEW:test/scan-incremental-wiring.test.mjs | 接线单测（task-03）：guard 握手写入/白名单放行与拦截/finalize bump 调用/--force-rescan 跳过探测/flag 白名单命中 |
| 修改 | src/stages/scan.js | 「断点续扫检测」noAI 步并入增量探测输出；「构建环境探测」「深度扫描」「生成模块映射」「生成模块卡片」步骤 prompt 增量分支（计划注入段+跳过集声明）；步骤名/顺序不变（进度库兼容） |
| 修改 | src/run/command.js | `--incremental` / `--force-incremental` flag 解析+白名单登记（:749 一带）+ 帮助文本（:261 一带） |
| 修改 | src/run/stage.js | scan 启动段（写 scan-guard 同段，:322-344 一带）：增量探测+计划执行+路径判定输出+计划落盘；增量模式 guard 写 mode='scan-incremental' + 重生成面白名单/docHashes（Grill P0-1） |
| 修改 | src/hooks/worktree-guard.js | 白名单新增 mode='scan-incremental' 分支（仿 scan-refresh 先例，:223-226 一带）：白名单内放行、白名单外照常拦截（未受影响面保护） |
| 修改 | .gitignore | 本仓（dogfood）登记 `.sillyspec-codegraph/` 一行（Grill P1-2；其他仓靠探测警告提示，不自动改写） |
| 修改 | src/run/scan-profile.js | executeScanFinalize 增量分支：stampScanDocHeaders 后接 bumpScanDocBaselines 统一推进至 HEAD（探测/计划本体在 stage.js 启动段，非本文件——Grill P1-1 修正落点） |
| 修改 | src/scan-facts.js | buildAndWriteScanFacts 支持 scope 限定参数（增量模式限受影响模块 paths） |
| 修改 | docs/sillyspec/file-lifecycle.md | 新增运行时文件 scan-incremental-plan.json / _module-map-audit.md 的生命周期条目（触及 src/stages/scan.js 的强制同步义务） |
| 修改 | docs/prompt/_extracted.json | 改 stages/scan.js 后重跑 `node docs/prompt/_extract.mjs` 机械再生（提示词文档同步纪律） |
| 修改 | docs/prompt/scan.md | 按 _extracted.json 逐字同步增量分支 prompt 正文 |
| 修改 | .claude/skills/sillyspec-scan/SKILL.md | scan skill 增量模式说明同步（CLAUDE.md 同步义务） |

## 接口定义

```js
// src/scan-codegraph.js
/** 命令解析（Windows .cmd shim → 真实 node 入口；非 Windows 直返裸名） */
export function resolveCodegraphCommand() // → { command: string, baseArgs: string[] }

/** 探测三态（fail-soft：任何异常 → available:false） */
export async function probeCodegraph(root) // → { available: boolean, reason: string, status?: object }

/** 索引全量文件清单（对账数据源） */
export async function listIndexFiles(root) // → [{ path, language, nodeCount, size }] | null（失败）

/** 受影响测试清单（截断 200 + truncated 标记） */
export async function affectedTests(root, files) // → { affectedTests: string[], truncated: boolean } | null

// src/scan-incremental.js
export async function computeIncrementalPlan({ projectRoot, specBase, projectName, forceIncremental = false })
// → { ok: boolean, mode: 'incremental' | 'full', reason: string,
//     base: string|null, head: string, behindCommits: number|null,
//     affectedModules: [{ id, doc, files: [{path, status}], added, deleted, modified }],
//     unmappedFiles: [{ path, status, hintFromCodegraph?: string[] }],
//     docsToRegenerate: string[], docsToSkip: string[],
//     audit: { uncoveredFiles: string[], totalIndexed: number, coverageRatio: number } | null,
//     affectedTests: { list: string[], truncated: boolean } | null,
//     guardDocs: string[],   // worktree-guard 白名单（重生成面：docsToRegenerate + 受影响模块卡 + _module-map.yaml + _module-map-audit.md + _facts.md，POSIX 相对路径）
//     warnings: string[] }
//   ok:false = 参数缺失等硬错误；mode:'full' + reason = 回退判定
//   （无索引/无基线/软门超限/探测失败/受影响文档含 scan_depth:quick——quick 浅文档回退全量，与 refresh quick-depth 硬门同语义）
```

CLI 面：`sillyspec run scan [--incremental] [--force-incremental]`（与既有 `--quick/--standard/--deep/--force-rescan` 正交组合；`--force-rescan` 存在时增量探测跳过）。

本变更 HTTP 接口面：0 端点（无接口变更）。

## 生命周期契约表

不涉及生命周期契约。（本变更是 CLI 命令内的同步计算与子进程调用，无跨进程事件/状态机/会话面；codegraph 子进程同步执行、超时即杀、调用返回即退。）

## 数据模型

无 schema 变更。新增运行时文件（非 SQLite 表）：
- `.sillyspec/.runtime/scan-incremental-plan.json` — 增量计划快照（编排各步与 finalize 共读；scan 结束保留一份供审计，下次 scan 覆盖）
- `docs/<project>/scan/_module-map-audit.md` — 对账报告（`_` 前缀非基线载体，不参与 staleness/refresh 门控，与 `_facts.md` 同类）

## 兼容策略（brownfield 必填）

1. **未装 CodeGraph 的仓**：探测第一步即 `available:false`（ENOENT）→ 走现行全量路径，除一行「⚠️ 未检测到 CodeGraph，走全量 scan」提示外行为与改动前逐字一致（验收标准 2 的临时空仓实测）。
2. **无 scan 基线（绿地）**：计划返回 `mode:'full'` → 现行全量。
3. **索引存在但落后**：增量判定只依赖 git diff（基线..HEAD），索引只补强线索——索引旧不致命（unmapped 线索缺失/对账略过时，均 advisory）；`index.reindexRecommended:true` 或 `pendingChanges` 巨大时警告建议 sync，不阻断。
4. **软门回退**：漂移 >100 文件 / >200 commit → 全量建议（`--force-incremental` 可越）。
5. **不改变的 API/行为**：scan-refresh 全命令面、7 份文档契约、postcheck 校验规则、`--force-rescan`/`--quick`/`--standard`/`--deep` 语义、步骤名与顺序（进度库兼容）；worktree-guard 的 mode='scan-refresh' 分支与非 scan 面拦截逻辑原样（增量只**新增** mode='scan-incremental' 分支，白名单外照常拦截——增量模式下未受影响文档的覆盖保护反而更强）。
6. **验收口径澄清**（Grill）：验收 1「未受影响模块文档零变化」指**正文零变化**——全部基线载体篇章文档的 frontmatter 三键（source_commit/updated_at/generator）会统一推进，产物 diff 对比须排除 frontmatter 键或按正文对比，否则验收自身假红；模块卡层面零变化严格成立（不在任何盖章面）。
7. **基线语义**：per-doc source_commit 载体不变；增量收口统一 bump 至 HEAD 与 refresh 的 per-doc bump 用同一单源函数（bumpScanDocBaselines），staleness/scan-diff 聚合口径（落后最多）无需改动即兼容。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | Windows 下 execFile 调 npm 全局 .cmd shim ENOENT（D-013 实证坑） | P1 | resolveCodegraphCommand 先解析真实入口（移植 daemon cmd-shim 思路）；单测覆盖解析路径；解析失败=探测不可用→全量（fail-safe 方向正确） |
| R-02 | 增量判定保守性不足 → 漏更未受影响判定的模块（文档腐烂静默化） | P0 | 受影响集宁大勿小：篇章映射证据不明确即归入重生成集；unmapped 文件恒入 agent 判断清单；软门封顶漂移窗口；验收 1 的产物 diff 对比兜底 |
| R-03 | 双路径（增量/全量）状态复杂度 → 断点续扫/收口错乱 | P1 | 不加新步骤不改状态机——增量=计划注入+跳过集，11 步骨架与步骤名不动；计划落盘 .runtime/ 供断点恢复；既有断点续扫步骤行为不变 |
| R-09 | guard 握手错位（白名单与实际重生成面不一致 → 子代理被拦或越界放行） | P1 | guardDocs 由计划单点产出（guard 写入与编排注入同源同值）；docHashes 哈希在手才放行（refresh D-007 同构 fail-closed）；增量复审/验收 1 越界零变化的实测兜底 |
| R-04 | codegraph 输出形状随版本演进漂移 → 解析崩 | P1 | 防御式解析（字段缺失→降级 unavailable/null，不 throw）；实测形状快照进单测夹具；版本号进计划 warnings |
| R-05 | 既有 scan 测试回归 | P0 | 新功能全部落新增文件；stages/scan.js 只增不改既有 prompt 语义（增量段为注入前缀）；scan-refresh 等四套测试零改动；收口实测门跑变更测试面 |
| R-06 | 对账报告误报（索引扫了 .sillyspec/产物目录 → 未归属清单噪声） | P2 | 排除前缀与 estimateSourceSize skipDirs 同源；multi-agent-platform 实测人工抽查校准（验收 3） |
| R-07 | 统一 bump 语义争议（未受影响文档未重写却推进基线） | P1 | bump 语义=「核对至 HEAD 的检出项已处理」的扩大版（增量 scan 核对了整个漂移窗口）；audit 与计划快照留档可追溯；文档 frontmatter generator 标注 sillyspec-scan-incremental |
| R-08 | 无长驻进程/外部资源，生命周期面不适用 | — | codegraph 子进程同步调用带超时，返回即退；无文件锁/监听/后台任务 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 设计目标 1/非目标第 1 条（与 refresh 互补边界）+ 总体方案 Phase 2（检出单源复用） | 已覆盖 |
| D-002@v1 | 设计目标 4 + 兼容策略 1/3/4（降级链零回归）+ Phase 1 probeCodegraph 三态 | 已覆盖 |
| D-003@v1 | 设计目标 1 + 总体方案 Phase 3（缺省自动判定 + flag 兜底）+ 接口定义 CLI 面 | 已覆盖 |
| D-004@v1 | rejected 防复潮条目（方案 B 落选）——无实现覆盖点，其否决内容=本设计不做的事 | 不适用（rejected） |
| D-005@v1 | rejected 防复潮条目（方案 C 落选）——同上 | 不适用（rejected） |
| D-006@v1 | Phase 3「guard 握手」段 + 文件清单（src/run/stage.js、src/hooks/worktree-guard.js）+ 接口 guardDocs + R-09 | 已覆盖 |
| D-007@v1 | 设计目标 1 边界声明 + Phase 3「探测落点＝命令启动入口层」+ quick 深度回退 | 已覆盖 |
| D-008@v1 | Phase 2.5 三层隔离（单点排除常量/warnings 提示/本仓 .gitignore） | 已覆盖 |
| D-009@v1 | Phase 3 步骤增量分支（conditionalWait 豁免+压制「已存在则跳过」） | 已覆盖 |

无未解决决策；决策追踪表状态列已全部闭合（已覆盖 / rejected 不适用），无预填残留。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/拆分判断/总体方案/文件变更清单/接口定义/生命周期契约表（豁免）/数据模型/兼容策略/风险登记/决策追踪/自审）
- [x] frontmatter 字段齐全（author/created_at/scale——scale 留 Step 8 落值，frontmatter 键已在）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-005 全部入决策追踪表）
- [x] 生命周期关键词检查：正文含 index.state 的 "complete" 字样（Phase 1 探测条件）——已按模板在「生命周期契约表」节写紧邻豁免短语「不涉及生命周期契约」（该 "complete" 是 codegraph 索引状态字段值，非本系统生命周期事件）
- [x] UI 原型分级核对：跳过（纯 CLI 变更无 UI 面），已在 Step 5 向用户声明并获确认
- [x] 不确定的问题标注：无「⚠️ 自审存疑」残留项——篇章影响映射规则（Phase 2.6）与 unmapped 归属线索的具体启发式在 plan/execute 期细化，机制与保守方向已定，不构成存疑
