---
author: flow-machine-draft
created_at: 2026-11-26T01:27:58.575Z
---
# 提案书（Proposal）— 2026-11-26-fr-anchor-underscore-domain-align

## 动机

任务原话转写：FR 锚与提炼域词表对齐支持下划线域名

测试绑定归档提升的锚校验（test-bindings ANCHOR_RE，字符类 A-Za-z0-9- 不含下划线）拒收 FR-tool_gateway-001 形态，而同轮 FR 索引提炼对同编号放行且知识文件已写入带下划线域的节头——两处域名词表不同源（2026-11-25 实证、活跃坑 docs/sillyspec/2026-11-25-flow-done-test-binding-underscore-domain-rejected.md）。发号侧域取自模块 id（tool_gateway、frontend_components 等目录名形态）原样进编号，含下划线属正常形态非脏数据；连带发现 fr-index FR_SECTION_RE/FR_GLOBAL_ID_RE 同样不含下划线，知识文件重读时带下划线节会被静默跳过（幂等/重读面潜在丢节）。修复=提炼与消费两侧域字符类统一补下划线。

成功标准：
- FR-<含下划线域>-NNN 绑定行归档提升不再被拒：FR-tool_gateway-001 形态过 ANCHOR_RE 校验并成功 upsert 进 knowledge/fr/ 机器子块（测试先行红转绿）
- 对齐后词表两侧同源：FR_SECTION_RE / FR_GLOBAL_ID_RE / frEntryExists 标题扫描 / knowledge-graph FR 节解析均接受含下划线域，知识文件重读不丢带下划线的 FR 节
- 既有不带下划线域与 ql- 形态零回归（既有相关测试全绿）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. FR-<含下划线域>-NNN 绑定行归档提升不再被拒：FR-tool_gateway-001 形态过 ANCHOR_RE 校验并成功 upsert 进 knowledge/fr/ 机器子块（测试先行红转绿）
2. 对齐后词表两侧同源：FR_SECTION_RE / FR_GLOBAL_ID_RE / frEntryExists 标题扫描 / knowledge-graph FR 节解析均接受含下划线域，知识文件重读不丢带下划线的 FR 节
3. 既有不带下划线域与 ql- 形态零回归（既有相关测试全绿）

## 成功标准（可验证）

1. FR-<含下划线域>-NNN 绑定行归档提升不再被拒：FR-tool_gateway-001 形态过 ANCHOR_RE 校验并成功 upsert 进 knowledge/fr/ 机器子块（测试先行红转绿）
2. 对齐后词表两侧同源：FR_SECTION_RE / FR_GLOBAL_ID_RE / frEntryExists 标题扫描 / knowledge-graph FR 节解析均接受含下划线域，知识文件重读不丢带下划线的 FR 节
3. 既有不带下划线域与 ql- 形态零回归（既有相关测试全绿）
