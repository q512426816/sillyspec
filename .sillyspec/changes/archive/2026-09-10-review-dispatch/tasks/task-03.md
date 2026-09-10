---
id: task-03
title: 'review-dispatch core module'
title_zh: 'review-dispatch 核心模块'
author: 'qinyi'
created_at: 2026-09-10 13:54:29
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@1, D-002@1, D-003@1]
allowed_paths:
  - NEW:src/review-dispatch.js
  - NEW:test/review-dispatch.test.mjs
target_files:
  - NEW:src/review-dispatch.js
  - NEW:test/review-dispatch.test.mjs
goal: >
  纯逻辑核心（可测，MCP 调用经注入）：
  ① buildReviewerTaskBook({stage,changeDir,reviewRunId}) → {objective, workerPrompt}
  （消费 task-01 的 REVIEW_CHECKLISTS + 复用 renderReviewJsonContract（channelPriority
  显式传 platform 序位说明）+ 期望 review.json 路径 + 禁改文件禁 git commit 铁律段）；
  ② 在途记录 readDispatchRecord/writeDispatchRecord/clearDispatchRecord——
  .sillyspec/.runtime/review-dispatch-<change>.json，schema
  { change, stage, missionId, workerId, state: dispatching|in-flight|completed|failed|abandoned,
  createdAt, lastState, lastStateAt, errorCode? }，O_EXCL 创建防并发双开、原子替换；
  ③ detectStall(record, nowMs, stallMs)——queued 不计时，running 后超窗 → {stalled, hint}；
  ④ extractReviewFromArtifacts(artifacts)——kind 含 review/review_json 优先解析 content JSON，
  兜底 summary 文本提取首个 JSON 对象；
  ⑤ persistStageReview——复用 validateStageReview 机械校验 + 写既有
  stage-reviews/<stage>-<runId>/review.json + reviewer.channel="platform"/missionId 落款；
  ⑥ 中断分支：dispatching 态记录 + 处置指引生成。
implementation:
  - import 自 stage-review.js（renderReviewJsonContract / validateStageReview）、stage-review-checklist.js（REVIEW_CHECKLISTS，task-01 契约）、fs-atomic（仓内既有原子写）
  - SillyHubMcpClient 以参数注入不 import（probe.js 同款依赖注入风格）
  - 测试全 mock（无网络）：MCP 调用走注入的 fake client，文件操作走临时目录
acceptance:
  - node --test test/review-dispatch.test.mjs 全绿，覆盖以下各条
  - 任务书含四要素：单源清单（REVIEW_CHECKLISTS 渲染）/ 契约（renderReviewJsonContract）/ 期望 review.json 路径 / 禁改文件禁 git commit 铁律段
  - 在途记录幂等：已有 in-flight 记录时拒绝重复创建（提示 --status / --kill）
  - detectStall 三态：queued 不计时 / running 后超窗 → stalled / 未超窗 → 不 stalled
  - artifacts 双通道提取：kind 含 review/review_json 优先解析 content JSON；无匹配 kind 时兜底 summary 文本提取首个 JSON 对象
  - persistStageReview 产物过 validateStageReview（schema + docHash 同一口径）
  - 中断分支：dispatching 态记录与处置指引文案生成（--kill 清记录重建 或 平台 UI 处置 mission）
verify:
  - node --test test/review-dispatch.test.mjs（全绿即过，逐条对应 acceptance）
constraints:
  - 纯逻辑零网络：模块内不发任何 MCP/HTTP 调用，MCP client 一律经参数注入
  - 路径分隔符跨平台：文件路径一律 join 拼接，不硬编码 / 或 \
  - 不复制 review.json schema：契约单源消费 renderReviewJsonContract，不另造第二套 schema 文本
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
