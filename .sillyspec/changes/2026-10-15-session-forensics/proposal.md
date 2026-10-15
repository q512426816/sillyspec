---
author: flow-machine-draft
created_at: 2026-10-15T12:14:56.286Z
---
# 提案书（Proposal）— 2026-10-15-session-forensics

## 动机

任务原话转写：会话取证命令 sillyspec diagnose——对照 Superpowers diagnosing-superpowers 的取证形态，CLI 装配证据包 + 取证任务书，语义判断归 agent

动机：obra/superpowers v6.4.1 的 diagnosing-superpowers 实证了'会话出问题后要有取证通道'：定位 transcript → path:line 证据 → 结构化复盘报告。SillySpec 已有全部证据源（agent-session-log 多 harness 会话日志登记、friction-ledger 摩擦账本、verify-runs 测试结果、review.json 评审轮次、timeline/watcher events），但缺一个把证据装配成'取证现场'的命令——用户问'这个会话为什么搞成这样'时，agent 只能全靠翻文件。对照本仓哲学（CLI 装配与校验、agent 干语义活、零内容枚举），diagnose 是只读命令：机械事实由 CLI 从既有数据源装配，取证维度是任务书结构骨架（非内容词表），每条 finding 强制 path:line 锚（无锚不成立），报告落变更目录。

成功标准：
- 新命令 sillyspec diagnose --change <名>（只读零状态写入）：装配并输出证据包——变更身份（flow-state/tier）、按变更名过滤的 agent 会话日志路径、摩擦账本条目、verify-runs 测试结果文件、评审轮次文件（含 superseded）、取证据任务书
- 取证任务书含结构维度骨架（时间线重建/计划遵从/重复工作/停等与重试/成本与轮次/门禁摩擦）与取证纪律（每条 finding 必须 path:line 锚、无锚不成立；报告唯一可写产物 diagnosis-report.md 落变更目录；分析维度数据驱动不枚举内容）
- --json 形态输出结构化证据包（平台可消费）；--detect 复用 agent-session-log 现场探测
- 纯函数装配面（assembleForensicsPack/renderForensicsTaskbook）有单测：fixture runtime 目录上断言证据包字段与任务书必需节
- 变更自身测试面跑绿，lint 通过

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 新命令 sillyspec diagnose --change <名>（只读零状态写入）：装配并输出证据包——变更身份（flow-state/tier）、按变更名过滤的 agent 会话日志路径、摩擦账本条目、verify-runs 测试结果文件、评审轮次文件（含 superseded）、取证据任务书
2. 取证任务书含结构维度骨架（时间线重建/计划遵从/重复工作/停等与重试/成本与轮次/门禁摩擦）与取证纪律（每条 finding 必须 path:line 锚、无锚不成立；报告唯一可写产物 diagnosis-report.md 落变更目录；分析维度数据驱动不枚举内容）
3. --json 形态输出结构化证据包（平台可消费）；--detect 复用 agent-session-log 现场探测
4. 纯函数装配面（assembleForensicsPack/renderForensicsTaskbook）有单测：fixture runtime 目录上断言证据包字段与任务书必需节
5. 变更自身测试面跑绿，lint 通过

## 成功标准（可验证）

1. 新命令 sillyspec diagnose --change <名>（只读零状态写入）：装配并输出证据包——变更身份（flow-state/tier）、按变更名过滤的 agent 会话日志路径、摩擦账本条目、verify-runs 测试结果文件、评审轮次文件（含 superseded）、取证据任务书
2. 取证任务书含结构维度骨架（时间线重建/计划遵从/重复工作/停等与重试/成本与轮次/门禁摩擦）与取证纪律（每条 finding 必须 path:line 锚、无锚不成立；报告唯一可写产物 diagnosis-report.md 落变更目录；分析维度数据驱动不枚举内容）
3. --json 形态输出结构化证据包（平台可消费）；--detect 复用 agent-session-log 现场探测
4. 纯函数装配面（assembleForensicsPack/renderForensicsTaskbook）有单测：fixture runtime 目录上断言证据包字段与任务书必需节
5. 变更自身测试面跑绿，lint 通过
