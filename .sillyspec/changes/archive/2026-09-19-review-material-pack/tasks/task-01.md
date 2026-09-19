---
id: task-01
title: '注入基建——NEW:src/review-material-pack.js（buildReviewMaterialPack 四形态＋extractDesignHotZone 泛化＋extractDiffSummary 复用 resolveVerifyChangedFiles 锚点解序）+ prompt.js {REVIEW_MATERIALS} 注入位（缺省容错、两槽互斥、降级分支同步 join）'
title_zh: '注入基建——NEW:src/review-material-pack.js（buildReviewMaterialPack 四形态＋extractDesignHotZone 泛化＋extractDiffSummary 复用 resolveVerifyChangedFiles 锚点解序）+ prompt.js {REVIEW_MATERIALS} 注入位（缺省容错、两槽互斥、降级分支同步 join）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 15:25:00
priority: P0
depends_on: []
blocks: [task-02, task-03]
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - NEW:src/review-material-pack.js
  - src/run/prompt.js
target_files:
  - NEW:src/review-material-pack.js
  - src/run/prompt.js
provides:
  - contract: material-pack-infra
    fields: [buildReviewMaterialPack, REVIEW_MATERIALS_PLACEHOLDER]
    desc: "src/review-material-pack.js export buildReviewMaterialPack(stage, inputs) 返回注入文本字符串，四形态组包（grill-first＝designDigest＋fileList＋crossPoints[≤5]＋snippets；plan-review＝hardConstraintDelta；execute-qa＝diffSummary＋designHotZone＋checklist；re-review＝priorFindings＋fixDiff），另 export extractDesignHotZone/extractDiffSummary 抽取器；src/run/prompt.js 评审组装链（:1467-1472）增 {REVIEW_MATERIALS} split/join 注入位（缺省空串、降级分支 :1475-1480 同步 join、再审模板不含本槽）——task-02 四阶段契约改写消费"
goal: >
  建评审材料包注入基建（design Wave 1）：新增 src/review-material-pack.js（buildReviewMaterialPack
  四形态组包＋extractDesignHotZone/extractDiffSummary 抽取器）并在 src/run/prompt.js 落
  {REVIEW_MATERIALS} 注入位（缺省空串、两槽互斥、降级分支同步 join），为 task-02 四阶段契约
  改写提供「CLI 抽取＋模板注入」的物理前提，替代每次独立评审从零重读全仓的必读清单模式。
implementation:
  - 新增 NEW:src/review-material-pack.js，export function buildReviewMaterialPack(stage, inputs) 返回注入文本字符串（纯函数、包不落盘）——四形态按 stage 组包，schema 见 design 接口定义（grill-first＝designDigest＋fileList＋crossPoints[≤5]＋snippets；plan-review＝hardConstraintDelta；execute-qa＝diffSummary＋designHotZone＋checklist；re-review＝priorFindings＋fixDiff）
  - 同文件 export extractDesignHotZone(designContent, sections[])——从 src/stages/execute.js:979-1023 的 design 热区抽取（非目标/兼容策略两节先例）泛化为可复用纯函数；execute.js 原站点改调归 task-02（本 task 不动 src/stages/*）
  - 同文件 export extractDiffSummary(gitDir, base, head)——文件名单与 base 解序委托 resolveVerifyChangedFiles（定义于 src/verify-postcheck.js:1113，锚点优先级见其 :1091-1093 注释块，actualBaseHash/baselineCommit 优先于 baseHash，防 baseline 同步文件误入），±行数经 git diff --stat 叠加；禁独立解 base（design Wave 1 交叉点 2）
  - src/run/prompt.js 评审 prompt 组装链（:1467-1472）增 .split('{REVIEW_MATERIALS}').join(materialsMd)——与 {REVIEW_JSON_CONTRACT}/{PRIOR_REVIEW_FACTS} 同机制同框架；materialsMd 缺省空串（占位符缺失→空串容错，CLI 版本与 skill 缓存不同步不炸）；降级分支（:1475-1480）同步 join 防占位符残留
  - 槽位分权落盘（design Wave 1 交叉点 1）：三阶段模板（Grill 首轮/plan 审/execute QA）挂 {REVIEW_MATERIALS} 槽，再审模板不含本槽——两槽互斥不并存；{PRIOR_REVIEW_FACTS} 既有双块拼接（:1449-1451 前序 pass 段＋:1460-1465 复审基线段）零改动
acceptance:
  - buildReviewMaterialPack 四形态可渲染（grill-first/plan-review/execute-qa/re-review 各自 schema 字段在场且为注入文本形态）——单测文件由 task-03 落盘，本 task 交付可单测的纯函数
  - extractDiffSummary 的 base 解序与 resolveVerifyChangedFiles 一致（actualBaseHash/baselineCommit 优先于 baseHash；±行数与 git diff --stat 对齐）
  - 注入位容错——{REVIEW_MATERIALS} 材料在→注入包文本；缺失→空串且 prompt 无残留占位符（含 :1475-1480 降级分支路径）
  - 再审模板不含 {REVIEW_MATERIALS} 槽（两槽互斥）；{PRIOR_REVIEW_FACTS} 双块拼接行为零回归
verify:
  - node --check src/review-material-pack.js
  - node --check src/run/prompt.js
  - npm test（全量回归——本 task 无独立测试文件，包形态/锚点序单测由 task-03 落盘）
constraints:
  - extractDiffSummary 的 base 解序复用 resolveVerifyChangedFiles（actualBaseHash/baselineCommit＞baseHash），禁独立解 base
  - 占位符缺失→空串容错（prompt.js 既有机制）——CLI 版本与 skill 缓存不同步时不炸
  - 两槽互斥：三阶段走 {REVIEW_MATERIALS}，再审走 {PRIOR_REVIEW_FACTS} 且模板不含 MATERIALS 槽（排他语改写属 task-02）
  - 包是 prompt 时字符串不落盘（零 schema 变更）；存量 review.json 产物契约零改动（schemaVersion/reviewType/verdict 不动）
  - 不动 src/stages/*（四阶段模板改写归 task-02）；不改评审轮次/S2/S3 菜单/ceremony 定价
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
