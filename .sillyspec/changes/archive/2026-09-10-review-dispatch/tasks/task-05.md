---
id: task-05
title: 'gate in-flight differentiation'
title_zh: 'gate 在途区分报错'
author: 'qinyi'
created_at: 2026-09-10 13:54:29
priority: P0
depends_on: ['task-03']
blocks: []
requirement_ids: [FR-06]
decision_ids: [D-002@1]
allowed_paths:
  - src/stage-review.js
  - test/review-channel-priority.test.mjs
target_files:
  - src/stage-review.js
  - test/review-channel-priority.test.mjs
goal: >
  Stage Review Gate 缺 review.json 时区分「平台审查在途」与笼统缺件（FR-06，派发是异步创建即返回——D-002，故 gate 撞到在途 mission 是正常形态）——validateStageReview 缺件报错（stage-review.js:460 errs 数组）与 printStageReviewResult FAILED 提示段（:605 附近）读在途记录（review-dispatch 的 readDispatchRecord，动态 import 防静态环）存在则改为「平台审查在途（mission <id>，state <s>，最近进展 <t>）——先 review-dispatch --status 轮询，或 --kill 后降级」；另把 renderReviewJsonContract 的 CHANNEL_DESC.platform 描述（:124）去掉「当前版本未落地，遇此通道直接跳过」改为指向 sillyspec review-dispatch --change <名> --stage <stage> 命令。
implementation:
  - 在途分支——validateStageReview 缺 review.json 的 errs 构造处与 printStageReviewResult FAILED 提示段，动态 import('../review-dispatch.js') 调 readDispatchRecord（task-03 契约；只在读记录点 import，防 stage-review ↔ review-dispatch 静态循环依赖）
  - fail-open——import 失败/记录读取异常/记录损坏一律按「无在途」走原文案，不新增 gate 失败面；记录存在才输出在途文案（missionId/state/lastStateAt 三要素 + --status/--kill 处置指引）
  - 契约文案——CHANNEL_DESC.platform（stage-review.js:124）去掉未落地标注，改为指向 sillyspec review-dispatch --change <名> --stage <stage> 的口径，与通道段「按序尝试首个可用通道」语义衔接（指引只引用已落地命令的铁律不变）
  - 同步既有断言 test/review-channel-priority.test.mjs:85——「platform P2 未落地显式标注」断言更新为新文案断言（设计演进非测试有误，AGENTS 规则 11 正向面；测试意图仍钉死「指引必须指向真实命令」）
  - 回归自查 stage-review 族（gate-echo/degraded-selfreview/contract/doc-hash 等）确认无在途记录路径输出零变化
acceptance:
  - 无在途记录时 validateStageReview 报错与 printStageReviewResult 输出和改前一致（gate 语义零变化）
  - 手工造 .sillyspec/.runtime/review-dispatch-<change>.json 在途记录后，FAILED 输出含 mission id、state、最近进展时间与 --status/--kill 指引
  - renderReviewJsonContract 输出的 platform 行含 review-dispatch 命令指引且不再含「未落地」字样；node --test stage-review 族全绿（含更新后的 review-channel-priority 断言）
verify:
  - node --test test/review-channel-priority.test.mjs test/stage-review-gate-echo.test.mjs test/stage-review-contract.test.mjs test/stage-review.test.mjs test/stage-review-degraded-selfreview.test.mjs test/stage-review-doc-hash-auto-refresh.test.mjs
  - npm test 既有回归零破
constraints:
  - gate 语义不变——仍 fail-closed（缺 review.json 照常阻断），只改「在途 vs 缺件」的文案区分与处置指引，不对任何 verdict 放水
  - 读在途记录 fail-open（动态 import 失败按无在途处理，不阻塞 gate）
  - 文案改动限 stage-review.js 与被更新断言的测试文件，不动 review-dispatch 本体
related_tests:
  - path: test/review-channel-priority.test.mjs
    reason: CHANNEL_DESC.platform 文案随 P2 上线演进（未落地跳过 → 指向 review-dispatch 命令），:85 既有断言同步更新为新文案
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
