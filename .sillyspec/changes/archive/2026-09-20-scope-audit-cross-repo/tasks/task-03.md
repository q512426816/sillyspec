---
id: task-03
title: '渲染与查询面——renderScopeAuditTable 跨仓行真实三态带仓标 label+表尾 per-repo 汇总行；getFileDiff 跨仓行路由该仓（rows crossRepo 判据先于主仓冻结 patch 捷径，A 档 `git diff base..head -- file` 优先，B/C 档实时窗口兜底）；src/verify-postcheck.js 调用点传参贯通（runtimeRoot/changeName）+notes 锚点档动态化；src/run/gates.js printCrossRepoReconcile 锚点档标签；src/index.js scope-audit 帮助文案'
title_zh: '渲染与查询面——renderScopeAuditTable 跨仓行真实三态带仓标 label+表尾 per-repo 汇总行；getFileDiff 跨仓行路由该仓（rows crossRepo 判据先于主仓冻结 patch 捷径，A 档 `git diff base..head -- file` 优先，B/C 档实时窗口兜底）；src/verify-postcheck.js 调用点传参贯通（runtimeRoot/changeName）+notes 锚点档动态化；src/run/gates.js printCrossRepoReconcile 锚点档标签；src/index.js scope-audit 帮助文案'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 16:36:27
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-05, FR-07]
decision_ids: [D-002@v1]
allowed_paths:
  - src/scope-audit.js
  - src/verify-postcheck.js
  - src/run/gates.js
  - src/index.js
target_files:
  - src/scope-audit.js
  - src/verify-postcheck.js
  - src/run/gates.js
  - src/index.js
expects_from:
  - task-01: "collectRepoActual anchor{source,base,head,label}（verify notes/gates 渲染消费）"
  - task-02: "结果对象 repos[] 与 rows 跨仓行 crossRepo 字段（渲染面消费）"
goal: >
  渲染与查询面：renderScopeAuditTable 跨仓行真实三态带仓标+per-repo 汇总段；getFileDiff
  跨仓仓路由（A 档区间 diff 优先）；verify-postcheck 调用点传参贯通+notes 锚点档动态化；
  gates 渲染锚点档标签；index 帮助文案。
implementation:
  - renderScopeAuditTable（src/scope-audit.js）：跨仓行 label 从「⊘ 跨仓（本表不含）」改真实三态带仓标（如「✓ 计划内 [sub-grid-security]」，degraded 仓保留 ⊘）；表尾「ℹ️ 跨仓 N 文件」段升级 per-repo 汇总行（仓 key/anchor.label/三态计数）；degraded 仓逐仓一行降级原因
  - getFileDiff（src/scope-audit.js:1187-1267）：入参 filePath 命中结果 rows crossRepo 行 → 路由该仓（判据先于主仓冻结 patch 捷径防同名误切，评审交叉点⑤）；A 档 git diff <base>..<head> -- file 在该仓根执行（封闭区间=跨仓版冻结档），B/C 档该仓实时窗口兜底，note 注明档位
  - src/verify-postcheck.js:2918 调用点传参贯通：reconcileCrossRepoDeclarations({specBase,cwd,declarationsByRepo,runtimeRoot,changeName})（G2）；:2926 notes「（锚点=该仓最近提交窗口）」改按 anchor.label 动态输出
  - src/run/gates.js printCrossRepoReconcile（:1074 附近）：明细行补锚点档标签（anchor.label）
  - src/index.js scope-audit 帮助文案（:119、:1422）补跨仓按仓对账说明
acceptance:
  - 文本表跨仓行出真实三态带仓标；per-repo 汇总行含锚点档与三态计数；degraded 仓 ⊘+原因
  - --file 跨仓行在该仓根出 diff（A 档区间优先）；主仓行 --file 行为零变化
  - verify notes 按 anchor.label 动态；gates 明细带锚点档；帮助文案更新
verify:
  - node --test test/scope-audit-cross-repo.test.mjs（渲染/--file 用例，task-04 补全后全绿）
  - node --test test/scope-audit.test.mjs（主仓渲染回归）
constraints:
  - 主仓行渲染零变化（单仓变更文本表逐字等价）
  - getFileDiff 主仓路径行为零变化（冻结 patch 捷径/HEAD 兜底链不动）
  - verify-postcheck/gates 仅文案与传参，不改判定逻辑
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
