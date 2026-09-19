---
id: task-03
title: '验收钉＋镜像——test/review-material-pack.test.mjs 新增组四（fixture 装配三形态非空＋接线源码钉＋留位钉，既有组一二三零改动）；docs/prompt 三步流水线 _extract→_sync→_verify；npm test 定向+全量＋lint。target_files: test/review-material-pack.test.mjs, docs/prompt/_extracted.json, docs/prompt/brainstorm.md'
title_zh: '验收钉＋镜像——test/review-material-pack.test.mjs 新增组四（fixture 装配三形态非空＋接线源码钉＋留位钉，既有组一二三零改动）；docs/prompt 三步流水线 _extract→_sync→_verify；npm test 定向+全量＋lint。target_files: test/review-material-pack.test.mjs, docs/prompt/_extracted.json, docs/prompt/verify.md, docs/prompt/brainstorm.md'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 16:37:07
priority: P0
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - test/review-material-pack.test.mjs
  - docs/prompt/_extracted.json
  - docs/prompt/verify.md
  - docs/prompt/brainstorm.md
target_files: [test/review-material-pack.test.mjs, docs/prompt/_extracted.json, docs/prompt/verify.md, docs/prompt/brainstorm.md]
expects_from:
  task-01:
    - contract: assembleStageReviewMaterials
      needs: [stage, cwd, changeName, specBase, return]
      notes: '组四 fixture 断言直接 import 该导出：三形态非空 / 留位缺件提示 / 未知 stage 与素材全缺返回空串'
  task-02:
    - contract: review-materials-injection
      needs: ['prompt.js 主链 join 目标=装配调用结果', 'prompt.js 降级分支 join 空串保持', '三 stages 模板含 {REVIEW_MATERIALS} 槽', 'docs/prompt 镜像同步']
      notes: '组四接线源码钉的断言对象（src/run/prompt.js 主链/降级分支）；镜像一致性由三步流水线复跑终验'
goal: >
  test/review-material-pack.test.mjs 新增组四验收钉（装配函数三形态非空 fixture 断言＋prompt.js 接线源码钉＋留位钉，既有组一/二/三零改动）＋ docs/prompt 三步流水线镜像终验＋npm test 全量与 lint——把「非空注入」钉成可回归断言（D-003 拆两层：装配函数单测＋源码钉，不跑 outputStep 全链）。
implementation:
  - 'test/review-material-pack.test.mjs 顶部 import 追加 assembleStageReviewMaterials（../src/review-material-pack.js）；既有组一（:24-39）/组二（:41-62）/组二补（:64-71）/组三（:73-81）断言逐字零改动，组四追加在组三之后'
  - '组四-1 装配三形态非空：mkdtemp 建临时 fixture changeDir（design.md 含背景/设计目标/非目标/兼容策略/全局硬约束节＋文件变更清单表；decisions.md 含决策条目与 priority 行）→ grill-first 断言非空且含文件清单行与章节行号索引；plan-review 断言非空且含硬约束行；另建缺「## 全局硬约束」节的 design.md 变体验证 decisions.md P0/P1 兜底命中；execute-qa 对本仓真实 git（changeName=2026-09-19-review-material-cli-wiring、specBase=.sillyspec）断言返回非空字符串'
  - '组四-2 接线源码钉：读 src/run/prompt.js 源码断言含 assembleStageReviewMaterials 调用，且主链 join 目标为该调用结果变量（非空串字面量）；降级分支 .split({REVIEW_MATERIALS}).join(空串) 保持'
  - '组四-3 留位钉：grill-first 产出含「主代理未点名」缺件提示且不含预填交叉点；plan-review 产出含「主代理未提供差量」缺件提示且不含预填差量判定（crossPoints/planDelta 半边留位形态）'
  - '组四补两分支：未知 stage 返回空串、素材全缺返回空串（对齐 AC-03 尾项）'
  - 'docs/prompt 三步流水线复跑终验（node docs/prompt/_extract.mjs → _sync.mjs → _verify.mjs，exit 0；task-02 已同步则零增量 diff）＋ npm test 全量 ＋ npm run lint'
acceptance:
  - 'AC-05：既有组一（两原语绝迹）/组二（包形态＋joins≥2＋两槽互斥）/组三（排他语）断言零改动保持绿；npm test 定向（review-material-pack）＋全量＋lint 通过'
  - 'AC-04（钉面）：组四接线源码钉在场——prompt.js 主链 join 目标为装配调用结果、降级分支 join 空串保持'
  - 'AC-06（验面）：docs/prompt 三步流水线 exit 0（镜像一致）；三模板镜像（docs/prompt/brainstorm.md、docs/prompt/plan.md、docs/prompt/execute.md）含 {REVIEW_MATERIALS} 槽'
  - '组四三断言面齐备：装配函数三形态非空（fixture）＋接线源码钉＋留位钉（crossPoints/planDelta 不预填）——本文件跑零 FAIL、退出码 0'
verify:
  - 'node test/review-material-pack.test.mjs'
  - 'node docs/prompt/_extract.mjs && node docs/prompt/_sync.mjs && node docs/prompt/_verify.mjs'
  - 'npm test'
  - 'npm run lint'
constraints:
  - '**base 解序单点**：extractDiffSummary 的 base 解序复用 resolveVerifyChangedFiles（src/verify-postcheck.js:1113，锚点优先级 actualBaseHash/baselineCommit＞baseHash），禁独立解 base。'
  - '**镜像流水线**：改 src/stages/*.js 后必须跑 docs/prompt 三步流水线：node docs/prompt/_extract.mjs → _sync.mjs → _verify.mjs（exit 0）。'
  - '**机械钉不动**：test/review-material-pack.test.mjs 的两原语绝迹断言保持绿；组一/二/三断言零改动；新增「非空注入」断言（组四）。'
  - '两槽互斥铁律：再审模板（stage-review.js 派发面）不得引入 {REVIEW_MATERIALS} 槽。'
  - '不在测试里跑 outputStep 全链（D-003——不引入 ProgressManager/db fixture 与子进程 runCommand 重量；接线以源码钉＋装配函数单测双保险）'
  - '既有组一/二/三断言逐字零改动（只允许组三之后追加组四）；测试只动 test/review-material-pack.test.mjs，不在其他测试文件加钉'
  - '不改 src/**（源码问题回退 task-01/task-02 修，本 task 不顺手改）；docs/prompt 镜像只经三步流水线再生，不手改'
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
