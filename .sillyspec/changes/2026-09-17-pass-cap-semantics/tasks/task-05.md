---
id: task-05
title: '配套四小修——skip 跨仓档位 / adopt 勾选两层 / probe7 多根 / design 无段头缺口'
title_zh: '配套四小修——skip 跨仓档位 / adopt 勾选两层 / probe7 多根 / design 无段头缺口'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 12:09:11
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: ['FR-07', 'FR-08', 'FR-09', 'FR-10']
decision_ids: ['D-008@v1']
allowed_paths:
  - src/verify-postcheck.js
  - src/task-review.js
  - src/run/complete.js
  - src/verify-probes.js
  - src/design-facts.js
target_files:
  - src/verify-postcheck.js
  - src/task-review.js
  - src/run/complete.js
  - src/verify-probes.js
  - src/design-facts.js
goal: >
  修复 D-008 四处门的自身失明点（design §5）：①主仓 skip 时跨仓仍盲跑 fallback npm test 造成假败打回（verify-postcheck）②adopt 通道勾选断链（task-review 白名单 + complete 跨仓 diff 源两层）③probe7 测试文件在跨仓仓根读不到、矩阵恒预填 partial（双根扩多根）④design 清单无段头时跨仓注册路径被按主仓根逼 NEW: 前缀（降 warning 提示补段头）——四处均按「只消除假红/假漏、不引入假绿」档位修复，让批次 A 的语义封顶有完整的门眼睛。
implementation:
  - 'skip 跨仓档位（FR-07 / src/verify-postcheck.js:1421-1426 调用点 + :1445-1471 mergeCrossRepoResults）：runVerifyTestCheck 尾声 return mergeCrossRepoResults(mainResult, ctx) 前判 mainResult.status——skipped 时进短路档：逐跨仓 entry 检其 own local.yaml（<projectRoot>/.sillyspec/local.yaml，读法复用 :1501-1511 + extractTestCommand :1507），未自配 commands.test 的跨仓不再跑 fallback npm test、随主仓 skip 短路通过（合并结果保持 skipped，outputTail/reason 注记「主仓 skip 短路」与「可配 own local.yaml commands.test 纳入实测」出路）；自配了 commands.test 的跨仓仍走 runCrossRepoFullTest 原路径执行；own local.yaml 配 test_strategy: skip 的跨仓单独 skip（逐仓生效）。主仓 passed/failed 或单仓 ctx 路径零变化'
  - 'adopt 勾选两层之白名单层（FR-08 / src/task-review.js:340-357）：isExplicitReviewWrite 由 writeTaskReview 单前缀匹配扩为前缀集合 [writeTaskReview, adoptTaskReviewMechanics]（reviewProvenanceStamp 落 writtenBy=<channel>#pid，adopt 通道 :1824 落值 adoptTaskReviewMechanics#pid...）——adopt 通道合并写入的 review 带 agent 供给 verdict，按非草稿处理、不再被草稿零 diff 守卫拦；:340-354 函数注释同步补 adopt 通道依据'
  - 'adopt 勾选两层之 diff 源层（FR-08 / src/run/complete.js:1013-1038 prefetchDiffFileSet）：主仓 base..head + collectWorktreeChangedFiles 现状保持，另并入跨仓仓根双源——逐跨仓根跑 git diff --name-only HEAD~1..HEAD ∪ git status --porcelain --untracked-files=all（复用 cross-repo-reconcile.js:94-106 双源口径；gitQuiet 本文件已 import，数组参数防 shell 拆词），产物路径正斜杠归一进 diffFileSet；跨仓根读侧 = <cwd>/.sillyspec/local.yaml 的 parseRepoRegistry（design-facts.js:474-477 同款口径）；git 失败/registry 不可读 fail-open 跳过该仓不炸主流程。效果：shouldAutoCheckTask 的 ctx.diffFileSet.has(f)（:1089-1096）能命中跨仓 review 的仓根相对 changedFiles（adopt 通道 task-review.js:1731-1742 产物），跨仓 task 自动勾选不再断链'
  - 'probe7 跨仓多根（FR-09 / src/verify-probes.js:860-874 buildAcceptanceHints）：readTest 的双根循环 [cwd, wtRoot]（:868）扩多根——并入 local.yaml repos 注册的跨仓仓根（join(specBase, local.yaml) + parseRepoRegistry，probe8 :312-316 同款先例；调用点 :1211 处 specBase 已在作用域，解析注册根后传入）；根列表去重、空值过滤，cache 键与 hints 输出形态不变（既有消费方零回归）；签名向后兼容，无 repos 注册的单仓调用行为零变化'
  - 'design 无段头缺口（FR-10 / src/design-facts.js:461-469 无段头分支）：checkAgainstRoot(cwd, ...)（:467）前对清单行做跨仓注册路径前缀命中判定（local.yaml repos 注册值/basename 前缀命中；registry 读取自 :474-477 有段头分支上移、两分支共用）——命中行不再按主仓根打 design_file_ref_invalid 逼 NEW: 前缀，降 warning 提示「该行疑似跨仓 <repo> 路径——补 ## <repo-key> 仓变更 段头后按仓根核验」；纯主仓行与有段头路径零变化'
acceptance:
  - 'FR-07 GWT1：主仓 test_strategy=skip 且跨仓无自配 commands.test → verify 测试合并短路通过，跨仓不再执行 fallback npm test（假败消除），合并结果含短路注记'
  - 'FR-07 GWT2：跨仓自配 commands.test → 仍执行；跨仓 own local.yaml test_strategy=skip → 该仓单独 skip、逐仓生效'
  - 'FR-08：writtenBy=adoptTaskReviewMechanics#pid 形态的 review（verdict 非 fail）→ isExplicitReviewWrite 判真、tasks.md 自动勾选生效；跨仓 review 的仓根相对 changedFiles 命中并入跨仓双源后的 diffFileSet'
  - 'FR-09：测试文件位于跨仓仓根时 buildAcceptanceHints 内容可读、命中不再恒空（矩阵不因跨仓恒预填 partial）'
  - 'FR-10：design 清单无「## <repo> 仓变更」段头且行含跨仓注册路径 → 降 warning 提示补段头，不再按主仓根逼 NEW: 前缀'
  - '兼容零变化：单仓 ctx / 主仓非 skip / 跨仓自配 test / design 有段头跨仓段——四条既有路径行为不变；npm run lint（check-syntax）通过'
verify:
  - npm test
  - npm run lint
constraints:
  - 'src/cross-repo-reconcile.js 只读复用（:94-106 双源口径），不修改、不进 allowed_paths'
  - '不改任何测试文件：四小修的断言随行统一归 task-07（plan 任务总表）；npm test 若出现与本 task 行为变化相关的红（cross-repo-verify / task-review-adopt / probe7-anchor-testfile / design-facts），属 task-07 收口范围——不得在本 task 内改断言迁就或回退行为（AGENTS.md 核心规则 11）'
  - '只消除假红不引入假绿（design 兼容策略 + R-04 档位收窄）：主仓 skip 短路仅覆盖无自配 test 的跨仓，自配 test 的跨仓照跑'
  - 'fail-open 边界：跨仓 git 不可用 / local.yaml registry 不可读 → 跳过该仓并注记，不阻断 verify/勾选主流程、不放大勾选面'
  - '纯 JavaScript（ESM）零新依赖（全局硬约束 1/2）；git 一律 gitQuiet 数组参数；路径正斜杠归一、CRLF/LF 容忍（全局硬约束 6）'
  - '改动面限于 allowed_paths 5 个文件，不为顺手重构扩面'
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
