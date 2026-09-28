---
id: task-04
title: 'complete.js 方案步 --done 门检索回显＋config-schema 逃生阀＋单测'
title_zh: 'complete.js 方案步 --done 门检索回显＋config-schema 逃生阀＋单测'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-09-28 18:02:57
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-004@v1]
allowed_paths:
  - src/run/complete.js
  - src/config-schema.js
  - test/design-knowledge-check.test.mjs
target_files:
  - src/run/complete.js
  - src/config-schema.js
  - NEW:test/design-knowledge-check.test.mjs
goal: >
  方案步（brainstorm Step 4）--done 门自动知识检索命中回显（warn 不阻断，FR-03 机器面）＋
  local.yaml commands.knowledge-gate 逃生阀。闭合 D-004 缺口：决策时点库内否决路线可见。
implementation:
  - 'src/run/complete.js completeStep（src/run/complete.js:166 一带）：stage=brainstorm 且步骤为「提出 2-3 种方案」的 --done 时，对 --output 文本与 decisions.md 自上次 --done 的新增条目（D-xxx 标题+question 拼串）跑既有知识检索匹配器（复用 knowledge search 的评分逻辑，勿另写匹配器）'
  - '命中 → 收口输出回显命中摘要（条目 id＋标题＋一句话理由，rejected 条目优先）＋提示「须在 evidence 回应或说明不复潮」；v1 warn 级不阻断'
  - 'src/config-schema.js：commands 域加 knowledge-gate 开关（boolean，缺省 true=开；false 关回显）'
  - '单测 test/design-knowledge-check.test.mjs：命中场景回显（用库内真实条目如 decisions/unmapped D-001 枚举开放世界）；无命中输出与现状一致；knowledge-gate: off 时静默；顺带断言 task-02 的指引文案在场（Step4/5 指引含检索动作句）'
acceptance:
  - 方案步 --done 命中库内条目时输出含命中摘要与 evidence 提示；不阻断、不要求改写
  - 无命中 / 开关关闭时输出与现状一致
  - 复用既有检索匹配器（不新写匹配逻辑）
  - test/design-knowledge-check.test.mjs 全绿
verify:
  - node --test test/design-knowledge-check.test.mjs
  - npm run lint
constraints:
  - warn 级不阻断（D-004 故障面：狼来了效应减压阀）
  - 检索查询串由 --output 与新增 D 条目拼装，不引入用户私有文本之外的网络调用
  - 不动 src/knowledge-match.js 判定逻辑
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
