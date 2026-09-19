---
id: task-03
title: '验收钉与镜像——NEW:test/review-material-pack.test.mjs（两原语绝迹 grep＋包形态单测＋排他语断言）+ docs/prompt 三步流水线 _extract→_sync→_verify + npm test 全量＋lint（depends_on: task-01,02）'
title_zh: '验收钉与镜像——NEW:test/review-material-pack.test.mjs（两原语绝迹 grep＋包形态单测＋排他语断言）+ docs/prompt 三步流水线 _extract→_sync→_verify + npm test 全量＋lint（depends_on: task-01,02）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 15:25:00
priority: P0
depends_on: [task-01, task-02]
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v1, D-005@v1]
allowed_paths:
  - NEW:test/review-material-pack.test.mjs
  - docs/prompt/
target_files:
  - NEW:test/review-material-pack.test.mjs
  - docs/prompt/_extracted.json
expects_from:
  task-01:
    - contract: material-pack-infra
      needs: [buildReviewMaterialPack]
  task-02:
    - contract: four-stage-prompt-contract
      needs: [REVIEW_MATERIALS_PROMPTS_REWRITTEN, PRIOR_FACTS_EXCLUSIVE]
goal: >
  收口验收钉与 prompt 镜像（design Wave 3，D-003 可证伪验收）：新增
  test/review-material-pack.test.mjs 机械钉（两原语全仓绝迹/包形态四单测/排他语与两槽互斥
  断言），跑 docs/prompt 三步镜像流水线（_extract→_sync→_verify）并全量 npm test＋lint——
  把「必读清单已废、包契约已立」钉进回归防线。
implementation:
  - 新增 NEW:test/review-material-pack.test.mjs 断言组一（两原语绝迹）：对 src/ 全量（含根级 src/stage-review.js）grep 断言无「必须读取完整」与「素材宁可多读」——正则收窄只匹配这两原语（R-02 防误伤）；现命中仅 src/stages/brainstorm.js:417/:424，均在 task-02 改写面内
  - 断言组二（包形态四单测）：buildReviewMaterialPack 四 stage（grill-first/plan-review/execute-qa/re-review）各自 schema 字段在场；extractDiffSummary 锚点优先级单测（actualBaseHash/baselineCommit＞baseHash，与 resolveVerifyChangedFiles（src/verify-postcheck.js:1113）解序一致）
  - 断言组三（排他语＋互斥＋自检）：复审基线段排他语「唯一基准面」在场；两槽互斥——再审模板无 {REVIEW_MATERIALS} 槽；自检首项（cannot_verify＋列缺件）在四阶段 prompt 在场
  - docs/prompt 三步流水线：node docs/prompt/_extract.mjs（再生 _extracted.json）→ node docs/prompt/_sync.mjs（同步各 stage 镜像 md；plan/execute 动态阶段被 fence 跳过的既知豁免保持）→ node docs/prompt/_verify.mjs（一致性核验须绿）——src/stage-review.js 为根级文件不在提取面，再审文案无镜像义务（不误列）
  - npm test 全量＋npm run lint 收口（.sillyspec/local.yaml commands.test/commands.lint 实测口径）
acceptance:
  - 验收 1：grep -rn "必须读取完整\|素材宁可多读" src/ 零命中（断言组一绿）
  - 验收 2：四阶段包形态单测绿（buildReviewMaterialPack 四 schema）；两槽互斥断言绿（再审模板无 MATERIALS 槽）
  - 验收 3：排他语在场（复审基线段「唯一基准面」）；自检首项在四阶段 prompt 在场（断言组三绿）
  - 验收 4：extractDiffSummary base 解序与 resolveVerifyChangedFiles 一致（锚点优先级单测绿）
  - 验收 5：docs/prompt 三步流水线跑通且镜像一致（node docs/prompt/_verify.mjs 绿）
  - 验收 6：npm test 全量＋lint 通过
verify:
  - node --test test/review-material-pack.test.mjs
  - node docs/prompt/_extract.mjs
  - node docs/prompt/_sync.mjs
  - node docs/prompt/_verify.mjs
  - npm test
  - npm run lint
constraints:
  - 机械钉正则只匹配「必须读取完整」「素材宁可多读」两原语（收窄防误伤）
  - 本 task 不改 src/——验收钉暴露 task-01/02 缺陷时回对应 task 修，不在本 task allowed_paths 内夹带
  - docs/prompt 镜像同步走三步流水线（_extract→_sync→_verify），plan/execute 动态阶段 fence 豁免保持；src/stage-review.js 根级不在提取面，无镜像义务
  - token 节省比例不作验收（design 非目标，观测注记）
  - 存量 review.json 产物契约零改动（schemaVersion/reviewType/verdict 不动）
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
