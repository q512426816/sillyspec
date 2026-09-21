---
id: task-03
title: 'execute 派发契约注入——轮数纪律三行 + B1 返回契约 + B2 回收瘦身（含 test/dispatch-contract.test.mjs）'
title_zh: 'execute 派发契约注入——轮数纪律三行 + B1 返回契约 + B2 回收瘦身（含 test/dispatch-contract.test.mjs）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 11:53:08
priority: P0
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-001@v1, D-002@v1]
depends_on: ['task-02']
allowed_paths:
  - src/stages/execute.js
  - test/dispatch-contract.test.mjs
target_files:
  - src/stages/execute.js
  - NEW:test/dispatch-contract.test.mjs
goal: >
  execute 派发 prompt 注入轮数纪律（B-⑥，打「轮数 × 上下文」的轮数乘数——验靶实证新鲜
  内容仅 3.2%，轮数是另一半杠杆）+ 子代理返回契约（C-1 B1）+ 审查回收瘦身（C-1 B2）。
implementation:
  - src/stages/execute.js buildWavePrompt「子代理 prompt 要点」段（task-02 已加材料包行之后）追加：①轮数纪律三行——相邻同文件改动合并为单次 Edit / TodoWrite 阶段边界用不中途连发 / 测试验证合并单次 Bash 跑完；②返回契约——子代理返回 ≤25 行结构化摘要（verdict=done|blocked / 触碰文件数 / 测试一行结果 / 偏差说明），细节不贴正文
  - 同文件回收约定段补一行：审查回收输出 = verdict 一行 + blockers + review.json 路径，细节按需 Read 工件
  - 新增 test/dispatch-contract.test.mjs：四段文本钉（材料包行/轮数纪律/返回契约/回收瘦身均在 buildWavePrompt 渲染输出中）
acceptance:
  - buildWavePrompt 渲染输出含四段新文本（子串级文本钉）
  - git diff 对账相关代码行零改动（execute.js:489/1374/1395 不在 diff 中——对账真相源红线）
  - 既有 execute 相关测试零回归
verify:
  - node --test test/dispatch-contract.test.mjs
  - npm test
constraints:
  - 只加 prompt 渲染文本，禁触碰任何门禁/对账/review.json 写入逻辑
  - 文本钉测试断言子串而非全文快照（防后续微调文案即碎）
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
