---
author: flow-machine-draft
created_at: 2026-10-05T14:48:26.336Z
---
# 提案书（Proposal）— 2026-10-05-input-teach-copyable

## 动机

任务原话转写：2026-10-05-flow-help-status 实测发现教学面两类缺口：① CLI 输出 7 处 --input 教学为分号内联描述形态（src/run/command.js status 空态、src/flow.js 变更名重试提示、src/index.js quick 退役引导、src/hooks/worktree-guard.js 三处 stage 提示、src/stages/brainstorm.js 转轻量建议），字面照抄实测 extractSuccessCriteria 提取 0 条、exit 2——CLI 无一处可照抄实例，新手第一次照抄必碰壁；② design.md 模板「答案直接写在问题下方」措辞未防「答案整块替换问题原文」失败模式（flow-help-status 实测三度同型锚拒收）。本变更把 7 处教学统一为含真实换行的可照抄实例（行级 trim 容忍缩进，带缩进展示照抄亦过门），并强化 design 模板锚教学措辞。

成功标准：
- src 全仓 7 处分号内联教学形态零残留，各教学处给出含「成功标准：」独立行与「- <可验证标准>」条目行的可照抄多行实例
- design 模板教学措辞显式说明问题行原样保留（勿删勿改勿替换）、答案另起一行写在问题行下方
- 测试锁定：分号形态零残留断言 + 教学实例组成部分在场断言 + 实例核心形态喂 extractSuccessCriteria 提取大于等于 1 条断言
- 相关测试全部通过（含 input-format-copy 教学点断言同步更新）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. src 全仓 7 处分号内联教学形态零残留，各教学处给出含「成功标准：」独立行与「- <可验证标准>」条目行的可照抄多行实例
2. design 模板教学措辞显式说明问题行原样保留（勿删勿改勿替换）、答案另起一行写在问题行下方
3. 测试锁定：分号形态零残留断言 + 教学实例组成部分在场断言 + 实例核心形态喂 extractSuccessCriteria 提取大于等于 1 条断言
4. 相关测试全部通过（含 input-format-copy 教学点断言同步更新）

## 成功标准（可验证）

1. src 全仓 7 处分号内联教学形态零残留，各教学处给出含「成功标准：」独立行与「- <可验证标准>」条目行的可照抄多行实例
2. design 模板教学措辞显式说明问题行原样保留（勿删勿改勿替换）、答案另起一行写在问题行下方
3. 测试锁定：分号形态零残留断言 + 教学实例组成部分在场断言 + 实例核心形态喂 extractSuccessCriteria 提取大于等于 1 条断言
4. 相关测试全部通过（含 input-format-copy 教学点断言同步更新）
