---
author: qinyi
created_at: 2026-09-09T05:30:00+08:00
---
# 提案书（Proposal）

## 动机
doctor 阶段 6 步教 agent 跑 bash/node 探测再汇总（每自检 ~5 轮 agent）；探测与 sillyspec doctor --json 诊断双轨漂移。轮次经济学 §3.1 定性：折叠进既有 CLI 诊断 + 净增三类探测器。

## 关键问题
1. doctor ∈ READONLY_AUXILIARY：run doctor 只读短路到不了状态机——noAI 步不可达（Grill BLOCKER-A）。
2. 八维诊断不覆盖 worktree 残留/构建环境/MCP 配置（净增三类）。
3. 顶层非 --json doctor 委托阶段路径——改阶段必须同时保住顶层命令的只读承诺（Grill 复审 P0）。

## 变更范围
三 detector（worktree 复用 WorktreeManager.doctor 薄适配/构建环境/MCP 项目级）+ doctor 移出 READONLY_AUXILIARY + _cliAction doctorRunDiagnostics（诊断+渲染+落盘）+ 阶段 6→3 步（noAI 综合诊断/agent 修复决策/agent 汇总）+ index.js 非 json 改道。

## 不在范围内
--confirm 写操作合并（D-003）、诊断信封 schema 变更、quick/auto 流程、网络探测。

## 成功标准（可验证）
- run doctor：step1 noAI 自动执行输出诊断报告（bash 教学步消失）
- 顶层 sillyspec doctor（非 json）：直跑诊断渲染，零 initChange/零 lastActive 刷新（只读承诺）
- doctor --json：含三新维度（skipped 注记降级）
- 新测试全过 + doctor 族回归绿
