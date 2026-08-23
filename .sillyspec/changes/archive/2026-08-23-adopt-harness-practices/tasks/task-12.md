---
id: task-12
title: 'run/prompt.js verify 分支 evidence-auto 占位符注入'
title_zh: 'run/prompt.js verify 分支 evidence-auto 占位符注入'
author: 'qinyi'
created_at: 2026-08-23 21:48:31
priority: P1
depends_on: ['task-11']
blocks: ['task-13']
requirement_ids: [FR-11]
decision_ids: ['D-005@v2']
expects_from:
  - task: task-11
    needs: [evidence_auto_recommendation]
allowed_paths:
  - src/run/prompt.js
goal: >
  verify 的推荐注入发生在 prompt 时点（verify-postcheck 在 --done 事后运行），故经
  run/prompt.js verify 分支新增 EVIDENCE_AUTO_RECOMMENDATION 占位符处理——把 task-11
  的 evidence_auto_recommendation 渲染进 step prompt 供用户否决（FR-11）。
implementation:
  - 复用 WORKTREE_BASELINE_INFO 先例（prompt.js:649 的 stageName=verify 且 promptText.includes 判据分支模式），新增 EVIDENCE_AUTO_RECOMMENDATION 占位符处理分支
  - 分支内经 resolvePromptSpecBase 定位 local.yaml 文本，动态 import verify-postcheck 的 resolveTestStrategy（task-11 契约），取 evidence_auto_recommendation 渲染为推荐检查组合块——含推荐理由、降级注记与「可在 verify-result.md 否决并改跑全量」说明
  - fail-soft——读取失败/resolveTestStrategy 抛错/非 evidence-auto（recommendation=null）时不触发替换或注入降级自查指引，绝不阻断 verify（对齐 :678 catch 先例）
  - 占位符在 stages/verify.js prompt 的落位由 task-13 交付——本 task 交付注入机制，占位符就位后端到端生效
acceptance:
  - test_strategy 为 evidence-auto 且 step prompt 含占位符 → 渲染后不残留裸占位符，输出含推荐组合与否决说明
  - 非 evidence-auto / 占位符缺失 / 其他阶段 → 注入分支零干扰，既有输出不变
  - 注入异常路径降级为指引文本，不抛错不阻断 prompt 输出
verify:
  - node --check src/run/prompt.js
  - 端到端注入与降级路径回归交 task-13（照 verify-baseline-injection.test.mjs 的 outputStep 范式）
constraints:
  - 仅做注入渲染，不改推荐逻辑本体（resolveTestStrategy 归 task-11 契约）
  - 注入必须 fail-soft，任何异常降级为指引文本，绝不阻断 verify prompt
  - src/run/prompt.js 同时被 task-04（Wave 2）修改——不同 Wave 合法，本 task 不动 brainstorm Step2 decisionHits 分支
  - 不改 stages/verify.js（占位符落位归 task-13），不改测试文件
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
