---
id: task-06
title: '测试套件 test/plan-target-files.test.mjs（声明核验 + 对账差集 + 两形态×三模式矩阵 + 门禁冒烟）'
title_zh: '测试套件 test/plan-target-files.test.mjs（声明核验 + 对账差集 + 两形态×三模式矩阵 + 门禁冒烟）'
author: 'qinyi'
created_at: 2026-09-07 00:35:26
priority: P0
depends_on: ['task-03', 'task-04', 'task-05']
blocks: []
requirement_ids: [FR-02, FR-03, FR-04]
decision_ids: [D-002@v1, D-004@v1]
allowed_paths:
  - test/plan-target-files.test.mjs
  - test/taskcard.test.mjs
  - test/taskcard-ensure-skeletons.test.mjs
  - test/plan-postcheck.test.mjs
  - test/plan-postcheck-blocklist.test.mjs
  - test/plan-adopt-waves.test.mjs
  - test/run-complete-noai-done-gate.test.mjs
  - test/run-complete-step-validator-rollback.test.mjs
goal: >
  测试套件锁定声明核验与对账行为：三类差集、存量兼容、两形态 actual
  口径、门禁阻断冒烟，并修复受影响的既有断言。
implementation:
  - 新建 test/plan-target-files.test.mjs：parseTargetFiles 严格解析（拒 glob/前缀/引号、NEW: 剥离）；validateTargetFiles 各 severity 分支；reconcile 三类差集与 skipped/degraded；基建过滤口径；两形态（worktree 存活 meta 在 / post-apply meta 删 + apply-pathspec）actual 断言；gates 接线阻断冒烟
  - 更新受影响既有测试（executePlanPostcheck 聚合相关 4 测试若因新汇总 WARNING 失败、taskcard 骨架快照断言）
acceptance:
  - 新文件全部断言通过（含门禁阻断冒烟：②类在场 verify gate 红）
  - 受影响既有测试更新后通过；全量 npm test 零回归
verify:
  - node --test test/plan-target-files.test.mjs && npm test
constraints:
  - node:test 风格与本仓一致，不引第三方测试库
  - 不为实现迁就而弱化断言（发现的缺陷回流对应 task 修复）
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
