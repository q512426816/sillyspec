---
author: qinyi
created_at: 2026-09-11T14:35:00+08:00
---

# 提案（Proposal）— 跨变更语义护栏

## 一句话
quick 会话触碰「其他变更刚交付的语义」时，CLI 把知识库里仍生效的决策和近因交付归属送到会话眼前——进场 advisory 注入 + `--done` 断言重写点名，治「改断言重定义绿灯、静默删除他者 implemented 决策语义」的跨变更语义冲突。

## 问题（2026-09-11 事故形态）
- 变更 A 交付「恒读 SQLite」（implemented 决策 D-001：文件清理后仍可读库）；次日变更 B（quick 安全批）要求「文件必须存在才能读库」，恰好删掉 A 的核心场景。
- B 同步改写了 A 的测试断言（「零文件 IO」→「lstat 恰好一次」），测试全绿——quick `--done` 的 test 硬门禁按设计工作，但被「重定义绿灯」绕过。
- 根因有二（详见 design.md 背景）：知识库匹配键是任务措辞而非文件路径（即使走完整流程，B 的安全措辞也命中不了 A 的恒库决策）；quick 对知识库只有一行被动 `cat INDEX.md` 提示，无主动消费。

## 方案（已选 A，见 decisions.md D-001@v1）
三层 advisory，全部非阻断、零命中静默（friction-signal 同哲学）：
1. **数据契约**：决策条目增「文件：」字段（decision-distill 机械解析），存量条目由「锚点：」路径提取兜底，零迁移。
2. **quick 进场注入**：按候选文件（--files + git 脏文件）反查知识库决策（implemented+rejected）+ git log 近 7 天他者变更交付归因，命中注入 prompt。
3. **quick `--done` 断言 WARNING**：本会话 diff 中他者交付的测试文件断言行被改时点名输出，建议理由写进 quicklog `--solution`。

## 非目标
- 不做硬阻断（误报校准数据为零，先 advisory 收集实证）。
- 不改造完整流程的关键词匹配引擎（execute 已有注入，缺口在 quick）。
- 不做断言↔决策自动双向锚定的强制校验（只在 advisory 文案里建议，约定层推进）。
