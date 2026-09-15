---
author: qinyi
created_at: 2026-09-15T20:58:00
---

# Decisions: 2026-09-15-worktree-dual-truth-gates

> 本次变更的决策台账。每条有稳定版本 ID，被 design.md §11 引用。
> 源需求：用户 2026-09-15 multi-agent-platform 仓 execute 全流程五坑实证（坑文档
> `docs/sillyspec/execute-baseline-overlay-carries-broken-parallel-wip.md`，存于 multi-agent-platform 仓）。

## D-001@v1: overlay 隔离消费既有 own/foreign oracle，不做语法校验
- type: architecture
- status: accepted
- source: design
- question: baseline overlay 如何识别「并行会话在途半成品」？做语法探测吗？
- answer: 消费既有归属 oracle（`src/foreign-declared.js` 的 `splitOwnVsForeignDiffFiles`，声明源=其他 quick 会话 guard.json allowedFiles + 其他变更 design §6 清单，own 优先）。foreign 声明文件在 staged/unstaged patch 道与 untracked 复制道全排除（worktree 取基线 HEAD 版本）。语法/esbuild 探测不做——语言特定、误报率高、CLI 不该带语言工具链依赖。
- normalized_requirement: `_overlayBaseline` 接收 changeName；staged/unstaged diff 文件集与 untracked 集先过 `splitOwnVsForeignDiffFiles`，foreign 文件从 patch pathspec（`:(exclude)<path>`）与复制道剔除，隔离清单（文件←归属者）显式打印一行；未声明文件维持现行为 + 既有 advisory。
- impacts: [FR-01, §1]
- evidence: `src/worktree.js:1906`（_overlayBaseline 现仅 `.sillyspec` 前缀排除）、`src/foreign-declared.js:195`（splitOwnVsForeignDiffFiles）、`src/run/stage.js:350`（quick guard.json 会话启动即写）
- priority: P0
- 锚点: src/worktree.js:_overlayBaseline
- 模块域: worktree
- 否决理由: 语法探测（tsc --noEmit/esbuild transform）：语言特定、误报率高、CLI 依赖重——坑文档「期望」也只作次选（「至少」之后才是理想态）
- 复潮条件: 出现语言无关且零依赖的通用损坏探测方案，且归属面（guard.json/design §6）实证漏放率 ≥20%
- 故障面: oracle 误判（他者声明覆盖本变更文件）→ own 优先判据兜底（loadOwnDeclaredSet 声明过即归 own）；隔离后 worktree 缺并行会话已修 bug 的场景 → 主仓 HEAD 版本本就是干净基线
- 退役判据: 出现比显式声明面更完整的归属事实源（如文件级 mtime 会话锁）时

## D-002@v1: no-op 过滤放 applyWorktree changedFiles choke point，apply/assess 同口径
- type: architecture
- status: accepted
- source: design
- question: 「worktree 工作区内容 = 主仓 HEAD」的 no-op 文件在哪一层剔除？
- answer: `applyWorktree` step 2 的 changedFiles 计算处（filterDeliverableFiles 之后）一处过滤——apply 与 assess（assess 复用 applyWorktree checkOnly）自动同口径。比对方式：worktree 内 `git hash-object --stdin-paths`（分批，沿用 ql-20260912-010 分批先例）对照主仓 `git ls-tree -r HEAD` 一次取的 blob map；相等即 no-op，剔出 changedFiles/deletedFiles/absentAfterMerge，warnings 列清单。每调用现算不缓存（主仓 HEAD 在 assess 与 apply 间推进时安全）。
- normalized_requirement: changedFiles 过滤后新增 no-op 剔除段：对「worktree 工作区存在且主仓 HEAD 树存在」的候选文件批量 hash-object 对照，相等者剔出三集并计 warnings；删除类（worktree 无文件）不参与（主仓 HEAD 有内容即非 no-op）。
- impacts: [FR-02, §2]
- evidence: `src/worktree-apply.js:1208`（filterDeliverableFiles choke point）、`src/worktree-apply.js:2373`（assessApplyRisk 复用 checkResult.changedFiles）
- priority: P0
- 锚点: src/worktree-apply.js:applyWorktree
- 模块域: worktree
- 否决理由: 仅 assess 侧过滤——apply 回放仍带 no-op 文件，双口径继续漂移（本次修的就是口径漂移）
- 复潮条件: 无（单点收敛是明确更优解）
- 故障面: hash-object/ls-tree 失败 → 该批文件保守不剔（保留 changed，退回现状误报而非误放行）
- 退役判据: apply/assess 改为内容寻址交付（blob 级）时

## D-003@v1: 生成物供给走 local.yaml `worktree.supplyFiles`，不做 gitignore 自动探测
- type: architecture
- status: accepted
- source: design
- question: .gitignore 生成物（如 build-id.ts）如何随 worktree 供给？
- answer: local.yaml 新增 `worktree.supplyFiles`（string[]，精确路径 + glob `*`/`**`，默认空=零行为变化）。worktree create step 5.8（deps 供给）后新增供给步：glob 展开→主仓存在则复制（mkdir -p 父目录），缺失 console.warn；meta.supplyFiles 记录实供清单。gitignore 物天然不进 assess/apply 面（`ls-files --others --exclude-standard` 遵循 .gitignore）。自动探测 gitignore 生成物不做——无法判定哪些是构建必需，误供给噪声大。
- normalized_requirement: config-schema.js 注册键 `worktree.supplyFiles`（producer=local.yaml → worktree.js create 供给步展开 glob 复制 → consumer=worktree 文件系统 + meta.supplyFiles）；无新依赖，glob 转换自实现。
- impacts: [FR-03, §3]
- evidence: `src/config-schema.js:59-136`（现有键位）、`src/worktree.js:736-747`（step 5.8 deps 供给位）、`src/worktree-apply.js:1202`（ls-files --exclude-standard）
- priority: P0
- 锚点: src/config-schema.js
- 模块域: worktree, setup
- 否决理由: 自动探测——无法判定构建必需性，误供给噪声大；且 gitignore 文件数量可能巨大（dist/node_modules 类）
- 复潮条件: 出现可靠的「构建输入图」信号源（如项目自带 manifest），探测面可收敛时
- 故障面: glob 误配展开风暴 → 展开上限帽截断 + 单文件失败不阻断 create；供给物过期（主仓重新生成前）→ 构建期自然报错，与主仓缺生成物同症状
- 退役判据: 项目自带构建输入 manifest 可机读时（自动探测复潮条件同）

## D-004@v1: 勾选守卫 diff 集对齐 D-004@v1（库内）worktree 分支 diff+porcelain 口径，抽公共 helper
- type: architecture
- status: accepted
- source: design
- question: 自动勾选漏计（坑④）如何修？守卫降级吗？
- answer: 不降级。根因是 `prefetchDiffFileSet` 的 diffFileSet 只算 `git diff base..head`（worktree 已提交），而草稿归属（generateTaskReviewDrafts）并入了 porcelain 未提交 + merge-base committed 补齐——子代理默认不 commit 时 diffFileSet 恒空/缺文件，勾选守卫全部跳过。修法：把「worktree 改动文件集（porcelain ∪ committed merge-base 补齐）」抽成公共 helper，complete.js 勾选守卫与 task-review.js 草稿归因共用（两处既有「口径须同步改」注记正好收口）。同文件多 task 归属：`attributeSuspectTasks` 首中即止改全量多归属（map 值 string[]），③类报告渲染完整作者列表。
- normalized_requirement: 新增公共 helper（输入 cwd/changeName/meta → 输出 worktree 改动文件集），prefetchDiffFileSet 消费；shouldAutoCheckTask 逐 task 回退路径（git diff -- files）保持；attributeSuspectTasks 值改 string[] 且消费端渲染跟随。（Grill 细化：①守卫消费侧剔除 meta.baselineFiles——merge-base..wtHead 含 baseline checkpoint 提交，夹带文件不剔则「声明未做」task 误勾；②helper 含 in-place 分支（porcelain 取 cwd），保住现状 in-place 并入；③resolveVerifyChangedFiles 补齐段本次不动，注记指向 helper 口径，记已知残留；④attributeSuspectTasks 在 reconcileTargetFiles 组装 suspectTask 边界 join 成字符串，gates.js/archive-delta.js 下游零改动。）
- impacts: [FR-04, §4]
- evidence: `src/run/complete.js:969`（prefetchDiffFileSet commit-only）、`src/task-review.js:1340-1370`（草稿并入段「两处口径须同步改」注记）、知识库 decisions/worktree.md D-004@v1（归因唯一事实源=worktree 分支 diff+porcelain）、`src/verify-postcheck.js:2462`（!map.has(n) 首中即止）
- priority: P0
- 锚点: src/run/complete.js:prefetchDiffFileSet
- 模块域: core-engine, runtime
- 否决理由: 守卫降级为 warning 放行勾选——丢零 diff 防伪造底线（W2 task-04 FR-03 既有契约）
- 复潮条件: 无（口径对齐是契约兑现，非新决策）
- 故障面: helper 对 meta 缺失/in-place 返回 [] → 守卫退回 base..head 现状（fail-open 不放大勾选面）；多归属渲染膨胀 → 截断展示
- 退役判据: review/勾选改为 per-task 锡点锚定（base/head 写进 task 卡）全量落地时

## D-005@v1: required-evidence 消费侧双根核验，生成时机不动
- type: architecture
- status: accepted
- source: design
- question: verify-required-evidence 误报（坑⑤）在哪一侧修？
- answer: 消费侧。`runRequiredEvidenceCheckV2` 逐文件核验（存在性/mtime）从单根（主仓 cwd）改双根：候选根 = [cwd, worktree 根]（worktree 根经 `specBase/.runtime/worktrees/<change>/meta.json` 解析，与 resolveVerifyChangedFiles 同源）；文件在任一根存在即 filesExist=true，mtime 取所在根 stat。diffHit 不动（resolveVerifyChangedFiles 已 worktree-aware）。生成时机不动——execute 期 Task Review Gate 写入是既有契约（gates.js:1172）。
- normalized_requirement: runRequiredEvidenceCheckV2 增双根解析与逐文件双根取数；worktree meta 缺失/in-place 时退单根（零回归）。
- impacts: [FR-05, §5]
- evidence: `src/verify-postcheck.js:2146-2151`（join(cwd, vf) 单根）、`src/verify-probes.js:223-237`（buildAcceptanceHints 双根先例）、`src/run/gates.js:1172`（生成点）
- priority: P0
- 锚点: src/verify-postcheck.js:runRequiredEvidenceCheckV2
- 模块域: core-engine
- 否决理由: evidence 生成推迟到 apply 后——动 Task Review Gate 契约且丢「verify 前拦截」价值
- 复潮条件: 无
- 故障面: worktree 根解析失败 → 退单根现状（误报回潮但不误放行）；双根同文件内容分叉取 worktree mtime → 主仓后写场景误判 mtimeOk=false → 属实报（主仓后写=apply 后态，不该在 verify 期）
- 退役判据: verify 核验统一改在 worktree 内执行（单根化）时
