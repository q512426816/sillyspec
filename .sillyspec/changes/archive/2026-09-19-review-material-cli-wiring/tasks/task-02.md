---
id: task-02
title: '注入链接线＋模板槽——src/run/prompt.js tier 注入块（:1378 分支）按 stageName 调装配函数填充 {REVIEW_MATERIALS}（specBase 显式传 :1382 tierSpecBase；组装 best-effort catch；降级分支 join('''') 不动；:1473 stale 注释同步改写）；brainstorm.js Grill 输入材料节/plan.js 审查步 independent 段/execute.js acceptance 操作节三处加 {REVIEW_MATERIALS} 槽＋主代理补位指引。target_files: src/run/prompt.js, src/stages/brainstorm.js, src/stages/plan.js, src/stages/execute.js'
title_zh: '注入链接线＋模板槽——src/run/prompt.js tier 注入块（:1378 分支）按 stageName 调装配函数填充 {REVIEW_MATERIALS}（specBase 显式传 :1382 tierSpecBase；组装 best-effort catch；降级分支 join('''') 不动；:1473 stale 注释同步改写）；brainstorm.js Grill 输入材料节/plan.js 审查步 independent 段/execute.js acceptance 操作节三处加 {REVIEW_MATERIALS} 槽＋主代理补位指引。target_files: src/run/prompt.js, src/stages/brainstorm.js, src/stages/plan.js, src/stages/execute.js'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 16:37:07
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/run/prompt.js
  - src/stages/brainstorm.js
  - src/stages/plan.js
  - src/stages/execute.js
  - docs/prompt/_extracted.json
  - docs/prompt/brainstorm.md
  - docs/prompt/plan.md
  - docs/prompt/execute.md
target_files: [src/run/prompt.js, src/stages/brainstorm.js, src/stages/plan.js, src/stages/execute.js, docs/prompt/_extracted.json, docs/prompt/brainstorm.md]
expects_from:
  task-01:
    - contract: assembleStageReviewMaterials
      needs: [stage, cwd, changeName, specBase, return]
      notes: 'stageName→stage 映射：brainstorm→grill-first / plan→plan-review / execute→execute-qa；specBase 显式传 src/run/prompt.js:1382 的 tierSpecBase（块内唯一解析源，勿用 process.cwd 兜底另解）'
provides:
  - contract: review-materials-injection
    fields: ['prompt.js 主链 join 目标=装配调用结果', 'prompt.js 降级分支 join 空串保持', '三 stages 模板含 {REVIEW_MATERIALS} 槽', 'docs/prompt 镜像同步']
goal: >
  src/run/prompt.js 既有 tier 注入块按 stageName 调 task-01 的 assembleStageReviewMaterials 组装材料包并填充 {REVIEW_MATERIALS}（D-001 同链注入，不另立派发前置步），三 stages 模板加 {REVIEW_MATERIALS} 槽＋主代理补位指引——派发 prompt 的素材半边由 CLI 机械填充，消灭「包组装靠主代理照散文自由发挥、偷懒/漂移无兜底」的断点。
implementation:
  - 'src/run/prompt.js:1378 tier 注入块 try 分支内：动态 import assembleStageReviewMaterials（src/review-material-pack.js），按 stageName→stage 映射（brainstorm→grill-first / plan→plan-review / execute→execute-qa）调用；specBase 显式传 :1382 已解析的 tierSpecBase，cwd/changeName 用块内既有值；组装独立 try/catch best-effort，失败 reviewMaterialsMd=空串'
  - '主链 join 改写（src/run/prompt.js:1467-1473）：.split({REVIEW_MATERIALS}).join(reviewMaterialsMd)——join 目标从空串字面量变为装配结果；:1473 stale 注释「包由派发侧组好后再经本链二次替换，防双写」同步改写为 CLI 组装语义（CLI 组装已取代派发侧手组——Design Grill 审查意见①）'
  - '降级 catch 分支（src/run/prompt.js:1474-1483）既有 .split({REVIEW_MATERIALS}).join(空串) 原样保持——降级语义与占位符缺失同态（防字面量残留，plan 审查既有提示不动）'
  - 'src/stages/brainstorm.js:416-421 Grill「### 输入材料」节：加 {REVIEW_MATERIALS} 槽（置于既有 {REVIEW_TIER}/{REVIEW_JSON_CONTRACT} 同段）＋补位指引一行（统一文案：包内「五个交叉点」节派发前由你补齐——file:line 锚，留空则评审者按 cannot_verify 列缺件）；散文从「主代理派发时组装」改为「CLI 已注入素材半边；点名半边派发前由主代理补」'
  - 'src/stages/plan.js:359-368 stepReviewPlan「tier=independent 时：启动 plan-review 子代理」段：同款加槽＋补位指引（plan 差量逐约束判定归主代理半边）；填卡步（src/stages/plan.js:500）不动'
  - 'src/stages/execute.js:443-448 acceptance「对照设计检查」步「### 操作（材料包口径）」节：同款加槽＋补位指引'
  - '改完 src/stages/*.js 跑 docs/prompt 三步流水线（硬约束②）：node docs/prompt/_extract.mjs → node docs/prompt/_sync.mjs → node docs/prompt/_verify.mjs（exit 0）——镜像（docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/prompt/plan.md、docs/prompt/execute.md）随流水线再生落盘（task-03 复跑终验）'
  - '既有测试影响自查（本 task 不改测试文件）：test/review-material-pack.test.mjs:59 组二 joins≥2 钉不受影响——主链 join 目标变量化不减少 {REVIEW_MATERIALS} 字面量出现次数（split 参数仍在两分支）；test/worktree-execute-spec-drift.test.mjs:166 按 includes 定位含 {REVIEW_TIER} 的 acceptance step——加槽不摘 {REVIEW_TIER}，不失效'
acceptance:
  - 'AC-04：prompt.js 主链 {REVIEW_MATERIALS} join 目标为 assembleStageReviewMaterials 调用结果（源码钉断言面，组四由 task-03 落盘）；降级 catch 分支 join 空串保持；组二 joins≥2 断言仍绿'
  - 'AC-06：三 stages 模板（src/stages/brainstorm.js Grill 输入材料节 / src/stages/plan.js 审查步 independent 段 / src/stages/execute.js acceptance 操作节）各含 {REVIEW_MATERIALS} 槽＋补位指引；docs/prompt 三步流水线 exit 0（镜像一致），三模板镜像含 {REVIEW_MATERIALS} 槽'
  - 'stageName→stage 映射正确（brainstorm→grill-first / plan→plan-review / execute→execute-qa），specBase 传 :1382 tierSpecBase（勿 process.cwd 兜底另解）；组装 best-effort：失败空串注入，不阻断渲染、无占位符字面量残留（FR-01）'
  - '再审面零改动：{PRIOR_REVIEW_FACTS} 注入机制、collectSameStagePriorReview/renderPriorRoundFindingsMd、tier 判定与 ceremony 菜单（classifyReviewTier/renderCeremonyTierInjection）全部不动'
  - '既有测试零失效：test/review-material-pack.test.mjs 组一/二/三与 test/worktree-execute-spec-drift.test.mjs 存量断言全绿（定向实测）'
verify:
  - 'node test/review-material-pack.test.mjs（组一/二/三零回归——重点组二 joins≥2 与两槽互斥钉）'
  - 'node docs/prompt/_extract.mjs && node docs/prompt/_sync.mjs && node docs/prompt/_verify.mjs'
  - 'npm run lint'
constraints:
  - '**base 解序单点**：extractDiffSummary 的 base 解序复用 resolveVerifyChangedFiles（src/verify-postcheck.js:1113，锚点优先级 actualBaseHash/baselineCommit＞baseHash），禁独立解 base。'
  - '**镜像流水线**：改 src/stages/*.js 后必须跑 docs/prompt 三步流水线：node docs/prompt/_extract.mjs → _sync.mjs → _verify.mjs（exit 0）。'
  - '**机械钉不动**：test/review-material-pack.test.mjs 的两原语绝迹断言保持绿；组一/二/三断言零改动；新增「非空注入」断言（组四）。'
  - '两槽互斥铁律：再审模板（stage-review.js 派发面）不得引入 {REVIEW_MATERIALS} 槽。'
  - '不改 {REVIEW_MATERIALS} 注入机制（split/join 框架沿用），仅填充值从恒空串变为装配结果；降级 catch 分支 join 空串原样不动'
  - '不动 {PRIOR_REVIEW_FACTS} 注入与 renderPriorRoundFindingsMd（再审面零改动）；不动 tier 判定/仪式定价/菜单（classifyReviewTier/renderCeremonyTierInjection 零改动）；plan.js 填卡步（:500）不动'
  - '三模板加槽位置限定：brainstorm.js 输入材料节 / plan.js 审查步 independent 段 / execute.js acceptance 操作节——stage-review.js 派发面与其他步骤不加槽；不加/不改测试（组四归 task-03）'
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
