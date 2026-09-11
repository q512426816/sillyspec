---
id: task-07
title: '文档同步（modules/runtime.md + docs/sillyspec/file-lifecycle.md）'
title_zh: '文档同步（modules/runtime.md + docs/sillyspec/file-lifecycle.md）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 10:19:06
priority: P2
depends_on: [task-01]
blocks: []
requirement_ids: [FR-03, FR-05]
decision_ids: [D-002@v1, D-005@v1, D-006@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - docs/sillyspec/file-lifecycle.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - docs/sillyspec/platform-interface-map.md
  - docs/sillyspec/architecture-4a.md
  - docs/sillyspec/multi-agent-review-2026-08-08.md
  - docs/sillyspec/review-2026-08-08.md
  - docs/sillyspec/review-2026-08-09.md
  - docs/sillyspec/self-audit-2026-08-16.md
target_files: [.sillyspec/docs/sillyspec/modules/runtime.md, docs/sillyspec/file-lifecycle.md, .sillyspec/docs/sillyspec/modules/_module-map.yaml]  # 对账用精确路径清单
goal: >
  模块文档与文件生命周期文档同步：runtime 模块登记 friction-tally 职责；file-lifecycle 增计数文件条目（含 .runtime 红线与归档 prune/放弃残留策略）。
implementation:
  - modules/runtime.md：核心文件清单补 src/friction-tally.js + 一段职责说明（摩擦计数/收尾提示/落点红线/静默降级）
  - docs/sillyspec/file-lifecycle.md：新增 .runtime/friction-tally-<change>.json 与 quick-sessions/<id>/friction-tally.json 条目——生命周期（record 于失败时点/consume 清零于 quick·verify 收尾/归档与删变更 prune/放弃变更残留接受），并注明不入 git 不上平台（D-002）
  - _module-map.yaml：runtime paths 增补 src/friction-tally.js（主仓 spec 区 + worktree 基线副本各一份，worktree 侧为 lint 门禁 module-map 覆盖检查所需）
  - 行号锚机械重锚（docs check --fix 产物，同 quick 流程 autoReanchorDocRefs 先例）：本变更源码插入使 platform-interface-map/architecture-4a 等文档中锚定 gates.js/complete-handlers.js/complete.js 的行号漂出符号窗口，CLI --fix 批量重锚 6 个文档的纯行号数字（零语义变更；其中主仓 L115 锚点在变更前即已失效，属顺带修复）
acceptance:
  - 两文档各含 friction-tally 条目；file-lifecycle 条目含 prune 与红线说明
  - docs check 无新增断链（行号引用格式正确）
verify:
  - npm test（docs-debt 相关检查含在既有测试面）
constraints:
  - 只增条目不改既有段落结构；模块文档遵循既有格式
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
