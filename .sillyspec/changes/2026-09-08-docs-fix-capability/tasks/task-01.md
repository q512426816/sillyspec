---
id: task-01
title: 'Parse fixes + exemption + candidates in docs-check.js'
title_zh: '解析修复+豁免+candidates——REF_RE 展开循环形、fuzzy skip、isExemptDoc、fix.candidates'
author: 'qinyi'
created_at: 2026-09-08 09:37:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-05, FR-06]
decision_ids: [D-003@v1, D-006@v1]
allowed_paths:
  - src/docs-check.js
target_files: [src/docs-check.js]
goal: >
  docs-check.js 四项内聚改动：REF_RE 展开循环形支持括号路径（D-006 否决原子序列形 ReDoS）；
  r.file 含 `...` 模糊路径 skippedFuzzy 跳过；isExemptDoc 双通道豁免（路径段 archive/finished +
  frontmatter doc_type: snapshot）；classifyFix tie 与带 / 路径文件不存在分支增 fix.candidates。
implementation:
  - REF_RE 文件段 `[A-Za-z0-9_.\-\/]+` → `[A-Za-z0-9_.\-\/]*(?:\([A-Za-z0-9_.\-\/]+\)[A-Za-z0-9_.\-\/]*)*`（展开循环，Grill 验证线性；markdown 链接 [t](foo.js:12) 回落零回归）
  - runDocsCheck ref 循环前置：`r.file.includes('...')` → skippedFuzzy++ continue（不计 total）
  - 新导出 isExemptDoc(relPath, mdText)：POSIX 归一路径段 archive|finished 命中 或 frontmatter 块内 `doc_type: snapshot` 行（容忍行内注释/首尾空白，带引号不识别——机械匹配）
  - docFiles 循环豁免插点：路径段判 readFileSync 前、frontmatter 判读取后；豁免 → skippedExempt++ continue；opts.exempt !== false 默认开
  - runDocsCheck opts 增 exempt?: boolean；返回增 skippedExempt: number, skippedFuzzy: number
  - classifyFix tie 分支返回增 candidates: [{file, line}]（ranked top8，relDisplay 相对路径）
  - 文件不存在分支（candidates.length===0 且 r.file 含 '/'）：basename treeCache 树扫非空 → fix.candidates: [{file}]
acceptance:
  - app/(dashboard)/ppm/shared.tsx:21 全量提取且真实校验
  - [t](foo.js:12) 提取 foo.js:12（行为零回归）
  - 长 token 无 :N（GitHub URL 形态）线性耗时（evil 用例 < 100ms）
  - 含 ... 路径引用 skippedFuzzy 计数不计 invalid
  - archive/finished 路径段或 doc_type: snapshot 文档 skippedExempt 计数
  - exempt: false 时全部照常校验
  - tie 歧义 fix.candidates 含 {file, line}；带 / 不存在文件 fix.candidates 含 {file}
verify:
  - node --check src/docs-check.js
  - 测试在 task-04
constraints:
  - 顿号/全角标点不进字符集（拆分行为天然正确，仅测试锚定）
  - candidates 纯机械数据，无置信度打分（D-001 边界）
  - 人类可读输出文本不变（candidates 仅 --json 面）
---

## 上下文

design.md §总体方案 Phase 1；Grill review.json（brainstorm-review-2026-09-08-084339）。
