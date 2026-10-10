---
author: t
created_at: 2026-10-10T19:15:00.000Z
scale: small
---
# 设计记录（Design Record）— 2026-10-10-cross-repo-patch-freeze

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）？

用户实证：跨仓变更收口后 change.patch / change-patch.json 只有主仓面——跨仓 diff 正文从未冻结（只冻计数与锚点哈希，B/C 档锚内容收口后永久不可复得），轻量道跨仓声明行恒谎报 `untouched ⊘`。「审计真相 sha256 锚定」承诺对跨仓面不成立。

修法三决策（D-001@v1 / D-002@v1 / D-003@v1）：① 跨仓 diff 正文收口冻结进 change-patch.json `scopeAudit.repos[].patch`（+patchSha256），不落独立文件族（保 2026-10-09-close-trace-single-set 单套两件纪律）、不混单 patch（git apply 必失效）；② 跨仓对账集成段（现内联在 computeFullFlowAudit，scope-audit.js:1216-1310）抽导出 `reconcileCrossRepoPlan` 共享集成函数——heavy（execute --done）与 thin（flow done）同源消费，轻量道接入后跨仓行从恒 ⊘ 升级为真实三态（复用 collectRepoActual 共享内核，2026-09-20「单一真相源」哲学延续）；③ patch 采集窗口与行数窗口同根同窗（锚 hash 为 baseRef，B 档 HEAD~1 / C 档 HEAD 字面 ref 工作树兜底），失败/空窗落 null 不出伪件；顶级 files[]/totals 主仓投影面（projectTraceFaceRows）与单套两件纪律不动——全景走 scopeAudit（rows 全三态 + repos[] 锚点/计数/正文），展示面由平台读 scopeAudit 承接。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- scope-audit.js 新增导出 `reconcileCrossRepoPlan({ cwd, specBase, runtimeRoot, changeName, planEntries, collectPatch })` → `{ rows, repos, notes }`（rows 带 crossRepo 标记三态行；repos[] 条目 `{ key, repoPath, anchor, totals, degraded, degradedReason, patch, patchSha256 }`）；computeFullFlowAudit 内联跨仓段改调它（行为等价 + patch 增量），notes 并入外层 notes。
- `scopeAudit.repos[]` 条目增键 `patch: string|null`、`patchSha256: string|null`（collectPatch=true 时采集）；thin 通道 snapObj 从无 repos 键到有（纯增量）。
- flow-parity.js `buildThinSnapshotRows({ ownFiles, stats, planEntries, crossRepoRows? })` 增第 4 可选参：提供时带 repo 的声明条目不再落 ⊘ untouched 补行（由对账行覆盖，pathMatches+crossRepo 双判）；缺省 undefined → 现行为逐字节零回归。
- flow.js done 路径：planEntries 含 repo 条目时（动态 import）调 reconcileCrossRepoPlan（fail-soft try/catch 退现行为），snapObj 增 repos 键；console 增一行跨仓冻结摘要（仅有跨仓时；advisory）。
- change-patch.json 格式增量：scopeAudit.repos[]（如上）；顶级 change/baseline/head/files/totals/savedAt/note/moduleScope/patchSha256/patchStatus 全部不动；writeCloseTraceArtifacts 签名不变（snapObj 透传）。
- CLI 命令面无新增无删除；scope-audit 表格渲染面不动（repos[] 不进表，rows 结构不变）。

生命周期契约：不适用（本变更为收口留痕文件内容增强，不涉及 lifecycle 事件、会话租约或状态机迁移；「切换/生命周期」盲维见下方第 3 问作答）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。patch 采集读的是跨仓 git 对象 + 工作树，锚定在 repos[].anchor（base hash 或字面 ref）：收口后跨仓再推进只影响「事后重建」而冻结件本身自洽（正文+sha256 已锚）；A 档 reviews 锡点区间、B' 档 worktree baseline 在收口时点已定形。轻量道对账晚于/heavy 对账先后交错（同一变更先 flow done 后 execute --done 重收口）时，两通道各自全量重建 repos[]，后写覆盖——单套写纪律保证 change-patch.json 无双版本并存。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

变更目录归本变更独占（既有纪律：writeCloseTraceArtifacts 落盘 changeDir），跨仓 patch 采集是纯读（git diff/status 对跨仓只读不写），无新增写面。他会话对跨仓主副本的并行提交落在采集窗口之外时表现为主仓同款语义（baseRef..worktree 窗口内未提交 hunk 本就按工作树口径收——跨仓无并行会话声明切分，全集入冻与 heavy 通道现行口径一致）。跨仓 worktree 场景改动在 worktree 侧，主副本 diff 读不到 worktree 内未提交面——B' 档已用 worktree baseline 窗口覆盖（meta.baseHash..worktree），本设计沿用内核产物不另造窗口。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。收口是断点可重入的既有结构（patch 子步失败半态可重跑），本变更不新增子步、不新增运行态：跨仓对账发生在 patch 子步内部（内存态计算 + 随 change-patch.json 单次落盘），中断即整体重跑，无半态文件。失败降级（⊘ + null patch）与成功（三态 + patch）都是完整可读件。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。repos[].patch 按 repoKey 分组内嵌于本变更自己的 change-patch.json（归属变更目录）；跨仓路径解析走 local.yaml repos 注册表（cwd 相对/绝对双形态，既有 parseRepoRegistry 口径）；runtimeRoot 随主仓 specBase 解析（resolveRuntimeRoot），多主仓实例各自注册表与 .runtime 天然隔离。patch 正文是仓相对路径 hunk，不含仓根绝对路径（buildFrozenPatch 既有形态），归档件外发不泄漏本机布局。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：R-01 JSON 内嵌 patch 使 change-patch.json 体积膨胀（大跨仓改动时平台读取/传输面变重）——缓解：binary 折叠 marker 行 + 按文件面过滤（buildFrozenPatch 既有能力）+ 跨仓交付面本身受 design 清单约束；v1 接受，膨胀成为实际问题时再评估独立文件族（方案 A 预留，接口不锁死）。R-02 B/C 档字面 ref（HEAD~1/HEAD）在采集时点与窗口判定时点之间若跨仓新推提交，patch 内容会偏移（窗口漂移）——窗口判定与 patch 采集在同一同步段内完成（毫秒级窗口），且 anchor.label 诚实标注降级窗口语义，接受。R-03 轻量道对账新增 git 调用（每降级仓最多 2 次 diff/status）拉长 flow done 时延——仅在有跨仓声明时触发，单仓 timeout 既有 GIT_TIMEOUT 兜底，fail-soft 不阻断。

试过但放弃的方案：方案 A 每仓独立 `change--<repoKey>.patch` 文件——打破单套两件纪律，平台 assets/读侧兼容链动面最大，收益（免提取直接 apply）非当前痛点，记非目标；方案 C 混进单 change.patch——git apply 必失效且路径语义误导，直接否决；C 档行数升级（用 HEAD 基点补 +/- 计数）——会改变既有 rows null 降级档语义与既有断言，超出本变更动机（补正文不补计数），记非目标。

## 自审（Self-Review）

- 四问逐条作答，无「不适用」逃逸（第 3 问以收口重入结构作答而非跳过）。
- 交叉点自查：① computeFullFlowAudit 内联段抽函数后行为等价——notes/rows/repos 三产物原样并回，既有 cross-repo-* 测试为回归钉；② buildThinSnapshotRows 第 4 参缺省路径与现行为逐字节一致——close-trace-unified.test.mjs 既有断言为回归钉；③ flow.js 跨仓对账失败 try/catch 退 ⊘ 补行——不阻断 flow done 六子步；④ patch sha256 与 writeCloseTraceArtifacts 顶级 patchSha256 同款 \n 归一口径（CRLF/lf 跨平台一致）。
- 兼容性：无跨仓声明时三条修改路径全走缺省/零条目分支（scopeAudit 无 repos 键、console 无摘要行、对账函数不调用）——单仓变更零行为；本仓 dogfood 收口即首个实证。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/scope-audit.js | 跨仓集成段抽导出 reconcileCrossRepoPlan（heavy 改调用行为等价）+ repos[].patch/patchSha256 采集（锚 hash/字面 ref 双形态，fail-soft null） |
| 修改 | src/flow-parity.js | buildThinSnapshotRows 增可选 crossRepoRows 参（覆盖判定替代 ⊘ 补行，缺省零回归） |
| 修改 | src/flow.js | done 路径跨仓对账接线（planEntries repo 条目 → reconcile fail-soft 调用 + snapObj.repos + console 摘要行） |
| 新增 | NEW:test/cross-repo-patch-freeze.test.mjs | 真实 git fixture：已提交/未提交 patch 冻结 + sha256 锚 + 降级仓留痕 + thin 覆盖判定 + 无跨仓零行为 |
