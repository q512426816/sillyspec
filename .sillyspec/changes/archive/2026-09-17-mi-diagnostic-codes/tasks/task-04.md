---
id: task-04
title: 'Sync machine-interface module card (third truth source)'
title_zh: '模块卡 .sillyspec/docs/sillyspec/modules/machine-interface.md 第三真相源同步——:28 行旧 informational 说法改写 + 契约摘要补 codes 键语义 + frontmatter/最近变更行'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:25:55
priority: P0
depends_on: ['task-03']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-003@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/machine-interface.md
expects_from:
  task-03: '契约对账后的 transition 参与-ok 表述与 codes 键语义（卡片说法与契约一致）'
goal: >
  消灭模块卡第三真相源：:28 行旧 informational 说法与契约新语义对齐，契约摘要补 codes 键。
implementation:
  - :28 行「transition(informational，不参与综合 ok)」改写为参与综合 ok 表述（与 task-03 重写后的契约 §2.3 同口径）
  - 契约摘要节补 codes 顶层键与 checks[].code 键语义（恒在场身份码/聚合非 1:1/schema_version 仍 1）
  - frontmatter updated_at + 最近变更行登记（引用变更名 2026-09-17-mi-diagnostic-codes）
acceptance:
  - grep informational 模块卡正文无「不参与综合 ok」旧表述
  - 卡片与 interface-contract.md 对 transition 语义、codes 键的表述零冲突（人工对读）
verify:
  - grep -n "informational\|codes" .sillyspec/docs/sillyspec/modules/machine-interface.md
constraints:
  - 只改模块卡单文件
  - 不改 MANUAL_NOTES 保护段（如有）
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
