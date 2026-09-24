---
id: task-03
title: '探针 7 落 candidate：归属行机械写 test-trace.json'
title_zh: '探针 7 落 candidate：归属行机械写 test-trace.json'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 12:35:27
priority: P0
depends_on: [task-01]
blocks: [task-06]
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-003@v1, D-005@v1]
allowed_paths:
  - src/verify-probes.js
  - test/test-bindings.test.mjs
target_files: []
expects_from:
  - task-01 writeChangeTrace + row_id 构造（含 orphan 指纹）
goal: >
  探针 7 构建验收×测试矩阵时，把归属非空行机械落为 candidate trace
  （requirement_ids join→局部 FR-NN 锚；无锚→anchor:null+指纹 row_id）——
  候选供给主写点，预填≠确认（discovery=machine/confirmed_by=null）。
implementation:
  - src/verify-probes.js 探针 7 构建处（矩阵行循环）调用 writeChangeTrace：归属非空行→candidate 行
  - 锚解析：task 卡 frontmatter requirement_ids join → 局部 FR-NN；无锚行 row_id=acc-<index>-<sha256(acceptance 原文)前8>（D-005@v1）
  - 幂等：行键=anchor+row_id，重复构建零漂移；uncovered/non-testable 预填不落行
acceptance:
  - 有归属 acceptance 落 candidate 行（三字段 discovery/confirmed_by/state 如实）；uncovered/non-testable 零落行（fixture 驱动探针构建直测）
  - orphan 行 row_id 同文恒稳（重跑探针不变）且含 8 位指纹段
  - 重复构建 test-trace.json 字节不变
verify:
  - node --test test/test-bindings.test.mjs
  - npm run lint
constraints:
  - 只写变更目录 test-trace.json，不触活库/quicklog 面
  - 不改矩阵渲染文案与 validateAcceptanceMatrix 校验规则
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
