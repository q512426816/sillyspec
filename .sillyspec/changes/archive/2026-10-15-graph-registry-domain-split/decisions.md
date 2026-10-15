---
author: flow-machine-draft
created_at: 2026-10-15T02:43:57.295Z
---
# 决策记录（Decisions）— 2026-10-15-graph-registry-domain-split

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：登记名与模块卡名撞车造成簇键歧义（如登记 backend 且同树有 backend 模块卡）——file 节点归簇优先 module-files（精确挂接赢），登记前缀只兜底无挂接节点，无歧义路径。次风险：大小写不敏感匹配在大小写敏感文件系统上的语义错位——本匹配只影响展示聚簇键，不触文件解析，安全。放弃方案：①为跨仓建模块卡（doc-debt behind 计算在本仓无对应提交面=垃圾数据，且模块卡是维护义务不是标签）；②跨仓前缀硬编码清单（projects/ 登记机制已是单一真相源，硬编码制造第二源）；③_unmapped 簇直接隐藏（真缺口必须可见——761 是可行动信号非噪音）。
