---
id: task-04
title: 'verify --done 晋升：判定列驱动 candidate→active'
title_zh: 'verify --done 晋升：判定列驱动 candidate→active'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 12:35:27
priority: P0
depends_on: [task-01]
blocks: [task-06]
requirement_ids: [FR-02]
decision_ids: [D-003@v1]
allowed_paths:
  - src/test-bindings.js
  - src/run/gates.js
  - test/test-bindings.test.mjs
target_files: []
expects_from:
  - task-01 readChangeTrace/writeChangeTrace
goal: >
  verify --done 矩阵门通过后按判定列晋升（D-003@v1）：covered/covered-service→
  state=active+confirmed_by=agent+confirmed_at=HEAD；partial 留 candidate；
  uncovered/non-testable 删行——判定列即 agent 复核面。
implementation:
  - src/test-bindings.js 增 promoteTraceFromMatrix({tracePath, matrixRows})：按判定枚举更新/删行（消费 extractAcceptanceMatrixSlots 同源形态）
  - src/run/gates.js verify 门通过点（testCheck+记账之后）接线调用；try/catch fail-open（晋升失败不拦 --done，归档以 trace 现态为准）
  - 晋升幂等：重跑 --done 零漂移
acceptance:
  - covered/covered-service 行三字段齐变（state/confirmed_by/confirmed_at）；partial 保持 candidate；uncovered/non-testable 行被删
  - 重跑晋升零漂移（fixture 直测）
  - promote 抛异常时 --done 不被拦（fail-open，留 stderr 提示）
verify:
  - node --test test/test-bindings.test.mjs
  - npm run lint
constraints:
  - 只消费 verify-result.md 判定列，不改矩阵校验规则
  - 晋升仅落变更期 trace（全局提升在 task-06）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
