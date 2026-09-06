---
id: task-02
title: 'plan 阶段 prompt 填写指引（src/stages/plan.js 任务清单步 + TaskCard 生成步）'
title_zh: 'plan 阶段 prompt 填写指引（src/stages/plan.js 任务清单步 + TaskCard 生成步）'
author: 'qinyi'
created_at: 2026-09-07 00:35:26
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-004@v1]
allowed_paths:
  - src/stages/plan.js
goal: >
  plan 阶段两步 prompt 注入 target_files 填写指引，让 agent 在任务展开
  与 TaskCard 生成时按统一格式声明计划改动的文件。
implementation:
  - 任务清单步（:137 附近）prompt 增加要求：展开任务时确定每个 task 的 target_files
  - TaskCard 生成步（:405-457）必备字段说明加入 target_files 与格式正反例
acceptance:
  - 两步 prompt 文本均含 target_files 指引与格式说明
  - 指引口径与 taskcard-rules.md 一致（单一真相引用，不另造格式）
verify:
  - node --test test/plan-taskcard-include.test.mjs test/plan-postcheck.test.mjs
constraints:
  - 只改 prompt 文案，不改步骤结构/数量/门控
  - prompt 不硬编码完整规则全文（指引与 taskcard-rules.md 同口径）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
