---
id: task-09
title: '测试四件——ir-strict-mode / design-file-list-gate / delta-scan-feedback / docs-fix-receipt（含 grill 补的 4 场景）'
title_zh: '测试四件——ir-strict-mode / design-file-list-gate / delta-scan-feedback / docs-fix-receipt（含 grill 补的 4 场景）'
author: 'qinyi'
created_at: 2026-09-07 23:13:34
priority: P0
depends_on: ['task-02', 'task-03', 'task-04', 'task-06', 'task-07']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-006@v1, D-007@v1]
allowed_paths:
  - NEW:test/ir-strict-mode.test.mjs
  - NEW:test/design-file-list-gate.test.mjs
  - NEW:test/delta-scan-feedback.test.mjs
  - NEW:test/docs-fix-receipt.test.mjs
target_files: [NEW:test/ir-strict-mode.test.mjs, NEW:test/design-file-list-gate.test.mjs, NEW:test/delta-scan-feedback.test.mjs, NEW:test/docs-fix-receipt.test.mjs]
goal: >
  测试四件：闸门两档/清单核验/delta 回灌/修复回执，含 Grill 补的 4 场景，存量豁免回归锁定。
implementation:
  - ir-strict-mode：isStrictChange 三边界 + P3b strict ERROR/存量 skip + P3a 主仓全零（含混合跨仓）strictViolation + gates envelope/print 阻断路由（CLI 级）
  - design-file-list-gate：幻觉 ERROR / NEW: 豁免 / glob+占位跳过 / 清单缺失 WARNING / brainstorm --done 阻断与放行
  - delta-scan-feedback：project 同口径（有/无 project 两态）+ sidecar schema + advisory 三态 + 写失败 fail-soft
  - docs-fix-receipt：回执计数正确（构造已知失效 fixture）+ 非 --fix 零变化 + --fix --json receipt 形态
acceptance:
  - 四测试文件全过且覆盖上述场景
  - 存量豁免场景有显式断言（skip 原文/注记）
verify:
  - node test/ir-strict-mode.test.mjs && node test/design-file-list-gate.test.mjs && node test/delta-scan-feedback.test.mjs && node test/docs-fix-receipt.test.mjs
constraints:
  - 不修改被测实现来凑测试（修逻辑不修测试）
  - fixture 用 tmp 仓（_cli-step-harness 模式）不污染主仓
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
