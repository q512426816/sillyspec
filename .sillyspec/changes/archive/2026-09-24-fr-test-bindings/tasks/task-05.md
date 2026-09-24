---
id: task-05
title: 'quick --done 落 ql 绑定：窗口测试文件→quicklog 机器面'
title_zh: 'quick --done 落 ql 绑定：窗口测试文件→quicklog 机器面'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 12:35:27
priority: P1
depends_on: [task-01]
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-004@v1]
allowed_paths:
  - src/run/complete-handlers.js
  - test/test-bindings.test.mjs
target_files: []
expects_from:
  - task-01 writeQlBindings
goal: >
  quick --done 实测门通过后，对提交窗口测试文件（isTestPath 口径）机械落
  ql-… candidate 行（discovery=machine/confirmed_by=null）——诚实记录（D-004@v1），
  确认走 task-02 修理工。
implementation:
  - src/run/complete-handlers.js QUICKLOG 条目标完成点（qlId 在场）：窗口文件（annotatedRealFiles 剥行数注记）测试三信号过滤→upsertQlBindings
  - anchor=本会话 ql-id（QUICKLOG 登记面会话→条目映射既有口径）；行键=ql-id+path
  - 幂等：同 ql-id 同文件集重放零漂移；落行异常 fail-open 不拦 --done
acceptance:
  - 含测试文件的窗口落 ql candidate 行（state/confirmed_by 如实）；纯 doc 窗口零行零写
  - 重放零漂移（fixture 直测）
  - 落行异常时 quick --done 不被拦
verify:
  - node --test test/test-bindings.test.mjs
  - npm run lint
constraints:
  - 恒 candidate 不预支消费语义（是否入跑集属读侧另案）
  - 不改 isTestPath 判法与门禁行为
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
