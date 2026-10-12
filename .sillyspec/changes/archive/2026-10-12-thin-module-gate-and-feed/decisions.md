---
author: flow-machine-draft
created_at: 2026-10-12T10:20:20.307Z
---
# 决策记录（Decisions）— 2026-10-12-thin-module-gate-and-feed

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：门的误报面——存量仓里合法未登记目录多（根级脚本、配置目录），首轮 done 会频繁撞门。缓解：module_gate_ignore 一次性配置 + --accept-unmapped 签收不丢数据（缺口数留痕），遥测可见放行频率，可据此再调默认。次风险：回写的格式自适应误判（卡内混合形态）——只动「## 变更索引」节内/ sidecar 尾部，节外逐字保留，与 splitChangelog 同款行级防线。 已知边界（评审 P3 披露）：共享主仓并行会话在基线之后对同文件（src/flow.js）的提交 hunk 会混入 change.patch 冻结面——冻结 diff 是文件级（baseRef..HEAD × 文件清单），无法做 hunk 级归属切分（未提交面的归属收窄已由 quick --files 声明机制处理，提交面共享文件是残留盲区）。审计以显式 pathspec 提交清单为准。断点续跑路径（distill 已 done 后归档失败重入）的 extraDocs 由 deriveRecordedChangeIndexTargets 从卡/sidecar 反查含变更名的目标文件（幂等事实），不依赖目录级回退兜底。 放弃方案①：给 docTouched=false（命中模块但卡未更新）也上门——放弃：源码活跃≠卡错，代理信号不配阈值（docs-gate 既有裁决，误报训练忽略报警），维持 advisory。 放弃方案②：自动改写模块卡语义段（CLI 生成契约摘要）——放弃：语义解释含 LLM 判断增量，与「CLI 算事实、agent/人写语义」的分工冲突；机械动作只碰变更索引表格。 放弃方案③：module-map 登记也走棘轮基线（docs gate 同款）——放弃：棘轮适合「存量治理、拦增量」的计数面；登记是逐变更直接信号（文件在、图没认），无需基线间接层。
