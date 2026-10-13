---
author: flow-machine-draft
created_at: 2026-10-13T08:38:14.250Z
---
# 提案书（Proposal）— 2026-10-13-declared-paren-strip

## 动机

任务原话转写：动机：平台仓消费方冒烟实证（multi-agent-platform 仓 docs/sillyspec/flow-diff-declared-face-paren-pollution.md，2026-10-13-turn-nav-rail-overflow-fix 归档件）：design 清单列表项以「路径后接括号注记、注记内含冒号说明」的写法书写时，列表分支先剥首个冒号（冒号落在括号注记内）把行砍成「路径黏连未闭合括号残片」的形态，normalizePath 只剥闭合尾括号救不回——脏路径入库：同文件双行（真统计加零占位）、totals.files 虚高、json 消费方 join 失配、声明文件被判 unplanned。三层修复：①列表分支剥括号注记前置于冒号剥（完整括号组先走，冒号剥只处理真「路径冒号描述」形态）；②normalizePath 增未闭合尾括号残片剥除（闭合剥的超集）；③buildThinSnapshotRows 兜底合并——declared 行剥残片后与实际行同路径时并单行、verdict 取 planned。存量归档件零回填。

成功标准：
- design 清单行「路径加括号注记」全半角形态剥除：列表项与表格 cell 双形态解析出干净路径，含角色前缀与未闭合残片形态
- normalizePath 兜底剥未闭合尾括号残片，闭合剥既有行为零回归，既有 change-list 测试零改动全绿
- 快照对账兜底合并：declared 污染行剥残片后与实际行同路径时合并单行、verdict 为 planned、totals.files 按唯一路径计
- incidental 顺带修复嗅探不回归；冒号描述与双尾注两既有剥除形态不回归
- 存量归档件零回填；e2e：污染写法清单的变更收口后 scopeAudit 出单行干净路径

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. design 清单行「路径加括号注记」全半角形态剥除：列表项与表格 cell 双形态解析出干净路径，含角色前缀与未闭合残片形态
2. normalizePath 兜底剥未闭合尾括号残片，闭合剥既有行为零回归，既有 change-list 测试零改动全绿
3. 快照对账兜底合并：declared 污染行剥残片后与实际行同路径时合并单行、verdict 为 planned、totals.files 按唯一路径计
4. incidental 顺带修复嗅探不回归；冒号描述与双尾注两既有剥除形态不回归
5. 存量归档件零回填；e2e：污染写法清单的变更收口后 scopeAudit 出单行干净路径

## 成功标准（可验证）

1. design 清单行「路径加括号注记」全半角形态剥除：列表项与表格 cell 双形态解析出干净路径，含角色前缀与未闭合残片形态
2. normalizePath 兜底剥未闭合尾括号残片，闭合剥既有行为零回归，既有 change-list 测试零改动全绿
3. 快照对账兜底合并：declared 污染行剥残片后与实际行同路径时合并单行、verdict 为 planned、totals.files 按唯一路径计
4. incidental 顺带修复嗅探不回归；冒号描述与双尾注两既有剥除形态不回归
5. 存量归档件零回填；e2e：污染写法清单的变更收口后 scopeAudit 出单行干净路径
