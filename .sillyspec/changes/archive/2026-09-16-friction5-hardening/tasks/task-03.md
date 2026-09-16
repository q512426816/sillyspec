---
id: task-03
title: 'apply docs 白名单——worktree-apply.js resolveApplyAllowSet 条件加白 + declaredFace 审计报备 + test/apply-docs-allowlist.test.mjs'
title_zh: 'apply docs 白名单——worktree-apply.js resolveApplyAllowSet 条件加白 + declaredFace 审计报备 + test/apply-docs-allowlist.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 11:39:03
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v2]
allowed_paths:
  - src/worktree-apply.js
  - test/worktree-allow-list-violations.test.mjs
  - test/cross-repo-apply.test.mjs
  - test/apply-docs-allowlist.test.mjs
target_files:
  - src/worktree-apply.js
  - test/worktree-allow-list-violations.test.mjs
  - test/cross-repo-apply.test.mjs
  - NEW:test/apply-docs-allowlist.test.mjs
goal: >
  Gate1 条件白名单 .sillyspec/docs/（声明面非空才加）+ declaredFace 审计口径，approved 文档同步不再被拦且空清单变更 fail-open 语义不变。
implementation:
  - 'resolveApplyAllowSet：聚合 design §6 ∪ allowed_paths 后，仅 mainSet.size > 0 才 mainSet.add(''.sillyspec/docs/'')（尾斜杠写法）；加白前快照 declaredFace = new Set(mainSet) 随返回值带出（如 { repoMap, declaredFace } 或在 Map 上附带属性——导出函数签名改动须核全部调用点：grep resolveApplyAllowFiles/resolveApplyAllowSet 引用，评估最小侵入形态——可选新增导出 resolveApplyAllowContext 或在 allowMap 上挂属性，选调用面扰动最小的）'
  - 'applyWorktree：hasAllowList 判定与审计报备均以 declaredFace 为口径；实际 changedFiles 中以 .sillyspec/docs/ 开头且 ∉ declaredFace 的文件 → result.warnings 报备一行'
  - '连带更新 test/worktree-allow-list-violations.test.mjs:114/:152 与 test/cross-repo-apply.test.mjs:94/:122 的 main Set deepEqual 断言（补 .sillyspec/docs/ 条目——有意语义变更的合法断言更新，断言语义从「design 清单集」变「清单 ∪ 白名单集」）'
acceptance:
  - 'design §6 非空且未声明 docs 的变更：changedFiles 含 .sillyspec/docs/x.md 时 Gate1 零违规且该文件进 patch'
  - 'design + 任务卡全缺时 allowMap 行为与旧版完全一致（fail-open）'
  - 'declaredFace 命中（allowed_paths 已声明 docs）时不报备'
verify:
  - 'npm test -- test/apply-docs-allowlist.test.mjs test/worktree-allow-list-violations.test.mjs test/cross-repo-apply.test.mjs'
  - 'npm test（全量回归）'
constraints:
  - '不动 filterDeliverableFiles'
  - '不动 review 声明相交过滤'
  - '不动跨仓切片语义'
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
