---
id: task-04
title: 'Unify auto-check diff scope + multi-attribution (collectWorktreeChangedFiles + prefetchDiffFileSet + attributeSuspectTasks)'
title_zh: '勾选口径统一 + 归因多归属（helper + prefetchDiffFileSet + attributeSuspectTasks）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-15 21:34:09
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-004@v1]
allowed_paths:
  - src/task-review.js
  - src/run/complete.js
  - src/verify-postcheck.js
target_files:
  - src/task-review.js
  - src/run/complete.js
  - src/verify-postcheck.js
goal: >
  修坑④——勾选守卫 prefetchDiffFileSet 只算 base..head diff（worktree 已提交），子代理默认
  不 commit 时 diffFileSet 恒空/缺文件，shouldAutoCheckTask 草稿零 diff 守卫全跳过；同文件
  多 task 归因被 attributeSuspectTasks 首中即止吞掉。本 task 抽公共 helper
  collectWorktreeChangedFiles（porcelain ∪ committed merge-base 补齐，D-004@v1 口径单一化）
  供勾选守卫与草稿归因共用，守卫侧并入并剔 meta.baselineFiles 防误勾，attributeSuspectTasks
  改全量多归属（string[]，消费边界 join 保下游零改动）。
implementation:
  - 新增导出 helper collectWorktreeChangedFiles(cwd, changeName, meta = null, opts = {})（src/task-review.js，签名按 design 接口定义）——meta 缺省内部 WorktreeManager.getMeta，无 meta（getMeta 亦 null）返 []（fail-open）；gitDir 取 meta.worktreePath（mode 非 in-place-fallback 且目录存在）否则退化 cwd（in-place 分支——porcelain 取 cwd，保住现状主仓并入，R-08）；porcelain（status --porcelain --untracked-files=all，parsePorcelainFiles 解析）∪ committed（仅 gitDir ≠ cwd 时 merge-base(主仓HEAD, wtHEAD)..wtHEAD 的 diff --name-only 补齐，防双并）→ 正斜杠归一文件集；git 失败返 []
  - helper 过滤集与 resolveVerifyChangedFiles 口径对齐（滤 .sillyspec/changes/、.sillyspec/.runtime/、.sillyspec/quicklog/，保 .sillyspec/docs/** 交付物，verify-postcheck.js:1073-1076）——草稿侧现状滤整个 .sillyspec 前缀（task-review.js:1346），统一后的行为差用回归测试锁定
  - generateTaskReviewDrafts 并入段（task-review.js:1340-1370）改消费同一 helper——保留 if (attribution.mergeGitDir) 守卫与并入计数注记打印，内部 wtStatus/committedFiles 两段替换为 helper 调用（meta 传 attribution.meta 或缺省内取）；:1350 既有「两处口径须同步改」注记更新为指向 helper 口径
  - prefetchDiffFileSet（src/run/complete.js:969-978）并入——diffFileSet = base..head diff ∪ collectWorktreeChangedFiles 结果，再剔 meta.baselineFiles（R-07——merge-base..wtHead 含 baseline checkpoint 提交，夹带文件不剔则「声明未做」task 误勾）；剔除按正斜杠归一后 exact 匹配（两侧同 git 口径路径），baselineFiles 缺失按 [] 容错
  - 两个调用点（complete.js:1085 与 :1169）均在 cwd/changeName 作用域内——buildDraftContext（:936-962）已取 meta，把 cwd/changeName/meta 随 ctx 透传给 prefetchDiffFileSet（ctx 扩展字段对 shouldAutoCheckTask 只读 gitDir/base/head/diffFileSet 零影响）；helper 经顶部既有静态 import（:26，from ../task-review.js）扩展引入，勿动态 import（task-review.js 不依赖 run/complete.js，无环）
  - attributeSuspectTasks（src/verify-postcheck.js:2437-2467）多归属——:2462 的 !map.has(n) 首中即止改全命中收集，map 值 string 改 string[]（同文件多 task 全 push、去重保序；runDirs 字典序倒序的「最新 run 优先」扫描顺序保持），JSDoc @returns 同步更新
  - 消费端 reconcileTargetFiles（:2578-2583）——suspect.get 取值改 string[]，:2582 组装边界将数组 join('、') 成 string 写入 suspectTask 字段（空数组仍走无 suspectTask 分支）；:2487 JSDoc 的 suspectTask 形态保持 string，gates.js:1606 / archive-delta.js:213 与 :325 下游渲染零改动（本 task 勿动这两个下游文件）
  - resolveVerifyChangedFiles（verify-postcheck.js:1045）自身逻辑不动（R-09——补齐段含 form A 专属语义），其 :1053「与 generateTaskReviewDrafts 的并入口径同源」注记更新指向 helper 口径
  - 新增 NEW:test/worktree-dual-truth-gates.test.mjs（本 task 段）——①helper 单测（worktree 模式 porcelain ∪ committed 两形文件集、in-place 分支 porcelain 取 cwd、git 失败 fail-open 返 []）；②勾选（worktree 未提交改动命中 task 草稿 changedFiles → shouldAutoCheckTask 勾选；baseline 夹带文件 ∈ meta.baselineFiles 不误勾；in-place 未提交改动并入不丢）；③多归属（同文件被多 task review changedFiles 声明 → reconcileTargetFiles 的 undeclared 条目 suspectTask 为「task-01、task-02」形 string，gates/archive-delta 渲染零改动）
acceptance:
  - 'FR-04 GWT1：worktree 有未提交改动（子代理默认不 commit）且某 task 草稿 changedFiles 命中 → prefetchDiffFileSet 的 diffFileSet = base..head ∪ porcelain ∪ committed 补齐（剔 baselineFiles 后），shouldAutoCheckTask 草稿守卫通过、task 被自动勾选'
  - 'FR-04 GWT2：仅被 baseline checkpoint 夹带的文件（∈ meta.baselineFiles）被剔出 diffFileSet，声明了它但未实现的 task 不被误勾（防伪底线保持）'
  - 'FR-04 GWT3：in-place 模式 helper porcelain 取 cwd（现状并入不丢）；无 meta / git 失败 → helper 返 []、守卫退回 base..head 现状（fail-open 不放大勾选面）'
  - 'FR-04 GWT4：attributeSuspectTasks 返 Map 值为 string[] 全命中收集（最新 run 优先序保持），reconcileTargetFiles 边界 join(''、'') 成 string——gates.js:1606 / archive-delta.js:325 下游零改动（test/archive-delta.test.mjs:111 的 suspectTask string 断言保持通过）'
  - generateTaskReviewDrafts 并入段与 prefetchDiffFileSet 消费同一 helper（口径单一化），两处既有「口径同步」注记更新指向 helper；resolveVerifyChangedFiles 行为零改动（test/verify-evidence-committed-diff.test.mjs 全绿）
  - test/execute-batch-zero-diff.test.mjs、test/task-review-draft.test.mjs、test/archive-delta.test.mjs、test/verify-evidence-committed-diff.test.mjs 与新增测试全绿
verify:
  - '本卡新增用例由 task-06 统一收口（test/worktree-dual-truth-gates.test.mjs 五组）'
  - node --test test/execute-batch-zero-diff.test.mjs test/task-review-draft.test.mjs test/archive-delta.test.mjs test/verify-evidence-committed-diff.test.mjs
  - npm test && npm run lint （全量回归零红零告警，task-06 收口后全量跑）
constraints:
  - 勿改 resolveVerifyChangedFiles 补齐段逻辑（R-09——form A 专属语义，仅注记指向 helper）；勿改 shouldAutoCheckTask 逐 task 回退实测路径（complete.js:1041）；勿动 gates.js / archive-delta.js（下游零改动是验收项）
  - fail-open 契约——helper git 失败返 []，prefetchDiffFileSet 退回 base..head 现状，不放大勾选面；守卫不降级（D-004 否决 warning 放行勾选）
  - attributeSuspectTasks 的 string[] 只在 reconcileTargetFiles 组装边界 join 成 string，suspectTask 对外形态保持 string
  - Windows 路径正斜杠归一；Edit 前重读文件最新态（R-06——verify-postcheck.js 有并行会话在途改动）；保持 LF 行尾、frontmatter 闭合
  - task-05（evidence 双根）同文件 verify-postcheck.js 在本 task 之后串行，本卡勿越界改 runRequiredEvidenceCheckV2
related_tests:
  - test/execute-batch-zero-diff.test.mjs
  - test/task-review-draft.test.mjs
  - test/archive-delta.test.mjs
  - test/verify-evidence-committed-diff.test.mjs
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
