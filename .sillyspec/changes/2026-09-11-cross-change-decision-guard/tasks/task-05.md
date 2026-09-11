---
id: task-05
title: 'quick step1 entry injection in run/prompt.js render layer'
title_zh: 'quick step1 进场注入（run/prompt.js 渲染层）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 14:45:11
priority: P0
depends_on: ['task-03']
blocks: [task-07]
requirement_ids: [FR-03]
decision_ids: [D-001@v1]
allowed_paths:
  - src/run/prompt.js
  - test/semantic-guard-prompt-inject.test.mjs
target_files:
  - src/run/prompt.js
  - NEW:test/semantic-guard-prompt-inject.test.mjs
expects_from:
  - task-03: renderSemanticGuardBlock / readSemanticGuardEnabled
goal: >
  quick 会话进场时（step1 prompt 渲染）注入语义护栏 advisory：候选文件（--files +
  git 脏文件）反查知识库决策命中 + 近 7 天他者变更交付归因——把跨变更语义承诺送到
  即将改代码的会话眼前（FR-03，D-001@v1 模块四）。
implementation:
  - 注入判定独立按 quick step1 口径（prompt.js quickFirstStep 分支先例，勿嵌进 {QUICK_CONTEXT_DIGEST} 占位符守卫内——模板去占位符时护栏静默失效，plan 审查 N2）
  - 入口首行 readSemanticGuardEnabled → false 直接零输出（不采候选文件不跑反查——开关语义全停非半停）
  - 候选文件 = 会话声明文件（readQuickGuardField 同源读取 guard.allowedFiles）+ git status --porcelain 脏文件（复用 parsePorcelainPath 口径：引号剥离/-> rename/反斜杠归一），去重封顶 20
  - renderSemanticGuardBlock 非空 → 插到 step1 prompt 末尾；空串 → prompt 与现状字节一致（零命中静默）
  - 全链 fail-soft：异常单行说明注入，不阻断 quick 启动
  - 注入用例独立文件 test/semantic-guard-prompt-inject.test.mjs（与 task-03/06 的 semantic-guard.test.mjs 隔离——同 Wave 并行子代理不共享文件，plan-postcheck 硬约束）
acceptance:
  - 零命中时 step1 prompt 输出与改动前一致（无空段残留占位符）
  - 命中时 prompt 末尾含决策段/交付段（rejected 标注勿复潮）
  - semantic_guard.enabled=false → prompt 与现状一致
  - git/知识库读取异常 → prompt 含单行降级说明，流程不中断
verify:
  - node --test test/semantic-guard.test.mjs
  - npm test（prompt.js 既有测试保持绿）
constraints:
  - 不改 src/stages/quick.js 模板（注入在渲染层，模板零变更——design 明确不改清单）
  - 不动 {QUICK_CONTEXT_DIGEST} 既有注入逻辑
  - 候选文件采集在渲染进程内同步完成（无异步新增命令调用——safeGit 同步封装既有口径）
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
