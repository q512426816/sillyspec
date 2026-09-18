---
id: task-02
title: '生成器接线（src/index.js）——design-init 决策追踪表用 prefillDecisionTable；taskcard ids 占位用 prefillCardIds；prefill-refresh 命令路由'
title_zh: '生成器接线（src/index.js）——design-init 决策追踪表用 prefillDecisionTable；taskcard ids 占位用 prefillCardIds；prefill-refresh 命令路由'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 23:50:25
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-002@v1]
allowed_paths:
  - src/index.js
target_files:
  - src/index.js
goal: >
  把 prefill.js 三槽推导接进 src/index.js 三入口——骨架落盘即带预填注值，agent 从「从零写」变「核对改写」。
implementation:
  - design-init 接线：决策追踪表段改用 prefillDecisionTable({ changeDir }) 预填（decisions.md 在场时）；缺 decisions.md 时空槽+提示行，现状骨架行为不变
  - taskcard 接线：requirement_ids/decision_ids 占位改用 prefillCardIds({ changeDir }) 直填——按当时在场文件预填，缺则留空数组+提示行
  - prefill-refresh 接线：新增命令路由 sillyspec prefill-refresh --change <名> 与 help 条目，调 runPrefillRefresh 重放三槽
acceptance:
  - 三入口接线后生成骨架白名单槽含预填注值（design-init 决策追踪表行/taskcard ids 直填/prefill-refresh 重放落槽）
  - 定向回归：design-init/taskcard 相关既有测试全绿（fourpiece-init 无白名单槽不受影响）
verify:
  - npm test
  - npm run lint
constraints:
  - 生成器幂等不覆盖已存在文件的纪律不变；预填随骨架落盘，CLI 单一写入方不变（D-002）
  - 白名单外槽零触碰（D-001）；fourpiece-init（proposal/requirements 骨架无白名单槽）不接线
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     三接线：design-init 决策表/taskcard ids/prefill-refresh 路由 / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
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
