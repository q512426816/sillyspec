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
理由：「候选复活」缺陷：平台知识页 merge/reject 待审候选后，服务器侧软删（manifest 行 exists=false、不置墓碑）；本地 `knowledge/proposed/` 残留文件在下次 spec-sync 按「本地有服务器无 → add」规则（src/spec-sync.js:364-374）推回平台，走平台 service.py 复活分支落盘（2026-11-07 平台侧子代理核查实证）——审核成果被下次同步冲掉。修复走 CLI 侧窄化拦截：`computeSpecOps` 的 add 生成处，对 `knowledge/proposed/` 前缀且服务器 manifest 该行 `exists === false`（平台处置过的唯一可信证据——软删行在场）的本地文件跳过 add；`syncSpecTree` 调用后检测此类残留并自动删除本地文件+一行提示。选 CLI 侧而非平台侧置墓碑：平台侧改 merge/reject 置 `platform_deleted` 墓碑会改变跨端删除语义（墓碑目前仅「平台删除变更目录」专用），影响面大；CLI 侧按路径前缀+软删行证据窄化判定，不动全局「本地为真相源」规则。
