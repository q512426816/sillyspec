---
id: task-07
title: 'end-to-end verification + module changelogs'
title_zh: '端到端验证+模块文档（npm test/lint 全量+冒烟+changelog）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 14:45:11
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05', 'task-06']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
  - .sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md
  - .sillyspec/docs/sillyspec/modules/setup.changelog.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
target_files:
  - .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
  - .sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md
  - .sillyspec/docs/sillyspec/modules/setup.changelog.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
goal: >
  全链端到端验证（全量测试/lint + quick 会话冒烟）+ 四模块 changelog 更新——
  verify 阶段实测门的数据基础与本变更的知识沉淀。
implementation:
  - 全量 npm test（预期 436+ 新增全绿）+ npm run lint
  - 冒烟：临时目录造 fixture（他者变更名提交的测试文件 + 本会话改断言）跑 detectAssertionRewrites+collectRecentForeignDelivery 组合路径，确认 WARNING 渲染链路通（不真起 quick 会话——避免污染 .runtime 会话区）
  - 四模块 changelog 追加本变更条目（core-engine=knowledge-match / docs-consistency=decision-distill / setup=config-schema / runtime=semantic-guard+prompt+quick-audit）
  - 提交前 git status 核对暂存面只含本变更文件（AGENTS 规则 18；decision-distill.js 若仍有并行残留 → hunk 级核对或延后单独提交）
acceptance:
  - npm test 0 失败、npm run lint 通过
  - 冒烟路径输出含 ⚠️ 点名段与交付变更名
  - 四模块 changelog 各含一条本变更条目
verify:
  - npm test
  - npm run lint
constraints:
  - changelog 文件若被并行会话持有未提交改动 → 延后补（不夹带，AGENTS 规则 18）
  - 不改 src/test 源码（纯验证+文档 task；发现问题 → 回对应 task 修复重验）
  - D-002@v1 移交记录：闸门热修不在本变更（complete-handlers.js 让位并行会话），verify 报告中留移交注记
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
