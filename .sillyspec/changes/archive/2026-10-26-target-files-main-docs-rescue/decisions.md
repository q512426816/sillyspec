---
author: flow-machine-draft
created_at: 2026-10-28T00:39:14.617Z
---
# 决策记录（Decisions）— 2026-10-26-target-files-main-docs-rescue

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：救赎把「主仓恰好改过同名治理文件但本变更没写」的声明误判为 matched——缓解：救赎只对显式声面生效且限治理前缀，误判后果是对账少一条 missing（保守方向是少拦不是假绿），且 notes 披露救赎计数可审计。试过但放弃的方案：①扩 worktree actual 读主仓全量 status——把主仓侧无关改动也卷进对账面，undeclared 假红换一种方式回来；②铁律改成都写 worktree 再同步主仓——「产物蒸发」风险方向（worktree 清理即丢档）不可接受；③对账时把治理路径从声明面剔除（不查）——自废对账语义，真缺产物从此无人拦。
