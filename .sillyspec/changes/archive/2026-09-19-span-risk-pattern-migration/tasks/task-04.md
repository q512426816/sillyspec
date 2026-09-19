---
id: task-04
title: 'contract sync + full suite: 4 module cards, bootstrap self-check (span face reconciliation), npm test + lint'
title_zh: '契约同步与全量——模块卡 4 张+自举走位验收+全量测试+lint'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 16:44:50
priority: P0
depends_on: [task-01, task-02, task-03]
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-001@v1, D-004@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/setup.md
  - .sillyspec/docs/sillyspec/modules/docs-consistency.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
target_files:
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/setup.md
  - .sillyspec/docs/sillyspec/modules/docs-consistency.md
expects_from:
  - provider: task-03
    needs: [map-span-risk-section]
goal: >
  四张模块卡与实现事实对齐，本变更自身按新声明面走位对账，全量测试+lint 收口。
implementation:
  - 模块卡同步：core-engine.md（span-risk-surface.js 补录+QUICK_RISK_PATH_PATTERNS 退役+ceremony-tier/quick-gate-profile/scope-audit/review-tier 口径）；runtime.md（gates/shared 接线）；setup.md（config-schema note）；docs-consistency.md（map span_risk 段维护+knowledge 登记）——只写实现事实，不写过程
  - _module-map.yaml core-engine paths 补 src/span-risk-surface.js（与 blast-surface.js 补录同款；task-03 加 span_risk 段时若未顺带 paths 登记则本 task 补）
  - 自举走位验收：本变更文件面 × 本仓 span_risk 声明表回放——按 design 文件清单实际命中 token×文件（migration/dispatch 域）记明细，span 档预期 S2 对账
  - npm test 全量 + npm run lint 双绿
acceptance:
  - 四模块卡与 map 无 needs_review 漂移（docs-check 过）
  - 走位验收记录实际命中 token×文件清单与 span 档预期一致
  - npm test 全量 exit 0 + npm run lint exit 0
verify:
  - npm test
  - npm run lint
constraints:
  - 只同步文档与 map 登记，不改 src/test 代码（代码问题回流对应 task 重开）
  - 走位验收如实记录（命中面若与预期不符，如实写偏差并回 task-01/03 判定）
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
