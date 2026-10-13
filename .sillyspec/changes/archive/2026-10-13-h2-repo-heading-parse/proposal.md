---
author: flow-machine-draft
created_at: 2026-10-13T03:33:33.661Z
---
# 提案书（Proposal）— 2026-10-13-h2-repo-heading-parse

## 动机

任务原话转写：动机：上一变更（2026-10-13-thin-empty-face-crosscheck）收尾探针实证：跨仓告警文案推荐的三种写法之①「段头 ## <注册key> 仓变更」在 thin 收口对账解析器（change-list.js parseFileChangeListDetailed）里解析为空——节扫描在 ^## 一刀切，h2 段头直接终结「文件变更清单」节，其后条目整段丢失。而该段头形态是生态既定约定：brainstorm 厚道模板教学（stages/brainstorm.js:320）、plan-postcheck 文件覆盖对账（REPO_SECTION_HEADER_RE + parseDesignCoverageByRepo 穿过段头不截断）、design-facts/docs-check 存在性核验（复用 parseDesignCoverageByRepo）、评审清单四处消费——change-list 是唯一离群者。agent 照模板/告警①书写即静默丢对账与冻结（fire-ledger-form-strict 事故族的直接诱因之一）。修法：修解析器对齐约定，不改四处文案——REPO_SECTION_HEADER_RE 单一源上移 change-list.js 导出（plan-postcheck 改 import，其本已 import change-list 无环），节扫描穿过段头 h2（段头行= currentRepo 设置器，key 须在 repoKeys 注册表内 fail-closed，未注册含 main 归主仓），### 子段与 cross-repo: 前缀两形态原样保留。

成功标准：
- design 清单用段头「## <注册key> 仓变更」（可含编号前缀与括号备注后缀）时 parseFileChangeListDetailed 解析出该段条目且带 repo 标注——节不再被 h2 段头截断，段头前主仓条目照常解析
- 段头 key 未注册（含 main）时条目归主仓（repo=null，fail-closed 同既有口径）；非段头的 ## 章节标题仍截断「文件变更清单」节（既有行为零回归）
- 「### <key> 子段」与「cross-repo:<key>: 前缀」两既有形态行为不变（cross-repo-patch-freeze 既有断言全绿）
- REPO_SECTION_HEADER_RE 单一源：定义上移 change-list.js 导出、plan-postcheck 改 import 同一符号（design-coverage/design-facts 既有断言零改动全绿）
- thin 空面 e2e：空冻结面 + 清单用「## libx 仓变更」段头 → 走纯跨仓规范标注路径（advisory 不阻断），不再误触未标注阻断

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. design 清单用段头「## <注册key> 仓变更」（可含编号前缀与括号备注后缀）时 parseFileChangeListDetailed 解析出该段条目且带 repo 标注——节不再被 h2 段头截断，段头前主仓条目照常解析
2. 段头 key 未注册（含 main）时条目归主仓（repo=null，fail-closed 同既有口径）；非段头的 ## 章节标题仍截断「文件变更清单」节（既有行为零回归）
3. 「### <key> 子段」与「cross-repo:<key>: 前缀」两既有形态行为不变（cross-repo-patch-freeze 既有断言全绿）
4. REPO_SECTION_HEADER_RE 单一源：定义上移 change-list.js 导出、plan-postcheck 改 import 同一符号（design-coverage/design-facts 既有断言零改动全绿）
5. thin 空面 e2e：空冻结面 + 清单用「## libx 仓变更」段头 → 走纯跨仓规范标注路径（advisory 不阻断），不再误触未标注阻断

## 成功标准（可验证）

1. design 清单用段头「## <注册key> 仓变更」（可含编号前缀与括号备注后缀）时 parseFileChangeListDetailed 解析出该段条目且带 repo 标注——节不再被 h2 段头截断，段头前主仓条目照常解析
2. 段头 key 未注册（含 main）时条目归主仓（repo=null，fail-closed 同既有口径）；非段头的 ## 章节标题仍截断「文件变更清单」节（既有行为零回归）
3. 「### <key> 子段」与「cross-repo:<key>: 前缀」两既有形态行为不变（cross-repo-patch-freeze 既有断言全绿）
4. REPO_SECTION_HEADER_RE 单一源：定义上移 change-list.js 导出、plan-postcheck 改 import 同一符号（design-coverage/design-facts 既有断言零改动全绿）
5. thin 空面 e2e：空冻结面 + 清单用「## libx 仓变更」段头 → 走纯跨仓规范标注路径（advisory 不阻断），不再误触未标注阻断
