---
id: task-02
title: implement-apply-fixes-pure-function
title_zh: applyFixes 纯函数写回修复
author: qinyi
created_at: 2026-08-18 22:42:51
priority: P0
depends_on: [task-01]
blocks: [task-03]
requirement_ids: [FR-01, FR-05]
decision_ids: [D-003@v2]
allowed_paths:
  - src/docs-check.js
provides:
  - contract: applyFixes-export
    fields: [applied, skipped]
expects_from:
  task-01:
    - contract: inv-fix-classification
      needs: [fixable, newLine]
goal: >
  新增 applyFixes 导出函数，按 docLine 定点替换失效引用行号为 newLine，行内偏移精确、其余字节不动，支持 dryRun 预览。
implementation:
  - 在 docs-check.js 按接口定义新增导出 applyFixes(projectRoot, fixes, opts)，opts 支持 dryRun 布尔（design §7）
  - fixes 条目含文档路径、docLine、ref、newRef；同一行多引用按行内偏移从后往前（降序）替换，防前序替换挤偏后序偏移（R-04）
  - 读写走 split 归一 + 检测原文行结束符按原样 join 写回，CRLF/LF 保持（R-05）；写盘用 writeFileSync（design §9）
  - dryRun 为真时不写盘仅返回将应用列表；返回 applied 计数与 skipped 数组（条目含 ref 与 reason）
acceptance:
  - 单命中引用修复后行号等于 newLine，同行多引用全部正确替换且文档其余字节不变
  - dryRun 为真时目标文件 mtime 与内容均不变
  - CRLF 文档修复后行结束符仍为 CRLF
  - 越界或目标行号非法的条目跳过并记入 skipped，不中断批量
verify:
  - node test/docs-check.test.mjs
  - npm run lint
constraints:
  - 纯函数不解析配置不读 local.yaml，候选定位全部依赖调用方传入；单测文件 test/docs-check-fix.test.mjs 由 task-04 负责，本任务只落实现
  - 不改引用文件名与 token，只改行号数字（文档保持标准 file:line，D-003）
---
