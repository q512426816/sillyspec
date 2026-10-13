---
author: flow-machine-draft
created_at: 2026-10-13T05:12:01.570Z
---
# 任务注册表（Tasks）— 2026-10-13-cli-pit-fix-batch

- [x] task-01: node --test test/worktree-deps-override.test.mjs 3/3 绿（合法覆写双留痕/缺 reason exit 2/非法值 exit 2/meta 缺失 exit 1）
- [x] task-02: sillyspec knowledge --help 输出帮助且零写盘副作用
- [x] task-03: sillyspec tests --redomain 用法门在位（--from/--to/--by-change/--write），fr-index 降级告警引用该命令
- [x] task-04: npm run lint 全绿（check-syntax 953 文件 + 未引用导出 0 hard fail）
