---
id: task-05
title: 'agents-instruction.md 选道表/速查行改写＋package.json 版本 bump'
title_zh: 'agents-instruction.md 选道表/速查行改写＋package.json 版本 bump'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-09-28 18:02:57
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - templates/agents-instruction.md
  - package.json
target_files:
  - templates/agents-instruction.md
  - package.json
goal: >
  AGENTS.md 模板选道表前提式改写＋速查行纠偏＋版本 bump 传播（FR-01 判断面收口）。
  模板同版本重跑 init 不更新——版本号递增是既有传播机制。
implementation:
  - 'templates/agents-instruction.md 选道表：第 1 行「默认快道」改前提式——自检（对本需求能不假思索答「无待问问题」且成功标准可直书）通过才走轻量；第 2 行负面信号以「举例」身份列出（改哪说不清/成功标准只能写空话/≥2 方案待取舍/需要人看方案再定——举例非机制，D-003 原则）'
  - '速查行「命中知识 CLI 会自动注入 prompt，勿自行重复检索」改写为「入口注入不覆盖设计时点——方案/设计引入新机制词时主动 knowledge search，命中必读（尤其 rejected 防复潮条目）」'
  - 'package.json version 3.30.0 → 3.31.0（minor：新增行为面）；确认 init.js 版本感知幂等逻辑取此字段'
acceptance:
  - 选道表第 1 行含前提式自检表述；第 2 行负面信号带「举例」标注
  - 模板全文不再含「勿自行重复检索」
  - package.json version 为 3.31.0
  - init 幂等逻辑在版本提升后可刷新既有仓 AGENTS.md（手跑 init 自验或引用既有测试）
verify:
  - npm run lint
  - node --test test/preview-migration.test.mjs（init/模板域回归）
constraints:
  - 只改模板文案与版本号，不动 init.js 机制代码
  - 模板改动须与 task-03 前门文案口径一致（同一自检问题措辞）
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
