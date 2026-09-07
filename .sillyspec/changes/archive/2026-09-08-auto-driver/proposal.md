---
author: qinyi
created_at: 2026-09-08T06:55:00+08:00
---

# 提案（Proposal）— 2026-09-08-auto-driver

## 一句话

auto 模式 driver 化：prompt 尾部机器可读元数据块 + 免 --change 记忆 + TTY wait 直通 + CLI 收尾总结——agent 从「编排控制器」退化为「判断步工人」。

## 为什么做

runAutoMode 已有阶段链编排，但 agent 仍背四件编排负担（关键词猜 requiresUser / 跨轮记 --change / wait 用户语音转抄 / 自撰收尾总结）——根因是机器可读元数据缺失，agent 每轮从 prose prompt 反向工程「我在哪/下一步什么命令/要不要停」。

## 做什么

1. **FR-01** SS-META 元数据块（四源 requiresUser 公式 + doneCommand 内嵌，auto 专属）。
2. **FR-02** 三态 --change（单活跃自动选中回显 / 多活跃 exit 2 / 零活跃新增建变更）。
3. **FR-03** `--wait-interactive` TTY 直通（readline 收，等价 --continue --answer）。
4. **FR-04** 流程全完成时 CLI 结构化收尾总结（挂 :1726）。
5. **FR-05** auto SKILL.md 瘦身（93→约 50 行，三段指令退役改 SS-META 消费）。

## 不做什么（Non-Goals）

CLI 内调模型、SillyHub 外部 driver 重写、单阶段 run 形态变化、wait 三段式删除（保留为非 TTY/默认路径）。

## 影响

5 文件修改 + 2 测试新增；单阶段 run 零变化；SS-META 为 additive。
