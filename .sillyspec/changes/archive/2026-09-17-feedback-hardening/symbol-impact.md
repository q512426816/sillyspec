# 符号影响面报告

> tasks.md 内容指纹（生成时）: 099dc4a5d1065620——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 <!--TODO--> 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增内部导出 parseGateSnapshotCommands(yamlText)→string[] 与 runGateSnapshotCommands(snapshotRoot, commands)→{ran, failed}（gate-snapshot.js，全新函数零存量调用点）；createGateSnapshot 函数体内插入执行段（无签名变更，调用方 run/gates.js 等零感知）；config-schema.js 纯数据登记。无签名级变更。
- task-02: probe7-anchor-check.js checkProbe7AnchorCoverage 返回结构不变（只改内部判定正则）；verify-probes.js renderProbe7Lines 仅改注释行字符串字面量（函数签名/返回结构不变）；gates.js 仅改 warn 文案字面量。无签名级变更。
- task-03: execute.js buildWavePrompt 签名不变（prompt 字符串按 wave.implicit 分支参数化）；plan-postcheck.js validateBlueprintConsistency 返回 {ok, errors, warnings} 结构不变（仅把一个 error push 改为 warning push）；parseWavesFromPlan 不动。无签名级变更。
- task-04: 纯文档镜像（.md 文件），无代码符号。无签名级变更。
