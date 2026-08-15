---
author: qinyi
created_at: 2026-05-31 11:00:00
updated_at: 2026-08-15T14:55:00+08:00
---

# SillySpec 文件生命周期

> 本文档按当前代码重写。它描述的是仓库里已经实现或运行时会暴露的行为，不描述期望设计。

## 文档拆分

| 文件 | 说明 |
|---|---|
| [storage-and-state.md](file-lifecycle/storage-and-state.md) | `.sillyspec/.runtime/`、SQLite、artifact、history、local 配置口径 |
| [stage-artifacts.md](file-lifecycle/stage-artifacts.md) | 各阶段的运行时步骤、变更目录产物、归档和 quicklog |
| [worktree-and-guard.md](file-lifecycle/worktree-and-guard.md) | `sillyspec worktree`、`meta.json`、apply、cleanup、归档/完成时自动清理判定（`hasUnappliedChanges`）、Claude hook 门禁 |
| [platform-workflows-sync.md](file-lifecycle/platform-workflows-sync.md) | 平台模式、workflow check、manifest、SillyHub sync |
| [known-implementation-gaps.md](file-lifecycle/known-implementation-gaps.md) | 当前代码与提示文案/旧文档不一致的地方 |

## 代码依据

本组文档主要对照以下实现：

- `src/init.js`
- `src/db.js`
- `src/scan-postcheck.js`
- `src/knowledge-match.js`
- `src/progress.js`（W6 Step9 后退化为 facade；实际逻辑在 `src/progress/*.js` 子模块：consistency-doctor / change-registry / step-store / stage-machine + shared.js 共享常量。ProgressManager 保留全部公共方法签名 + 4 个被外部直调的私有方法 `_write`/`_renderBatchProgress`/`_updatePlatformLastSync`/`_updateApprovalStatus` 做 delegate，persistence-core `read`/`_write`/`init`/`_ensureDB` 等留本体；外部零感知）
- `src/run.js`（W6 后退化为 barrel；实际逻辑在 `src/run/*.js` 叶子模块：shared / prompt / quick-audit / scan-profile / gates / complete-handlers / complete / stage / command。run.js 仅 re-export 外部 import 契约，外部零感知）
- `src/stages/*.js`
- `src/worktree.js`
- `src/worktree-apply.js`
- `src/hooks/worktree-guard.js`
- `src/workflow.js`
- `src/sync.js`
- `src/machine-interface.js`
- `src/modules.js`
- `src/index.js`
- `src/review-tier.js`
- `src/stage-review.js`
- `src/run/multi-repo-context.js`（跨仓 task 支持：MultiRepoContext 运行时，进程级内存对象，execute 启动构造贯穿 apply/verify）

运行时阶段列表以导入 `src/stages/index.js` 后得到的对象为准。当前导入结果：

| 阶段 | 当前步骤数 | 备注 |
|---|---:|---|
| scan | 11 | 辅助阶段；step 2 后会按项目动态展开 `perProject` 步骤；第 10 步「Extract Project Knowledge」写入 `knowledge/` |
| brainstorm | 8 | 独立包含”写设计文档并自审”（第 6 步）、”Design Grill 交叉审查”（第 7 步）、”生成规范文件”（第 8 步，原名”用户确认并生成规范文件”，已去确认门控——设计在第 5 步「分段展示设计」确认过，末步直接生成后展示摘要）；第 2 步加载上下文时含早期规模筛查（明显小变更建议走 quick）；完成时按 design.md frontmatter `scale` 分叉产物（large→四件套进 plan / small→仅 design.md 进 quick）；**`validateBrainstormOutputs` 经 contract `condition(scale≠small)` 豁免 proposal/requirements/tasks 三规则**（2026-08-07 修复：末步 small 指引只写 design.md 后 validator 四件套全 error 撞墙的矛盾；fail-safe：读不到 scale → 四件套全要求，保守走重流程） |
| plan | 动态 | 默认 9 步（含独立"审查计划"step，按规模分级 tier=self 自审 / tier=independent 独立子代理 + stage review.json）；`plan.md` 解析到任务后插入任务蓝图协调器；全局验收标准模板含集成冒烟引导（集成敏感 task 建议加集成冒烟验收，组件单测全绿 ≠ 集成正确）；postcheck 含确定性校验（结构/可行性/跨任务契约/design 文件覆盖/产物） |
| execute | 动态 | 默认 12 步；Wave 来自 `plan.md`，解析失败时默认 3 个 Wave；完成时 `validateExecuteOutputs` 客观核验存在真实代码变更（plan 有 task 但确证零变更则阻断），Task Review Gate 另做 review.json git 真实性交叉校验；`--done` 时若 plan 全勾 + 代码客观核验通过则一次性补完剩余 step 直达完成（见后「execute --done 批量完成」）；Wave prompt 含中断续跑引导（429/API 配额/崩溃中断后，plan.md 已勾选 task 跳过不重跑，`sillyspec status` + `run execute` 回当前 Wave step 续跑）；Wave 调度要求 + acceptance「运行测试」步要求子代理**既跑 lint check 也跑 formatter**（只 check 不 format 会把格式问题留到 commit 被 pre-commit hook 拦）；「确认 worktree 路径」步预告 worktree 内工具链可能缺失（先 `--version` 确认，缺则 `uv tool install`/`uv sync`） |
| verify | 7 | 只读校验 + 写 `verify-result.md`；「运行测试和质量扫描」step **不重复手动跑全量测试**（统一交 CLI 对账，避免与 CLI 实测重复耗时），只做 lint/静态检查 + 可选针对性冒烟；完成时 `validateVerifyOutputs` 校验 `verify-result.md` 存在且结论非 FAIL，缺失或 FAIL 则阻断完成；随后 CLI 亲自执行 `local.yaml` 的 `commands.test` 与自报告对账（实测失败阻断，结果写 `.runtime/verify-runs/<ts>/test-result.json`）；「对照设计检查」step 的 6 探针由 run/shared.js `resolvePromptIncludes` 从包内 `templates/prompts/verify-probes.md` 经 `{{include}}` 注入（prompt 组装时展开）；风险门控 `detectChangeRisk` 按 design/plan 关键词判级（integration/deployment-critical 缺真实集成证据则拦 PASS/PASS WITH NOTES），design.md frontmatter 可写 `risk_level:` 显式声明覆盖关键词判级（防「不改动 daemon」类否定语境被误判），显式等级下 PASS WITH NOTES 放宽不强制集成证据；verify --done 时另跑 runVerifyDeletionCheck（advisory）：git diff --name-status HEAD 提取本次删除文件，对账 design 声明操作（声明「新增/修改」却整文件删除 = 高风险；清单未列出 = 未声明），warning 不阻断完成（base 不可得→skipped）；另读 `changes/<change>/verify-required-evidence.json`（execute Task Review Gate 对 cannot_verify 任务落盘，schema `{items:[{task,verdict,evidence:[]}]}`）做 advisory 对账（`runVerifyRequiredEvidenceCheck`：cannot_verify 任务未在 verify-result.md 体现 → warn 不阻断归档；evidence 满足度由 agent 自报告，CLI 不语义判定。2026-08-07 闭合"只写不读死链 + verify.js 字段名 requiredEvidence 错配 + SKILL 谎报阻断"三连缺陷）；2026-08-15 D-1 起 verify --done 另跑 module-impact 死信探针（**blocking**，`gates.js` 复用 `extractPendingDocSyncRows`）：「更新结果」表存在 pending/待办行 → 阻断 verify 完成并回滚（与 archive 移动前校验同口径，死信号从 archive 提前到 verify；「对照设计检查」step prompt 同步改为"当场同步模块文档 + 回填 done/skipped"） |
| archive | 5 | 辅助阶段；第 4 步必须带 `--confirm`，由 `run/complete-handlers.js`（`archiveChangeDirectory`）移动目录并注销 active change；移动前硬校验 `plan.md` 存在 + module-impact.md「更新结果」表无 pending/待办死信行（`extractPendingDocSyncRows`，2026-08-15 D-5：只查该段表格末列精确匹配 pending/待办/未同步/todo，防代码标识符误报），移动后校验 `design.md`/`module-impact.md`；step2 `extract-module-impact`（**不改名**）2026-08-13 起改为**终审**——module-impact.md 不再由 archive 生成，改由 plan review_plan 步生成首版（large）、execute 各 Wave 主代理汇总更新、verify 核对、archive 终审（活文档全程演化，见下「module-impact.md 多阶段」） |
| quick | 3 | 辅助阶段；直接在主工作区实现，不创建 worktree |
| explore | 1 | 只读探索 |
| status | 3 | 项目级只读快照（非流程推进；查「下一步/当前阶段进度」用 `progress show`） |
| doctor | 5 | 环境和项目自检 |

## 顶层目录口径

当前 `sillyspec init` 会创建或维护以下目录：

| 路径 | tracked | 创建/维护方 | 当前生命周期 |
|---|---|---|---|
| `.sillyspec/projects/` | 是 | `init.js`、scan prompt 人工确认后 | 项目注册表，`*.yaml` 描述项目名、路径、状态 |
| `.sillyspec/docs/<project>/scan/` | 是 | `init.js` 建目录；scan 阶段生成文档 | 代码扫描产物，workflow `scan-docs` 会检查 |
| `.sillyspec/docs/<project>/modules/` | 是 | scan 可选步骤、archive sync、`modules` 子命令 | 模块索引和模块卡片 |
| `.sillyspec/changes/<change>/` | 是 | `ProgressManager.initChange()` 确保目录（quick session id `quick-<uuid8>` 例外：只作 SQL session key，不建实体目录，避免空残留）；阶段 prompt 写入 | 单个变更包文档和验收产物 |
| `.sillyspec/changes/archive/` | 是 | archive `确认归档 --confirm` 分支 | 已归档变更目录 |
| `.sillyspec/knowledge/` | 是 | `init.js` 建目录；scan「Extract Project Knowledge」步骤产出 | `INDEX.md`、`uncategorized.md`，以及 scan 提取的 `conventions.md`/`patterns.md`/`known-issues.md` |
| `.sillyspec/workflows/` | 是 | `init.js` 从模板复制 | workflow check 定义 |
| `.sillyspec/quicklog/` | 是 | `src/quicklog.js`（CLI 接管，O_EXCL 锁 + writeAtomic 原子写） | 每次 quick 任务记录（CLI 启动时写「进行中」条目 + 分配 ql-ID，完成时翻「已完成」+ 追加结构化结果块 需求/根因/方案/结果，step3 --output 缺字段则 --done 被拒；关联变更另由 CLI 在各 change tasks.md 追加/勾选。读-改-写经 writeAtomic 原子覆盖，reader 不读半截） |
| `.sillyspec/shared/` | 是 | `init.js` | 共享目录，当前无核心生命周期逻辑 |
| `.sillyspec/workspace/` | 是 | `init.js` | 工作区目录，当前无核心生命周期逻辑 |
| `.sillyspec/.runtime/` | 否 | `init.js`、`ProgressManager`、运行时命令 | DB、artifacts、history、workflow-runs、worktrees、knowledge-hit-report.json、postcheck-result.json、execute-runs（execute task review.json）、stage-reviews（brainstorm/plan/propose/execute 独立审查 review.json）、sync-conflict-<change>.json（平台同步双向冲突持久化，resolve 三选一后清理）、sillyspec.db.pre-import-<ts>.bak（pull/resolve --take-platform 的 import 前 snapshot） |

`init.js` 会把 `.sillyspec/.runtime/`、`.sillyspec/local.yaml`、`.sillyspec/codebase/SCAN-RAW.md` 追加到 `.gitignore`。注意 `.sillyspec/local.yaml.example`（脱敏配置示例，2026-08-11 起 `init.js` `doInstall` 调 `config-schema.js` `renderExample()` 落盘）**不在** gitignore——它是给人/外部 agent 看的可提交配置发现物；真实 `local.yaml`（含凭据）才 gitignored。

> **平台模式残留清理边界**（`init.js` `cleanupRuntimeResidue`，由 `run/command.js`（`runCommand`）启动时首次执行一次）：
> 当 `specRoot` 指向外部、源码目录的 `.sillyspec/` 含真实资产（`changes/`/`projects/`/`sillyspec.db`）时，只清理运行时残留，**不整删 `.runtime/`**。清理白名单保留权威状态：`worktrees/`、`sillyspec.db`、`global.json`、`contract-artifacts/`、`execute-runs/`；其余子项（`artifacts/`、`scan-runs/`、`scan-projects.json`、`user-inputs.md`、`postcheck-result.json` 等可重建缓存）逐项删除，`local.yaml`、`codebase/` 整删。未知子项默认保留（安全侧倾斜）。
> 该清理在 `run/command.js`（`runCommand`）启动时**仅执行一次**：首次处理后写 cwd 根的 `.sillyspec-platform-cleaned` 标记文件，后续每次 `run` 直接跳过。旧版每次启动都打印 `❌ 拒绝删除` 红叉属误导性噪声（清理既不阻塞流程也不动真实资产），已降为 `ℹ️` 一次性提示。

> **drift 场景 `.runtime` 落点（`specDriftAnchor`，坑 execute-runs-isolation）**：
> agent cd 进 worktree 隔离目录跑 plan/execute/verify/archive 时，cwd 命中 worktree 内 checkout 出来的 `.sillyspec` 副本 → `detectWorktreeSpecDrift`（`run/shared.js`）命中 → drift 守卫（`run/command.js`）把 `specBase`/`specRoot`/`specDir`/`pm` 锚回主仓，并在 `platformOpts` 追加 `specDriftAnchor = 主仓 specBase`（**不**设 `specRoot`/`runtimeRoot`——否则触发平台 sentinel，误跳 `triggerSync`/`checkApproval`、误进平台渲染分支）。下游 15 处 `.runtime` 根解析统一调 `resolveRuntimeRoot(platformOpts, localSpecBase)`（`run/shared.js`；优先级：`platformOpts.runtimeRoot` > `platformOpts.specDriftAnchor` > `localSpecBase/.runtime`）→ **execute-runs / stage-reviews / quick-sessions guard 从落盘起即在主仓 `.sillyspec/.runtime/`**，worktree cleanup（整目录删 worktree 物理目录）物理上碰不到 → archive step1 完成度 gate（真相源=磁盘主仓 `review.json`）不再因 cleanup 丢文件阻断。多 change 并行各自落 `<主仓>/.runtime/execute-runs/<各自 runId>/...`（marker 含 `changeName` + `runId` 时间戳全局唯一），无路径冲突。drift 守卫条件 `stageName ∈ [plan,execute,verify,archive]`，不含 quick（quick drift 走 `detectQuickSessionDrift` fail-fast）。

## 主要文件流

```text
sillyspec init
  -> .sillyspec/projects/<project>.yaml
  -> .sillyspec/docs/<project>/scan/.gitkeep
  -> .sillyspec/workflows/*.yaml
  -> .sillyspec/knowledge/{INDEX.md,uncategorized.md}
  -> .sillyspec/.runtime/{sillyspec.db,user-inputs.md,artifacts,history,logs,templates}

sillyspec run scan
  -> .sillyspec/docs/<project>/scan/*.md
  -> .sillyspec/docs/<project>/modules/_module-map.yaml      (optional prompt)
  -> .sillyspec/docs/<project>/modules/<module>.md           (optional prompt)
  -> .sillyspec/knowledge/{conventions,patterns,known-issues}.md  (Extract Project Knowledge)
  -> .sillyspec/knowledge/INDEX.md                           (索引更新)
  -> .sillyspec/.runtime/scan-projects.json                  (step expansion state)
  -> .sillyspec/.runtime/postcheck-result.json              (scan-postcheck 结构化结果)

brainstorm / propose / plan / execute / verify / archive
  -> .sillyspec/changes/<change>/...
  -> .sillyspec/.runtime/sillyspec.db                    (node:sqlite 内置模块 + WAL 模式：journal_mode=WAL + busy_timeout=5000 + foreign_keys=ON，事务提交直接持久化主库文件 + .db-wal/.db-shm 侧车；写前自动备份为 sillyspec.db.bak，读取时主库损坏/为空从 .bak 回退，两者均坏则 fail-loud；WAL 单写者串行 + SQLITE_BUSY 应用层有限重试，并发安全不丢更新；schema v4：changes 表加 last_synced_platform_ts=base_ts 乐观锁（push 带头标 X-SillySpec-Base-Ts，平台比对 current_pushed_at > base_ts 则 409）+ last_local_modified_ts=本地脏度（全写入路径 _touchLocalModified 触发，读路径 run().changes>0 guard 不标脏）；pull/resolve --take-platform 的 import 事务前另存 sillyspec.db.pre-import-<ts>.bak（独立 .bak 路径，不抢主 sillyspec.db.bak 回退链；import 后 last_local_modified_ts 重置为 pushed_at，D-013 例外）)
  -> .sillyspec/.runtime/user-inputs.md
  -> .sillyspec/.runtime/artifacts/*.txt                     (long step output)

execute
  -> .sillyspec/.runtime/worktrees/<change>/meta.json
  -> .sillyspec/.runtime/knowledge-hit-report.json           (启动时按 taskContext 匹配 knowledge)
  -> worktree branch sillyspec/<change>
  -> apply patch back to main workspace, then cleanup

platform sync / pull（双向冲突命中时）
  -> .sillyspec/.runtime/sync-conflict-<change>.json         (push 409 base_ts 过期 / pull 本地脏度+平台更新 命中写，payload 含 change/base_ts/local_modified_ts/platform_last_pushed_at/platform_progress/created_at；platform resolve --keep-local|--take-platform|--abort 后必清防累积，禁止字段级 auto-merge)

quick
  -> .sillyspec/quicklog/QUICKLOG-<git-user>.md              (CLI 写入：启动分配 ql-ID 写「进行中」，完成翻「已完成」+ 追加结构化结果块 需求/根因/方案/结果，缺字段则 step3 --done 被拒)
  -> .sillyspec/.runtime/quick-sessions/<sessionId>/guard.json  (CLI 启动建：sessionId=quick-<uuid8>，含 baselineFiles/allowedFiles/allowedFilesHash/linkedChanges/quicklogId + specDir 锚定创建时的 specBase。run/command.js 在 quick --done/--status 时调 detectQuickSessionDrift：当前 specBase 无本 session guard、但祖先链别处 specBase 有 → 判跨 specDir 漂移，fail-fast exit 2，治 monorepo cd 子项目后的无声分裂。allowedFilesHash = step1 启动时每个 allowedFile 内容的 sha256 映射 { "<file>": "<sha256>" }，文件不存在/读失败则该 file 不录入；--done auditQuickCompletion 末尾用其检测同文件并发——allowedFile 在 baselineFiles（他者改过）且当前 sha256 ≠ 录入值（我也改了）→ commit 整文件 pathspec 会夹带他者 hunk，CLI warn 给 git add -p/patch 分离指引，advisory 不阻断；旧 guard 无此字段 → 可选链判 undefined 跳过，向后兼容)
  -> CLI appends/checks checkbox in .sillyspec/changes/<change>/tasks.md
  -> code changes are made in the main workspace
```

## local.yaml 配置口径

`.sillyspec/local.yaml` 是项目主配置；各段 producer/consumer 与写入时机相互独立（scan step6 调 `sillyspec local detect` 生成骨架 + agent 补策略字段；scan step11 自检核对 local.yaml 与 detect 产出一致——commands 键已由 detect 核验存在性，agent 不再重复核验或标 unavailable；verify/execute step 读 local.yaml 时缺文件先 `sillyspec local detect` 生成骨架再读）：

> **配置键速查（2026-08-11）**：全部已知键 + 生效状态 + 读取点的单一数据源 = `src/config-schema.js`（`LOCAL_YAML_SCHEMA`）。`sillyspec config schema` 打印人类可读树（`--json` 机读）；键分两类——【生效】配了即生效、【声明·路径A 预留·未落地】`dispatch.poll_interval_ms`/`worker_timeout_ms`（consumer `renderSillyHubInstruction` 在 `isPathASupported()=false` 时整段派发指令不注入，路径A 落地后接线，配了暂不生效），表中诚实标出。`sillyspec init` 调 `renderExample()` 落盘脱敏 `.sillyspec/local.yaml.example`（**可提交**，区别于 gitignored 的真实 `local.yaml`），给人/外部 agent 作配置发现物。

- **project.type / commands / test_strategy**（detect 生成段）：producer = `sillyspec local detect`（`src/local-detect.js` `detectLocalYaml`，纯 fs 嗅探、零 AI/零 token、不 spawn 子进程）。**核验版生成逻辑（非闭眼写三件套）**：nodejs 核验 `package.json` 的 `scripts.{build,test,lint}` 存在才写对应键，缺失不写（仅 test/lint 无 build 的项目 build 键不写；`JSON.parse` 失败 throw 中文错误）；maven 写 `mvn compile/test/checkstyle:check`；gradle 核验 `gradlew` 存在用 `./gradlew` 否则 `gradle`；make 的 test 命令从 `Makefile` `test:` 目标解析、build/lint 无则不写；全无 → `generic`（commands 为空对象）。detect 只写这三段骨架，`commands.install`/`env`/`modules`/`known_failures` 等策略字段由 scan agent 按项目实际补充（R-04 防编造：只写能从 package.json/lockfile/构建文件/CI/README 确证的事实）。
- **platform 段**（平台 HTTP API 凭据）：producer = `sillyspec platform connect <url> <token>`（`src/sync.js` `SyncManager.connect`）——ping `/api/health` 验证后写 `{ url（尾斜杠归一）, token, last_connected, user? }`（user 显式 > git user.name > env，见 `resolvePlatformUser`）；consumer = `SyncManager` push/pull（`_getPlatform` 读此段走 HTTP API 同步平台进度）。`platform disconnect` 删 platform 段。
- **mcp 段**（dispatch worker MCP 协议凭据）：
  - producer = 同 `platform connect`（**同源假设** design §7.4：`if (!config.mcp)` 守卫下复用 platform 的 url/token 写 `{ url, token }`；用户已手填 mcp 段则保留不覆盖，R-09）。不同源时 agent 手填 `mcp.url`/`mcp.token`，或设环境变量 `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN`（不入盘）。
  - consumer = `readMcpConfig`（`src/sillyhub-mcp/config.js`）：优先级 local.yaml mcp 段（`mcp.url`+`mcp.token` 两键齐全）> env fallback > null；best-effort（文件缺/js-yaml 解析失败全 try/catch 回退 env）、不抛不发网络。三处消费：`client.js` 构造（`_url`/`_token`/`_configured`/`_endpoint`）、`dispatch/probe.js`（`configFingerprint` 缓存 key + no-config 快速路径）、`execute.js` `getDispatchMode`（派发三态 hasConfig 判定）。
  - **platform 与 mcp 段并列、语义独立**：platform 段供 sync 的 HTTP API（平台进度双向同步），mcp 段供 dispatch worker 的 MCP 协议（连 sillyhub 派发任务）；同源假设下 `connect` 一并写两者，不同源则各填各的。
- **dispatch 段**（可选调参）：detect/connect 均不写。仅 `probe_ttl_ms` 生效（agent 确知调优值才填；`dispatch/probe.js` `readProbeTtlFromLocalYaml` best-effort 读）。`poll_interval_ms`/`worker_timeout_ms` 为**路径A 预留·未落地**键（consumer `renderSillyHubInstruction` 注入的轮询/超时文本提及，但 `isPathASupported()=false` 时该指令整段不注入；路径A 落地后接线，配了暂不生效，见 `src/config-schema.js` status=declared）。
- **auto_mode 段**（变更规模自动分类，2026-08-11 接线）：`sillyspec run auto` 时 `runCommand`（`src/run/command.js`）调 `readAutoModeFromLocalYaml`（`src/classify-change.js`）读本段传 `classifyChange` 的 `localConfig`——`force_full_patterns`/`force_quick_patterns`（正则数组，i 大小写无关）匹配需求描述则强制对应模式；非法正则 try/catch 跳过不崩（review-2026-08-09 #30）。detect/connect 不写本段，agent 按需手填。
- **repos 段**（workspace 多仓注册表，2026-08-12 跨仓 task 支持）：producer = agent 手填（detect 不嗅探跨仓路径——跨仓归属是设计决策，非环境探测）；consumer = `parseRepoRegistry`（`src/stages/plan-postcheck.js`，`getOrCreateMultiRepoContext` 调用）解析为 `Map<key, path>`，供 `MultiRepoContext` 构造时按 task 卡 `repo:` 字段查表取跨仓仓根。键名 = task 卡 `repo:` 字段引用的 repoKey，值 = 跨仓仓绝对路径（如 `sillyspec: C:/Users/qinyi/IdeaProjects/sillyspec`）。`main` **不用注册**（隐式 = cwd / specRoot 父目录，design §7.3）。跨仓 change 缺 `repos:` 段或 task 卡 `repo:` 引用的 key 未注册 → `MultiRepoContext` 构造 fail-closed 抛错阻断 execute（约束②：跨仓 apply 走错仓=数据所有权事故，配置错误不降级）。单仓 change（所有 task 无 `repo:`）不读本段，零回归。

doctor 自检报告的修复建议已把 `sillyspec init` 更正为 `sillyspec local detect`（detect 才是 local.yaml 的生成命令）。

## scan 产出的下游消费

> 本表对照 scan 各产物在下游阶段的实际消费（"读" = 阶段 prompt 里含读取/cat 指令；"运行时注入" = 由 CLI 程序化注入，非 agent 自行 cat）。历史上此表缺失，导致 `CODEBASE-OVERVIEW.md`、`STACK.md` 等幽灵引用（scan 不产出但下游仍 cat）长期未被发现，已于 2026-07-24 修复。

| scan 产物 | brainstorm | plan | execute | verify | quick | doctor |
|---|---|---|---|---|---|---|
| PROJECT.md | 读（总览入口） | 读（总览入口） | 读（总览入口） | — | — | — |
| ARCHITECTURE.md | 读 | 读（含技术栈） | 读 | — | — | 检查存在 |
| STRUCTURE.md | 读 | — | — | — | — | — |
| CONVENTIONS.md | 读 | 读 | 读 | 读 | 读 | — |
| INTEGRATIONS.md | — | — | — | — | — | — |
| TESTING.md | — | — | — | 读（验收对照） | — | — |
| CONCERNS.md | — | — | — | 读（技术债触碰标注） | — | — |
| _module-map.yaml | 读（需求→模块匹配） | 读 | 读（源码定位） | 读 | 读 | 读 |
| modules/`<m>`.md | 读 | 读 | 读 | 读 | 读 | 健康检查 |
| knowledge/INDEX.md | — | — | 运行时注入 | — | 读 | — |
| flows/*.md | — | — | — | — | — | — |
| glossary.md | 术语碰撞时读 | — | — | — | — | — |

说明：
- `INTEGRATIONS.md`、`flows/*.md` 当前无下游消费者（scan 产但无人读），属已知死文档——待后续接消费，或明确承认其仅供 knowledge 提取与人类查阅。
- 技术栈信息统一在 `ARCHITECTURE.md`；早期 `STACK.md` 是 `codebase/` 时代的遗物（`src/migrate.js` 把 `codebase/` 迁到 `docs/<project>/scan/` 时未对应到新 7 份文档），scan 重构后下游 prompt 未同步，已于 2026-07-24 清理。
- `knowledge/` 经 `src/knowledge-match.js` 在 execute 启动时按 task 关键词命中后注入 prompt（落 `.runtime/knowledge-hit-report.json`），是 scan 产出**唯一**的程序化注入管道；其余消费都是 prompt 内 cat 指令 + agent 自行解析（module-map 的 tags/aliases/entrypoints 用法即由各阶段 prompt 指导 agent 使用）。

## 机器接口（gate / derive）

`sillyspec gate <stage>` 与 `sillyspec derive <facet>` 是面向 SillyHub driver 模式的**只读查询子命令**（实现 `src/machine-interface.js`，路由 `src/index.js`）。它们复用既有的门控与事实核验引擎，把"埋在 `run <stage> --done` 人类可读输出里的结论"抽象成统一 JSON envelope + 退出码契约。

**只读语义边界（无状态副作用）**：

| 行为 | gate / derive | 说明 |
|---|---|---|
| 写 `sillyspec.db` | ❌ 不写 | 仅调 `ProgressManager.read`，调用前后 db 文件 byte-identical |
| `triggerSync` | ❌ 不触发 | 无自动同步副作用 |
| 推进 step / stage | ❌ 不推进 | 状态推进仍走 `run <stage> --done` 或平台显式调用 |

**唯一例外（取证落盘，非状态写入）**：`derive verify-test` 与 `gate verify`（verify stage）会真实执行 `local.yaml` 的 `commands.test`，并把结果落盘到 `.runtime/verify-runs/<ts>/test-result.json`。这是产物取证——记录测试结果事实，不进 `sillyspec.db`、不推进进度。daemon 消费 `verify-test` 的 `data.resultPath` 即可定位该取证文件。

命令面与退出码语义（0=通过 / 1=事实阻断 / 2=无法核验）、envelope schema、facet 白名单（`execute-evidence` / `verify-test` / `task-reviews` / `artifacts`）、TBD-hub-api 待对账清单，以 **[interface-contract.md](interface-contract.md)** 为两仓库对账基准。本组文档不重复这些契约细节；当 envelope schema 或副作用声明变更时，须同步修订契约文档与本节。

sillyspec doctor --json（结构化诊断，平台模式状态分裂检测）
  -> <authoritySpecDir>/.runtime/doctor-diagnosis.json
  （authoritySpecDir = pointer.specRoot 平台模式 / <cwd>/.sillyspec 本地模式；只读检测，不写 db）

sillyspec doctor --dump-db --path <db>
  -> <authoritySpecDir>/.runtime/doctor-dumps/dump-<ts>.json（只读取证：schema_version + 全量 changes + stages）

sillyspec doctor --cleanup-remnant [--confirm]
  -> 删除 0 字节空占位 db（默认 dry-run；--confirm 才真删；只删 size===0，不动有内容的 db）

sillyspec doctor --align-execute-progress [--confirm] [--change <name>]
  -> 按 plan.md 声明对齐 execute 阶段派生进度戳（默认 dry-run，只报告将补哪些 step；
     --confirm 才落盘：把 execute 阶段所有非 completed step 标 completed，并显式置
     execute stageData.status='completed' + completedAt）。仅当 plan.md 所有 task checkbox
     全勾时才对齐（信任声明、verify 兜底，同 archive 真相源语义）；--change 缺省时按单活跃
     变更自动兜底。典型用于 worktree 已 cleanup（终态）但 execute 派生戳未盖上的死锁场景。
     只写 stages 表 step 状态（经 ProgressManager._write），不改 schema。

execute --done 批量完成（2026-07-28，`run/complete.js`）
  -> 任一 execute `--done` 完成当前 step 后，若满足① plan.md 所有 task checkbox 已勾
     （人工勾，或基于各 task review.json 双 verdict 非 fail 由 `autoCheckPlanFromReviews` 自动勾）
     ② `checkExecuteCodeEvidence` 非"零变更"（防手动勾选伪造空完成），则一次性把剩余
     pending/in-progress step 标 completed，本次 --done 即进入阶段完成分支，后续收尾（Task Review
     Gate、worktree cleanup、execute summary、下一阶段提示）照常走原路径——不绕过任何 gate。
     条件不满足（plan 未全勾 / 代码零变更）时仍按单步推进。这是把"plan 全勾但 progress 戳
     未盖 → 需逐次 --done 7 次"的补救从 `doctor --align-execute-progress` 前移到常规 `--done`。
     不重算 worktree 文件内容、不识别"代码已在 main"，只在 plan 声明 + 代码客观核验双绿时对齐派生戳。

## 核心修正

这版文档相对旧版长文档做了几项关键修正：

- `quick` 不走 worktree 生命周期。hook 在 quick 阶段对写文件放行，只拦截危险 Bash 命令。
- `scan` 当前定义是 10 步，并且 step 2 后会动态展开项目级步骤，不是固定 12 步。
- `brainstorm` 步骤数从历史 11/13 演进到当前 8（optional 步——协作复用/原型分析/需求范围评估/需求澄清Grill/HTML原型——已内联进相邻必选步，减少 agent 往返）；`propose` 为 7。
- `.sillyspec/local.yaml` 是当前主配置口径；scan prompt 写这里，sync 读写这里，hook 优先读这里并兼容根目录 fallback。各段（project/commands/test_strategy/platform/mcp/dispatch）的 producer/consumer 与生成核验逻辑见上方「local.yaml 配置口径」段（detect 核验 scripts/gradlew 存在性、命令缺失不写键——非闭眼写三件套；mcp 段由 `platform connect` 同源写入或手填/env，readMcpConfig 消费）。
- 平台模式的 `manifest.json` 已接入 scan 完成回调；`workflow-runs` 在平台模式下落盘到 `<runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/`——`run/complete-handlers.js`（`handleScanStageCompleted`）的 scan/archive post-check 已向 `saveWorkflowRun` 透传 `runtimeRoot` / `scanRunId`（本地模式仍落 `cwd/.sillyspec/.runtime/workflow-runs/`，详见 `platform-workflows-sync.md`）。
- `execute-runs`（task review）同样支持平台模式：`run/stage.js`（`runStage`）的 `runtimeRoot` 解析点（`current-execute-run-id` 写入、task review gate、done-like 校验）均已认 `platformOpts.runtimeRoot`，平台模式落 `<runtimeRoot>/execute-runs/<runId>/tasks/<taskId>/review.json`；本地模式仍落 `<specBase>/.runtime/execute-runs/`。`contract-matrix.js` 的 `extractProviderArtifact` / `buildConsumerInjection` / `verifyApiParity` 同步加了可选 `runtimeRoot` 参数，artifact 路径加 `changeName` 维度（`contract-artifacts/<changeName>/<taskName>/endpoints.json`）实现跨变更隔离（旧路径无 changeName，不同变更同名 task 互相覆盖）。`contract-artifacts/` 生命周期：execute Wave 完成时 `extractArtifactsForChange`（`contract-matrix.js`）扫 worktree 提取后端端点（`scanBackendEndpoints` 多框架：FastAPI `.py` / Express `.js,.ts` / Spring `.java`）→ 落 artifact；verify 阶段 `runVerifyParityCheck`（`verify-postcheck.js`）读它做 advisory parity 对账（`missingBackend>0` 只 warning 不阻断 verify 完成；无 artifact → skipped，非全栈项目不打扰）；init cleanup 白名单（`RUNTIME_KEEP`）保留。注：`buildContractMatrix` 的 provider 识别 bug（只 classify consumers 不 classify providers）与 `parseTaskDependencies` 表格正则贪婪 bug（`[^|]*` 吃前导 0 → `task-1` 误解析）已修，端点级 contracts/注入方真正生效。
- `archive` 的目录移动已经由 `run/complete-handlers.js`（`archiveChangeDirectory`）在第 4 步 `--confirm` 时执行；未带 `--confirm` 会回退该步骤并提示补参。
- scan 第 10 步「Extract Project Knowledge」把长期有效的项目知识写入 `.sillyspec/knowledge/`（`conventions.md`/`patterns.md`/`known-issues.md` + 更新 `INDEX.md`）；`scan-postcheck.js` 校验产物（INDEX.md 存在、引用文件真实存在）。
- execute 启动时由 `knowledge-match.js` 按 plan.md 的 task 关键词匹配知识库，命中报告注入 prompt 并写 `.runtime/knowledge-hit-report.json`。
- 平台模式残留清理只删缓存、保留权威状态（`worktrees/`、`sillyspec.db`、`global.json`、`contract-artifacts/`、`execute-runs/`），不再整删 `.runtime/`——否则 worktree meta 被清掉会导致 `depsStatus` 恒为 unknown、`branch already exists` 死循环、`worktree doctor` orphan 误判。
- plan→execute Contract 校验（`parseWavesFromPlan`）解析 `## Wave N` 段内的 `- [ ] task-XX:` 行；遇到非 Wave 标题行（`## 自检` 等）即退出当前 Wave 段，避免自检 `- [x]` checkbox 被误当 task 定义。light/none plan.md 用 `## Tasks`/`## 任务`（无 `## Wave N`）包任务时，识别为隐式任务区，对其中的 `- [ ] task-XX:` 惰性创建隐式 Wave 收容（非任务区 `## 验收`/`## 自检` 的 checkbox、任务区内无 `task-XX` 编号的 checkbox 仍忽略），隐式 Wave 标记 `implicit: true`。
- `executePlanPostcheck`（`run/stage.js`）的 `resolveChangeDir` 从 `run/shared.js` 导入（W6 Step1 抽出的纯函数；历史上曾误从 `./modules.js` 导入，该模块未导出此函数）。
- `executePlanPostcheck`（noAI，execute 前最后关口）顺序跑确定性校验：`validateBlueprintConsistency`（task 结构/路径冲突/拓扑无环）、`validatePlanFeasibility`（TaskCard 字段齐全/依赖存在/id 连续）、`validateCrossTaskContracts`（consumer `expects_from` ↔ provider `provides` 字段对账）、`validateDesignFileCoverage`（`design.md` 文件变更清单 → tasks `allowed_paths` 覆盖对账；未覆盖的源码文件阻断 execute，避免子代理被 allowed_paths 锁死而无权改 → 漏改；2026-08-15 D-2 起 `.sillyspec/docs/` 模块文档亦须认领）、`validateBlueprintConsistency` 内含 plan.md 声明任务 ↔ tasks/ 卡片双向对账（2026-08-15 D-2b：plan 列任务漏生成卡片——典型尾部文档同步任务——阻断，孤儿卡亦阻断）、`validatePlanArtifacts`（plan.md/tasks/ 产物存在）。`parseFileChangeList`（`change-list.js`）兼容表格与分类列表两种清单格式、表头列顺序自适应，跳过 `.sillyspec/` 非 docs 子路径与「不修改文件」子段，CRLF 容错（2026-08-15 D-2 起 plan 覆盖对账传 `keepSillyspecDocs: true`：`.sillyspec/docs/` 模块文档 = 交付物，须被 task `allowed_paths` 认领，与 worktree apply `resolveApplyAllowSet` 口径一致）；覆盖对账用双向前缀 + glob 容差匹配，与 `quick-recommend` 共用 `change-list.js` 的 `pathMatches`。
- Revision v1：`stages` 表新增 `revision`/`reopened_from_step`/`reopened_at`/`stale_reason` 列；阶段新增 `revising`/`stale` 状态；`sillyspec run <stage> --reopen --from-step <n>` 重开已完成阶段、级联标记下游 stale；`.runtime/postcheck-result.json` 由 `scan-postcheck.js` 的 `writeStructuredResult` 落盘（本地写 `specDir/.runtime`，平台写 `runtimeRoot/scan-runs/<id>`）。
- 平台指针 fail-closed（2026-07-03）：`resolvePlatformSpecDir`（`progress.js`）在 pointer 存在但失效（specRoot 不可达/损坏/缺字段）时抛 `PointerUnreachableError`，`index.js` 顶层 catch 打印修复引导 + exit 1，**不再静默回退本地孤儿 db**；无 pointer 的纯本地项目不受影响。`sync.js` 用 `safePlatformSpecDir` best-effort 包裹保持容错。逃生口：显式 `--spec-dir`。
- doctor 结构化诊断新增 `execute-progress-plan-mismatch` 维度（2026-07-07，`doctor-diagnostics.js` D5）：检测某 change 的 execute stage status≠completed 但其 `plan.md` 所有 task checkbox 全勾（只读 `plan.md`/`tasks.md` + 只读查 stages 表，**绝不写 db**）。命中即输出 `safe_action` 建议 `sillyspec doctor --align-execute-progress --change <name>`（advisory/WARNING，不阻断任何流程）。写操作由独立的 `ProgressManager.alignExecuteToPlan` 承担（诊断/写分离，D-001@v2）。
- Agent 门控强化（2026-07-09）：
  - **validator 失败回滚**：`completeStep()` 在 validator 之前就把 stage 写成 `completed`，历史上失败分支不回滚导致 DB 与真实产物不一致。现在阶段完成校验（`runValidators`、plan postcheck、Task Review Gate、verify 实测）任一失败时，`rollbackStageCompletion()` 把 stage 回滚为 `in-progress`、最后一步重置为 `pending` 并落盘。noAI 末步（`run/stage.js`）与 `continueStep` 完成分支（`run/complete.js`）现已与 `completeStep()` 走同一套 `completeStageGates`（`run/gates.js`，三处接入的共享收尾管线：`handleScanStageCompleted` → `validateMetadata` → `validateFileLocations` → auxiliary 重置 → `runStageCompletionGates` → `handleExecuteWorktreeCleanup`），同样受上述 rollback 保护——修 multi-agent-review §2.1 S1/S2（此前 noAI 末步 / continueStep 完成分支标 completed 后绕过 gate 不回滚）；另 S3：旧 `actualCompleted===actualTotal` 守卫用 completed-only 计数，skip 任一 optional 步骤后 < total 致整条 gate 被跳过，现统一用 `completed‖skipped` 计数。
  - **noAI 步骤 --done 硬门（noai-done-bypass）**：`completeStep()`（`run/complete.js`）在标记步骤 completed 前检测 `currentStepDef.noAI`——--done 落到 noAI step（planPostcheck / scanPreflight / scanPostcheck）时同样执行对应 `_cliAction` 的 CLI 确定性校验（分支对齐 `run/stage.js` 的 noAI 自动执行），校验 throw 则步骤保持 pending 不推进。此前 noAI 校验只在 `run <stage>` 推进路径（runStage）自动执行，agent 对 noAI step 直接 `--done` 会静默标 completed 绕过校验（实证：multi-agent-platform `2026-08-13-spec-sync-visibility` tasks/ 从未生成但 plan 阶段 completed）。
  - **`progress complete-stage` / `update-step` 校验门**：两者曾是零校验后门（`progress.js completeStage/updateStep`）。现在标记 stage completed 前必跑 `runValidators`（经 `_validateStageArtifacts`），失败拒绝；`--force` 为显式逃生口，使用即向 `.runtime/audit.log` 追加审计记录。
  - **Task Review Gate fail-closed**：Gate 自身异常时不再 warning 放行，改为阻断 execute 完成并回滚。
  - **review.json git 真实性交叉校验**（`task-review.js verifyReviewGitEvidence`）：base/head 必须是仓库真实 commit（`git rev-parse --verify`）；base..head 空 diff 的非 low_risk task 报 error；`changedFiles` 与实际 diff 完全不相交报 error；git 环境不可用降级 warning 不误杀。校验目录优先 worktree（`meta.worktreePath`，排除 in-place），回退主仓库。
  - **execute stage validator**（`stage-contract.js validateExecuteOutputs` + `checkExecuteCodeEvidence`）：plan.md 声明了 task 时客观核验真实代码变更——worktree meta 的 `baseHash..HEAD` diff + 未提交改动 → 分支 `sillyspec/<change>` merge-base diff → 主工作区未提交改动，能确证零变更则阻断（"勾选 checkbox 不等于完成实现"），无法判定时降级 warning（fail-open on uncertainty）。
  - **`alignExecuteToPlan` 事实核验**：对齐前调用 `checkExecuteCodeEvidence`，plan 全勾但确证代码零变更时拒绝对齐。
  - **verify 实测对账**（`verify-postcheck.js`）：verify 产物校验通过后，CLI 用 `execSync` 执行 `local.yaml` 的 `commands.test`（10 分钟超时），结果写 `.runtime/verify-runs/<ts>/test-result.json`；自报告 PASS 但实测失败 → 阻断 verify 完成并回滚。未配置 test（或 unavailable）降级 warning 不阻断。
  - **文案修正**：validator 失败提示不再声称 `--skip-approval` 可跳过产物校验（该 flag 只作用于阶段转换/审批检查）；quick 阶段 quicklog 缺失提示同步移除。
  - **wait 选项单选强制（wait-choice-enforcement，2026-08-14）**：定义了 `waitOptions` 的 requiresWait/repeatableWait 步骤，`--answer` 必须命中预设选项之一——防止 agent 一句话代答绕过人工选择（方案选择类 wait 的 answer 本就该是选项本身，而非自由文本）。开放回答型步骤（澄清追问，answer 为自由文本）在 step 定义显式声明 `waitFreeAnswer: true` 豁免（brainstorm 的「对话式探索与需求澄清」/ brainstorm-auto 澄清步已声明）。校验覆盖三条用户答案路径：requiresWait 门 `--done --answer`（`completeStep`）、`--done --answer` 解 waiting（`resolveWaitingStepWithAnswer`）、`--continue --answer`（`continueStep`）；校验失败打印选项清单 + exit 1（fail-loud，与 requiresWait 门同风格）。实现为 `complete.js` 的 `enforceWaitChoice` helper。
  - **status 输出区分操作目标与活跃列表（status-change-pointer-ambiguous，2026-08-14）**：`progress show`/`status` 多变更汇总不再只列「活跃变更 N 个」，新增两行明确语义——「当前操作目标」（多活跃时不带 `--change` 的 run/progress 不隐式选定任一，须显式 `--change`）与「活跃变更记录」（下列为 DB 中存在的活跃记录，非操作目标）；DB 有记录但目录缺失的空壳 change（default/quick-xxx 残留）逐项标注 `⚠️ 目录缺失（残留记录，可用 doctor 清理）`，防止把残留空壳误当操作目标跑错 change。
- worktree execute 收尾 per-task review 草稿 + assess 顺带修复豁免（2026-07-30，坑 worktree-execute-apply-friction 1/2/4）：
  - **per-task review.json 草稿自动落盘**（坑2，`task-review.js generateTaskReviewDrafts`）：execute 每次 `--done`（`complete.js` execute 块，`detectExecuteBatchFinish` 之后）自动补写缺失的 `.runtime/execute-runs/<exec-id>/tasks/task-XX/review.json`。worktree execute「主 agent 直接实现」模式不走子代理 review 落盘 → review.json 全缺 → Task Review Gate 报「task-XX 缺少 review.json」阻断；现据 `resolveVerifyChangedFiles`（worktree-aware base..head diff）按各 task `allowed_paths`（`parseAllowedPaths` + `pathMatches`）归属，生成 `verdict=cannot_verify` + 非空 `requiredEvidence` 草稿（过 schema，流转 verify 兑现）。幂等：已存在的 review.json（人工/子代理已填 verdict）一律跳过不覆盖；空 changedFiles 的 task 不生成（verifyReviewGitEvidence 判空 diff 伪造）。exec-id 与 Task Review Gate（`gates.js`）/ `autoCheckPlanFromReviews` 同源：`current-execute-run-id-<change>` marker，缺失则 `generateExecuteRunId` + 落盘。
  - **assess 顺带修复豁免 + 一次报全**（坑1/4，`worktree-apply.js assessApplyRisk`）：design §6 文件清单标注「顺带修复」（表格「说明」列，正则 `/顺带修复|附带修复|顺带|drive-?by|incidental/i`，`change-list.js parseFileChangeListDetailed`）的预存债文件，assess 豁免 allowed_paths 严格校验（降 warning 不 BLOCKED）——顺带修预存债是 CLAUDE.md 规则20 鼓励的合规操作，不应被 task 边界卡死。同时 `applyWorktree(checkOnly)` 的 Gate1（文件清单）/Gate3（主区 dirty）不再短路，`assessApplyRisk` 聚合各道 reasons 一次报全（治原逐道挤牙膏）；Gate2 allowed_paths 解析复用 `parseAllowedPaths` + `pathMatches`（与 plan-postcheck/Gate1 同语义容差），消除原内联字面前缀弱匹配漂移。真实 apply（checkOnly=false）仍短路保安全。**apply 文件清单 = `resolveApplyAllowSet`（design §6 清单 ∪ 全部 task allowed_paths，execute 复盘 c）**：design §6 常只列源码、漏测试/产物文件，而 task allowed_paths（plan 阶段产出）已含——apply 若只认 design 清单会在测试/产物文件上误拦（assess 用 task allowed_paths 已放行、apply 用 design 清单又拦，两 gate 口径不一致）；union 后两源并集为准，design/plan 之外完全越界的文件仍拦。
- **Stage Review Gate**（2026-07-16；2026-08-14 tier-plan-level 改造）：brainstorm/plan/propose/execute 的"审查/自检"从当前 agent 自审改为按规模分级。`classifyReviewTier`（`review-tier.js`）判定权归 agent 的 plan_level 自主判断（CLI 只做确定性映射）：plan_level=none/light → tier=self（当前 agent 自审，放行+审计打印），plan_level=full → tier=independent（强制独立审查子代理，与执行子代理一样要求独立上下文）；无 plan_level 的阶段（brainstorm 等 plan.md 未生成）退变更文件数启发式（≤`SELF_REVIEW_FILE_THRESHOLD`（3）→ self，否则 independent）。此前 light + >3 文件会被文件数强制 independent（agent 判定被 CLI 第二套标准推翻且不透明，实证 agent 判 light 自审通过、完成时被 7 文件强制 independent review.json）。tier=independent 时 done gate 要求 `.runtime/stage-reviews/<stage>-<runId>/review.json` 存在且 verdict 非 fail，由 `stage-review.js` 校验（schema + docHash 真实性重算防伪造 + cannot_verify 必须带 requiredEvidence 的反逃逸），异常 fail-closed 回滚（与 Task Review Gate 一致）。plan 的"审查计划"从生成 step 拆成独立 step（fixedPrefix 2→3 步），消除"生成+自检同一次输出"的 self-review。运行时占位符 `{REVIEW_TIER}`/`{REVIEW_TIER_REASON}`/`{STAGE_REVIEW_RUN_ID}` 由 run/prompt.js（`outputStep`）注入 stage prompt。scanProfile（决定 maxAgentCalls）只在 scan 生效、change-risk-profile 的 P0/P1/P2 只管 apply/verify 证据，都不约束这些阶段的审查方式，故新选 plan_level/文件数维度。运行时 marker（2026-07-28，gap 6）：prompt 渲染 `{REVIEW_TIER}` 时（`run/prompt.js`）把本次 reviewRunId 落盘到 `.runtime/current-stage-review-run-id-<stage>(-<change>)`（含 change 防多 change 串台，对齐 execute `current-execute-run-id-<change>`，marker 缺失才 `generateStageReviewRunId()` 生成并落盘）；Stage Review Gate（`stage-review.js` `getLatestStageReviewRunId`）优先读该 marker、fallback 扫 `stage-reviews/<stage>-review-*` 目录（向后兼容无 marker 旧数据），保证 gate 取的 ID == prompt 注入给 agent 的 ID，修复「prompt 多次渲染 / 多次 review 时 gate 取错 ID 读错 review.json」。
- **scan profile 显式选择 + quick 平台快速接入**（2026-07-31）：`computeScanProfile`（`run/scan-profile.js`）新增 `--quick`/`--standard`/`--deep` 显式 flag，优先于按规模自动判定（三档互斥由 `run/command.js` `PROFILE_FLAGS` 检测，同时给≥2 个 exit 2）；`estimateSourceSize` 扩 `skipDirs`（补 `.next`/`.nuxt`/`coverage`/`.svelte-kit`/`target`/`vendor`/`.turbo` 等构建产物目录）+ `maxDepth=6` 兜底，修小项目因产物目录里的海量 `.js` 拉高 fileCount/sourceBytes 误判 deep。quick 档（显式 `--quick` 或小项目自动判定）只产 4 份核心文档（PROJECT/ARCHITECTURE/CONVENTIONS/STRUCTURE），frontmatter 标 `scan_depth: quick`；`scan-postcheck.js` 改 profile 感知（`SCAN_REQUIRED_DOCS_QUICK` 4 份 vs `SCAN_REQUIRED_DOCS` 7 份，`constants.js`），quick 平台模式不再因缺 INTEGRATIONS/TESTING/CONCERNS 判 failed，落 `completed_with_warnings` + `quick_profile_notice` informational check（归 `quality_warnings`）；`complete-handlers.js` 透传 `stageData.scanProfile` 给 postcheck、且主路径 manifest 写 `scan_profile.{mode,reason}`（平台据 `mode=quick` 区分接入态 scan）；深度扫描识别 `scan_depth: quick` 后即使 source_commit 匹配也允许覆盖升级为完整文档（`stages/scan.js` step5 覆盖保护新增规则）。
- **工具驾驭复盘 4 坑确定性修复**（2026-08-06，change `2026-08-06-sillyspec-self-tooling-fixes`）：
  - **stage review gate marker 缺失自生**（坑1，`run/gates.js:276`）：tier=independent 且 `getLatestStageReviewRunId` 返回空（execute 批量完成跳过 prompt 渲染、prompt 未落 marker 等场景）时，gate 自身调 `generateStageReviewRunId()` + `stageReviewMarkerPath()` 写盘 + `mkdirSync`，让 gate 读到确定 ID——错误路径从 `execute-null`（不可执行）变为 `execute-review-<review-前缀 id>`（可执行）。补充 gap 6（prompt 渲染时落 marker）的兜底：prompt 路径未走到时 gate 路径自生，两条落 marker 路径互不依赖。marker 文件名 / 位置不变（`current-stage-review-run-id-<stage>(-<change>)`）。
  - **worktree apply 交付物过滤精细化**（坑3，`worktree-apply.js#filterDeliverableFiles`）：apply 时排除 `.sillyspec/changes/` + `.sillyspec/.runtime/` + `.sillyspec/quicklog/` + `meta.json`，**保留 `.sillyspec/docs/`（dogfood 模块规范文档视为交付物，随变更 apply 回主仓）**。原一刀切排除整个 `.sillyspec/` 导致模块文档改动滞留 worktree 分支（exec-g defer 项落地）。`verify-postcheck.js` 改 import `filterDeliverableFiles` 去双写；`index.js` apply / assess 自动 apply 的用户面消息同步为「changes/.runtime/quicklog 不自动 apply，模块文档 docs/ 会自动 apply」。
  - **archive CLI 下沉 git add**（坑4，`run/complete-handlers.js:137`）：`unregisterChange` 后 CLI 确定性 `safeGit add -- .sillyspec/changes/archive/ + .sillyspec/docs/`，不靠 archive step5 prompt 驱动。step5 prompt 的 git add 已精确化（`git add .sillyspec/changes/archive/` + `git add .sillyspec/docs/<project>/modules/`，勿用 changes/ 或 docs/ 整目录——会裹挟其他活跃变更；坑 index-staged-cross-change-contamination），保留作幂等兜底。safeGit 失败不阻断归档（目录已移动 + change 已注销），由 step5 prompt + agent `git status` 核对兜底。
  - **归档清理 runId marker**（2026-08-10，`run/complete-handlers.js#archiveWorktreeCleanup`）：归档时除 worktree cleanup 外，顺带清理该 change 的 execute / stage-review runId marker（`current-execute-run-id-<change>` + `current-stage-review-run-id-<stage>-<change>`，normal + 自愈分支共用）。marker 只服务 execute→verify→archive 期间，归档后无读者；只写不删会让 `.runtime/` 随变更数无限累积（单仓库几十个）。runtimeRoot 解析同写入侧 `resolveRuntimeRoot(platformOpts, specBase)`（锚主仓，平台模式不误清理）。失败仅 warn 不阻断归档。
  - 坑5（多代理中间态 import 链污染，D-05）架构级延后入 [ROADMAP.md](../../ROADMAP.md)。
- **跨仓 task 支持**（2026-08-12，change `2026-08-11-cross-repo-task-support`）：单个 change 的 task 可分散到主仓 + 多个跨仓仓实现（dogfood 自指、monorepo 多包仓等场景）。**单仓 change 零回归**（所有 task 无 `repo:` → MultiRepoContext 退化为 `{main:{...}}` 单值 map，7 个调用点全走原路径）。跨仓机制要点：
  - **task 卡 frontmatter 扩展**：`tasks/task-NN.md` 新增可选 `repo:`（缺省='main'，不写=主仓 task）、`base_commit:` / `head_commit:`（CLI 双锡点，跨仓 task 专用）。`base_commit` 由 CLI 派发前实时 `git -C <跨仓仓根> rev-parse HEAD` 落盘锁 base（防同 Wave 多 task 改同跨仓仓时 HEAD 推进致 diff 漂移，约束①）；`head_commit` 由 agent 在跨仓 task 子代理 commit 后、写 review.json 前落盘。`parseRepo`/`parseBaseCommit`/`parseHeadCommit`（`plan-postcheck.js`）解析。跨仓 task 的 `allowed_paths` 指**相对跨仓仓根**的路径（非主仓根）。
  - **local.yaml `repos:` 段**（见上方「local.yaml 配置口径」）：跨仓仓注册表 `Map<key, path>`，`main` 隐式不注册。跨仓 change 缺注册 → fail-closed 抛错（约束②）。
  - **MultiRepoContext 运行时**（`src/run/multi-repo-context.js`，进程级内存对象，不入库不持久化，随 CLI 进程生死）：execute 启动时由 `getOrCreateMultiRepoContext`（`run/shared.js`）构造一次，贯穿 execute/apply/verify 不重建（G2）。`resolve(repoKey)` 返回 `RepoEntry`（含 `gitDir`/`worktreePath`/`projectRoot`/`isMain`/`resolveHead`/`resolveBase`）；主仓 `isMain=true` 读 meta，跨仓 `isMain=false` 实时 git 验证可达（fail-closed）。`hasCrossRepo()` 判是否含跨仓 task（execute prompt 分叉用）。
  - **pathOwners 按仓分段**（`plan-postcheck.js`）：`pathOwners` 改按 `(repo, path)` 二元组聚合（键=`${repo}|${path}`），跨仓 task 与主仓 task 同名物理路径分属不同 repo 不判冲突。`validateDesignFileCoverage` 支持 design §6 按仓分段（段头 `## <repo> 仓变更`），跨仓仓路径相对跨仓仓根对账。
  - **execute prompt per-task workdir**（`execute.js buildWavePrompt`）：签名加 `ctx`（MultiRepoContext）。有 ctx 且本 Wave 含跨仓 task 时，注入 per-task workdir 多值表（主仓 task workdir=主仓 worktreePath，跨仓 task workdir=跨仓仓根）+ 跨仓 task commit 指引（直接改跨仓仓主干+commit，不经主仓 worktree、不建分支）+ 双锡点说明；无 ctx 或单仓 Wave → 沿用旧单值 worktreePath（零回归）。同 Wave 允许主仓+跨仓 task 混合。
  - **跨仓 task review.json**：路径仍主仓 `.runtime/execute-runs/<runId>/tasks/task-XX/review.json`，但 `base`/`head` 是**跨仓仓的 commit**（取 task 卡 `base_commit`/`head_commit` 锡点，非瞬时 HEAD）。`review.repo` 字段（缺省='main'）标该 task 所属仓，`verifyReviewGitEvidence`/`validateTaskReviews` 按 `review.repo` 切 gitDir（跨仓 gitDir=跨仓仓根）。schemaVersion 读侧接受 `[1,2]`（`REVIEW_SCHEMA_VERSIONS_ACCEPTED`，向后兼容旧 v1 review）；写侧常量 `REVIEW_SCHEMA_VERSION=1`（与 stage-review 共享，跨仓 task 草稿追加 `repo` 字段而非升 v2）。
  - **跨仓 apply = no-op**（`worktree-apply.js` G1）：跨仓 task 的代码由子代理直接 commit 到跨仓仓主干（落盘即落地），主仓 apply 对跨仓 task 不打 patch、不 cleanup——只校验 `review.head` 是跨仓真实 commit。`resolveApplyAllowSet` 返回 `Map<repo, Set<path>>` 按 repo 切片。主仓 task 走原 apply 路径不变。
  - **跨仓 verify per-repo cwd**（`verify-postcheck.js` A6）：`runVerifyTestCheck` per-repo cwd，跨仓仓有 `package.json` 则在该仓根跑 `npm test`（决策④），无则跳过+warn；跨仓仓只跑 full npm test，不参与 module 子集策略（module 配置主仓强相关）。`resolveVerifyChangedFiles` per-repo 取 diff 合并。
  - **不涉及生命周期/DB schema**（design §7.5/§8）：MultiRepoContext 是运行期内存对象，不跨进程、不持久化、无状态机；进度库（sillyspec.db）仍是主仓单库；review.json 多一个可选 `repo` 字段（JSON 文件，非 DB 列）；`db.js DB_SCHEMA_VERSION` 不变。跨仓仓的 git commit 由 task 子代理负责，SillySpec 不管理跨仓仓生命周期。
