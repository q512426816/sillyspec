---
id: task-03
title: 'add-scope-audit-command-route'
title_zh: 'scope-audit 命令路由（--change 必填 / --json / fail-soft）'
author: 'qinyi'
created_at: 2026-09-10 10:45:46
priority: P0
depends_on: ['task-01', 'task-02']
blocks: ['task-07']
requirement_ids: [FR-02]
decision_ids: [D-003@v1]
expects_from:
  task-01:
    - contract: ScopeAuditResult
      needs: [rows, totals, degradedReason, mode]
allowed_paths:
  - src/index.js
  - docs/sillyspec/platform-interface-map.md
target_files:
  - src/index.js
  - docs/sillyspec/platform-interface-map.md
goal: >
  在 src/index.js 新增 case 'scope-audit' 命令路由，把 Wave 1 纯函数以 CLI 形态暴露——用户与 agent 不依赖阶段 --done 时点即可随时查看变更范围对账（FR-02）。
implementation:
  - 路由形态对齐 verify-probes（src/index.js:897）与 module-impact（:1041）先例——args 解析 --change 必填 + --json 可选，缺 --change 打用法错误并 exit 2
  - assertSafeChangeName 校验变更名后动态 import scope-audit.js 调 computeChangeScopeAudit（specBase 解析对齐 verify-probes 的 worktree 锚定主仓口径）
  - 加 --json 输出 JSON.stringify 的 ScopeAuditResult 全字段（rows/totals/degradedReason/mode 等）；缺省走 renderScopeAuditTable 人类可读表
  - 运行错误（变更不存在 / guard.json 缺失的 quick 会话 id / 计算异常）fail-soft 打错误摘要并 exit 1，不抛栈
  - 帮助文本 usage 区（:105 verify-probes 行附近）补一行命令说明
acceptance:
  - sillyspec scope-audit --change <full-flow 变更> 输出三态全表（✓ 计划内 / ⚠️ 计划外 / ⚠️ 计划未动）
  - 加 --json 输出结构化 JSON，ScopeAuditResult 字段齐可序列化
  - 缺 --change 用法错 exit 2；不存在的变更名或 quick 会话 id 出明确错误摘要 exit 1
verify:
  - node sillyspec scope-audit --change 2026-09-10-change-scope-audit（dogfood 本变更自测）
  - node --check src/index.js
constraints:
  - 不新增任何门禁（advisory 展示命令，既有命令行为零变化）
  - 对齐既有命令先例形态（assertSafeChangeName / 用法错 exit 2 / 运行错 fail-soft exit 1），不自创退出码语义
  - platform-interface-map.md 仅限 index.js 行号锚点机械平移（ql-20260816-015 先例），禁内容改动
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
