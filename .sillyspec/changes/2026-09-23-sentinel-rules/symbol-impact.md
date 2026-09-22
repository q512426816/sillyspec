# 符号影响面报告

> tasks.md 内容指纹（生成时）: f4350743d0645aad——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。

- task-01: buildSnapshot 返回对象 additive 扩展五字段（commits/dirtyCode/scanStatus/reviews/checkedTasks）——签名（参数）不变，返回结构增键；既有调用点 runWatcherFromEnv 循环（src/watcher.js:397,423）只读旧字段零影响；countCheckboxes 不动旁加 extractCheckedTasks 新内部函数。无破坏性签名级变更。
- task-02: 新导出 applySentinelRules/createSentinelState/STALL_EARLY_MS/STALL_EXECUTE_MS（纯新增符号，无既有符号改动）；runWatcherFromEnv 循环体内部插一段引擎调用（控制流变更非签名变更）。inferEvents 等既有导出签名零变化。
- task-03: 新文件新导出 detectFakeCheckCompletion——纯新增符号，仓内零调用点（本批单测唯一消费方）。无签名级变更（无既有符号触碰）。
- task-04: 新导出水位三函数（loadSnapshotWatermark/writeSnapshotWatermark/watcherSnapshotPath）；runWatcherFromEnv 初始 prev 赋值处改为先读水位（内部数据流变更）。签名级影响：无（新符号纯增）。
- task-05: src/run/command.js runAutoMode 头部插入 spawnWatcher 调用块——spawnWatcher 既有签名 (cwd, changeName, opts) 复用（flow.js:155 同款调用），无签名变更；runAutoMode 自身签名不动。
- task-06: 新测试文件（新符号仅测试内）；_module-map.yaml sync.paths 增一条（数据非符号）。无签名级变更。
