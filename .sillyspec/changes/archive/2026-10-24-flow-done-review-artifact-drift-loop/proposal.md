---
author: flow-machine-draft
created_at: 2026-10-25T11:12:29.304Z
---
# 提案书（Proposal）— 2026-10-24-flow-done-review-artifact-drift-loop

## 动机

任务原话转写：复审交付面锚定与评审开放态收敛判定；动机：倒推收编 2026-10-24 中断会话留在工作区的在途六文件（src/flow-parity.js、src/flow-review.js、src/flow.js + 三个配套测试）。坑实证：复审锚之后本变更 own 提交仅触治理文件（review.json 自身提交典型形态）时，reviewAnchoredToHead 要求锚==HEAD 恒 false、governanceOnly 聚合整个冻结窗被复审前修复提交污染也恒 false——隔离重评→重评再提交 review.json 又前移，三连循环；另增量复审保留的历史 findings 无 status 语义，阻断判定盲数全条目。改法：deliveryFaceAnchoredAfter 把已覆盖度量单位从窗口换成锚点（锚后 own 提交只碰治理文件且未触 requirements/design→评审对象未变，fail-safe 宁可多评）；isOpenFinding 开放态词表（resolved/resolved-as-accepted/accepted/false-positive，缺省未知=fail-closed 开放），阻断只计开放 P1；评审任务书写入纪律（目录不存在=已归档停手，评审产物保持未提交随归档入库）。

成功标准：
- 复审锚后仅治理文件 own 提交不再触发隔离重评（deliveryFaceAnchoredAfter 判定 + flowdone-disposition-drift 回归绿）
- findings 阻断只计开放 P1，status 缺省/未知值按开放收敛（isOpenFinding + flow-review 测试绿）
- 评审写入纪律面 thin-empty-face-crosscheck 绿；受影响面 flow-review/flowdone-disposition-drift/thin-empty-face-crosscheck 33/33 绿 + lint 1085 文件绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 复审锚后仅治理文件 own 提交不再触发隔离重评（deliveryFaceAnchoredAfter 判定 + flowdone-disposition-drift 回归绿）
2. findings 阻断只计开放 P1，status 缺省/未知值按开放收敛（isOpenFinding + flow-review 测试绿）
3. 评审写入纪律面 thin-empty-face-crosscheck 绿；受影响面 flow-review/flowdone-disposition-drift/thin-empty-face-crosscheck 33/33 绿 + lint 1085 文件绿

## 成功标准（可验证）

1. 复审锚后仅治理文件 own 提交不再触发隔离重评（deliveryFaceAnchoredAfter 判定 + flowdone-disposition-drift 回归绿）
2. findings 阻断只计开放 P1，status 缺省/未知值按开放收敛（isOpenFinding + flow-review 测试绿）
3. 评审写入纪律面 thin-empty-face-crosscheck 绿；受影响面 flow-review/flowdone-disposition-drift/thin-empty-face-crosscheck 33/33 绿 + lint 1085 文件绿
