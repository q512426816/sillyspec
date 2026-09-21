---
id: task-05
title: '文档收口——镜像机械重生成+模块卡行为行+docs-check 重锚'
title_zh: '文档收口（镜像+模块卡+重锚）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 22:51:51
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04']
blocks: []
requirement_ids: ['FR-01', 'FR-02', 'FR-03', 'FR-04']
decision_ids: ['D-001@v1', 'D-002@v1', 'D-003@v1', 'D-004@v1']
allowed_paths:
  - docs/prompt/_extracted.json
  - docs/prompt/plan.md
  - docs/prompt/execute.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
target_files:
  - docs/prompt/_extracted.json
  - docs/prompt/plan.md
  - docs/prompt/execute.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
  - .sillyspec/docs/sillyspec/modules/machine-interface.md
  - .sillyspec/docs/sillyspec/modules/machine-interface.changelog.md
goal: >
  W1+W2 源码落地后收口文档面
implementation:
  - node docs/prompt/_extract.mjs 重生成镜像（DYNAMIC 策展面按需人工）
  - runtime 卡增补 P2/P4 行为行+changelog；stages/cli-entry 视落位
  - docs-check 按提示重锚
acceptance:
  - 镜像与源一致（_verify 不低于基线）
  - 模块卡行为行锚点有效
  - docs-check 无新增漂移
verify:
  - node docs/prompt/_verify.mjs
  - sillyspec docs check
  - npm test
constraints:
  - 镜像只由 _extract.mjs 机械生成禁手编
  - 模块卡只写主仓
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（示例形态 src/foo . js:123——此处为格式教学非引用）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
