---
id: task-04
title: 'stages/verify.js Step 7 prompt 纪律两条'
title_zh: 'stages/verify.js Step 7 prompt 纪律两条'
author: 'qinyi'
created_at: 2026-09-07 03:51:53
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-001@v1]
allowed_paths:
  - src/stages/verify.js
target_files:
  - src/stages/verify.js
goal: >
  verify Step 7 prompt 增加两条纪律，卸责并防篡改告知。
implementation:
  - Step 7（输出验证报告）prompt 操作清单追加：预填探针段不可篡改或删除（verify --done gate 会重跑对比，不符即拦）；verify-facts.json 为机器底稿勿手改（防护基准是正文，改底稿无意义）
acceptance:
  - prompt 文本含两条纪律且指向 gate 行为
verify:
  - node -e import 冒烟 + node --test test/verify-probes.test.mjs
constraints:
  - 只改 prompt 文案，不改步骤结构与门控

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
