---
id: task-05
title: '文档同步（runtime 模块卡/changelog、file-lifecycle 登记）+ 新测试入 test:core'
title_zh: '文档同步（runtime 模块卡/changelog、file-lifecycle 登记）+ 新测试入 test:core'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 14:39:34
priority: P1
depends_on: [task-01, task-03, task-04]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
  - docs/sillyspec/file-lifecycle.md
  - package.json
target_files:
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
  - docs/sillyspec/file-lifecycle.md
  - package.json
goal: >
  收尾登记：runtime 模块卡/changelog 补账本与回收机制摘要、file-lifecycle.md 登记新运行时文件
  与账本路径、新测试入 test:core 清单——文档与清单面同步收口（模块卡摘要同步属实现卡收尾
  义务，不另立仪式卡）。frontmatter 的 requirement_ids 仅为追踪引用，本卡不重复实现任何 FR。
implementation:
  - 确认 src/run/gate-snapshot.js 归属 runtime 模块卡（既有 M2 段），在其后追加账本/回收机制摘要（TTL×pid 双闸、账本路径、回收时机）
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md 追加本变更一行摘要（最终版随归档核对）
  - docs/sillyspec/file-lifecycle.md 登记新运行时文件 src/run/gate-snapshot-ledger.js 与账本路径 .sillyspec/.runtime/active-gate-snapshots.json（按该文件既有登记体例）
  - package.json 的 test:core 清单追加 test/gate-snapshot-lifecycle.test.mjs 与 test/gate-snapshot-cleanup.test.mjs（照 test-ledger/test-bindings 先例）
  - 如上述文档含源码行号锚，按 docs check 结果同步重锚（禁裸文件名锚）
acceptance:
  - node bin/sillyspec.js docs check 失效数不增（重锚后零新增）
  - npm run lint 绿（module-map 覆盖全、模块卡字数预算不超限）
  - test:core 清单含新测试文件
verify:
  - npm run test:core
constraints:
  - 文档行号锚写仓根相对全路径+行号（docs-check 层1 依赖）
  - 模块卡/changelog 改动随归档最终核对，不预写归档期结论
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:<行号>）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
