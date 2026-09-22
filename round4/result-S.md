# R4 小任务对撞结果：R4-S-Q（sillyspec quick 3.29.4）vs R4-O-S（OpenSpec 1.13.1）

> 同任务（claude autocompact 三键）、同基线 50736b6ef、同机同模型、全新本地 zcode 会话、零子代理。
> 会话：R4-S-Q = sess_3c71e652（标题「R4 对照实验：autocompact 小任务 sillyspec quick 通道」，用户手起标题 `R4 ` 带空格致 `R4-` LIKE 漏配，按 id 补归）；R4-O-S = sess_b818b681。

## 硬账（zcode db，epoch-ms 数值比较）

| 指标 | R4-S-Q sillyspec quick | R4-O-S OpenSpec | 比 |
|---|---|---|---|
| 墙钟（创建→最后活动） | **41.2min** | **21.5min** | 1.92× |
| 请求 数 | 87 | 85 | ≈平 |
| tokens（computed_total） | **8.97M** | 9.33M | sillyspec 略优 |
| model-time（Σduration） | 13.3min | 13.1min | 平 |
| 子代理 | 0 | 0 | 平 |
| 模型利用率（model-time/墙钟） | 32% | 61% | 差在空闲 |

**墙钟差 19.7min ≈ 非模型时间差**（27.9 vs 8.4min）——模型算力完全同量级，差距全在本地命令等待。

## 非模型时间去向（R4-S-Q 账面证据）

1. quick --done 门禁**隔离快照全量测试 545.5s（9.1min）**（quicklog 结果段自述 + 提交信息双证）
2. 全仓 lint 门（ruff check/format 1288 文件 + mypy 963 文件）——且因全仓口径被存量 format 债卡住，agent 被迫**顺手清偿两文件范围外 ruff 债**才过门
3. 定向测试（daemon 31/31 + 相邻 93/93、frontend 35/35 + 相邻 46/46）+ 新工作树依赖安装

## 预注册判定（prereg.md H4/H6）

- H6 墙钟 ≤20min：**FAIL**（41.2min）
- H6 --done 一次过零返工：**PASS**（steps 零 wait_round、门禁双 PASS 一次过）
- H4 quick 资产尾：**FAIL——CLI 缺陷，非 agent 违令**（细读更正：db 原始命令实证两次 `--done` 均带 `--linked-changes 2026-09-20-r4-linked-parent`）。两个独立缺陷：①②见「细读补正」节。

## 意外发现：第 3 轮 OpenSpec 参照值是 fork 污染值

OpenSpec 全新会话实测 **9.33M**，第 3 轮参照「33.3M」是 **fork 继承胖上下文**（该跑 db 标题「Fork of …」实证）——**3.6× 虚高**。真实对比下两边 token 成本几乎相同；此前「OpenSpec 小任务更费 token」的印象不成立。sillyspec quick 8.97M 也只有第 3 轮 sillyspec 全流程 17.2M 的一半。

## 质量面（非对称交付）

- sillyspec：隔离快照全量 + 定向 31/35 + 相邻 139 例 + 双侧 tsc + lint 全绿；资产落盘（quicklog 四参数结构化条目 + patch 双件 + 模块文档增量段 + 范围快照 sha256 锚定）
- OpenSpec：自愿跑测试 27/27 + 32/32（无门禁强制）；规格库合入 5 requirement + archive

## 结论与下一刀

轻通道的「省 token」目标已达成（与 OpenSpec 持平且略优、较自家全流程减半）；剩余墙钟差距是**机制级可修的**：quick --done 门禁的测试/lint 范围化（按 touched-files 定范围或信任 agent 定向实测 + 差量校验），预计可砍 10–15min 墙钟——这是 3.29.5 的明确候选工作项。

## 细读补正（2026-09-21，逐条从会话正文/原始命令核出）

### 更正记录

前版「agent 未按提示词声明 --linked-changes」为**误判**：db 原始 Bash 命令显示两次 --done（首跑 22:29 与 lint 债修复后重跑 22:35）均带 `--linked-changes 2026-09-20-r4-linked-parent`。agent 行为完全合规。

### 新发现的 CLI 缺陷（3.29.4，均 R4-S-Q 实证）

**缺陷 A（② changelog 边车死路）**：会话控制台实录 `⚠️ [资产尾] changelog 追加异常（fail-open）：loadQuickModuleIndex is not a function`。源码定位：`src/run/shared.js:1294` 的 `loadQuickModuleIndex` 是内部函数**缺 `export`**，`complete-handlers.js:1430` 动态 import 解构得 undefined → 调用即 TypeError → fail-open 吞掉。§7 单测没抓到是因为直接模拟 join 语义、没走真实 import。

**缺陷 B（① 蒸馏尾未触发 + quicklog「关联变更：（无）」同根）**：tail 块读 `mergedGuard?.linkedChanges`，但 `--linked-changes` 在 --done 时解析后未并入该结构（manualLinked 空列表 → distill 干净跳过、零警告）；quicklog 条目的关联变更字段渲染源同链。flag→guard 的接线断点需在修复任务中定位（command.js:645-666 解析后进入完成路径的通道缺失）。

### 墙钟 41.2min 的精确分解（时间线实测）

| 阶段 | 时间 | 内容 |
|---|---|---|
| 0–1.6m | 1.6min | 引导+身份+CLAUDE.md；**worktree 守卫摩擦 3 次失败**后才用 `--allow-worktree-cwd --spec-dir` 放行 |
| 1.6–6.3m | 4.7min | Step1 理解：读码 + **5 次联网核键名**（precomputeCompactionEnabled 官方文档实证，任务简报未给键名） |
| 7.2–16.2m | 9.0min | 实现+定向测试全绿（daemon 31/31+相邻 93/93、前端 35/35+相邻 46/46、双侧 tsc、lint 基线对照）+ 依赖安装 + 模块文档增量 |
| 16.2–26.1m | 9.9min | **--done #1**：隔离快照全量测试 545.5s + lint → **被 2 个未触碰的存量 ruff format 债文件拦下** |
| 26.1–28.3m | 2.2min | agent 清偿范围外存量债 + 边界重声明 |
| 28.3–39.0m | 10.7min | **--done #2**：门禁全量重跑（test 539.3s + lint 62.7s）→ PASS |
| 39.0–41.2m | 2.2min | quicklog 核对 + 显式 pathspec 提交 + 报告 |

**门禁双跑 ≈ 20.7min，占墙钟一半**。其中第二跑对纯 lint 修复重跑全部测试是纯浪费（~9min）；首跑被存量债拦截是 lint 全仓口径的结构问题。CLAUDE.md 规则 0（禁全量测试、留给 CI）与门禁的模块全量口径直接矛盾——工具门禁违反了仓规。

### OpenSpec 侧行为细读（21.5min 分解）

- 0–3.5m 引导：init 即生成 `.zcode/commands/opsx/*` 流程说明书（propose/apply/archive），agent 读模板即上手——**工具自带教学**；
- 3.5–7.0m 只读探索（与 sillyspec 同量）；
- 7.3–9.8m proposal 阶段：CLI 脚手架+instructions 模板引导，agent 写四件套（proposal/specs delta/design/tasks 8 任务），strict 校验过；
- 10.1–19.7m apply：8 任务推进，**前端依赖后台安装与表单编辑并行**（墙钟并行度）；测试 3 轮修复迭代（2 处 esbuild 语法 + 1 处选择器逻辑）；daemon 27/27 + 前端 32/32 定向绿；
- 20.0–21.1m archive：CLI 把 delta 合入活规格（5 requirement）+ 提交。
- **零强制门禁**：agent 自选验证深度（比 sillyspec 少 7 个新测试用例、不跑 lint、不清存量债、不跑全量回归）；键名**未联网核验**（凭先验写 precomputeCompactionEnabled，碰巧对——sillyspec 花了 2.5min 实证）。

### 质量不对称的本质

sillyspec 的 20.7min 门禁买到：模块级全量回归×2、全仓 lint、强制清偿存量债、22 个新测试。OpenSpec 买到：15 个新测试 + 自愿 typecheck。差距不是「sillyspec 浪费」而是**质量执行深度 2× 于对手**——但当前实现里约 11min（第二跑全量测试 + 存量债拦截处理）是可消除的纯损耗，且模块全量口径违反仓规（规则 0）。

### 3.29.5 候选工作项（按 ROI 排序）

1. **门禁增量复用**：纯 lint 失败重试时跳过测试重跑（按树 hash 缓存测试结论）——省 ~9min；
2. **lint 范围化**：quick 门禁 lint 限 touched-files（或存量债基线快照豁免）——消除范围外拦截与「顺手清债」连带；
3. **缺陷 A 修复**：shared.js:1294 补 export + 用真实 import 的回归测试；
4. **缺陷 B 修复**：--linked-changes → mergedGuard.linkedChanges 接线 + quicklog 关联变更字段同修；
5. 测试口径与 CLAUDE.md 规则 0 对齐（模块全量→touched 模块，全量留 CI）。

# R4 大任务+小任务全流程结果（2026-09-21 终态核算）

## 硬账总表（五跑全终态，zcode db epoch-ms 口径）

| 跑 | 墙钟 | 请求 | tokens | 子代理 | 终态 |
|---|---|---|---|---|---|
| R4-L sillyspec 大·全流程 | 184.5min | 767 | 99.07M | 19 | 归档 01:14 verify PASS |
| R4-O-L OpenSpec 大 | 79.8min | 251 | 52.00M | 0 | archive 23:53（17 Requirement） |
| R4-S-F sillyspec 小·全流程 | 170.2min | 298 | 53.64M | 2 | 归档 01:00 |
| R4-S-Q sillyspec 小·quick | 41.2min | 87 | 8.97M | 0 | 已析（前节） |
| R4-O-S OpenSpec 小 | 21.3min | 85 | 9.33M | 0 | 已析（前节） |

对照臂：大任务旧 sillyspec 重做 269min/681req/104.13M/12 子代（Fork 续跑）；OpenSpec 旧跑 177.8min/288req/80.03M（同为 Fork）——**fork 污染双向坐实：OpenSpec 全新会话 79.8min/52M，比它自己的 fork 跑快 2.2×、省 35% token**。

## 预注册判定（prereg.md）

- **H1 大任务墙钟 ≤150min：FAIL**（184.5min；较对照臂 269min 降 31%；vs OpenSpec 同条件 2.3×）
- **H2 机制五点：5/5 全中 → PASS**
  - a 波次并发：15:22 双并发、15:34 **四并发**实证（对照第 3 轮全串行——拓扑守卫生效）
  - b 无假红循环：无「同 gate 无变化重试」旧病（PASS）；但见「新病」——隔离快照 lint 环境差异无诊断线索（见新发现）
  - c verify 批量补完：batch completion 生效（R4-S-F 61.4m 实录"batch completion kicked in"）
  - d 审查请求钳（四律）：设计 11/12 ✓、计划 6/10 ✓、QA 6/15 ✓——**三阶段全达标**
  - e plan 零卡片填充子代理：19 个子代全是调研/取证/审查/实现，无 TaskCard 生成器 ✓
- **H3 提示词级可靠性：PASS**——四律请求钳本次被遵守（单样本，不可外推为「已解决」）
- **H5 小任务全流程 ≤30min：FAIL**（170.2min；分解见下）

## R4-S-F 170min 去向（时间线分解）

1. 0–61min：brainstorm+plan+execute 五任务（两个 batch 子代理，实现与测试全绿）——**净仪式+实现成本约 60min**
2. 67.5–97.3min：**额度中断 ~30min**（会话被限额卡停，用户"继续，额度已恢复"）
3. 69–141min：**verify 隔离快照 lint 法证 ~70min**——CLI 实测隔离快照根在临时目录：mypy/ruff 缓存全冷（每次 --done 全速重跑 ~7min）+ known_failures 豁免环境差异 → agent 侧复现恒绿、门禁恒红，agent 被迫做缓存 mtime 考古 + WAL db 探测定位（131.2m "FOUND IT"）
4. 141–170min：module-impact 死信回填 + 槽格式学习 + archive

**剔除额度中断与快照法证后净成本 ~60-70min**——仍超 39.5min 旧臂（服务器侧条件不可比），但数量级合理。

## 新发现（本轮最大 actionable）

**verify 隔离快照的 lint 环境差**：快照根（%TEMP%）无 mypy/ruff 缓存、known_failures 豁免随行性存疑 → 门禁失败无诊断线索，fresh agent 花 70min 法证。修法候选：①快照 lint 失败输出一行诊断（快照根路径+「与工作区差异可能原因：缓存冷/豁免不随行」）；②快照复用工作区 lint 缓存目录；③lint 结论按树 hash 缓存（ROADMAP 已登记的 parity 增量缓存同族）。

## 结论

- **结构性修复全部生效**（波次并发/审查钳/批量补完/零填卡/无假红——H2 5/5），token 效率大任务 99M vs 旧 104M（fork 臂不可比，OpenSpec fresh 52M 仍是 1.9×——子代理架构的固有税）
- **剩余墙钟差距的三块**：①额度中断（环境非工具）；②隔离快照 lint 法证（工具缺陷，可修）；③严格档槽格式学习曲线（fresh agent 每次重付——流程命令卡的 verify 卡应预载槽格式要点，2026-09-21-flow-command-cards 的 run-verify 卡已有此意，可强化）
- 产品级判断：小任务路由 quick（41min）正确；全流程通道的修复方向已从「结构」转移到「门禁环境差诊断」与「槽格式先验」

## 五会话细读分析（2026-09-21 补）

### 交付物对照（大任务，分支内 diff，排除 spec 产物）

| | R4-L sillyspec | R4-O-L OpenSpec |
|---|---|---|
| 代码文件/插入 | 24 文件 / 7241 行 | 25 文件 / 3396 行 |
| 其中测试 | 2909 行（40%） | 1193 行（35%） |
| 提交数 | 15 | 5 |
| 审查面 | 13 task review.json + 3 阶段独立审查 | schema-only strict validate |

### 关键出入（可比性）

**三个大跑撞了同一个 5h 额度墙**：R4-O-L 74.5m、R4-S-F 97.3m、R4-L 97.5m 各有一次「继续，额度已恢复」——恢复时延取决于用户何时看到（O-L 仅 ~3.5min，S-F ~30min，L 未知）。**所有墙钟绝对值被污染，趋势方向可信**。

### OpenSpec 快的解剖（79.8min）

0–19m 探查（含 4 个真实数据探针脚本：zcode sqlite part.data/cursor transcript ×3，96 份样本实证格式）→ 19–22m proposal 四件套+strict validate+提交（3min）→ 22–43m daemon（自测 129 绿，6 轮小修）→ 43–57m backend（20 绿+gen:types）→ 57–71m 前端+测试 → 74–79 archive。**单上下文 251 请求零子代理、零外部门禁、所有验证自跑即时反馈（vitest 13s/pytest 17s）、archive 1min 机械合并**。

### sillyspec 慢的解剖（184.5min，含额度中断）

0–14m 三调研子代理并发 → 14:30 取证 → 14:50–15:07 设计+计划审查串行（11+6 req，均达标）→ 15:22–16:52 execute 五波（2/4/2/2/1 并发，编排者波间 TaskOutput 阻塞）→ 其余为 verify/archive 的槽格式学习（module-impact 缺失重建、step --done 不推进 ×2、结论枚举/探针 7 矩阵/死信回填）。

### 慢的归因排序（可修性）

1. **子代理重序列化税**（token 1.9× 主因）——架构固有，缩法：execute 子代理 prompt 瘦身（只给 task 卡+模块摘要不给全量上下文）
2. **隔离快照 lint 冷缓存法证**（S-F 70min）——可修（诊断行/缓存随行）
3. **槽格式学习曲线**（每 fresh agent 重付 ~20min）——可修（run-verify 卡强化）
4. **编排者波间空闲**（execute 90min 中编排者大多在等）——可修（波间做 verify 前置准备）
5. 审查串行 ~17min——已钳住，量小

### 别的问题

- TodoWrite reminder 噪声：R4-O-L 26 条系统提醒纯 token 浪费（harness 层，非工具账）
- OpenSpec 质量下限依赖 agent 自觉：本跑 agent 勤奋（真实探针+129 测试）但无独立审查面——若遇懒 agent 无兜底
- R4-S-F 的 brainstorm+plan 仪式（0–38m）与其实现（38–61m）等长——小任务走全流程的仪式/实现比 ≈1:1，路由 quick 正确
