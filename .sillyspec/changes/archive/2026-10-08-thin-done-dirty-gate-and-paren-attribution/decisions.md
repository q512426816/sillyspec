---
author: flow-machine-draft
created_at: 2026-10-08T02:04:47.312Z
---
# 决策记录（Decisions）— 2026-10-08-thin-done-dirty-gate-and-paren-attribution

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：阻断门改变既有收口习惯——依赖「警告后继续」的自动化/脚本会开始拿到 exit 1。缓解：exit 语义=半态可重入（与 review 中断一致，CLI 文化内既有形态）；--accept-dirty-gap 一 flag 恢复旧行为且留痕；flow-protocol ⑥b 同步更新锁定新语义。放弃的方案：① 归档态 `flow done --refreeze` 重入口——治存量不治源头，且对终态归档件开重写面（review/快照/sha 锚一致性要另设计），阻断门落地后坏状态不再产生，存量用已验证的协议重入修法，留档后续可选；② dirty 警告时自动 --freeze-dirty——把「无法归属」静默升级成「全归属」，跨变更审计双计风险（他侧在途文件误入冻），违背归属保守原则；③ 提交信息解析支持任意前缀文本（不限 thin）——误匹配面扩大无实测形态支撑，收窄为 thin 前缀 + 附注。
