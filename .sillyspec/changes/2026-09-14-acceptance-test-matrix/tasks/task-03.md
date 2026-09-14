---
id: task-03
title: '文档——testcase-design.md 第 7 条 + verify-probes.md 清单 + verify.js step5 prompt + docs/prompt 同步'
title_zh: '文档——testcase-design.md 第 7 条 + verify-probes.md 清单 + verify.js step5 prompt + docs/prompt 同步'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 23:45:45
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-001@v1]
allowed_paths:
  - templates/prompts/testcase-design.md
  - templates/prompts/verify-probes.md
  - src/stages/verify.js
  - docs/prompt/verify.md
  - docs/prompt/_extracted.json
  - docs/prompt/README.md
target_files:
  - templates/prompts/testcase-design.md
  - templates/prompts/verify-probes.md
  - src/stages/verify.js
  - docs/prompt/verify.md
  - docs/prompt/_extracted.json
goal: >
  把 acceptance×测试覆盖对账约定文档化——testcase-design 第 7 条为单一真源，verify-probes 清单与 verify step5 prompt 同步矩阵消费说明，docs/prompt 三件套机械同步保持逐字一致。
implementation:
  - templates/prompts/testcase-design.md 现有 1-6 条后追加第 7 条（原文见 design 方案 D）：「**覆盖对账**：每条 TaskCard acceptance 至少对应一个测试用例，或显式标注 non-testable（文档/部署类）；对应关系由 verify 探针 7 矩阵机械核对——写测试时先看卡的 acceptance 列表逐条对齐」
  - templates/prompts/verify-probes.md 探针清单补探针 7 行：CLI 机械半边（acceptance 解析/双源归属/关键词提示/骨架）与 agent 填槽职责（四枚举判定+证据）分述，注明与探针 3 口径差异（存在性面 vs 承接面，冲突以 7 为准）
  - src/stages/verify.js step5「任务蓝图验收」prompt 补矩阵消费说明：核验 acceptance 时先读探针 7 矩阵预填（归属/提示），逐行填四枚举判定与证据（covered/partial 附测试锚点，non-testable 附一句理由），无 tasks/ 跳过不变
  - docs/prompt 三件套同步（改 src/stages/verify.js prompt 后必跑，先读 docs/prompt/README.md 确认）：node docs/prompt/_extract.mjs 刷新 _extracted.json → node docs/prompt/_sync.mjs 同步 verify.md fence（行尾写回 LF）→ node docs/prompt/_verify.mjs 自检；README.md 仅在流水线确实牵动（探针描述/维护说明变化）时一并更新
acceptance:
  - testcase-design.md 含第 7 条覆盖对账约定，1-6 条原文零改动
  - verify-probes.md 探针清单含探针 7 条目；verify.js step5 prompt 含矩阵消费说明
  - docs/prompt/verify.md 与 _extracted.json 的 step5 prompt 逐字一致（node docs/prompt/_verify.mjs 通过），涉及文件 LF 行尾
  - 纯 prompt/文档改动不改变运行时行为（npm run lint 通过）
verify:
  - npm run lint
constraints:
  - 只动 allowed_paths 六文件；verify.js 仅改 prompt 字符串，步骤结构 / noAI 标记 / 步骤名零变动
  - testcase-design 第 7 条以 design 方案 D 文案为准，禁扩写塞新约定（单一真源防漂移）
  - verify.md fence 由 _sync.mjs 从 _extracted.json 机械写入，禁手改 fence 正文
  - README.md 未牵动则不改（allowed_paths 仅兜底）
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
