---
id: task-11
title: 'config-schema 枚举扩 + 新键 decisions.behind_threshold + verify-postcheck skip 真跳过接线 + evidence-auto 推荐逻辑 + config-schema.test 防漂断言'
title_zh: 'config-schema 枚举扩 + 新键 decisions.behind_threshold + verify-postcheck skip 真跳过接线 + evidence-auto 推荐逻辑 + config-schema.test 防漂断言'
author: 'qinyi'
created_at: 2026-08-23 21:48:31
priority: P0
depends_on: []
blocks: ['task-12', 'task-13']
requirement_ids: [FR-10]
decision_ids: ['D-005@v2']
provides:
  - contract: test_strategy_resolution
    fields: [strategy, evidence_auto_recommendation]
allowed_paths:
  - src/config-schema.js
  - src/verify-postcheck.js
  - test/config-schema.test.mjs
related_tests:
  - test/config-schema.test.mjs（:92-115 renderExample 防漂断言随枚举/新 live 键更新，本 task 改）；test/verify-postcheck-module.test.mjs（skip/evidence-auto 断言扩展由 task-13 交付，路径归 task-13）
goal: >
  兑现 D-005@v2——test_strategy 枚举扩 skip（真跳过不回退全量）与 evidence-auto（按
  module-impact 推荐检查组合），新增 decisions.behind_threshold 键，导出契约供 task-12/13 消费。
implementation:
  - config-schema.js test_strategy 枚举（:120）扩为 full/module/skip/evidence-auto，desc 补 skip=真跳过、evidence-auto=按证据面推荐；新增 decisions 段与键 decisions.behind_threshold（integer/optional/live/缺省 10，reader=docs-check 决策规则——消费侧 task-05 已交付）；renderExample 同步补 decisions 段（否则防漂断言红）
  - verify-postcheck.js extractTestStrategy（:168-176）识别 skip 与 evidence-auto 两值，未知值仍回 null（缺省全量口径不动）；decideVerifyTestAction 增 skip 分支返回 skip 动作，不落 full 兜底
  - runVerifyTestCheck 对 skip 短路返回既有 skipped 状态机 shape（:781 先例），reason 显式标注「测试已按 test_strategy=skip 配置跳过」+ R-07 行为变化提示
  - verify-postcheck.js 新导出 resolveTestStrategy 纯函数（契约 test_strategy_resolution）——evidence-auto 时按变更目录 module-impact.md 影响类型映射推荐（行为→module 聚焦测试、文档→docs-check、门禁契约→gate），缺失/不可解析降级 module 并注记 degraded；runVerifyTestCheck 对 evidence-auto 先经它取生效策略再进既有链路
  - test/config-schema.test.mjs 更新防漂断言——枚举含四值、decisions.behind_threshold 为 live 且 renderExample 含其 token
acceptance:
  - extractTestStrategy 解析 skip/evidence-auto 返回对应枚举值；full/module/null 三态行为不变（未知值仍 null）
  - 配置 skip 时 runVerifyTestCheck 返回 status=skipped 且不执行 commands.test，reason 含显式跳过标注；full/module/缺省三路径输出与现状一致
  - resolveTestStrategy 对 full/module/缺省返回原 strategy 且 evidence_auto_recommendation=null；对 evidence-auto 返回两字段齐备的推荐结果，module-impact.md 缺失时降级 module 且注记；config schema --json 的 test_strategy.values 含四值、新键 live 可查
verify:
  - node --check src/config-schema.js && node --check src/verify-postcheck.js && node --test test/config-schema.test.mjs（skip 不回退全量/evidence-auto 降级等深度语义回归交 task-13 统一锁定）
constraints:
  - full/module 消费路径语义不变；未配置缺省=全量 full 不变（:216 null 回退保留）
  - skip 生效时输出显式标注留审计痕迹（R-07）；R-07 的 CHANGELOG/doctor 升级提示归本 task——以 skip 标注文本承载行为变化说明（仓库无 CHANGELOG 文件，doctor 检查项属 task-05 不在本 task 扩）
  - evidence-auto 降级 module 并注记不阻断 verify；不改 docs-check/doctor 消费逻辑；测试仅改 test/config-schema.test.mjs（verify-postcheck-module.test.mjs 断言扩展归 task-13）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
