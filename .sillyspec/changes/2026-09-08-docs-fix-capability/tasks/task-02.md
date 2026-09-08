---
id: task-02
title: 'docs migrate --from/--to new module + CLI wiring'
title_zh: 'docs migrate 新模块+CLI 接线——planDocsMigrate/runDocsMigrate + index.js 分派/--no-exempt'
author: 'qinyi'
created_at: 2026-09-08 09:37:00
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-04, FR-05]
decision_ids: [D-002@v1, D-004@v1]
allowed_paths:
  - NEW:src/docs-migrate.js
  - src/index.js
target_files: [NEW:src/docs-migrate.js, src/index.js]
goal: >
  新增 src/docs-migrate.js（薄模块，import 复用 docs-check 导出，不复制解析正则——D-004）；
  index.js docs 分派 migrate flag 分流（有 --from/--to 走新语义、无 flag 落回旧 migrateDocs）；
  check/gate flag 白名单加 --no-exempt。
implementation:
  - planDocsMigrate({ projectRoot, from, to, docs?, paths?, skip? })：readDocsCheckConfig 同源文档集 → collectDocRefs 提取 → 过滤 r.file.startsWith(from) → newRef = to + file.slice(from.length)（行号段原样）→ 每目标 resolveCandidates 验证（0 候选标 unverified）→ 返回 { plans: [{doc, docLine, ref, newRef, verified}], scanned }
  - runDocsMigrate({ ..., apply = false })：dry-run 打印计划表（unverified 高亮）；--apply 走 applyFixes(projectRoot, plans)（shape 一致）→ 自动 runDocsCheck 报迁移后失效数；返回 { plans, applied, skipped, unverified, postCheck?: {invalid, total} }
  - exit code 契约（design §Phase 2）：0=dry-run 零计划或 --apply 后 postCheck 全绿；1=--apply 后仍失效或 unverified>0；2=用法/配置错误；dry-run 有计划恒 0
  - index.js docs 分派：`docs migrate` 含 --from/--to → runDocsMigrate；无 flag → migrateDocs(dir)（兼容保留+deprecated 提示）；--from 缺 --to 或反之 → exit 2
  - index.js check 白名单 BARE_FLAGS 加 --no-exempt（置位 → exempt: false 透传 runDocsCheck）
acceptance:
  - dry-run 输出计划表且零写盘、exit 0
  - --apply 写盘 + postCheck 报告失效数对比
  - unverified>0（from/to 写反）→ 计划表高亮 + --apply 时 exit 1
  - 无 flag 裸跑 docs migrate → 旧结构迁移行为不变
  - --from 缺 --to → exit 2 用法错误
verify:
  - node --check src/docs-migrate.js src/index.js
  - 测试在 task-04
constraints:
  - 不碰 git 历史、不改非引用文本（D-002）
  - migrate 不自动 --apply（默认 dry-run）
  - --no-exempt 仅 docs check 白名单（gate 不需要——gate 复用 runDocsCheck 默认豁免开）
---

## 上下文

design.md §总体方案 Phase 2 + exit code 契约（Grill 阻断项补写）；旧 migrate.js 是 .sillyspec 结构迁移（migrateDocs），与本语义无关但占名。
