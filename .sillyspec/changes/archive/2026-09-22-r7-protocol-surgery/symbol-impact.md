# 符号影响面报告

> tasks.md 内容指纹（生成时）: 74ec2867f5f16103——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增导出面（src/watcher.js：spawnWatcher/runWatcherFromEnv/inferEvents/aggregateStageTiming/isWatcherLeaseLive）——全新符号无既有调用点；接线点 src/run/command.js:1344 附近仅增量调用，不改既有函数签名。无既有签名级变更。
- task-02: complete-handlers.js 640-722 内联代码抽为导出函数 runArchiveChain（新增导出，参数含 skipPlanCheck）；原内联调用点改为函数调用——行为等价纯搬运，无其他调用点（归档链仅 archive 完成处理器单点使用）。
- task-04: verify-draft.js 六导出中 checkDraftIntegrity/amendDraftMarkers/transformSkeletonToDraft 的实现体改为消费 src/machine-draft.js 原语——**导出签名逐字不动**（消费方零回归硬门）；新增 machine-draft.js 独立导出面。消费点 3 处（index.js:1255/:1324、run/gates.js:1243）不受影响。
- task-07: src/stages/plan.js 仅改步骤 prompt 文案字符串——无签名级变更（步骤定义对象结构/name 字段不动，fingerprint 机制自然重算）。
- task-03: 新增导出面（src/flow.js：cmdFlowStart/cmdFlowDone/readFlowState/writeFlowState）+src/index.js 新增 case 'flow' 分发（新增 case 不改既有 case）+src/config-schema.js LOCAL_YAML_SCHEMA 增键（additive）。runArchiveChain 消费（task-02 provides）。无既有签名级变更。
- task-05: 新增导出面（src/flow-draft.js：draftProposal/draftRequirements/draftTasks/draftDecisions）+src/flow.js 增 flow amend-draft 子命令与工件校验子步（task-03 新文件的增量，非既有签名变更）。无既有签名级变更。
- task-06: src/flow-draft.js 增 computeEditRatio 导出+src/flow.js flow done 输出增强——均为本变更新文件的增量。无既有签名级变更。
