---
author: t
created_at: 2026-11-28 00:04:33
---
# 任务清单（Tasks）

- [x] task-01: 配置面——LOCAL_YAML_SCHEMA 增 changes.doc_tracking 枚举校验 + resolveDocTracking 缺省/失败回退 helper + renderExample 注释示例（验证：test/doc-tracking-config.test.mjs 六态断言：未配置/非法值/三显式值/坏配置回退留痕）
- [x] task-02: 收口面——flow.js:3083 epilogue 两段式分支（验证：test/flow-epilogue-doc-tracking.test.mjs——repo 逐字现形态；platform/never 两段式：单行+回退指引、knowledge 面有暂存出指引段/无暂存不出段；changes/ 面不跑 git 重算）
- [x] task-03: 归档链——complete-handlers.js changes/ 面暂存短路（验证：同上测试文件——:648/:704 两触点在 platform/never 下不触 git add、:661/:675/:721 knowledge 面照常；短路后 pathspecs 无 ignored 路径）
- [x] task-04: init 面——ignoreRules 按生效值≠repo 追加 .sillyspec/changes/ 行（验证：test/init-doctor-doc-tracking.test.mjs——≠repo 幂等写、repo 不写、重入不重复）
- [x] task-05: doctor——存量仓迁移 INFO 检查项（验证：同上测试文件——存量+未声明触发 INFO；显式声明/无存量不触发；残留检测语义回归）
- [x] task-06: 本仓切换——.gitignore 加行 + local.yaml 显式 changes.doc_tracking: platform（验证：git status 对新建变更目录无未跟踪条目 + git check-ignore 命中 + 存量文件 ls-files 跟踪不变实测）
- [x] task-07: 文档族同步——CLAUDE.md / AGENTS.md / .claude/skills/（archive/flow/commit 等）/ docs/sillyspec/file-lifecycle.md 措辞按枚举改写（验证：grep「归档提交/落库/入库」残留清零 + docs-check 门绿）
- [x] task-08: 测试面收束——六块测试全绿 + 相关既有面回归（验证：跑本变更测试文件集 + flow done 实测门）
