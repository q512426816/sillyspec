---
id: task-05
title: 'stage-burst test surface (equivalence, breakpoint, answer, escape valve)'
title_zh: 'stage-burst 测试面收口（等价性双跑/断点/answer 消费/逃生阀）+ 全量回归'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:23:08
priority: P1
depends_on: ['task-02', 'task-03', 'task-04']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06]
decision_ids: [D-011@v1]
expects_from: 'task-01 readStageBurst；task-02 burst 渲染分支；task-03 completeStepBurst+接线；task-04 flow 翻转'
allowed_paths:
  - test/stage-burst.test.mjs
target_files:
  - NEW:test/stage-burst.test.mjs
goal: >
  burst 机制的行为级测试收口：等价性双跑（验收 2）+ 断点 + answer 单次消费 + 逃生阀 + 尾随 stale 场景 + 全量回归。
implementation:
  - test/stage-burst.test.mjs 扩展（task-01 已建文件）：复用 test/_cli-step-harness.mjs（makeRepo/initChange/seedStage/runStage/runCLI）造 fixture
  - 等价性：同 fixture 双副本，一份逐步 completeStep（burst off 外部循环 run <stage> --done N 次）、一份 burst on 单次 --done——终态 progress 步态/output 一致、gate 判定一致
  - 断点：fixture 门禁失败步（如 design 文件清单幻觉路径）→ burst --done 非零退出、progress 停在失败步、与单步失败态一致
  - answer 单次消费：双 requiresWait fixture → 一次 --done --answer 完成首等待步、停在第二等待步（exit 非零、waitAnswer 未错填）；二次 --done --answer 完成
  - 尾随 stale：--reopen 造 stale 尾 + burst on → 渲染打印 stale 说明书 + --done 轮首拉回完成（渲染集合=完成集合）
  - 逃生阀：local.yaml burst true + SILLYSPEC_STAGE_BURST=0 → 单步渲染
  - env 纪律：spawn env 显式 delete SILLYSPEC_STAGE_BURST 后按需注入；行为翻转走 fixture 文件（被跟踪）
acceptance:
  - 全部新测试绿；全量 npm test + npm run lint 零回归（既有 3 存量失败按知识库口径甄别非本变更引入）
  - '本仓 .sillyspec/local.yaml 加 stage 段 burst: true 自举（gitignored 不入提交面）'
verify:
  - node --test test/stage-burst.test.mjs
  - npm test && npm run lint
constraints:
  - 测试断言面不因实现方便而放松（等价性以 gate 输出与 progress 态为准，非文本逐字节——D-002@v2 首访渲染形口径）
  - 不改 src（纯测试收口；发现实现 bug 回 task-02/03 修）
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
