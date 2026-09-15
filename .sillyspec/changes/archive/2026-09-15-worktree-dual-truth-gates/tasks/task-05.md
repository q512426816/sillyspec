---
id: task-05
title: 'Dual-root required-evidence file verification in runRequiredEvidenceCheckV2'
title_zh: 'evidence 双根核验（runRequiredEvidenceCheckV2 主仓 ∪ worktree 双根取数）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-15 21:34:09
priority: P0
depends_on: [task-04]
blocks: [task-06]
requirement_ids: [FR-05]
decision_ids: [D-005@v1]
allowed_paths:
  - src/verify-postcheck.js
  - test/verify-evidence-triple.test.mjs
  - test/verify-evidence-committed-diff.test.mjs
target_files:
  - src/verify-postcheck.js
goal: >
  runRequiredEvidenceCheckV2 逐文件核验从单根 join(cwd, vf) 扩为双根候选 [cwd, worktree 根]，
  apply 前只存在于 worktree 的新文件不再误报「文件不存在」错误阻断 verify——修坑⑤消费侧
  取数（生成时机与 diffHit 口径均不动），worktree meta 缺失 / in-place 时退单根零回归
  （FR-05 / D-005@v1）。
implementation:
  - 'src/verify-postcheck.js 内部函数 runRequiredEvidenceCheckV2（~2098 起；导出入口 runVerifyRequiredEvidenceCheck:2041 签名不动）开头解析 worktree 根：metaPath = join(specBase 或缺省 join(cwd, ".sillyspec"), ".runtime", "worktrees", changeName, "meta.json")，与 resolveVerifyChangedFiles（~1060）同源口径'
  - 'meta 存在且 mode !== in-place-fallback 且 existsSync(meta.worktreePath) → 候选根 [cwd, worktreePath]；否则 [cwd]（零回归）'
  - '逐文件核验循环（~2144-2163）：filesExist = 任一根 existsSync(join(root, vf))；mtime 取命中根 statSync——双根都在取 worktree 根（R-05：新改动所在）；遍历形态沿 verify-probes.js buildAcceptanceHints（223-237）for (const root of [cwd, wtRoot]) 双根先例'
  - 'reason 文案保持「文件不存在」语义仅在两根皆缺时报；diffHit 逻辑不动（resolveVerifyChangedFiles 已 worktree-aware，changedSet 计算保持现状）'
  - '本卡只动 runRequiredEvidenceCheckV2 区段——task-04 已改同文件 attributeSuspectTasks（~2437）/reconcileTargetFiles（~2578），Edit 前重读文件最新态，勿回退 task-04 改动'
acceptance:
  - 'FR-05 GWT-1：证据账 verifiedFiles 声明的文件仅存在于 worktree（主仓不存在）→ 核验 filesExist=true、mtime 取 worktree 根，明细不再产生「文件不存在」红项，verify 不再被错误阻断'
  - 'FR-05 GWT-2：worktree meta 缺失或 mode=in-place-fallback → 候选根退 [cwd] 单根，核验结果与现状一致（零回归）'
  - '双根同文件都在 → mtimeOk 取 worktree 根的 statSync 读数（主仓旧 mtime 不误判为过期）'
  - 'diffHit 行为与改动前一致：code 类仍查 changedSet、artifact 类仍豁免 diff'
  - '既有 test/verify-evidence-triple.test.mjs、test/verify-evidence-committed-diff.test.mjs 单根 fixture 全绿'
verify:
  - '本卡新增用例由 task-06 统一收口（test/worktree-dual-truth-gates.test.mjs evidence 双根组）'
  - 'node --test test/verify-evidence-triple.test.mjs test/verify-evidence-committed-diff.test.mjs（既有证据测试零回归）'
  - 'node test/run-tests.mjs && node test/check-syntax.mjs（全量回归 + lint）'
constraints:
  - 'meta 缺失 / in-place-fallback / worktreePath 目录不在 → 一律退单根 [cwd]，不新增报错路径（零回归底线）'
  - '勿动 diffHit 与 resolveVerifyChangedFiles（后者补齐段口径残留为 R-09 已知边界，本变更不动）'
  - '只改 runRequiredEvidenceCheckV2 区段，不碰 task-04 已落的 attributeSuspectTasks 多归属与 reconcileTargetFiles join 消费端；Edit 前重读 verify-postcheck.js 最新态（多 agent 并行）'
  - '不改 runVerifyRequiredEvidenceCheck 导出签名与 gates 接线、不动 evidence 生成时机（execute Task Review Gate 既有契约）'
related_tests:
  - test/verify-evidence-triple.test.mjs
  - test/verify-evidence-committed-diff.test.mjs
expects_from:
  - 'task-04：src/verify-postcheck.js 已由其改过 attributeSuspectTasks——本卡 Edit 前重读最新态，只动 runRequiredEvidenceCheckV2 区段'
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
