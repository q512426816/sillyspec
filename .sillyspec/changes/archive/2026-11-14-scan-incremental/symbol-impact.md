# 符号影响面报告

> tasks.md 内容指纹（生成时）: 4d8702cabe51dfe2——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——全量新增文件（NEW:src/scan-codegraph.js + NEW:test/scan-codegraph.test.mjs），无既有调用点。
- task-02: 无签名级变更——全量新增文件（NEW:src/scan-incremental.js + NEW:test/scan-incremental.test.mjs）；复用既有导出（parseSourceCommit/parseNameStatus/matchFilesToModules）为只读消费，不改其签名。
- task-03: 无签名级变更——command.js（flag 白名单/help 文本，数据行非签名）、stage.js（scan 启动段新增逻辑分支）、worktree-guard.js（guard mode 白名单新增 'scan-incremental' 分支值，shouldBlock/shouldBlockWrite/shouldBlockBash 导出签名零改动，符合 hooks 模块卡三重门禁契约）、scan-profile.js（executeScanFinalize 内部增分支，导出签名不变）。调用点零改面：guard 消费方 claude-pre-tool-use.cjs 不动。
- task-04: 签名级变更 1 处——src/scan-facts.js buildAndWriteScanFacts 新增可选参数 opts.scope（POSIX 路径前缀数组，缺省 undefined=现行全量行为）。受影响调用点：src/scan-refresh.js:341（传 {cwd, specDir, projectName} 三键——可选参数缺省不破坏，零改动兼容）；src/stages/scan.js:78 prompt 文本（sillyspec scan facts 命令描述，文本面随本 task 更新）；CLI 入口（src/run/command.js scan facts 子命令，可选 --scope 透传，在本 task allowed_paths 内）。全部调用点兼容或在本任务范围内，无需跨任务补面。
- task-05: 无签名级变更——纯文档同步（file-lifecycle.md/_extracted.json/scan.md/SKILL.md），skills-docs 模块卡「口径与实现同源」边界已确认：镜像内容以 task-03/04 落地实现为准。
- task-06: 无签名级变更——只读实测验收 + verify-evidence.md 证据落盘，零源码触碰。
