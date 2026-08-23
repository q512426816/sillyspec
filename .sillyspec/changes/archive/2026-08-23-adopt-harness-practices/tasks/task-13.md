---
id: task-13
title: 'verify.js 检查选择指引 + _globalGuardrails 修订 + skip/evidence-auto 语义回归测试（含占位符注入与降级路径）'
title_zh: 'verify.js 检查选择指引 + _globalGuardrails 修订 + skip/evidence-auto 语义回归测试（含占位符注入与降级路径）'
author: 'qinyi'
created_at: 2026-08-23 21:48:31
priority: P1
depends_on: ['task-11', 'task-12']
blocks: ['task-14']
requirement_ids: [FR-11, FR-12]
decision_ids: ['D-005@v2']
expects_from:
  - task: task-11
    needs: [strategy]
allowed_paths:
  - src/stages/verify.js
  - test/verify-postcheck-module.test.mjs
goal: >
  verify prompt 注入检查选择指引 + _globalGuardrails 增「不重复已通过检查/本地聚焦」
  条目（FR-12），并以语义回归测试锁定 skip 真跳过、evidence-auto 占位符注入与降级
  路径——task-11/12 产出的消费侧验证（FR-11）。
implementation:
  - stages/verify.js「运行测试和质量扫描」step prompt 注入检查选择指引——行为改动→聚焦测试（test_strategy=module）、文档/prompt 改动→docs-check、门禁契约/接口改动→sillyspec gate，全量仅在用户明确要求或仓库级不可分变更时；并落位 EVIDENCE_AUTO_RECOMMENDATION 占位符引用（衔接 task-12 注入分支，对齐 :92 WORKTREE_BASELINE_INFO 落位形态）
  - _globalGuardrails 增条目——不得为凑检查而重复执行已通过的检查；本地聚焦、全量留给 CI/明确要求
  - test/verify-postcheck-module.test.mjs 扩语义回归——extractTestStrategy 解析 skip/evidence-auto、decideVerifyTestAction 对 skip 返回 skip 动作不回退全量、resolveTestStrategy 契约两字段（strategy+evidence_auto_recommendation）与 module-impact 缺失降级 module 注记
  - 同文件补占位符注入端到端断言（照 verify-baseline-injection.test.mjs 的 outputStep+runCapturing 范式）——evidence-auto 渲染不残留裸占位符、降级路径注入指引文本
acceptance:
  - 配置 skip 后 verify 实测不再回退全量（回归锁定），skip 输出显式标注（R-07 审计痕迹）
  - evidence-auto 端到端——prompt 含推荐组合与否决说明，module-impact 缺失降级 module 且注记
  - verify stage prompt 含检查选择指引与新增护栏条目；full/module/缺省三路径既有断言不回归
  - node --test test/verify-postcheck-module.test.mjs 全绿（含既有 weird 回 null 等旧断言）
verify:
  - node --check src/stages/verify.js
  - node --test test/verify-postcheck-module.test.mjs
constraints:
  - full/module 语义不变、未配置缺省=全量不变——两条 brownfield 兜底必须有回归断言覆盖
  - 指引为 advisory 注入，不新增硬门禁、不改 verify 步骤结构
  - src/stages/verify.js 同时被 task-09（Wave 3）修改——不同 Wave 合法，本 task 不动 task-09 的 postmortem 提示段
  - 语义回归统一写在 test/verify-postcheck-module.test.mjs（不新建 test-strategy-skip.test.mjs，与 implementation 一致）；纯函数断言沿用本文件既有导入风格
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
