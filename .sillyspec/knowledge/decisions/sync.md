# 决策知识 — sync

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-sync-001@v1 2026-11-04-sync-push-chunking——只改客户端推送腿：`src/spec-sync.js` 的单次 `POST /api/changes/-/spec-sync`（整批 ops 一个请求、30s
状态：implemented
变更：2026-11-04-sync-push-chunking
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-04-sync-push-chunking/design.md
文件：src/spec-sync.js, test/sync-push-chunking.test.mjs
最近确认：88a36bbcc3e54440923d058ebe153343382de8bb
理由：只改客户端推送腿：`src/spec-sync.js` 的单次 `POST /api/changes/-/spec-sync`（整批 ops 一个请求、30s 单请求预算写死）改为**双约束切块顺序推送**——新增纯函数 `chunkOpsForPush` 按「块内 op 数（默认 128）+ base64 字节粗估和（默认 2MB）」切块，逐块独立 POST，全部块落地后把各块响应合并成单批等价形状交给既有冲突/墓碑/成功处理路径（下游零改动）。推送单请求预算经 `SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS` 可调（默认 30s 不变），块尺寸经 `SILLYSPEC_SPEC_SYNC_CHUNK_OPS` / `SILLYSPEC_SPEC_SYNC_CHUNK_BYTES` 可调（conventions：机制先落缺省，env 只作调优，缺省小批量一块直发零回归）。 为什么是这个方案：生产实证（multi-agent-platform 工作区）spec 文件树同步 15 天零落地——单批 2436 ops/45.7MB（base64 后 ~60MB）在「客户端单请求 30s 掐线 + 服务端 apply 16-34s」双超下 best-effort 重试永不收敛。分批后每块上传+服务端处理都在预算内；已落地块推进服务器清单（spec_version bump），失败即停，下一轮 diff 以刷新后的清单为锚、已落地路径自动出 diff——**断点续传免费获得，无需客户端记账**。服务器端 apply_ops 单事务语义按块天然保持（块=事务单元），不动服务端。

## D-sync-002@v1 2026-11-07-sync-proposed-no-revive——「候选复活」缺陷：平台知识页 merge/reject 待审候选后，服务器侧软删（manifest 行 exists=false、不置墓碑）；本地 `knowl
状态：implemented
变更：2026-11-07-sync-proposed-no-revive
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-07-sync-proposed-no-revive/design.md
文件：src/spec-sync.js, test/spec-sync-proposed-no-revive.test.mjs
最近确认：a943bcc7e7ea26dd57041c0a51c158ce3145677a
理由：「候选复活」缺陷：平台知识页 merge/reject 待审候选后，服务器侧软删（manifest 行 exists=false、不置墓碑）；本地 `knowledge/proposed/` 残留文件在下次 spec-sync 按「本地有服务器无 → add」规则（src/spec-sync.js:358）推回平台，走平台 service.py 复活分支落盘（2026-11-07 平台侧子代理核查实证）——审核成果被下次同步冲掉。修复走 CLI 侧窄化拦截：`computeSpecOps` 的 add 生成处，对 `knowledge/proposed/` 前缀且服务器 manifest 该行 `exists === false`（平台处置过的唯一可信证据——软删行在场）的本地文件跳过 add；`syncSpecTree` 调用后检测此类残留并自动删除本地文件+一行提示。选 CLI 侧而非平台侧置墓碑：平台侧改 merge/reject 置 `platform_deleted` 墓碑会改变跨端删除语义（墓碑目前仅「平台删除变更目录」专用），影响面大；CLI 侧按路径前缀+软删行证据窄化判定，不动全局「本地为真相源」规则。

## D-sync-003@v1 2026-11-08-hindsight-tasks-ratio-retire——单点退役判定通路：`src/route-hindsight.js` 的 `HINDSIGHT_THRESHOLDS` 删除 `tasksRewriteRatio
状态：implemented
变更：2026-11-08-hindsight-tasks-ratio-retire
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-08-hindsight-tasks-ratio-retire/design.md
文件：src/route-hindsight.js, test/flow-clarity-probe.test.mjs, test/prestage-consent-gate.test.mjs, test/route-hindsight.test.mjs
最近确认：2850892edcca44a141b08720646a19a96ba714b5
理由：单点退役判定通路：`src/route-hindsight.js` 的 `HINDSIGHT_THRESHOLDS` 删除 `tasksRewriteRatio` 键、`markHindsight` 删除该路超阈判定与 reasons 拼装；`computeHindsightMetrics` 的 tasks 改写比**计算保留**（观测面，D-003 自校准回路未来重定阈的依据）。flow.js 侧零改动——收口接线（flow.js:2824）与同意门渲染读的都是 markHindsight 产物与标记文件，判定退役后正常变更不再落标记，门自然不再被误拦。 选判定退役而非调阈值/删种子/降 advisory 的理由：现行种子形态（2026-10-07-thin-tasks-v3：成功标准逐条转写，验收句≠实现步骤）下正常改写与需求不清的改写不可区分——阈值无论调到多少都无法分离信号与噪音（0.875/0.8 的两次误报即实证）；种子回退破坏 v3「任务面归你」契约；降 advisory 留误报噪音仍污染提示面。design 改写比（种子=四问钉死模板，真需求不清会大改）/盲维/实测失败三路信号不受影响，保留。

## D-sync-004@v1 2026-11-15-sentinel-evidence-channel——哨兵（detectFakeCheckCompletion，src/sentinel-assertions.js）的 review 证据通道是死代码：listRe
状态：implemented
变更：2026-11-15-sentinel-evidence-channel
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-15-sentinel-evidence-channel/design.md
文件：src/sentinel-assertions.js, test/sentinel-unified-evidence.test.mjs
最近确认：1058bb4d523b67fdd558ff52fbf33a7ba9c9c7d4
理由：哨兵（detectFakeCheckCompletion，src/sentinel-assertions.js）的 review 证据通道是死代码：listReviewEvidence（:49-70）扫描 `join(dirname(changeDir), '.runtime', 'execute-runs')` = `.sillyspec/changes/.runtime/execute-runs`——错位一级目录，真实产物在 `.sillyspec/.runtime/execute-runs/`（specBase/.runtime，实测在场），该通道从未命中过（完整流程也一直只靠 commit token 过门——上游 2026-11-14-scan-incremental 的 wt-commit 每笔带 task-NN 正因此）。轻量变更（flow 道）更无 execute-runs，唯一通道=commit token，而 .sillyspec-gitignored 仓的勾选留档不可入库——结构性依赖提交消息带 token，忘带即卡死（2026-11-15-scan-audit-domain 实证三次确认卡超时）。 修复两刀（都在 src/sentinel-assertions.js）：①路径修正 `dirname(dirname(changeDir))`（变更目录的父级 changes 的父级=specBase）——复活 execute 通道（完整流程受益）；②detectFakeCheckCompletion 增第三通道：变更目录下 review.json（轻量道收口评审产物）文本含 task id 即认——轻量道不再单独依赖 commit token。

## D-sync-005@v1 2026-11-28-spec-downstream-write-arbitration——实证病灶（2026-11-28 multi-agent-platform）：decisions.md 被旧副本覆盖、一分钟后又变回，双向抖动。
状态：implemented
变更：2026-11-28-spec-downstream-write-arbitration
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-28-spec-downstream-write-arbitration/design.md
文件：src/index.js, src/spec-sync-guard.js, src/sync.js, test/pull-spec-bundle-resurrect-guard.test.mjs, test/spec-downstream-arbitration.test.mjs
最近确认：e6c2673cd827bcfdcde602607c4fbf59d2607574
理由：实证病灶（2026-11-28 multi-agent-platform）：decisions.md 被旧副本覆盖、一分钟后又变回，双向抖动。调研确认下行写点五处，其中两处缺「本地改动保护」：`resolve --take-platform`（`src/sync.js:2057 _takePlatformSpecPaths`，冲突提示直接引导执行，逐文件裸 `writeFileSync` 且随后把基线刷成服务器 hash——本地改动就此被标记成已同步、彻底丢失）、`pull --spec`（整树 rm+解包，只有 --force 门槛与 resurrect 抑制，无本地改动判定）。daemon 侧 `pullSpecBundle` 已有 D-008 回灌闸，但其 mtime 判定在 git 操作后失真、门控只数 daemon 会话（另一 CLI 窗口的编辑不算）——本次先补 CLI 两处，daemon 侧 hash 化单列。 改法：新增统一仲裁纯函数 `shouldKeepLocal(localPath, baseHashes, force)`——读本地内容算 sha256，与同步基线 `spec-sync-base.json` 中该路径 hash 比对：基线有且不同 = 本地改过 → 保留；基线有且相同 = 本地未改 → 可覆盖；基线缺失 = 保守保留（首次同步/损坏时不赌）。仲裁只做「跳过 + 告警 + 审计」，不改写用户内容；`--force` 全旁路（用户显式裁决优先）。被保留路径不写新基线值，防止「保留却被记成已同步」。

## D-sync-006@v1 2026-11-28-spec-sync-guard-dead-exports——答：`src/spec-sync-guard.js` 的 `SPEC_SYNC_BASE_FILENAME` / `hashFileContent` 只在本模块
状态：implemented
变更：2026-11-28-spec-sync-guard-dead-exports
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-28-spec-sync-guard-dead-exports/design.md
文件：src/spec-sync-guard.js
最近确认：c8d156930188f059c5b20f32a008f8f436c89016
理由：答：`src/spec-sync-guard.js` 的 `SPEC_SYNC_BASE_FILENAME` / `hashFileContent` 只在本模块内使用（`readBaseHashes`、`shouldKeepLocal`、default 聚合），`src`/`test` 其余文件零引用；`test/check-syntax.mjs` 的 22e-b 死码判据按文本引用检查，default export 聚合不算引用，因此 lint 恒红。修法：去掉两个符号的 `export` 关键字，降级为模块私有；保留 default 聚合与内部调用（零行为变化），不扩大到「让 sync.js 共享常量」的跨文件重构。
