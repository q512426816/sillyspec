---
author: qinyi
created_at: 2026-11-14 22:03:09
generated_by: sillyspec-fourpiece-init
change: 2026-11-14-scan-incremental
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

## D-001@v1: 增量 scan 与既有 scan-refresh 的职责边界
- type: architecture
- priority: P0
- status: confirmed
- source: docs
- question: 仓里已有 scan-refresh（2026-09-14-scan-incremental-refresh，引用级定点修补），增量 scan 会不会与其职责重叠？
- answer: 两者互补不互替。scan-refresh＝引用级定点修补（staleRefs 命中的 file:line 过期陈述，agent 手术式编辑，检出极限=只查带引用论断，src/scan-refresh.js:24-25）；增量 scan＝模块级重生成（变化文件经 module-map 归属到模块，受影响模块的模块卡+映射增量重写，子代理并行生成，复用 stages/scan.js 的子代理范式）。增量 scan 解决 refresh 检出极限外的「无引用论断/结构性变化」，不替代 refresh 的轻量定点修补场景。
- normalized_requirement: 增量 scan 实现不得改动 scan-refresh 的行为与命令面；两者的漂移检出共享单源（computeScanDiff/collectStaleRefs）。
- impacts: [FR-01, task-01]
- evidence: src/scan-refresh.js:1-26（refresh 定位注释）、src/scan-diff.js:400-425（collectStaleRefs 单源）、src/stages/scan.js:102-158（子代理生成范式）
- 故障面: 两套增量机制并存可能让用户困惑选哪个——命令输出需互相指引（增量 scan 触发软门时建议 refresh，反之亦然）。
- 退役判据: 若 refresh 使用率趋零（增量 scan 覆盖其场景），可考虑合并。

## D-002@v1: 降级链——CodeGraph 缺失时零回归回退全量
- type: compatibility
- priority: P0
- status: confirmed
- source: user
- question: 目标仓未装 CodeGraph / 无索引 / 状态探测失败时增量 scan 怎么办？
- answer: 用户任务书明确：绝不因索引缺失阻断 scan——探测失败（命令不存在/未 init/index.state!=complete/超时）自动回退现行全量 scan，行为与现行版本完全一致（零行为回归）。降级要留痕（警告行说明回退原因），不静默。
- normalized_requirement: 未装 CodeGraph 的仓跑 scan，产物/退出码/流程与改动前版本逐字一致；探测路径全部 fail-soft；探测耗时计入增量判定预算（秒级）。
- impacts: [FR-03, task-02, verify-02]
- evidence: 用户任务书「关键约束」节（降级链必须）、multi-agent-platform 仓 .sillyspec/changes/archive/2026-11-13-codegraph-map-base/design.md（manager 状态判定参考）

## D-003@v1: 入口形态——方案 A 缺省自动增量判定
- type: architecture
- priority: P0
- status: confirmed
- source: user
- question: 增量模式入口选哪种：缺省自动判定（A）还是显式 flag 才增量（B）？
- answer: 用户选方案 A（2026-11-14 对话轮「A」）：`sillyspec run scan` 启动时 CLI 秒级探测（codegraph status + git diff 基线聚合 → 增量计划），可行则自动走增量路径（受影响模块清单/篇章跳过集/unmapped/对账报告注入既有 11 步编排），不可行自动回退现行全量（警告留痕）。`--incremental` 显式请求增量（不可行时警告后回退）、`--force-rescan` 语义不变。理由：任务书动机是「贵→不跑→腐烂」循环，缺省自动同时断掉「贵」与「不跑」两环；降级链（D-002）与缺省路径天然同构；判定不确定时保守回全量控制误判半径。
- normalized_requirement: 不带任何 flag 的 `run scan` 在索引可用仓自动走增量路径，输出明示本次路径与判定依据；探测不可行自动回退全量并留痕；`--force-rescan`/`--incremental` 显式控制语义如 answer 所述。
- impacts: [FR-01, FR-02, task-01, task-03]
- evidence: 2026-11-14 brainstorm Step 4 方案选择轮（本变更对话）
- 故障面: 同命令双路径的可预期性下降——输出必须明示走了哪条路径与原因，否则用户无法判断「这次为什么快/慢」。
- 退役判据: 若自动判定误判率实测过高（漏更模块），翻缺省值回方案 B 形态（显式 flag）。

## D-004@v1: 方案 B（缺省全量 + --incremental 显式触发）落选
- type: architecture
- priority: P1
- status: rejected
- source: user
- question: 增量模式入口选哪种：缺省自动判定（A）还是显式 flag 才增量（B）？
- answer: 落选。
- normalized_requirement: 不采用：缺省行为保持全量、显式 --incremental 才增量的入口形态不实现。
- impacts: []
- evidence: 2026-11-14 brainstorm Step 4 方案对比（机制与 A 相同 90%，差异仅缺省值）
- 否决理由: 不解决采用率——用户已不常跑 scan，新 flag 只治「跑了贵」不治「不跑」，腐烂循环另一半仍在；且 C1 要求探测失败静默回退全量，显式 flag 的「显式失败」意义被架空。
- 复潮条件: 自动增量误判率实测过高需要用户显式控制时，或存量用户对缺省行为变化反弹强烈时。

## D-006@v1: 增量路径的 worktree-guard 握手（Grill P0-1 修复）
- type: architecture
- priority: P0
- status: confirmed
- source: design-grill
- question: scan 启动无条件写 guard 且 forceRescan 仅由 --force-rescan 置 true（src/run/stage.js:322-344）、白名单只有 mode='scan-refresh'（src/hooks/worktree-guard.js:223-226）——增量模式（不带 --force-rescan）重写受影响文档会被 :239-247 拦截，主路径物理不可用；带 --force-rescan 又整体关闭保护违反 C8。怎么办？
- answer: 增量模式写自己的 guard 握手：mode='scan-incremental' + incrementalDocs 白名单（=计划 guardDocs：docsToRegenerate+受影响模块卡+_module-map.yaml+_module-map-audit.md+_facts.md）+ docHashes（哈希在手才放行，refresh D-007 同构 fail-closed）+ sourceCommit。worktree-guard 新增 mode 分支：白名单内放行、白名单外照常拦截——guard 转为「未受影响面零触碰」的执行保护机制。
- normalized_requirement: 增量模式下子代理编辑重生成面文件不被 hook 拦截；编辑白名单外 scan 产物仍被拦截；guardDocs 与编排注入的计划同源同值（单点产出）。
- impacts: [FR-01, FR-02, task-03]
- evidence: src/run/stage.js:322-344（guard 无条件写）、src/hooks/worktree-guard.js:218-257（白名单+拦截逻辑）、src/scan-refresh.js:227-244（握手先例）
- 故障面: guardDocs 与实际重生成面不一致 → 子代理被拦（fail-closed 方向）或越界放行（docHashes 哈希校验兜底）。
- 退役判据: scan 覆盖保护机制整体重构时。

## D-007@v1: 探测落点=scan 命令启动入口层，三档统一生效（Grill P1-1 修复）
- type: architecture
- priority: P1
- status: confirmed
- source: design-grill
- question: 探测若挂在「断点续扫检测」noAI 步——standard 档 skipNames 恰含该步、quick 档 3 步表无该步（src/run/scan-profile.js:116-193）——自动增量实际仅 deep 档生效，与设计目标「索引可用仓自动增量」不符。
- answer: 探测+计划在 scan 命令启动入口层（src/run/stage.js scan 启动段，写 guard 同段）执行，quick/standard/deep 三档统一；quick 深度文档例外回退全量（受影响文档含 scan_depth:quick → mode:'full'，与 refresh quick-depth 硬门同语义）。
- normalized_requirement: 三档 profile 下索引可用仓均输出增量路径判定；受影响面含 quick 深度文档时判定为全量并留痕原因。
- impacts: [FR-01, task-03]
- evidence: src/run/scan-profile.js:116-193（skipNames/quick 步表）、src/run/stage.js:322-344（启动段）、src/scan-refresh.js:159-165（quick-depth 硬门先例）

## D-008@v1: .sillyspec-codegraph 索引目录隔离（Grill P1-2 修复）
- type: compatibility
- priority: P1
- status: confirmed
- source: design-grill
- question: 索引目录 .sillyspec-codegraph 未进 .gitignore（本仓实测）；skipDirs 精确匹配集合不含该名（src/run/scan-profile.js:28-37）；DIRTY_FALLBACK_EXCLUDE 也不含（src/scan-refresh.js:48）——索引文件会污染对账清单与 refresh dirtyCheck（索引文件后缀命中 SOURCE_EXT 误触硬门）。
- answer: 三层隔离：①scan-incremental.js 定义单点排除常量（skipDirs 同源集合+'.sillyspec-codegraph/'）供对账与变化集过滤共用；②探测发现索引目录存在但未进 .gitignore → warnings 提示建议登记（不自动改写用户 .gitignore）；③本仓 dogfood 自身 .gitignore 补登记一行。CODEGRAPH_DIR 不改落 .sillyspec/ 下（其只接受项目根单段目录名，基础设施约束）。
- normalized_requirement: 对账未归属清单与增量变化集不含 .sillyspec-codegraph/ 下文件；未 ignore 的仓在计划 warnings 中收到提示；本仓 .gitignore 含该条目。
- impacts: [FR-04, task-02, task-03]
- evidence: .gitignore（本仓 38 行无该条目）、src/run/scan-profile.js:28-37、src/scan-refresh.js:48-51

## D-009@v1: 增量模式豁免「生成模块卡片」conditionalWait（Grill P1-3 修复）
- type: process
- priority: P1
- status: confirmed
- source: design-grill
- question: 「生成模块卡片」步 conditionalWait 检测已有模块文档覆盖必等用户（stages/scan.js:360-368 选项「只生成缺失/全部重新生成/跳过」）——增量重写受影响模块卡必然触发等待，与「解开不常重扫循环」动机冲突。
- answer: 增量模式下豁免该等待：授权载体=增量计划本身（D-003 缺省自动判定的用户授权 + 启动时路径判定输出明示重生成面）。未受影响模块卡不在重生成面、天然无覆盖风险；guard 白名单（D-006）为放行边界。非增量模式（含 --force-rescan）conditionalWait 行为原样。注入段显式压制「已存在则跳过」规则（对计划内受影响面不适用）。
- normalized_requirement: 增量模式下受影响模块卡重写不触发用户等待；非增量路径 conditionalWait 行为与改动前一致。
- impacts: [FR-02, task-03]
- evidence: src/stages/scan.js:360-368（conditionalWait）、src/stages/scan.js:239-241（已存在则跳过）

## D-012@v1: task-06 验收驱动的性能修复越卡边界（软门前置+探测缓存）
- type: process
- priority: P2
- status: accepted
- source: code
- question: task-06 真机验收发现 C4 秒级违规（大漂移仓 diff 被无谓执行/多项目重复探测），修复需改 task-02/03 的文件（src/scan-incremental.js、src/run/stage.js）——超出 task-06 声明的 allowed_paths（仅 verify-evidence.md）。
- answer: 我的判断（执行期裁决）：验收发现缺陷→修复→复验是验收任务的闭环产出，同变更 worktree 内可逆不推翻决策——作为 task-06 交付一并提交，verify-evidence.md 留痕。修复内容：①computeIncrementalPlan 软门 behind 轴前置到 git diff 之前（behind>200 非 force 直接回退省大 diff）；②stage.js 探测提循环外+listIndexFiles memoize 注入（多项目仓省 N-1 次 status/files 子进程）。
- normalized_requirement: 修复后单项目判定 <5s（真机实测 2.9-3.2s）；既有单测零回归（12/12）。
- impacts: [task-02, task-03, task-06]
- evidence: task-06 真机计时（修复前 49.7s/修复后并发干扰 60.7s→干净分段 2.9-3.2s/项目）、.sillyspec/.runtime/logs/task06-*.log
- 退役判据: 软门阈值或 diff 口径变更时重估前置条件。

## D-011@v1: facts scope 只做编程参数+文档层指令，不接 scan facts CLI flag
- type: scope
- priority: P2
- status: accepted
- source: code
- question: task-04 的 scan facts --scope 需要 CLI 子命令解析接线（index.js / command.js 子命令层），但两者都不在 task-04 allowed_paths 内——越界改文件或缩范围二选一。
- answer: 我的判断（执行期裁决）：buildAndWriteScanFacts 增加 opts.scope 编程参数（导出面，测试与未来消费方可用），CLI flag 接线不做（省 index.js 改动）；stages/scan.js prompt 的增量指令改为文档层面收窄（facts 命令照跑，_env-detect/_facts 补充只写受影响面相关事实）。
- normalized_requirement: scan-facts.js opts.scope 参数生效（范围内文件限定抽取）；prompt 注入段不含新 CLI flag 指引；index.js 零改动。
- impacts: [FR-02, task-04]
- evidence: task-04 allowed_paths 边界（tasks/task-04.md）、src/scan-facts.js
- 退役判据: CLI 需要显式 --scope 时另开轻量变更接线。

## D-010@v1: unmapped 归属线索用目录邻居启发（零子进程），不用 codegraph query
- type: feasibility
- priority: P1
- status: accepted
- source: code
- question: design Phase 2.4 写「unmapped 新文件的 import 归属线索（query 按文件名查符号→所属文件→反查模块）」——但 query 单次 10s 档超时，unmapped 文件可达数十个，逐文件 query 会击穿 C4「增量判定秒级」硬约束。
- answer: 我的判断（执行期裁决）：hint 改为目录邻居启发——unmapped 文件取其目录前缀，查同目录/父目录下已归属文件的模块 id（纯本地计算，零子进程零开销）；codegraph query 语义等价信息（文件→依赖边→模块）留待未来需要时按需引入。归属结论仍归 agent 判断（C3 不变）。
- normalized_requirement: unmappedFiles[].hint 由目录邻居启发产生（本地计算）；computeIncrementalPlan 全程除 probe/listIndex/affected 三个 codegraph 调用外零子进程，秒级预算成立。
- impacts: [FR-01, task-02]
- evidence: design.md Phase 2（C4 秒级约束与 query hint 的冲突）、src/scan-codegraph.js CODEGRAPH_TIMEOUTS_MS（query 10s 档）
- 退役判据: 秒级预算约束解除（如 hint 走后台异步）时可回到 query 方案。

## D-005@v1: 方案 C（scan-refresh 工单扩大版）落选
- type: architecture
- priority: P1
- status: rejected
- source: user
- question: 增量 scan 可否走 scan-refresh 工单扩大版（agent 定点编辑受影响模块文档，不重生成模块卡）？
- answer: 落选。
- normalized_requirement: 不采用：不重生成模块卡的定点编辑形态不实现。
- impacts: []
- evidence: 2026-11-14 brainstorm Step 4 淘汰说明（违反 C5 重生成语义）
- 否决理由: 违反任务书「只重新生成受影响模块的文档/模块卡」的重生成语义与验收标准 1 的产物 diff 对比口径；agent 定点编辑质量不可控（正是 refresh 检出极限困境），token 成本下降不显著。
- 复潮条件: 子代理重生成范式在某仓不可用（如无子代理环境）而该仓需要增量维护文档时。
