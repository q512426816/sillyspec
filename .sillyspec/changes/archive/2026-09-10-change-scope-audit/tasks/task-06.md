---
id: task-06
title: 'add-quick-numstat-line-counts'
title_zh: 'quick --done 文件行/审计行升级行数'
author: 'qinyi'
created_at: 2026-09-10 10:45:46
priority: P1
depends_on: ['task-01']
blocks: ['task-07']
requirement_ids: [FR-04]
decision_ids: [D-004@v1, D-006@v1]
allowed_paths:
  - src/run/complete-handlers.js
target_files:
  - src/run/complete-handlers.js
goal: >
  quick --done 收尾文件行/审计行（:1196-1255 消费区）并上 numstat 真实行数（基点 HEAD 未提交窗口），审计门禁判定零改动（FR-04）。
implementation:
  - quick 收尾 attributedFiles/softTestFiles/undeclared 输出区（src/run/complete-handlers.js:1196-1255）import collectNumstatByPath（task-01 函数导出非 DTO，故不写 expects_from）对 realFiles 与 softFiles 上行数
  - 文件行 bullet 追加 +N/-M 行数（binary 显 BIN），软归属与未声明审计行同口径带行数
  - quick 已提交（status 空且有 QUICKLOG 条目）提示降级读 QUICKLOG 条目文件行，不出空表冒充实时
  - auditQuickCompletion 判定与门禁零改动（只加展示列）
acceptance:
  - quick --done 文件行带 +N/-M 行数（与 git diff HEAD --numstat 一致，binary 显 BIN）
  - 门禁行为与改前一致（auditQuickCompletion 判定不变）
  - 已提交 quick 提示降级读 QUICKLOG，不出空表
verify:
  - npm test（audit-quick-completion.test.mjs 等既有回归零破）
  - node --check src/run/complete-handlers.js
constraints:
  - printQuickAuditReview 签名不变
  - 不改 auditQuickCompletion 判定语义（行数纯展示列，advisory）
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
