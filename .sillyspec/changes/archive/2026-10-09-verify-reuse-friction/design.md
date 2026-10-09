---
author: zcode-verify-friction
created_at: 2026-10-09T15:30:00+08:00
scale: large
risk_level: unit-sufficient
---
# 设计记录（Design Record）— 2026-10-09-verify-reuse-friction

## 目标/背景/问题描述

**目标**：修复 verify 收口复用机制的六个取证实证缺陷，让「码态未变的 --done 重跑」零重复实测、跨仓 task 不因主仓视角误判、复用链路可观测。

**背景**：multi-agent-platform 2026-10-09-tombstone-conflict-root-fix 变更 verify 阶段 13 轮 × 3.5 分钟重复实测（72 分钟总耗时）的完整取证（sqlite 会话记录 + .runtime 记录交叉归因）定位了四个独立机制 + 一个正确性风险 + 一个观测缺口，详见 proposal.md 动机。

**问题描述**（按机制）：①快照口径复用闸比对「计划口径」而快照慢性失败时永不收敛（含同型 failed 签名闸）；②快照失败静默回退主仓口径，apply 前实测的是无变更代码的基线且结论可被复用消费；③两类复用指纹含 HEAD，纯文档提交即击穿；④跨仓 trace/锚点/wt-commit 三处主仓视角；⑤纯事实对账门排在 3.5 分钟实测门之后；⑥指纹与复用判定不落盘，取证靠考古。

## 非目标（Non-goals）

快照慢性失败根因修复、轻量道（flow done）摩擦记账接入、gate 预检缓存层与 --docs-only 默认化、测试面推断/runner 探测机制改动——均不在本变更（详见 proposal.md Non-Goals）。

## 文件变更清单

| 文件 | 动作 | Wave | 说明 |
|---|---|---|---|
| NEW:src/run/code-face-key.js | 新建 | W2 | 单点代码面口径：非代码路径判据（自 green-cache.js 迁入，旧路径 re-export 兼容）+ 代码树内容键 computeCodeTreeKey |
| src/run/green-cache.js | 修改 | W2 | computeGateFingerprint 的 HEAD 分量替换为代码树内容键；filterCodePorcelain 迁移至 code-face-key.js 并 re-export |
| src/run/verify-quality-scan.js | 修改 | W1+W2 | passed/failed 两复用闸移到快照创建后按实际口径；快照 catch 静默改 ⚠️ 告警（task-02）；computeQualityScanFingerprint 树键化；store 携 missReason |
| src/run/gate-snapshot.js | 修改 | W1 | FR-02 reportGateSnapshotFallback（⚠️ 告警+摩擦记账统一 helper） |
| src/run/gates.js | 修改 | W1+W3 | 快照创建静默 catch 改高可见 ⚠️ + 摩擦记账；verify 段 required-evidence 与 target_files 对账门前移至实测门之前 |
| src/friction-tally.js | 修改 | W1 | TYPES 封闭枚举扩展 gate_snapshot_fallback |
| src/verify-postcheck.js | 修改 | W2+W4 | test-result.json 增 fingerprint/reuseDecision additive 字段；trace 悬空判定与残差执行按行 repo 解析（D-005@v1）；跨仓锚点窗口扩展 |
| src/verify-probes.js | 修改 | W4 | FR-06 探针 7 卡收集携 repo（写侧透传宿主） |
| src/test-bindings.js | 修改 | W4 | 机器 candidate 行写侧透传 repo 字段（additive，D-005@v1） |
| src/cross-repo-reconcile.js | 修改 | W4 | B 档锚点 HEAD~1..HEAD → baseline..HEAD（可得时），label 如实标注 |
| src/index.js | 修改 | W4 | wt-commit cwd 推断剥 --repoKey 后缀（注册表校验，D-006@v1） |
| src/wt-commit.js | 修改 | W4 | 跨仓 worktree 场景核实与配套（执行期复现后定改面） |
| NEW:test/verify-quality-scan-reuse-actual-scope.test.mjs | 新建 | W1 | FR-01 死循环回归锁 |
| NEW:test/gates-snapshot-fallback-visibility.test.mjs | 新建 | W1 | FR-02 可见性回归锁 |
| NEW:test/code-face-key-doc-commit-survival.test.mjs | 新建 | W2 | FR-03 文档提交存活/代码提交击穿（两指纹） |
| NEW:test/verify-test-result-reuse-observability.test.mjs | 新建 | W2 | FR-04 观测字段回归锁 |
| NEW:test/gates-verify-cheap-gates-first.test.mjs | 新建 | W3 | FR-05 门序回归锁（声明缺失零测试执行） |
| NEW:test/test-bindings-crossrepo-row-resolution.test.mjs | 新建 | W4 | FR-06 跨仓行解析回归锁 |
| NEW:test/cross-repo-reconcile-baseline-anchor.test.mjs | 新建 | W4 | FR-07 锚点窗口回归锁 |
| NEW:test/wt-commit-crossrepo-infer.test.mjs | 新建 | W4 | FR-08 推断回归锁 |
| .sillyspec/docs/sillyspec/modules/*.md 与 *.changelog.md | 修改 | 收尾 | task-09 文档同步落点（四卡+changelog，glob 行） |
| docs/sillyspec/platform-interface-map.md | 修改 | 收尾 | index.js 锚漂 5 处重锚（wt-commit 推断块 +19 行的伴生义务） |

协调点：本清单不触 worktree-apply.js 主体；活跃变更 2026-10-09-close-trace-single-set（收口四件套合并）与本变更不重叠，若 W4 执行期确需触碰其文件，Edit 前重读最新态（多 agent 并行）。

## 做法概述

**W1（FR-01/02，D-003@v1）快照口径死循环与可见性**：现机制——executeVerifyQualityScan 先判 passed 幂等复用（shouldReuseLastPassedScan，plannedSnapshot=env 常量）后建快照；快照慢性失败时记录 usedSnapshot 恒 false、planned 恒 true → `snapshot-scope-changed` 永久 miss。改为：先建快照（沿用 createVerifyGateSnapshot，失败照旧回退主仓），后以 actualScope=Boolean(snap) 判复用（passed 幂等闸与 failed 失败签名去重闸两处同型闸一并迁移——独立审查指出的同型死循环，防一个函数内两闸两种口径的分叉）——连续失败口径一致即收敛命中；口径真实切换仍失配（防作弊语义不变，闸的比对物从「计划」改为「事实」）。快照失败 catch 由静默改 ⚠️ 告警块（失败原因 + 实测口径=主仓回退明示 + 对验证结论的影响提示）并记 gate_snapshot_fallback 摩擦事件。快照创建秒级成本在复用命中轮照付——换确定性收敛，值得。

**W2（FR-03/04，D-002@v1）指纹树键化与观测**：两指纹的 HEAD 分量替换为代码树内容键——`git ls-tree -r -z HEAD`（NUL 分隔——非 ASCII 路径不加引号不转义，endsWith 判据不被尾部引号击穿）条目按既有非代码路径口径过滤后哈希（ls-tree 条目含 git 对象哈希，天然内容寻址）。纯文档提交不进过滤集 → 键不变 → 缓存存活；代码提交必变。快路径：整树 oid（`HEAD^{tree}`）与上次相同则沿用上次键（纯缓存优化，语义不变）。判据与计算收敛 code-face-key.js 单点，green-cache/quality-scan 消费同一实现。观测：真跑轮 test-result.json 增 fingerprint/reuse_decision（snake_case，additive）；复用命中轮判定追加 verify-runs/reuse-decisions-<change>.jsonl（复用轮不产生 test-result——其语义即无真实执行）；质量扫描 store 携 miss_reason 与 scope_decision{planned,actual}。

**W3（FR-05，D-004@v1）便宜门前移**：gates.js verify 段 required-evidence 门与 target_files 对账门（纯 git/文档事实，已核对与实测结果无数据依赖——锚点窗口是 git 事实、required-evidence 核验 存在×mtime×diff 交集）移至实测门之前，并入文档面收集阶段（R16 一次全列 + 统一 rollback）；「实测门在文档面全清后才执行」的提示语义自然覆盖它们。依赖实测结果的门（PASS 封顶、parity、超时降档）位置不动。执行期以调用链复核无隐藏依赖为准，发现依赖即留原位并记录。

**W4（FR-06/07/08，D-001@v1 Wave 结构 / D-005@v1 / D-006@v1）跨仓 per-repo**：① trace 行 repo 归属——写侧从 task 卡 repo 切片透传（additive 字段，缺省 main，存量零迁移）；读侧悬空判定/残差执行按行 repo 经 repos 注册表换根解析。② 对账锚点 B 档 `HEAD~1..HEAD` 扩为 baseline..HEAD（apply/worktree baseline 可得时），回退链 A(reviews 锡点) > B'(baseline 窗口) > B(HEAD~1 窗口) > C(未提交) 不回退。③ wt-commit cwd 推断：worktree 名含 `--<repoKey>` 且后缀命中 repos 注册表时剥除得变更名（注册表校验，不猜切分；二级校验：全段本身命中主仓进度库已知变更时不剥——防变更真名恰以 --repoKey 结尾的误剥）。三缺陷执行期先写复现测试（postmortem 证据为外部仓实证，本仓修面前先钉行为）再修。

## 接口契约
本变更接口面：0 端点（CLI 内部管线变更——无对外 API 端点增删；模块导出面变化见本节下方 additive 清单）

- `src/run/code-face-key.js` 导出：`filterCodePorcelain(porcelain)`（自 green-cache.js 迁入，语义不变）、`isNonCodePath(p)`、`computeCodeTreeKey({ cwd, specBase })`（git 失败返回 null——调用方 fail-open miss）。
- `computeGateFingerprint` / `computeQualityScanFingerprint` 签名不变，内部 HEAD 分量换 computeCodeTreeKey；旧缓存记录指纹自然失配一次（安全方向：多跑一轮不误复用）。
- 质量扫描记录 additive 字段：`scopeDecision { planned, actual }`（随 store 落盘）、`missReason`（上次 miss 原因）；`schemaVersion` 不动（additive 读侧兼容，先例：dedupKey/rerunSignature）。
- test-result.json additive 字段：`fingerprint`、`reuseDecision { layer: 'ledger'|'quality-scan'|'green-cache'|'real-run', hit: boolean, reason: string|null }`。
- friction-tally TYPES 增 `gate_snapshot_fallback`（封闭枚举扩展——CLI 自身信号类型，非开放世界；privacy 红线照旧：只存 count/detail 摘要）。
- trace 行 additive 字段 `repo`（字符串，缺省视为 'main'）；读侧解析函数新增可选 ctx/repos 参数（缺省主仓，行为兼容）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   缓存读写无事件面。代码树键是 HEAD 时点的 git 对象事实（无序性问题）；多笔提交间任意顺序，键只随过滤集内容变化。baseline..HEAD 窗口是提交序事实，git 保证。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   green-cache/质量扫描记录均为单文件 writeAtomicSync 原子写（既有语义）；两会话同时写同 scope 文件 → 后写覆盖，且写的都是各自真跑的绿记录（失败永不写）——覆盖方向安全。friction-tally 记账既有并发语义不动。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   快照先建后判复用：命中后走既有 cleanup；中断窗口留 tmpdir 快照与现状一致（tmpdir 生命周期语义不变）。指纹计算无状态。前移的对账门失败 → rollbackCompletionAndReturn 既有回滚路径，无新半态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   代码树键按各自仓的 HEAD 计算（主仓指纹=主仓键；W4 读侧按行 repo 各自解析——不串台）。非代码判据是路径口径（.sillyspec/、docs/、*.md）沿用既有单点，不引入语言/框架/扩展名枚举（ls-tree 是 git 对象枚举，非语言枚举）。wt-commit 后缀剥除经注册表校验，未注册后缀不剥（宁可不推断也不猜）。

## 风险与死路

- 最大风险：W3 门序前移触碰收口语义——缓解：只移两处已核对无实测依赖的纯事实门，执行期以调用链复核实证，任何隐藏依赖即回退该门原位并在 tasks 记录（宁可少前移不可错序）。
- 树键成本：大仓 `ls-tree -r` 百毫秒级/轮——整树 oid 快路径兜底（oid 同→沿用上次键）；若实测仍超预期，TTL 内按键缓存（执行期裁量，语义不变）。
- 死路（否决存档）：①「最近触码提交」作指纹分量——git log 语义（revert/merge/cherry-pick）不可靠，否决；②plannedSnapshot 探测式预判（先探快照可行性再判复用）——探测与真建两套口径会再分叉，不如先建后判的事实口径，否决；③指纹按文件 mtime——非 git 事实且跨平台不可靠，否决。
- W4 三缺陷的证据来自外部仓 postmortem——本仓执行期先复现（钉行为）再修，防修错面；复现不了的缺陷如实降级记录不硬修。
- 快照慢性失败的根因（本机为何 createVerifyGateSnapshot 返回 null）不在本变更修复面（无现存复现环境）——本变更保证：失败可见 + 复用不因慢性失败而死循环 + 主仓回退口径的实测结论照实标记口径。

## 变更风险等级

risk_level 由 design frontmatter 显式声明 = unit-sufficient（压仪式档；evidence 要求不受豁免——integration 实证以 8 个端到端测试文件承担：CLI 子进程/真实 git 仓/真实 worktree fixture 形态）。

## 自审（Self-Review）

- 文件清单与 FR/任务三向对齐：18 条具体文件行（10 src+8 NEW test）+ 1 条文档 glob 行 ↔ 8 FR ↔ 9 task，无孤儿（W4 wt-commit.js 标注执行期核实改面）。
- 红线复核：全设计无语言/框架/runner/扩展名枚举新增——代码面判据=路径口径（既有），树键=git 对象事实；wt-commit 剥后缀经注册表（用户自有配置）非内置清单。
- 防作弊语义守恒：口径闸从「计划比对」改「事实比对」（更严不更松）；失败永不缓存不动；指纹 fail-open miss 不动；逃生阀（GREEN_CACHE_OFF/TTL/RERUN）不动。
- 兼容面：cache/test-result/trace 行全部 additive 字段 + 旧格式读侧兼容（先例 dedupKey）；存量 trace 行零迁移。
- 已知妥协：快照秒级成本在复用命中轮照付；快照慢性失败根因不修（Non-Goal，如实标记）。
