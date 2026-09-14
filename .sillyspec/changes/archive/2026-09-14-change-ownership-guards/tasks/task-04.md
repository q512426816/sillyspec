---
id: task-04
title: ownership-guards-integration-tests-and-module-cards
title_zh: '测试与模块卡——迁移/四态/旁路/过滤/分流/空源集成测试（真 git 临时仓）+六卡同步+AGENTS.md 铁律'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 20:00:04
priority: P1
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: []
allowed_paths:
  - test/change-ownership-guards.test.mjs
  - .sillyspec/docs/sillyspec/modules/progress.md
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/setup.md
  - AGENTS.md
target_files:
  - NEW:test/change-ownership-guards.test.mjs
  - .sillyspec/docs/sillyspec/modules/progress.md
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/setup.md
  - AGENTS.md
expects_from:
  task-02:
    - contract: OwnershipCheck
      needs: [assertChangeOwnership]
  task-03:
    - contract: ArchiveGateAndAttribution
      needs: [archive-apply-gate, admission-filter, attribution-mode-switch]
goal: >
  测试与模块卡——change-ownership-guards 集成测试（真 git 临时仓不 mock）覆盖迁移幂等/所有权四态/assess 旁路/归档门/放行过滤/归因分流/终态空源，六张模块卡登记与 AGENTS.md 会话标识铁律（全 FR）。
implementation:
  - 新建 test/change-ownership-guards.test.mjs 真 git 临时仓端到端（不 mock git 与 SQLite）——v5→v6 幂等迁移/所有权四态（自有放行/活跃拒绝/窗口外接管/takeover 留痕）/assess 旁路受校验/归档阻断+--skip-apply 留痕/放行相交过滤（外来声明剔除）/归因模式分流/分支已删终态空源
  - 六卡登记（裸路径+符号名）——progress.md（owner_session 列+assertChangeOwnership）/worktree.md（放行收紧+归档收口关联）/runtime.md（归档收口+所有权接线）/cli-entry.md（--takeover/--skip-apply flag）/core-engine.md（task-review 归因分流）/setup.md（change-ownership.heartbeat_minutes 配置键）
  - AGENTS.md 新增会话标识铁律——agent 会话启动 export SILLYSPEC_SESSION_ID=<唯一标识>，附 --session <id> flag 回退示例（部分 harness Bash 工具 shell 状态不持久 env 丢失时每命令带 flag）
acceptance:
  - 集成测试全绿覆盖七组用例（迁移幂等/四态/assess 旁路/归档门/放行过滤/归因分流/终态空源）
  - 六卡均登记本变更符号名与裸路径且 docs check --paths 六卡通过
  - AGENTS.md 含 export SILLYSPEC_SESSION_ID 铁律与 --session flag 回退示例
verify:
  - npm test
  - npm run lint
  - node bin/sillyspec.js docs check --paths .sillyspec/docs/sillyspec/modules/progress.md,.sillyspec/docs/sillyspec/modules/worktree.md,.sillyspec/docs/sillyspec/modules/runtime.md,.sillyspec/docs/sillyspec/modules/cli-entry.md,.sillyspec/docs/sillyspec/modules/core-engine.md,.sillyspec/docs/sillyspec/modules/setup.md
constraints:
  - 集成测试用真 git 临时仓不 mock git 与 SQLite（复用既有测试 tmp 仓基建）
  - 模块卡登记只补增量事实不改既有结构；AGENTS.md 只加铁律一行+回退示例不重排
  - 不改 src 逻辑（实现归 task-01~03，发现缺陷回报不越卡修）
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
