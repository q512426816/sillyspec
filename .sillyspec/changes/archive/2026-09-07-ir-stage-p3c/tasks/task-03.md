---
id: task-03
title: 'prompt 双更新（brainstorm.js Step3 NEW: 指引 + Step6 design-init 卸责；prompt.js Step2 _facts 注入）'
title_zh: 'prompt 双更新（brainstorm.js Step3 NEW: 指引 + Step6 design-init 卸责；prompt.js Step2 _facts 注入）'
author: 'qinyi'
created_at: 2026-09-07 05:10:51
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: [D-003@v1, D-004@v1]
allowed_paths:
  - src/stages/brainstorm.js
  - src/run/prompt.js
target_files:
  - src/stages/brainstorm.js
  - src/run/prompt.js
goal: >
  prompt 三处更新——NEW:写法指引（生产端）、design-init 卸责、_facts 注入。
implementation:
  - brainstorm.js 模块域指引行（:360 附近，Step 6 对账子项 3）：补 NEW:写法（「规划中的新模块用 NEW:模块名 前缀声明，冒号后不加空格」）
  - brainstorm.js Step 6 操作 2：改为「优先跑 sillyspec design-init --change <名> 生成骨架再填散文（决策追踪表已预填）；存量手写路径仍合法」
  - prompt.js brainstorm Step 2 组装点：docs/<project>/scan/_facts.md 存在则注入「机械事实底稿」段（全文+禁止重复 grep 红线一句，scan 子代理红线同款措辞）；fail-soft（读取失败空注入）；超 15KB 截断提示刷新
acceptance:
  - 三处 prompt 文本更新且口径一致；注入 fail-soft
verify:
  - node -e import 冒烟 + node --test test/run-complete-step-brainstorm.test.mjs
constraints:
  - 只改 prompt 文案与注入函数，不改步骤结构/门控

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
