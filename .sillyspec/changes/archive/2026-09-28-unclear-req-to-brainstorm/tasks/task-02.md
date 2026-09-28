---
id: task-02
title: 'brainstorm Step4/5 指引模板加机制词检索固定动作'
title_zh: 'brainstorm Step4/5 指引模板加机制词检索固定动作'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-09-28 18:02:57
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-004@v1]
allowed_paths:
  - src/stages/brainstorm.js
target_files:
  - src/stages/brainstorm.js
goal: >
  brainstorm 阶段 Step 4（提出方案）与 Step 5（分段展示设计）指引模板加固定动作：落盘方案/决策前
  把方案引入的机制词跑 sillyspec knowledge search --query "<机制词>"，命中必读再定稿（FR-03 指引面，
  D-004——设计时点此前零检索面）。
implementation:
  - '在 src/stages/brainstorm.js 的 Step 4 指引静态文本「操作」清单插入一条固定动作（位置：列方案之后、给推荐之前）：方案引入新机制词（如 分类/词表/枚举/门/协议/状态机——举例非清单）时，先 sillyspec knowledge search --query "<机制词>"，命中条目必读（尤其 status=rejected 的防复潮条目）再定稿'
  - 'Step 5 指引同插一条：分段设计含新机制时同上检索'
  - '指引措辞明示「例词为举例非机制」——开放世界关键词由 agent 现场生成（D-003 原则同源）'
acceptance:
  - Step 4/Step 5 渲染文本均含检索固定动作句（含 knowledge search --query 用法与「命中必读」字样）
  - 例词以「举例」身份出现，不构成封闭清单
  - 既有 stage 测试（execution-mode-render 等）不破
verify:
  - npm run lint
  - node --test test/execution-mode-render.test.mjs
constraints:
  - 不改门禁逻辑（--done 门检索归 task-04）
  - 不动 src/flow-draft.js
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
