---
author: qinyi
created_at: 2026-09-17 14:04:39
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
machine-interface 族（`sillyspec gate / derive / progress show --json`）是 SillySpec↔SillyHub 的机器消费面，但信封 `errors`/`warnings` 是自由文本中文句子，程序化消费方无法按错误类型稳定分支——提示语改一个字就是一次静默破坏性变更。同时对账基准 interface-contract.md 已与实现漂移三处（含一处**语义级**反向漂移）。本变更为 2026-09-17 OpenSpec 源码对比三轮评审定稿的②号能力项。

## 关键问题
1. **散文错误不可编程消费**：SillyHub/未来 MCP 消费方要按错误类型分支只能正则匹配中文句子（「变更不存在: X」「测试失败: <原因>」），文案演进即静默破坏。
2. **契约三处漂移**（对账基准失真）：check 枚举缺 design-file-list（实现在发射）；命令面缺 progress show（契约自称两命令，实现有三）；§2.3 transition informational 语义与代码反向漂移——代码有意改为参与 ok（防 gate exit 0 而 --done 硬阻断的判定分裂），契约未跟，且模块卡 :28 行还写着旧说法（第三真相源）。
3. **无 parity 防线**：OpenSpec 的 agent-contract 靠人工审计保真、无文档↔代码 parity 测试（其已实证弱点）——同样的漂移在本仓已实际发生（上条即证）。

## 变更范围
1. 新模块 `src/diagnostic-codes.js`：冻结表 DIAGNOSTIC_CODES 单一源，首批 10 码（信封级 4 + check 级 6）。
2. `src/machine-interface.js`：信封加法式扩展——checks[].code 恒在场 + 顶层 codes[] 按失败 check 序去重聚合；errors/退出码/中文 message/schema_version 零改动。
3. `docs/sillyspec/interface-contract.md`：三项对账（progress show 子节顺延编号 / design-file-list 行 / transition §2.3 重写 + :123/:135/:241 informational 残留清扫）+ 新增诊断码目录节与 v1 存续期语义变更记录节。
4. `.sillyspec/docs/sillyspec/modules/machine-interface.md`：模块卡第三真相源同步（:28 旧说法 + 契约摘要补 codes）。
5. 新测试 `test/diagnostic-codes-parity.test.mjs`（码表↔文档目录双向核对 + 发射抽查）+ 既有 machine-interface 测试回归增补。

## 不在范围内（显式清单）
- 不做 errors 对象化 / schema_version 2（破坏语义才升版，另行变更）
- 不做 warnings 级码化（首期只码错误路径）
- 不做 stage-contract 校验器散文逐条码化（码标识失败面不标识每条消息）
- 不做 doctor / validate / scope-audit 面码化（形态分裂，一次不吞）
- 不做 mcp-server.js 自有 JSON-RPC 错误面（信封透传已覆盖）
- 不做 SillyHub 侧任何改造（消费方忽略新字段，零协同）

## 成功标准（可验证）
- gate/derive/progress show 三面的自产错误路径均携带稳定 snake_case 码（10 码恰额，无表外码）。
- interface-contract.md 与实现零漂移：check 枚举含 design-file-list、命令面含 progress show、transition 语义=参与 ok，全文无 informational 残留；模块卡同步。
- parity 测试双向绿：注册码全在文档目录 ∧ 目录码全在码表；CI 漂移即红。
- 既有 machine-interface.test.mjs 断言零回归；全量测试套件绿。
