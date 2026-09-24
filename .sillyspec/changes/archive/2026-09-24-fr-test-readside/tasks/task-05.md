---
id: task-05
title: '账本停复用护栏（trace 非空 fail-closed）'
title_zh: '账本停复用护栏（trace 非空 fail-closed）'
priority: P1
depends_on: [task-01]
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-006@v1]
allowed_paths:
  - src/run/gates.js
  - test/verify-trace-residual.test.mjs
target_files: []
goal: >
  trace 非空变更的 verify 门跳过 test-ledger consult/record——残差并入后 v2
  键不再描述实际跑面，fail-closed 停复用（宁多跑不误绿；空 trace 照用）。
implementation:
  - src/run/gates.js verify 门：consult 前与 record 前各查 readChangeTrace——存在 active 行即跳过（注释护栏理由与退役判据=账本键 v3 携 plan）
acceptance:
  - trace 含 active 行 → consult/record 零调用（stub 断言）
  - trace 空/缺失 → 照常（行为不变）
verify:
  - node --test test/verify-trace-residual.test.mjs
  - npm run lint
constraints:
  - 只动 verify 门两处；quick 门不动（quick 行恒 candidate 天然无残差）
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
