---
id: task-03
title: '执行矩阵合并：5 动作×trace 空/非空'
title_zh: '执行矩阵合并：5 动作×trace 空/非空'
priority: P0
depends_on: [task-01, task-02]
blocks: [task-04, task-06]
requirement_ids: [FR-03]
decision_ids: [D-002@v1]
allowed_paths:
  - src/verify-postcheck.js
  - test/verify-trace-residual.test.mjs
target_files: []
goal: >
  残差并入执行：full/module-subset/deps-auto-subset 主跑照旧+补残差段；skip/
  module-zero-hit-skip 且 trace 非空 → 跑 trace（mode=trace-residual）；trace
  空零行为漂移。任一段失败整体 failed（现选测逐字保留，残差只在结果层加法）。
implementation:
  - runVerifyTestCheck 主结果后按 FR-03 矩阵并入（skip 类以 trace 执行结果替代但 reason 注记原 skip 依据；其余 append 残差段）
  - 保守差集：action=deps-auto-subset 残差=traceFiles 减 deps 文件集；其余动作残差=全部 traceFiles（禁解析命令串）
  - 结果 mode 附加 '+trace(N)'（skip 类 'trace-residual'）；command 标签 append；失败 reason 透传残差段明细
acceptance:
  - trace 空：门禁输出与 3143aadc 行为一致（零漂移回归钉——fixture 对拍 mode/reason/command）
  - skip+trace 非空 → 执行 trace 且 mode=trace-residual；skip+trace 空 → skipped 原样
  - deps 动作残差剔除已覆盖文件；full 残差=全量 traceFiles
  - 残差段失败 → 整体 failed 且 reason 含残差段信息
verify:
  - node --test test/verify-trace-residual.test.mjs
  - npm run lint
constraints:
  - 不改 decideVerifyTestAction 缺省与 skip 声明语义
  - orphan/candidate/superseded 行不进跑集
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
