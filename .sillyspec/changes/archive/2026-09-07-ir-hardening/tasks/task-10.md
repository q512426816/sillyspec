---
id: task-10
title: '文档同步——file-lifecycle 注记 + module-impact + 全量 lint/test 回归'
title_zh: '文档同步——file-lifecycle 注记 + module-impact + 全量 lint/test 回归'
author: 'qinyi'
created_at: 2026-09-07 23:13:34
priority: P0
depends_on: ['task-09']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1, D-006@v1, D-007@v1]
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
target_files: [docs/sillyspec/file-lifecycle.md]
goal: >
  文档同步与全量回归：file-lifecycle 批次注记、module-impact 更新结果翻 done、全量 test+lint。
implementation:
  - file-lifecycle.md 增本变更注记（严格模式闸门语义 + 两个新信封 code + sidecar + 回执）
  - module-impact.md「更新结果」表逐行翻 done/skipped（含理由）
  - npm test 全量 + npm run lint 全绿
acceptance:
  - file-lifecycle 注记含闸门语义与信封 code
  - module-impact 无 pending/待办行（verify 硬拦）
  - 全量测试 0 失败 + lint 0 告警
verify:
  - npm test 全量 0 失败
  - npm run lint 0 告警
constraints:
  - 纯文档+回归，不改 src 逻辑
  - 若发现回归属实现 task 的问题，回对应 task 修（不在本 task 打补丁绕过）
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
