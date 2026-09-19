---
id: task-02
title: '四阶段契约改写——brainstorm.js Grill 输入段（:415-424）/plan.js 审查步（:332 stepReviewPlan，填卡 :500 不动）/execute.js QA 输入段/stage-review.js 再审排他语＋fixDiff 渲染并入；四处自检首项'
title_zh: '四阶段契约改写——brainstorm.js Grill 输入段（:415-424）/plan.js 审查步（:332 stepReviewPlan，填卡 :500 不动）/execute.js QA 输入段/stage-review.js 再审排他语＋fixDiff 渲染并入；四处自检首项'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 15:25:00
priority: P0
depends_on: [task-01]
blocks: [task-03]
requirement_ids: [FR-01, FR-02]
decision_ids: [D-002@v1, D-004@v1]
allowed_paths:
  - src/stages/brainstorm.js
  - src/stages/plan.js
  - src/stages/execute.js
  - src/stage-review.js
  - test/stage-review-prior-round.test.mjs
target_files:
  - src/stages/brainstorm.js
  - src/stages/plan.js
  - src/stages/execute.js
  - src/stage-review.js
expects_from:
  task-01:
    - contract: material-pack-infra
      needs: [buildReviewMaterialPack, REVIEW_MATERIALS_PLACEHOLDER]
provides:
  - contract: four-stage-prompt-contract
    fields: [REVIEW_MATERIALS_PROMPTS_REWRITTEN, PRIOR_FACTS_EXCLUSIVE]
    desc: "四阶段评审 prompt 输入材料契约改写完成——src/stages/brainstorm.js Grill 段（:415-424）/src/stages/plan.js 审查步（:332）/src/stages/execute.js QA 段为包注入＋自检首项且无「必须读取完整/素材宁可多读」原语；src/stage-review.js renderPriorRoundFindingsMd（:513-516）排他语＋fixDiff 渲染并入——task-03 机械钉/排他语断言消费"
goal: >
  四阶段评审 prompt 输入材料契约从「必读清单」改「材料包注入」（design Wave 2）：Grill 首轮/
  plan 审/execute QA 三处输入段改用 task-01 的 buildReviewMaterialPack 包＋基准面语义，再审
  {PRIOR_REVIEW_FACTS} 升为唯一材料（排他语＋fixDiff 并入），四处统一自检首项——消除
  「必读清单压过注入」的契约矛盾（design 背景：9.1M token / ~200x 信息放大的根因）。
implementation:
  - src/stages/brainstorm.js Grill 步输入材料段 :415-424 替换——删「必须读取完整 design.md」（:417）与「素材宁可多读，不要只读摘要」（:424）两原语；改为包注入（design 要点 digest＋文件清单＋五个交叉点（主代理点名）＋五点点名的源码片段（CLI 抽取））＋基准面语义措辞（D-004：包是必答基准面非禁读清单，包外定向查证合法须列明、禁全量扫读）
  - src/stages/plan.js 审查步 :332 stepReviewPlan 输入段改差量包——plan 相对 design 硬约束的差量（硬约束逐条对照＋偏差行）；填卡步 :500 不动（同病另立变更，design 非目标）
  - src/stages/execute.js QA（对照设计检查步）输入段改包——diff 摘要＋design 热区＋验收清单；:979-1023 原内联热区抽取改调 task-01 的 extractDesignHotZone 泛化 helper
  - src/stage-review.js renderPriorRoundFindingsMd :513-516——「以增量为主」从建议语改排他语（本材料是本轮唯一基准面）；只覆盖复审基线段（src/run/prompt.js:1460-1465 渲染面），前序 pass 段（:1449-1451）保持建议语；fixDiff 经该段渲染并入——占位符机制零改动，只扩渲染体
  - 四处统一自检首项：「材料包是否足以逐条作答；不足→cannot_verify＋列缺件」；三阶段模板挂 {REVIEW_MATERIALS} 槽（task-01 注入位），再审模板不挂（两槽互斥）
acceptance:
  - grep -rn "必须读取完整\|素材宁可多读" src/ 零命中（现命中 src/stages/brainstorm.js:417 与 :424，均在本 task 改写面内）
  - Grill 首轮/plan 审/execute QA 三处输入段为包注入形态且自检首项在场；再审派发 prompt 含排他语（复审基线段「唯一基准面」）与 fixDiff
  - 前序 pass 段（src/run/prompt.js:1449-1451）保持建议语不动；填卡步 src/stages/plan.js:500 不动；评审轮次/S2/S3 菜单零改动
  - 占位符机制零改动；存量 review.json 产物契约（schemaVersion/reviewType/verdict）不变
verify:
  - grep -rn "必须读取完整\|素材宁可多读" src/（期望零输出）
  - node --check src/stages/brainstorm.js（src/stages/plan.js、src/stages/execute.js、src/stage-review.js 同法各跑一次）
  - npm test（全量回归；机械钉单测与 docs/prompt 镜像流水线归 task-03 收口）
constraints:
  - 两槽互斥：三阶段走 {REVIEW_MATERIALS}，再审走 {PRIOR_REVIEW_FACTS} 且模板不含 MATERIALS 槽；排他语只覆盖复审基线段（prompt.js:1460-1465），前序 pass 段（:1449-1451）保持建议语
  - fixDiff 经 renderPriorRoundFindingsMd 渲染并入——占位符机制零改动，只扩渲染体
  - 包是必答基准面非禁读清单：包外定向查证合法须列明、禁全量扫读；评审者自检 cannot_verify 兜底
  - 存量 review.json 产物契约零改动（schemaVersion/reviewType/verdict 不动）
  - 不改评审轮次/S2/S3 菜单/ceremony 定价；不动填卡步 plan.js:500；不动事实面计量
  - docs/prompt 镜像同步不在本 task 落（三步流水线归 task-03）；机械钉正则只匹配「必须读取完整」「素材宁可多读」两原语（收窄防误伤，钉归 task-03）——本 task 改写后不留两原语的同义复述
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
