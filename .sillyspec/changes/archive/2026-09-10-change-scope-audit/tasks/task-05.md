---
id: task-05
title: 'inject-archive-scope-audit-table'
title_zh: 'archive --confirm 对账表占位与 fail-soft 注入'
author: 'qinyi'
created_at: 2026-09-10 10:45:46
priority: P1
depends_on: ['task-01', 'task-02']
blocks: ['task-07']
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
expects_from:
  task-01:
    - contract: ScopeAuditResult
      needs: [rows, totals, degradedReason, mode]
allowed_paths:
  - src/stages/archive.js
  - src/run/prompt.js
target_files:
  - src/stages/archive.js
  - src/run/prompt.js
goal: >
  「确认归档」步 prompt 注入范围对账全表——用户归档确认前看得到计划×实际对账，注入 fail-soft 不阻断归档（FR-03 第三注入点）。
implementation:
  - src/stages/archive.js「确认归档」步（:167 附近）prompt 操作 1 展示区加 {SCOPE_AUDIT_TABLE} 占位
  - src/run/prompt.js 注入对齐 ARCHIVE_IMPACT_AUDIT 先例（:1002）——条件 stageName 为 archive 且 promptText 含 {SCOPE_AUDIT_TABLE} 时 computeChangeScopeAudit + renderScopeAuditTable 注入
  - 注入 try/catch 降级单行指引（照 :995-1013 形态——异常信息 + 回退手跑 scope-audit 命令）
acceptance:
  - archive --confirm 步 prompt 含注入的对账全表
  - computeChangeScopeAudit 异常时 prompt 含降级单行指引，归档流程不阻断
verify:
  - node --check src/stages/archive.js && node --check src/run/prompt.js
  - npm test
constraints:
  - 不改 archive 完成判定与 requiresConfirm 语义（纯 prompt 展示面增量）
  - 注入 fail-soft——异常降级单行指引，不新增任何门禁
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
