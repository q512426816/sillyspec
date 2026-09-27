---
name: sillyspec:quick
description: 已废弃重定向 — quick 通道已退役（v3.30.0 起拒绝新会话）。小改动请走轻量变更 /sillyspec:flow。适合用户说"直接改、快速修、顺手调整、修个小 bug、更新一个文件"——一律转用 /sillyspec:flow。
---

## quick 通道已退役（重定向到 flow 轻量变更）

quick 通道已于 v3.30.0 直接退役：`sillyspec run quick` 对新会话一律拒绝（exit 1 并指路 flow start）。本 skill 只保留触发词重定向，**勿尝试执行任何 `run quick` 新会话命令**。

用户说"直接改 / 快速修 / 顺手调整 / 修个小 bug / 更新一个文件"时，**直接执行 `/sillyspec:flow`**：

- 轻量变更同是小改动的心智（flow start → 直接干活 → flow done，全程 2 次协议调用），且带实测门、测试绑定与 patch 留档，治理工件 CLI 机器起草
- 需求不清晰时 CLI 会在 flow start 处拦下给两选一（头脑风暴预段 / 确认输入已含决策），照提示走即可

升级前遗留的在途 quick 会话仍可收尾：`sillyspec run quick --change <会话ID>` 续跑 / `--done` 收口 / `--cancel` 取消（拒绝文案里有同款指引，以 CLI 输出为准）。

## 用户指令
$ARGUMENTS
