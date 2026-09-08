---
id: task-06
title: '槽位指引与文档同步'
title_zh: '槽位指引与文档同步'
author: 'qinyi'
created_at: 2026-09-08 23:16:18
priority: P0
depends_on: ['task-01', 'task-03', 'task-04', 'task-05']
blocks: []
requirement_ids: [FR-06]
decision_ids: [D-005@v2]
allowed_paths:
  - src/stages/verify.js
  - docs/prompt/verify.md
  - docs/prompt/_extracted.json
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/stages.changelog.md
  - .sillyspec/docs/sillyspec/modules/progress.md
  - .sillyspec/docs/sillyspec/modules/progress.changelog.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - docs/sillyspec/file-lifecycle.md
target_files:
  - src/stages/verify.js
  - docs/prompt/verify.md
  - docs/prompt/_extracted.json
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/progress.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - docs/sillyspec/file-lifecycle.md
expects_from:
  needs: task-01/02/03/04/05 全部产物（登记与指引的对象）
goal: >
  槽位填写指引进 verify.js step2/step7 + schema 单点模块入 map + docs/prompt 镜像 + 模块卡/sidecar 同步（FR-06）。
implementation:
  - stages/verify.js step2（evidence 检查 :73-81）与 step7（报告结构 :202-243）增槽位填写说明：三选一状态语义、verifiedFiles 精确路径要求、豁免后缀写法、回执四字段、占位符替换规则
  - node docs/prompt/_extract.mjs + _sync.mjs 刷新镜像
  - _module-map.yaml：verify-facts-schema.js 归 core-engine paths；core-engine/runtime/stages/progress 四卡同步（facts v2/分类核验/基线对比/gates 接线/getStageCompletedAt）+ sidecar 变更索引行
  - docs/sillyspec/file-lifecycle.md：verify-facts.json v2 与槽段生命周期条目同步
acceptance:
  - verify.js 两步 prompt 含槽位指引且 _extract/_sync 后镜像一致（node docs/prompt/_verify.mjs exit 0）
  - 模块卡与 sidecar 登记齐全、map 含新文件
  - file-lifecycle 文档与产物现实一致
  - npm test 模块子集全绿（--done 门禁实测）
verify:
  - node docs/prompt/_verify.mjs
  - node --test test/prompt-placeholders.test.mjs（prompt 族回归）
constraints:
  - 不改任何 src 判定逻辑（纯文档/prompt 层）
  - 模块卡只登当前状态不堆历史（历史进 sidecar）
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
