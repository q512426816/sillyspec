---
id: task-02
title: '残差执行段：runTraceResidual 复用组卷口径'
title_zh: '残差执行段：runTraceResidual 复用组卷口径'
priority: P0
depends_on: [task-01]
blocks: [task-03]
requirement_ids: [FR-04]
decision_ids: [D-003@v1]
allowed_paths:
  - src/verify-postcheck.js
  - test/verify-trace-residual.test.mjs
target_files: []
expects_from:
  - task-01 resolveTraceResidual 的 files
goal: >
  残差文件执行段：复用 buildDepsBatches 组卷推断面（扩展名分语言、py 走
  pytest 前缀、其余 node --test），无法归一硬错不猜测（方案 §3.6）。
implementation:
  - src/verify-postcheck.js 增 runTraceResidual({cwd, specBase, files, timeoutMs})：按 buildDepsBatches 同口径组卷执行（复用既有函数/组卷纯函数，以实际签名形态为准——不复制组卷逻辑）
  - py 段无 pytest 前缀可推/语言无法判定 → 抛错（调用方转 failed 硬错）
  - 返回段级结果 {runner, files, status, exitCode, durationMs, outputTail}
acceptance:
  - js/mjs 残差以 node --test 段执行（fixture 仓直测跑通真实小测试文件）
  - 无法归一 → 硬错不执行
  - 段结果字段齐备供合并与披露消费
verify:
  - node --test test/verify-trace-residual.test.mjs
  - npm run lint
constraints:
  - 不新造第二套执行配置（复用 deps 组卷面）
  - 绑定行禁存 shell command
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
