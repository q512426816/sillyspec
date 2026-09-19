---
id: task-01
title: '装配函数——src/review-material-pack.js 新增导出 assembleStageReviewMaterials({stage,cwd,changeName,specBase})：grill-first=designDigest（章节行号索引+背景/设计目标节，复用 extractDesignHotZone）+fileList（design.md「文件变更清单」表路径列解析）；plan-review=hardConstraints（「## 全局硬约束」节行 cap10，缺节 fallback decisions.md P0/P1 条目）；execute-qa=diffSummary（extractDiffSummary 委托 resolveVerifyChangedFiles——禁独立解 base）+designContent+checklist（REVIEW_CHECKLISTS.execute）；crossPoints/planDelta 恒不预填；未知 stage/素材全缺→''''。target_files: src/review-material-pack.js'
title_zh: '装配函数——src/review-material-pack.js 新增导出 assembleStageReviewMaterials({stage,cwd,changeName,specBase})：grill-first=designDigest（章节行号索引+背景/设计目标节，复用 extractDesignHotZone）+fileList（design.md「文件变更清单」表路径列解析）；plan-review=hardConstraints（「## 全局硬约束」节行 cap10，缺节 fallback decisions.md P0/P1 条目）；execute-qa=diffSummary（extractDiffSummary 委托 resolveVerifyChangedFiles——禁独立解 base）+designContent+checklist（REVIEW_CHECKLISTS.execute）；crossPoints/planDelta 恒不预填；未知 stage/素材全缺→''''。target_files: src/review-material-pack.js'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 16:37:07
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1]
allowed_paths:
  - src/review-material-pack.js
target_files: [src/review-material-pack.js]
provides:
  - contract: assembleStageReviewMaterials
    fields: [stage, cwd, changeName, specBase, return]
    notes: 'async 装配函数（src/review-material-pack.js 导出）：stage ∈ {grill-first, plan-review, execute-qa}；return=Promise<string>（含基准面语义头的注入文本；素材全缺/未知 stage 返回空串）；crossPoints/planDelta 恒不预填；re-review 不在函数面（两槽互斥铁律——走 {PRIOR_REVIEW_FACTS}）'
goal: >
  src/review-material-pack.js 新增导出 assembleStageReviewMaterials——CLI 半边素材按三形态机械收集（grill-first=designDigest＋fileList / plan-review=hardConstraints＋decisions 兜底 / execute-qa=diffSummary 委托＋designContent＋checklist）后调既有 buildReviewMaterialPack 渲染，为 task-02 的 prompt.js 注入链提供可单测的装配单元——消灭 buildReviewMaterialPack 生产调用点为零的归档 Gap 1。
implementation:
  - 'src/review-material-pack.js 新增导出 assembleStageReviewMaterials({ stage, cwd, changeName, specBase })——async、整体 best-effort try/catch：按 stage 分流机械收集素材，委托同文件既有 buildReviewMaterialPack(stage, inputs) 渲染返回（复用渲染层，不另写拼装）'
  - 'grill-first 形态：designDigest＝design.md 章节行号索引（L<行> ## <节名> 全列，照 src/stages/execute.js:1011 先例）＋「背景」「设计目标」两节正文（复用同文件 extractDesignHotZone(designContent, [背景, 设计目标])，4000 字符封顶由 buildReviewMaterialPack 的 designDigest clamp 承担）；fileList＝design.md「文件变更清单」表路径列机械解析（| 表行第 2 列剥 NEW:/MOD: 前缀，仓根相对路径口径）；crossPoints 恒不传（留位）'
  - 'plan-review 形态：hardConstraints＝design.md「## 全局硬约束」节的编号/圆点行解析为 [{id, text}]（id 形如 HC-1，cap 10）；design.md 缺该节时 fallback decisions.md 的 P0/P1 条目（决策条目标题行「## D-…@vN: <标题>」与其下「- priority:」行配对，cap 10）；planDelta 恒不传（留位——逐约束判定是主代理半边）'
  - 'execute-qa 形态：diffSummary＝既有 extractDiffSummary({ cwd, changeName, specBase })（base 解序委托 resolveVerifyChangedFiles，见 src/verify-postcheck.js:1113——禁独立解 base）；designContent＝design.md 全文读入（热区抽取由 buildReviewMaterialPack 内部 extractDesignHotZone 完成，不重复抽取）；checklist＝REVIEW_CHECKLISTS.execute（src/stage-review-checklist.js 既有导出）'
  - '未知 stage 或必素材全缺 → 返回空串（与 {REVIEW_MATERIALS} 占位符缺失同态，prompt join 空串零残留）；re-review 不进本函数面（两槽互斥铁律——走 {PRIOR_REVIEW_FACTS}）'
  - 'src/review-material-pack.js 文件头注释同步补 assembleStageReviewMaterials 的半边分工说明（CLI 素材半边/主代理点名半边——D-002，防 stale 注释）'
acceptance:
  - 'AC-01：assembleStageReviewMaterials 按 stage=grill-first 对含常规素材的 fixture（design.md 含背景/设计目标/文件变更清单表）返回非空包体，含文件清单行与章节行号索引；crossPoints 节为留位缺件提示（非预填）'
  - 'AC-02：按 stage=plan-review 对含「## 全局硬约束」节的 fixture 返回非空包体且含硬约束行；缺节时 decisions.md P0/P1 条目兜底命中；planDelta 节为留位缺件提示'
  - 'AC-03：按 stage=execute-qa 在本仓（真实 git）返回非空包体，含 diff 摘要节与 design 热区节与验收清单节（REVIEW_CHECKLISTS.execute 项）；未知 stage 返回空串；素材全缺返回空串'
  - '导出契约成立：assembleStageReviewMaterials({ stage, cwd, changeName, specBase }) 返回 Promise<string>，stage ∈ {grill-first, plan-review, execute-qa}；装配整体 best-effort——任一素材源缺失/解析失败只降级对应节为「（无）」，不抛错不阻断（FR-02）'
  - 'buildReviewMaterialPack 四形态 schema 与既有导出（buildReviewMaterialPack/extractDesignHotZone/extractDiffSummary/extractSnippets）零改动——已归档契约不回改，本 task 只做调用侧装配'
verify:
  - 'node test/review-material-pack.test.mjs（本 task 不改测试——跑既有组一/二/三钉确认基线绿）'
  - >-
    node --input-type=module -e "const m = await import('./src/review-material-pack.js'); const s = await m.assembleStageReviewMaterials({ stage: 'execute-qa', cwd: process.cwd(), changeName: '2026-09-19-review-material-cli-wiring', specBase: '.sillyspec' }); console.log(s ? 'non-empty len=' + s.length : 'EMPTY'); process.exit(s ? 0 : 1)"
  - 'npm run lint'
constraints:
  - '**base 解序单点**：extractDiffSummary 的 base 解序复用 resolveVerifyChangedFiles（src/verify-postcheck.js:1113，锚点优先级 actualBaseHash/baselineCommit＞baseHash），禁独立解 base。'
  - '**镜像流水线**：改 src/stages/*.js 后必须跑 docs/prompt 三步流水线：node docs/prompt/_extract.mjs → _sync.mjs → _verify.mjs（exit 0）。'
  - '**机械钉不动**：test/review-material-pack.test.mjs 的两原语绝迹断言保持绿；组一/二/三断言零改动；新增「非空注入」断言（组四）。'
  - '两槽互斥铁律：再审模板（stage-review.js 派发面）不得引入 {REVIEW_MATERIALS} 槽。'
  - 'crossPoints/planDelta 恒不预填（D-002）——包内对应节只渲染既有缺件提示；re-review 不进 assembleStageReviewMaterials 函数面'
  - 'buildReviewMaterialPack 及既有四导出签名零改动；不改 src/run/prompt.js 与 src/stages/*.js（接线归 task-02）；不加/不改测试（组四归 task-03）'
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
