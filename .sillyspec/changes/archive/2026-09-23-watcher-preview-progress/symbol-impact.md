# 符号影响面报告

> tasks.md 内容指纹（生成时）: 20ebcefb403e6acc——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 签名级变更=stages/steps 表结构（ADD COLUMN authority，DB 层非 JS 符号）——既有 prepare 语句按列名绑定不受影响；progress.js stage upsert SQL 文本变更（INSERT 列清单+DO UPDATE SET 增 authority），调用点（writeSerialized 链）零签名变化；doctor-diagnostics.js dump 语句增过滤条件，输出 JSON 增量字段对消费者（doctor 展示）additive。均在任务范围内。
- task-02: 新增导出 projectPreviewStages/writePreviewStages（新文件零既有调用点）；watcher.js 循环内新增一次 best-effort 调用（无签名变更）。
- task-03: 新增导出 readPreviewProgress（progress.js）；index.js progress show 增 --preview flag 分发（参数解析 additive）；handoff.js 输出追加段落（无签名变更）。
- task-04: change-registry.js unregisterChange 清理链追加 DELETE（无签名变更，内部 SQL 增量）。
- task-05: 无签名级变更（纯测试新增）。
