---
author: flow-machine-draft
created_at: 2026-10-16T11:55:05.901Z
---
# 决策记录（Decisions）— 2026-10-16-fix-downstream-tool-defects

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- **最大风险（FR-01）**：抑制面误伤——不可能误伤基线外文件（抑制集=基线键∩盘面缺失，交集定义）；真实风险是「用户删除文件后本想借 pull 恢复」，由 `--restore-deleted` 显式通道兜底，默认安全方向与「删除尚未上行成功」的事实一致。 - **FR-03 风险**：手写报告表头措辞变体不被「表头武装」识别 → 该表数据行从「按锚归属计数」变为「孤行报错」。两者都是阻断性报错，从误归属+误计 unfilled 变为准确孤行提示，误报面收敛；渲染器（renderProbe7Lines）是报告唯一生产者，表头字面稳定，回归用例钉「正常渲染零行为变化」。 - **FR-04 弃案**：改返回形态 null→`{error}` 哨兵对象——17+ 处调用与 gate-snapshot-layout-guard / verify-gate-snapshot 两测试文件的 null 断言全要动，收益（类型显式）不抵破坏面；failRef 出参零破坏。**B 档弃案**：让 pnpm 布局真能建快照（pnpm deploy/快照内离线 install/拷贝 node_modules）——新机制非修 bug，且团队已三次实证 junction 跨根失效在先，留待独立立项。 - **FR-02 弃案**：spec 树同步挪到 progress push 之前/并行——改变「progress 成功后顺带推文档与 spec 树」的既有顺序契约（2026-08-16-auto-sync-from-repo / 2026-08-17-spec-file-incremental-sync 锚定），且并行发请求加重熔断窗口竞争；抑制分支补跑是纯增量、无网络请求时零成本。 - **残差（显式不修）**：熔断窗口内 in-flight abort 仍会中断当轮 spec 树同步——无状态重算 + 下轮重试是既有设计（HUB-09 预算语义），本变更只根治「冲突文件长期封锁」这一确定性死锁面；daemon 侧同款复活路径跨仓另修。
