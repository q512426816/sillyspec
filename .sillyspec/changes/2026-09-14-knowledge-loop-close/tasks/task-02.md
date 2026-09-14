---
id: task-02
title: 'implement-knowledge-classify-dual-format-migration'
title_zh: 'classify 主体——NEW:src/knowledge-classify.js 双格式寻址 + 四步迁移（追加/INDEX 路由行 keywords+anchor/删除/幂等）+ --dry-run/--title 兜底 + NEW:test/knowledge-classify.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 19:59:00
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-001@v1]
allowed_paths:
  - src/knowledge-classify.js
  - test/knowledge-classify.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
target_files:
  - NEW:src/knowledge-classify.js
  - NEW:test/knowledge-classify.test.mjs
expects_from:
  task-01:
    - contract: KnowledgeHitsAPI
      needs: [appendKnowledgeHit, readKnowledgeHits]
goal: >
  实现 knowledge classify 子命令主体：双格式寻址解析 uncategorized.md 条目并完成四步迁移（追加目标知识文件 → INDEX.md 补路由行 → 删除原条目 → 幂等收尾），把归类从逐条人确认变为可机械执行的确认动作（FR-02，D-001@v1）。
implementation:
  - 新建 src/knowledge-classify.js 导出 classifyUncategorizedEntry({ knowledgeDir, qlId, targetFile, sectionTitle, keywords, titleFallback, dryRun })，返回 { ok, moved, appendedTo, indexUpdated, anchor, skippedReason? }（签名按 design.md 接口定义节）
  - 收尾把 src/knowledge-classify.js 补录进 _module-map.yaml core-engine paths（lint module-map 覆盖硬门禁，W1 实证）
  - 条目寻址三通道：标题行 `## <qlId> |` 前缀 ∪ 正文尾注 `（<qlId>）`（X-001 双格式）∪ titleFallback（--title）模糊匹配兜底历史无标注条目
  - 四步动作：解析条目 → 追加目标知识文件（`## <标题>` + 原文保留）→ INDEX.md 对应分类段补路由行（keywords 显式传或条目标题分词兜底，anchor=中文条目标题直接作 anchor，先例 knowledge/INDEX.md `#平台审核占位`，X-005）→ 从 uncategorized.md 删除该条目；幂等：目标已含同标题条目则跳过追加只做迁移收尾；--dry-run 只渲染将要发生的变更不落盘
  - 归类完成后经 task-01 appendKnowledgeHit 写一行审计进 .runtime/knowledge-hits.jsonl（type: classify，含 qlId/targetFile）
  - 新建 test/knowledge-classify.test.mjs：覆盖四步动作/双格式寻址/幂等/dry-run/--title 兜底/keywords+anchor 生成；尾注格式以单测构造样例实测（实测存量 0 条，plan-review X-9）
acceptance:
  - 标题行/尾注/--title 三通道寻址均能定位条目；存量 uncategorized 17 条（标题行 9 + --title 兜底 8）迁移后 uncategorized.md 不再含对应条目、目标文件含 `## <标题>`+原文、INDEX.md 含新增路由行（plan 全局验收 AC-4）
  - 迁移后 sillyspec knowledge validate 通过（classify 全链路集成冒烟，plan 全局验收 AC-2 / D-001 覆盖证据）
  - 幂等：目标文件已含同标题条目时重复 classify 不重复追加，仅完成删除收尾并返回 skipped 原因
  - --dry-run 零写盘（uncategorized/目标文件/INDEX 字节不变）；每次实归类 hits.jsonl 追加一行 type:classify 审计
  - node test/knowledge-classify.test.mjs 0 fail；npm test 全量 0 fail
verify:
  - node test/knowledge-classify.test.mjs
  - npm test
constraints:
  - INDEX 路由行严格按既有格式追加（`- kw1|kw2 → [display](file#anchor)`），不改 INDEX 既有行；anchor=条目标题机械生成保一致（R-03，anchor 级漂移不在 validate 范围）
  - 条目不丢内容：先追加后删除，可 revert（手工搬运）；写盘 Windows 兼容，append 单行+'\n'
  - 不越 allowed_paths：knowledge/INDEX.md、uncategorized.md 等为命令运行时数据面，不手工编辑；不改 src/knowledge-match.js（非目标：不新造匹配引擎）
  - 审计统一经 task-01 的 appendKnowledgeHit 落盘，不自建 hits 写入路径
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
