---
id: task-06
title: '模块文档认领——五模块 sidecar changelog 追加条目（回执双形态/重复键检测/docs 条件白名单/copy 面/锚点口径）'
title_zh: '模块文档认领——五模块 sidecar changelog 追加条目（回执双形态/重复键检测/docs 条件白名单/copy 面/锚点口径）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 11:45:49
priority: P1
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05]
decision_ids: [D-001@v1, D-002@v1, D-003@v2, D-004@v1, D-005@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
  - .sillyspec/docs/sillyspec/modules/stages.changelog.md
  - .sillyspec/docs/sillyspec/modules/worktree.changelog.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
  - .sillyspec/docs/sillyspec/modules/setup.changelog.md
target_files:
  - .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
  - .sillyspec/docs/sillyspec/modules/stages.changelog.md
  - .sillyspec/docs/sillyspec/modules/worktree.changelog.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
  - .sillyspec/docs/sillyspec/modules/setup.changelog.md
goal: >
  五模块 sidecar changelog 追加 2026-09-16-friction5-hardening 行为契约条目，把本变更五处门禁改动认领进模块文档（module-impact.md 更新结果 pending → done）。
implementation:
  - core-engine.changelog.md 追加：verify-facts-schema 回执双形态解析（多行 YAML 聚合 fail-closed）+ probe7-anchor-check 锚点口径扩 .test.
  - stages.changelog.md 追加：plan-postcheck feasibility 顶层重复键检测（detectDuplicateTopKeys）
  - worktree.changelog.md 追加：resolveApplyAllowSet 条件加白 .sillyspec/docs/ + declaredFace 审计口径（D-003@v2）
  - runtime.changelog.md 追加：gate-snapshot copy 面（gate_snapshot.copy junction/copy 回退）+ run/gates probe7 advisory 文案 + verify-probes 回执骨架双形态示例
  - setup.changelog.md 追加：config-schema 登记 gate_snapshot.copy 键（含 renderExample 同步）
acceptance:
  - 五个 sidecar 文件各含一条 2026-09-16-friction5-hardening 变更名锚定的条目
  - 条目内容与实际落地行为一致（对照 task-01~05 的 acceptance）
  - module-impact.md 更新结果表五模块 pending → done
verify:
  - npm test（全量，模块文档改动不触测试面）
  - git diff --stat 确认仅五个 changelog 文件变更
constraints:
  - 只追加 sidecar 条目，不改模块主文档正文（行为契约详情在 design.md）
  - 不动 _module-map.yaml（paths 归属无变化）
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
