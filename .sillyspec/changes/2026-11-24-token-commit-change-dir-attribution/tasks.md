---
author: flow-machine-draft
created_at: 2026-11-24T04:28:30.659Z
---
# 任务注册表（Tasks）— 2026-11-24-token-commit-change-dir-attribution

- [x] task-01: 提交级归属——src/foreign-declared.js 新增单一判定 isOwnCommitForChange / touchedChangeDirs / changesDirPrefixFor；src/flow-parity.js 的 detectPatchDrift 与 deliveryFaceAnchoredAfter 改用它并接受可选入参 changesDirPrefix；src/flow.js 的 cmdFlowDone 两处调用传入变更根前缀。验证=test/flowdone-disposition-drift.test.mjs 新增 ⑧ 先红后绿，既有 ①—⑦ 不改断言保持绿
- [x] task-02: 文件级归属——buildCommitAttribution 增 tokenDirs 与 tokenAmbiguous，isForeignByCommit 按「触及他变更目录的无名 task 提交 → foreign」收窄，commitAttributionForChange 传入变更根前缀。验证=test/commit-attribution-split.test.mjs 新增 ④⑥ 先红后绿，既有 ①②③ 不改断言保持绿
- [x] task-03: 变更根前缀解析的边界单测（仓内相对路径 / 仓外与跨盘符得空串）。验证=test/commit-attribution-split.test.mjs 新增 ⑤ 先红后绿
- [x] task-04: 端到端回归——评审 PASS 后他变更的 token 裸提交落地，重跑 flow done 不报漂移、不隔离评审、归档补丁不含他侧文件；并跑齐本变更测试面（两个测试文件 + hunk-gate-commit-attribution + thin-done-dirty-gate）与 lint。验证=新增 ⑨ 先红后绿，各命令退出码 0
- [x] task-05: task tick 回显的提交命令模板带上变更名（`(<变更名> task-NN)`），模板消息可被变更名解析识别。验证=test/task-tick.test.mjs ⑧ 断言按新形态更新后先红后绿，该文件全绿
- [x] task-06: 「归属分不清」advisory（用户在执行断点选定）——src/foreign-declared.js 新增 listAmbiguousTokenCommits；src/flow.js 在 patch 子步（冻结面算出后）与漂移分支各打一条提示，点名窗口内「带 task token、未写变更名、未触及变更目录」的提交；只提示，不改任何判定与流程结果。验证=test/commit-attribution-split.test.mjs 新增 ⑦ 与 test/flowdone-disposition-drift.test.mjs 新增 ⑩ 先红后绿，⑨ 不出现该提示
- [x] task-07: 作者身份补判（用户选定「先加作者判定再收口」）——src/foreign-declared.js 新增 COMMIT_LOG_ARGS / parseCommitLog / isOwnByFacts / collectOwnAuthors，isOwnCommitForChange、buildCommitAttribution、listAmbiguousTokenCommits 接入作者集；src/flow-parity.js 两个漂移函数改用含作者的 git log 并接受 ownAuthors；src/flow.js 按 baseline..HEAD 计算作者集并传入各处，提示增加「已按他侧处理」一行。验证=test/flowdone-disposition-drift.test.mjs 新增 ⑪⑫ 与 test/commit-attribution-split.test.mjs 新增 ⑧ 先红后绿，既有 ⑦（返工提交）与 ⑩ 保持绿
