---
author: flow-machine-draft
created_at: 2026-10-15T02:21:31.151Z
---
# 决策记录（Decisions）— 2026-10-15-rot-coverage-git-source

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：--grep 子串误吸——变更名 A 是变更名 B 子串时 B 的文件被吸进 A 覆盖面。评估：变更名格式 `YYYY-MM-DD-主题`，互为前缀子串的场景是同日同名变体（罕见且语义相近），宁可宽勿漏；如需收紧可改 --grep "^<名>$" 正则锚定（regex 语义）留作后续。次风险：大仓 git log 全历史遍历的性能成本（每 unknown 变更一次、covCache 摊薄、64MB maxBuffer 上限）——本仓实测毫秒级，量级无忧。放弃方案：①往归档变更补写 change-patch.json（冻结件 sha256 锚定，篡改审计真相=红线）；②unknown 来源持久化豁免清单（补丁摞补丁，git 源把根因解了豁免无必要）；③只对 unknownSources 计数不列名（丢定位信息，收口 advisory 失去可操作性）。
