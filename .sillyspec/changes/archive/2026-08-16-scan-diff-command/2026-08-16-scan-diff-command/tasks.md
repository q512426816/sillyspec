---
author: qinyi
created_at: 2026-08-16T21:08:40+08:00
updated_at: 2026-08-16T21:08:40+08:00
---

# 任务清单（Tasks）

- [ ] task-01: 实现 src/scan-diff.js（computeScanDiff 纯函数四分类 + matchFilesToModules 归模块 + isAncestor 守卫 + runScanDiff IO/终端渲染/--report 落盘）覆盖 FR-01~04/06
- [ ] task-02: 接线 src/index.js case 'scan' 拦截 diff 子命令（跳过 pull）+ src/run/command.js --diff flag 覆盖 FR-05
- [ ] task-03: 写 test/scan-diff.test.mjs（四分类/归模块/rename/unmapped/isAncestor/无漂移/CLI 集成）
- [ ] task-04: 文档同步（docs/prompt/scan.md + file-lifecycle.md + design-d7-scan-lifecycle.md 标注落地）+ npm test 全绿 + 提交
