---
id: task-02
title: 'assembleExecuteTaskMaterials 两段式材料包 + execute 派发引用行（含 test/execute-materials.test.mjs）'
title_zh: 'assembleExecuteTaskMaterials 两段式材料包 + execute 派发引用行（含 test/execute-materials.test.mjs）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 11:53:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - src/review-material-pack.js
  - src/stages/execute.js
  - test/execute-materials.test.mjs
target_files:
  - src/review-material-pack.js
  - src/stages/execute.js
  - NEW:test/execute-materials.test.mjs
goal: >
  execute 实现子代理获得 CLI 裁好的两段式材料包（稳定段先行只摘不译），替代通读全量
  design 文档——压 task-08 型子代理的轮均上下文（148K vs 同侪 45–92K 的差额即靶）。
implementation:
  - src/review-material-pack.js 新增导出 assembleExecuteTaskMaterials({changeDir, taskId, materialsDir, signatureAnchors})：稳定段（design.md「接口定义」「文件变更清单」固定节名机械选取原文，缺节跳过 + 签名锚点）→ 专属段（task 卡要点 + allowed_paths + 符号锚点）；上限 24576B（专属段尾部优先截；稳定段超限按节优先级截断，节头+首个代码块/表格+回源指引保留）；返回 {path, bytes, truncated}
  - 复用本文件既有 sectionBody/extractSnippets/clamp 先例（src/review-material-pack.js:228 assembleStageReviewMaterials 同族）
  - src/stages/execute.js buildWavePrompt「子代理 prompt 要点」段（src/stages/execute.js:1316 附近）新增一条：先读材料包路径，按锚点回源核对
  - 新增 test/execute-materials.test.mjs：两段顺序 / 稳定段与 design.md 原文逐字一致（无转写）/ 上限截尾 truncated=true / 锚点保留 / 缺节跳过
acceptance:
  - 材料包稳定段内容与 design.md 对应节逐字一致（逐字符断言）
  - 超限场景锚点不丢且带回源指引行
  - buildWavePrompt 渲染含材料包引用行（文本钉）
verify:
  - node --test test/execute-materials.test.mjs
  - npm test
constraints:
  - 只摘不译：禁止任何语义转写/缩写改写（D-003 错键正典红线）
  - 未提供 materialsDir 时 assembleExecuteTaskMaterials 不落盘不抛错（additive，不破坏现状派发）
  - 不改 assembleStageReviewMaterials 既有签名
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
