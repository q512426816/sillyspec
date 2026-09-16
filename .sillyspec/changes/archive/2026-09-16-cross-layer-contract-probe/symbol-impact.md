# 符号影响面（Symbol Impact）

<!-- CLI 骨架逐 task 结论（指纹锚定 tasks.md） -->

- task-01: 无既有签名级变更——新增导出 parseDesignContracts（additive，全仓无既有调用点）；runProbe8PayloadParity 返回结构 additive 扩三键（contractCount/contractOrphans/missingRequired），既有消费方仅解构读取已知键（渲染段/facts metrics/既有测试），additive 键零破坏
- task-02: 无签名级变更——checkProbeConsistency 内部对账维度表追加 probe8 条目（函数签名不变）；parseProbePrefillAnchors 锚点正则扩展（签名不变）
- task-03: 无签名级变更——纯新增测试文件，不改任何 src
