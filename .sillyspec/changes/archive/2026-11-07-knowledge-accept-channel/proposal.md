---
author: flow-machine-draft
created_at: 2026-11-06T16:51:35.827Z
---
# 提案书（Proposal）— 2026-11-07-knowledge-accept-channel

## 动机

任务原话转写：待审知识收口通道——proposed 可合并生效

动机与背景：CLI 侧核查（2026-11-07）实证 proposed/ 待审区只进不出：classify 通道只吃 uncategorized.md，proposed/ 零命令可消费，SKILL.md「仅用户明确要求才合并」规则指向不存在的命令（悬空）；本仓 6 条最高质量知识积压 46 天。修复：新增 knowledge accept 子命令——读 proposed/<slug>.md（解析 frontmatter/title/body），复用 classify 既有迁移原语（目标文件追加+INDEX 路由行注册+幂等 duplicate 检查）后删除源候选文件；inbox 补 proposed 待审清单；digest 补 proposed 积压信号；SKILL.md 悬空规则指向真实命令。复活防线由已归档的 2026-11-07-sync-proposed-no-revive 承担（本变更 accept 删本地文件后 sync 自然下发 delete，无复活面）。

成功标准：
- knowledge accept --id proposed/<slug> --file <目标> 完成：目标知识文件追加 ## 条目 + INDEX.md 对应分类段补路由行 + 源 proposed 文件删除，输出 JSON 含 anchor/keywords
- category frontmatter 为有效目标（known-issues/patterns/conventions）时可省 --file 自动路由；category 无效或缺失时必须显式 --file，否则结构化报错不落盘
- 同标题条目已存在于目标文件时幂等（跳过追加只做源文件清理收尾，skippedReason=duplicate-title）
- --dry-run 只渲染计划零写盘
- knowledge inbox 列出 proposed/ 待审清单（slug+标题+积压天数）；digest 含 proposed 积压信号（>0 可见）
- SKILL.md proposed 规则更新为指向 accept 命令（用户确认后 agent 可代跑）
- 既有 classify/inbox/digest 测试面全绿 + 新增用例覆盖上述分支

## 变更范围

按成功标准机械推导，共 7 条验收面：
1. knowledge accept --id proposed/<slug> --file <目标> 完成：目标知识文件追加 ## 条目 + INDEX.md 对应分类段补路由行 + 源 proposed 文件删除，输出 JSON 含 anchor/keywords
2. category frontmatter 为有效目标（known-issues/patterns/conventions）时可省 --file 自动路由；category 无效或缺失时必须显式 --file，否则结构化报错不落盘
3. 同标题条目已存在于目标文件时幂等（跳过追加只做源文件清理收尾，skippedReason=duplicate-title）
4. --dry-run 只渲染计划零写盘
5. knowledge inbox 列出 proposed/ 待审清单（slug+标题+积压天数）；digest 含 proposed 积压信号（>0 可见）
6. SKILL.md proposed 规则更新为指向 accept 命令（用户确认后 agent 可代跑）
7. 既有 classify/inbox/digest 测试面全绿 + 新增用例覆盖上述分支

## 成功标准（可验证）

1. knowledge accept --id proposed/<slug> --file <目标> 完成：目标知识文件追加 ## 条目 + INDEX.md 对应分类段补路由行 + 源 proposed 文件删除，输出 JSON 含 anchor/keywords
2. category frontmatter 为有效目标（known-issues/patterns/conventions）时可省 --file 自动路由；category 无效或缺失时必须显式 --file，否则结构化报错不落盘
3. 同标题条目已存在于目标文件时幂等（跳过追加只做源文件清理收尾，skippedReason=duplicate-title）
4. --dry-run 只渲染计划零写盘
5. knowledge inbox 列出 proposed/ 待审清单（slug+标题+积压天数）；digest 含 proposed 积压信号（>0 可见）
6. SKILL.md proposed 规则更新为指向 accept 命令（用户确认后 agent 可代跑）
7. 既有 classify/inbox/digest 测试面全绿 + 新增用例覆盖上述分支
