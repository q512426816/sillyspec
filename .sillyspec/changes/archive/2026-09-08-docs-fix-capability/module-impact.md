---
author: qinyi
created_at: 2026-09-08 09:33:00
---

# 模块影响分析（Module Impact）— 2026-09-08-docs-fix-capability

> 首版（plan 阶段生成，execute/verify 更新，archive 终审）

## 命中模块

| 模块 | 文件 | 变更性质 |
|---|---|---|
| docs-consistency | src/docs-check.js | 修改：REF_RE 展开循环形、fuzzy skip、豁免插点、candidates |
| docs-consistency | NEW:src/docs-migrate.js | 新增：planDocsMigrate/runDocsMigrate |
| cli-entry | src/index.js | 修改：docs 分派 migrate 分流、--no-exempt 白名单、FR-5 报告段通道 |
| docs-consistency | .sillyspec/docs/sillyspec/modules/docs-consistency.md | 修改：模块文档同步 |

## 依赖关系

- docs-migrate.js → docs-check.js（import 复用 collectDocRefs/applyFixes/runDocsCheck/readDocsCheckConfig/resolveCandidates——D-004 不复制解析正则）
- docs-gate.js → docs-check.js（runDocsCheck 复用，豁免语义自动跟随，gate 零改动面）
- index.js → docs-check.js + docs-migrate.js（CLI 分派）

## 影响面外（明确不动）

- docs-gate.js（复用 runDocsCheck，无代码改动；基线对账在收尾）
- .husky/pre-push（2>&1 合流只看 exit code，FR-5 通道迁移不影响）
- scan-postcheck / workflow ref_exists（走 collectInvalidDocRefs API 面，不走 CLI 文本）

## 归档核对（archive step2，git diff 实际落地 18 文件 vs 本记录）

- ✅ docs-consistency：src/docs-check.js（五项能力）、NEW src/docs-migrate.js、modules/docs-consistency.md、modules/_module-map.yaml（补录）——与「命中模块」一致
- ✅ cli-entry：src/index.js（docs 分派+--no-exempt+FR-5 报告段+usage）——一致
- ✅ 交付附带：docs/*.md 8 文件行号重锚（--fix 产物）+ scan/ARCHITECTURE.md、TESTING.md 锚点跟随 + test/verify-postcheck-known-failures.test.mjs（并行会话配套测试，随 docs-check.js 一并提交，commit 6db00e8 注明）
- 影响类型：docs-check.js/docs-migrate.js=新增能力（逻辑+接口）；index.js=接口（CLI flag/exit code）+行为（输出通道）；其余=文档
- needs_review：docs-consistency 模块卡已同步（updated_at 2026-09-08），无需
