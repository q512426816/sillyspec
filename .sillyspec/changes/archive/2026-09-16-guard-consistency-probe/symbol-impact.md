# 符号影响面（Symbol Impact）

- task-01: 无既有签名级变更——新增导出 clusterMutationMethods/detectGuardSignals/runProbe9GuardConsistency（additive，全仓无既有调用点）；runVerifyProbes 返回对象 additive 增 probe9 键（既有消费方 renderVerifyProbesReport/facts/测试为包含式解构，零破坏）
- task-02: 无签名级变更——checkProbeConsistency 对账维度表追加 probe9 条目/parseProbePrefillAnchors 返回 additive 增键（签名均不变）
- task-03: 无签名级变更——纯新增测试文件
