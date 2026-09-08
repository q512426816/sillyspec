# 符号影响面报告

> tasks.md 内容指纹（生成时）: 72cf3abd4e1fe240——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。

- task-01: 签名级变更——runDocsCheck opts 增可选 exempt、返回增 skippedExempt/skippedFuzzy 字段（向后兼容：调用方 docs-gate.js/scan-postcheck/workflow 不读新字段不受影响）；新导出 isExemptDoc（新增非修改）；classifyFix 内部函数返回对象增 candidates 可选字段（消费方 index.js --json 序列化面）。受影响调用点：docs-gate.js runDocsGate（透传 opts 不受影响）、index.js docs check 分支（读新字段）。均在任务范围内。
- task-02: 新增导出 planDocsMigrate/runDocsMigrate（新文件 NEW:src/docs-migrate.js，无存量调用点）；index.js docs 分派 migrate 分支行为变更（有 --from/--to 走新语义）——无函数签名变更（CLI 字符串分派）。
- task-03: 无签名级变更——仅 console.error→console.log 通道调整（行为变更非签名变更）。
- task-04: 无签名级变更——纯测试文件（新增两文件+改造一文件断言）。
- task-05: 无签名级变更——文档+help 文本。
