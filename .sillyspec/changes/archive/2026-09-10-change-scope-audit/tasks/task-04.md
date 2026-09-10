---
id: task-04
title: 'inject-execute-fulltable-and-verify-drift-line'
title_zh: 'execute --done 全表+快照双路径 与 verify --done 一行漂移确认'
author: 'qinyi'
created_at: 2026-09-10 10:45:46
priority: P0
depends_on: ['task-01', 'task-02']
blocks: ['task-07']
requirement_ids: [FR-03]
decision_ids: [D-005@v1, D-006@v1]
expects_from:
  task-01:
    - contract: ScopeAuditResult
      needs: [rows, totals, degradedReason, mode]
  task-02:
    - contract: ReconcileActualFiles
      needs: [baseAnchor]
allowed_paths:
  - src/run/complete.js
target_files:
  - src/run/complete.js
goal: >
  execute --done 打印范围对账全表并落 .runtime 快照（completeStep 与 continueStep wait 解除两路径收敛），verify --done 读快照出一行漂移确认——advisory 注入不改任何门禁（FR-03）。
implementation:
  - 抽共享 helper 同调两路径——completeStep（completeStageGates 调用 :609 后）与 continueStep wait 解除完成（:1332 后），wait 解除路径不漏（Grill G-2）
  - execute 完成输出区打 renderScopeAuditTable 全表 + ⚠️ 出口指引一行（补 design.md 声明或 --output 注明原因）+ 写 .sillyspec/.runtime/scope-audit-<change>.json 快照（结构即 ScopeAuditResult）
  - verify 完成输出区一行「变更范围：N 文件 +X/-Y（vs execute 时点：一致|漂移 M 文件）」——读快照对比 totals 与文件集
  - 漂移过滤 = filterDeliverableFiles 后追加排 .sillyspec/docs/** 子树（verify 合法文档同步不计漂移），组合过滤在 scope-audit 调用侧做勿改 filterDeliverableFiles 本体（Grill P2-②）
  - 全程 try/catch fail-soft——注入异常只打单行提示，阶段照常完成
acceptance:
  - execute --done 后控制台见全表且 .runtime/scope-audit-<change>.json 快照存在（continueStep wait 解除路径同样落）
  - verify --done 出一行（一致 或 漂移 M 文件），.sillyspec/docs 文档同步不计漂移
  - computeChangeScopeAudit 注入异常时阶段照常完成，仅单行提示
verify:
  - npm test 既有回归零破 + 手跑一次变更流程 execute/verify --done 抽查（或 node --check src/run/complete.js 语法兜底）
constraints:
  - advisory 零阻断——不改 completeStageGates 判定与回滚语义
  - 快照只写 .sillyspec/.runtime/（运行时产物惯例，不改 git 状态）
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
