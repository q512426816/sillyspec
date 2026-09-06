---
id: task-01
title: 'taskcard 骨架与 taskcard-rules 增加 target_files 字段支持'
title_zh: 'taskcard 骨架与 taskcard-rules 增加 target_files 字段支持'
author: 'qinyi'
created_at: 2026-09-07 00:35:26
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/taskcard.js
  - templates/prompts/taskcard-rules.md
goal: >
  task 卡骨架与规则文档支持 target_files 声明字段：骨架给占位与格式
  注释，taskcard-rules.md 给填写正反例——agent 填写时的唯一格式真相源。
implementation:
  - buildTaskcardSkeleton frontmatter 在 allowed_paths 之后追加 target_files 空占位注释行
  - 骨架尾注释块补 target_files 格式说明（精确路径 / NEW 前缀表新文件 / 禁 glob 与目录前缀）
  - taskcard-rules.md 新增 target_files 小节：格式定义 + 正反例 + 与 allowed_paths 的语义区别（意图声明 vs 守卫白名单）
acceptance:
  - 生成的骨架含 target_files 字段位与格式注释，既有 9 硬校验字段不受影响
  - taskcard-rules.md 含正反例（正确：src/foo.js、NEW:src/bar.js；错误：src/**、src/dir/）
verify:
  - node --test test/taskcard.test.mjs test/taskcard-yaml-escape.test.mjs test/taskcard-ensure-skeletons.test.mjs
constraints:
  - 只做 additive 占位与文档，不实现解析/核验逻辑（task-03 范围）
  - target_files 不进 SETTABLE_KEYS 白名单（--set 不覆盖列表字段）
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
