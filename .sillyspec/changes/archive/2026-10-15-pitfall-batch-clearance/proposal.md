---
author: flow-machine-draft
created_at: 2026-10-14T23:31:43.981Z
---
# 提案书（Proposal）— 2026-10-15-pitfall-batch-clearance

## 动机

任务原话转写：消费仓 multi-agent-platform 变更 2026-10-14-admin-server-status 全程实证六个工具坑，已按规则 15 落坑文件（消费仓 docs/sillyspec/ 每坑一文件+修复建议），本变更在 sillyspec 仓逐条清偿。源码对证结论：①矩阵锚点正则 stage-contract.js:1063 字符类排除右括号不排除左括号（（；空指文案不附解析集；②verify 收口探针一致性/draft/ceremony 三门在 gates.js:1397-1439 仍逐门 fail-fast；③verify-probes --init 不落 apiFace 且 writeVerifyFacts 合并会抹掉回填键；④对账链 verify-postcheck.js 无 --ignore-cr-at-eol 行尾过滤；⑤stage-review 目录口径三方不一致（skill 文档诱导双前缀，marker 值为裸 runId，规范目录=<stage>-+runId），refresh-hash 按规范路径找落空的错位文件；⑥execute 批量完成 complete.js:1732-1817 残留退役漏网的 per-task review 复核循环，archive step2 真相源随之全量缺失；⑦full-autopilot 代勾 complete.js:676-710 按最近 20 条提交消息全文提 token 即勾、无实现事实锚；⑧决策模板骨架无 否决理由/复潮条件 字段行；⑨探针矩阵归属测试文件列无截断；⑩commit-suggest 有 QUICKLOG 在场⇒fix 硬推定+body 重复；⑪sync 409 回显 200 字符响应体。

成功标准：
- 矩阵锚点正则对称化：design接口表# 锚点路径字符类同时排除中文左右括号与半角括号，锚点后紧跟中文左括号注记不再吞字空指（测试断言捕获路径=声明路径）
- 空指报错附诊断：锚点未命中解析面时文案附 facts 实际解析到的端点集
- verify 收口纯文档门一次性全列：探针一致性/draft 篡改/ceremony 双跑三门并入 docGateFailures 收集汇总，不再逐门 fail-fast 连撞
- verify-probes --init 落 apiFace 键（与 --done backfill 同源同形），re-init 保留已回填固化键不再抹除
- 对账零内容 diff 忽略：纯行尾差异文件（--ignore-cr-at-eol 对照判定）剔出 undeclared 面，软警告留痕
- stage-review 目录归一：裸 runId 目录与双前缀目录读侧容错命中，refresh-hash 对错位文件可用；三份 SKILL.md 口径统一
- execute 批量完成自动补 per-task review 草稿（机械生成幂等），批量完成复核循环与 archive 完成度判定不再全量缺失
- 自动勾选加实现事实锚：代勾改为提交 subject 含 task-NN 且 diff 与该卡 allowed_paths 交叠（无卡面时仅 subject token）才勾，正文散文提及不勾
- 决策模板骨架含 否决理由/复潮条件 字段行（标注 rejected 必填），distill needsWait 报错附可复制补丁样例
- 探针矩阵归属测试文件列截断前 5+共 N 个折叠，单元格转义
- commit 建议 type 加权：QUICKLOG 在场不再硬推 fix，subject 已列条目不进 body 重复
- 平台 409 回显折叠为一行摘要
- 全量测试与 lint 绿

## 变更范围

按成功标准机械推导，共 13 条验收面：
1. 矩阵锚点正则对称化：design接口表# 锚点路径字符类同时排除中文左右括号与半角括号，锚点后紧跟中文左括号注记不再吞字空指（测试断言捕获路径=声明路径）
2. 空指报错附诊断：锚点未命中解析面时文案附 facts 实际解析到的端点集
3. verify 收口纯文档门一次性全列：探针一致性/draft 篡改/ceremony 双跑三门并入 docGateFailures 收集汇总，不再逐门 fail-fast 连撞
4. verify-probes --init 落 apiFace 键（与 --done backfill 同源同形），re-init 保留已回填固化键不再抹除
5. 对账零内容 diff 忽略：纯行尾差异文件（--ignore-cr-at-eol 对照判定）剔出 undeclared 面，软警告留痕
6. stage-review 目录归一：裸 runId 目录与双前缀目录读侧容错命中，refresh-hash 对错位文件可用；三份 SKILL.md 口径统一
7. execute 批量完成自动补 per-task review 草稿（机械生成幂等），批量完成复核循环与 archive 完成度判定不再全量缺失
8. 自动勾选加实现事实锚：代勾改为提交 subject 含 task-NN 且 diff 与该卡 allowed_paths 交叠（无卡面时仅 subject token）才勾，正文散文提及不勾
9. 决策模板骨架含 否决理由/复潮条件 字段行（标注 rejected 必填），distill needsWait 报错附可复制补丁样例
10. 探针矩阵归属测试文件列截断前 5+共 N 个折叠，单元格转义
11. commit 建议 type 加权：QUICKLOG 在场不再硬推 fix，subject 已列条目不进 body 重复
12. 平台 409 回显折叠为一行摘要
13. 全量测试与 lint 绿

## 成功标准（可验证）

1. 矩阵锚点正则对称化：design接口表# 锚点路径字符类同时排除中文左右括号与半角括号，锚点后紧跟中文左括号注记不再吞字空指（测试断言捕获路径=声明路径）
2. 空指报错附诊断：锚点未命中解析面时文案附 facts 实际解析到的端点集
3. verify 收口纯文档门一次性全列：探针一致性/draft 篡改/ceremony 双跑三门并入 docGateFailures 收集汇总，不再逐门 fail-fast 连撞
4. verify-probes --init 落 apiFace 键（与 --done backfill 同源同形），re-init 保留已回填固化键不再抹除
5. 对账零内容 diff 忽略：纯行尾差异文件（--ignore-cr-at-eol 对照判定）剔出 undeclared 面，软警告留痕
6. stage-review 目录归一：裸 runId 目录与双前缀目录读侧容错命中，refresh-hash 对错位文件可用；三份 SKILL.md 口径统一
7. execute 批量完成自动补 per-task review 草稿（机械生成幂等），批量完成复核循环与 archive 完成度判定不再全量缺失
8. 自动勾选加实现事实锚：代勾改为提交 subject 含 task-NN 且 diff 与该卡 allowed_paths 交叠（无卡面时仅 subject token）才勾，正文散文提及不勾
9. 决策模板骨架含 否决理由/复潮条件 字段行（标注 rejected 必填），distill needsWait 报错附可复制补丁样例
10. 探针矩阵归属测试文件列截断前 5+共 N 个折叠，单元格转义
11. commit 建议 type 加权：QUICKLOG 在场不再硬推 fix，subject 已列条目不进 body 重复
12. 平台 409 回显折叠为一行摘要
13. 全量测试与 lint 绿
