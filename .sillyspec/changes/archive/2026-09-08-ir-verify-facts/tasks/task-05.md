---
id: task-05
title: 'facts 基线对比维度'
title_zh: 'facts 基线对比维度'
author: 'qinyi'
created_at: 2026-09-08 23:16:18
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-001@v2]
allowed_paths:
  - src/verify-postcheck.js
  - NEW:test/verify-receipt-rerun.test.mjs
target_files:
  - src/verify-postcheck.js
  - NEW:test/verify-receipt-rerun.test.mjs
expects_from:
  needs: task-01: facts probes 段形状与 writeVerifyFacts 分段合并（factsConsistency 段写入复用，不另开写入面）
goal: >
  checkProbeConsistency 增「重跑指标 vs facts 快照」对比维度，检出 facts 底稿过期（FR-05）。
implementation:
  - verify-postcheck.js checkProbeConsistency：既有 md 锚点对账不动；增第二维度——本次重跑指标 vs verify-facts.json probes 段快照逐计数比对；不一致按分级报告（probe1/6=ERROR、probe3/5=WARNING，继承 HEAD-advance 降级语义 :2584-2591）；结论经 writeVerifyFacts 分段合并固化 factsConsistency{checked,verdict,detail}
  - 修复指引文案：verify-probes --init 刷新 facts + 按新结果同步 md 探针段（双步）
  - test/verify-receipt-rerun.test.mjs 追加基线对比用例：match/mismatch-probe1(ERROR)/mismatch-probe3(WARNING)/facts 缺失 skipped
acceptance:
  - facts 被手改对齐新代码后 --done：probe1/6 mismatch 报 ERROR、probe3/5 报 WARNING
  - md 锚点对账行为零变化（既有 probe-consistency 测试全绿）
  - factsConsistency 段固化且 re-init 分段合并不抹
  - 依赖（git/db）不可用 → skipped 留痕不阻断
verify:
  - node --test test/verify-receipt-rerun.test.mjs
  - node --test test/verify-probes-facts.test.mjs
constraints:
  - 不新增独立重跑（复用 checkProbeConsistency 既有一次全量重跑）
  - 不降级既有 md 锚点 ERROR 语义
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
