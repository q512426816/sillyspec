# 符号影响面报告

- task-01: 新增导出 computeDecisionTouches（全新符号，消费方为 run/prompt.js 与 execute.js 渲染分支，均在任务范围内）；docs-check.js 私有 anchorFilePath 改为导出（仅加 export 关键字，签名与行为不变，既有内部调用不受影响）；run/prompt.js 与 execute.js 各追加渲染分支（既有函数签名不变）。
- task-02: doctor.js 既有检查段 prompt 文本追加（无 JS 签名变更，无新导出）。
