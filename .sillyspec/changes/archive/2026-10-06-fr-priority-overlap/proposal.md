---
author: flow-machine-draft
created_at: 2026-10-06T11:43:21.792Z
---
# 提案书（Proposal）— 2026-10-06-fr-priority-overlap

## 动机

任务原话转写：2026-10-06-fr-regress-cap-drop 修复后的重测（2026-10-06-resume-title 收口）暴露残留缺口：runModuleSubset 给 buildDepsBatches 传 priorityFiles: frLinked——只含与 deps 无重叠的「新增」绑定文件；与 import 依赖面重叠的 FR 绑定文件拿不到优先权，仍按普通依赖受 30 帽字母序弃置（实测 64 绑定文件弃 14，如 flow-protocol/fr-rot-precision 等）。修复：优先面传全量 fr.files（重叠与否不论——绑定面钦定即优先），重叠文件优先权不影响并集去重语义。

成功标准：
- runModuleSubset 的 priorityFiles 传全量 FR 绑定文件（fr.files），与 deps 重叠的绑定文件不再被帽弃（fixture：绑定文件同时在 import 依赖面内、字母序最末，修复后必入执行批）
- 并集去重与批计数语义不变（depsAll 构造照旧；披露标签如实反映实跑数）
- 直测覆盖重叠形态（绑定文件 ∈ deps）：修复后该文件在执行命令中；无 FR 索引/零绑定时行为与现状一致

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. runModuleSubset 的 priorityFiles 传全量 FR 绑定文件（fr.files），与 deps 重叠的绑定文件不再被帽弃（fixture：绑定文件同时在 import 依赖面内、字母序最末，修复后必入执行批）
2. 并集去重与批计数语义不变（depsAll 构造照旧；披露标签如实反映实跑数）
3. 直测覆盖重叠形态（绑定文件 ∈ deps）：修复后该文件在执行命令中；无 FR 索引/零绑定时行为与现状一致

## 成功标准（可验证）

1. runModuleSubset 的 priorityFiles 传全量 FR 绑定文件（fr.files），与 deps 重叠的绑定文件不再被帽弃（fixture：绑定文件同时在 import 依赖面内、字母序最末，修复后必入执行批）
2. 并集去重与批计数语义不变（depsAll 构造照旧；披露标签如实反映实跑数）
3. 直测覆盖重叠形态（绑定文件 ∈ deps）：修复后该文件在执行命令中；无 FR 索引/零绑定时行为与现状一致
