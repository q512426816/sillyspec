---
author: flow-machine-draft
created_at: 2026-11-19T15:55:46.116Z
---
# 任务注册表（Tasks）— 2026-11-19-closeout-noise-fix

- [x] task-01: collectDeletedFace 纯函数（flow-parity.js）+ 冻结对账 _suspects 删除面跳过与 ℹ️ 留痕行（flow.js）
- [x] task-02: 真跨仓声明（非删除面的缺路径）照常点名不误放——e2e 负例锁定
- [x] task-03: --accept-dirty-gap 签收持久化 flow-state（含文件清单）+ 预检/权威门同判定链签收面剔除（已签收免拦、增量仍拦并报数）
- [x] task-04: 时点快照解释行（_preflightDirtyCount 函数级变量传递 + 预检 dirtyCount 返回面）
- [x] task-05: 相关既有测试全绿（closeout-noise-fix 6/6、dirty-gate-ignore 4/4、flow-parity、disposition-drift、archive-selfheal、flow-done-preflight 合计 18+4 全绿）
