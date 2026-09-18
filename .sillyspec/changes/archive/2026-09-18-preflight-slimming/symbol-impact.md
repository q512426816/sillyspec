# 符号影响面报告

> tasks.md 内容指纹（生成时）: cf69a1e5254e8151——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增导出三件：hasDecisionId(changeDir,id)（decisions-io，字面标题解析零语义）/renderPreflightFailures（prompt.js，async→Promise<string>）/shouldInjectFullContext（→{full,digest,firstStep}）——纯读零副作用，无存量符号触碰
- task-02: outputStep 内部接线：新占位符 {PREFLIGHT_FAILURES} 渲染+模块/scan 注入分叉——outputStep 对外签名（async,参数,返回）不变，prompt 文本内容增量
- task-03: src/run/command.js --wait 参数族扩展（--inherit-from，解析层增量）；src/run/complete.js wait_answers 追加轮（既有数据结构复用）；complete-handlers prune 枚举数组加一项——均无签名变更
- task-04: stages 三文件步骤定义对象加 preflightValidators 可选键（固定 shape 增量，缺省键零影响）+prompt 文案行；templates/docs 镜像纯文本
- task-05: 新增测试文件，无源码签名变更
