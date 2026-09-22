---
author: zcode-r7-surgery
created_at: 2026-09-22 10:40:00
---
# 提案书（Proposal）

## 动机
R5-L 法证终账：对 OpenSpec 多烧 82.3M 输入 token 中 94%（77.7M）是流程自转三桶
（CLI 状态机往返 +29.1M / spec 工件维护闭环 +28.9M / 门禁强制重跑 +19.7M）；
第 3 批四件按 §十数学定死打不穿 ≤20M 门。协议手术是打穿 20M 的刀：把流程从
「agent 当步进机」改为「agent 干活、CLI 记账」。

## 关键问题
1. 协议必需交互 82/79 次（brainstorm 系 20 次），每次按当时全量上下文计费（斜率放大）。
2. 治理工件 agent 手写（SF 工件输出 60K 是代码 13K 的 4.5 倍），verify-result 读写 14 次。
3. 观测与协议共线：平台进度信号只能靠 CLI 调用推进（信道混淆）。
4. 薄/厚路由无机械信号（agent 主动 --full 靠不住，P8 类别错误）。

## 变更范围
四切片（详见 design.md）：①src/watcher.js 观测层（detached 轮询+三类事件源+
provisional:true+墙钟拆账）②src/flow.js 2-调用协议（flow start/done、thin|legacy
开关、子步幂等）③src/machine-draft.js+src/flow-draft.js 全件机器起草（指纹三件套
泛化+四件起草器+AGENT 槽）④编辑距离路由（ledger 首版原文+amend 通道汇合+失败升厚）。
含 index.js/command.js/complete-handlers.js/config-schema.js 接线与四组新测试。

## 不在范围内
fail-closed 判定语义/P2 账本口径/allowed_paths/多会话所有权/DB schema（红线不动）；
第 3 批四件（既成资产复用）；legacy 完整流程既有步数与门禁；错键防线与 FR 事实标签
（proposal §六各自独立立项）；平台仓 events 端点实现（跨系统声明依赖，fail-soft 降级本地）。

## 成功标准（可验证）
1. 片一：harness 无 agent 走流程，事件数与 CLI 调用数解耦（事件来自文件/git/工件三类源）；
   事件恒带 provisional:true；watcher 崩溃零影响主流程。
2. 片二：机械 harness 走通薄跑道，CLI 必需调用=2；恢复场景新会话同命令从盘面状态
   （checkbox/提交/账本/dirty files）生成恢复简报；flow:legacy 一行回滚零行为变化。
3. 片三：薄跑道会话内 .sillyspec 写入=仅例外裁决（harness 验产物面）；机器段三态拒收
   （标记缺失/哈希失配/手工重锚未审计）；AGENT 槽放行；amend 留痕。
4. 片四：合成场景改写比例阈值触发正确；verify 失败/审查否决/distill 异态自动升厚真跑一次。
5. 全量：四组新测试+既有族回归全绿+lint 绿；module-map 录新文件；自举（切片二起用薄流程
   开发下一片）。
6. 终验（四片全后一次）：大任务重放三桶 Δ≤20M / 当量 ≤1.3 达标 ≤1.2 拉伸 / 墙钟 ~90min。

## 依据
round5/flip-3.31.0-proposal.md（§三刀2/刀3/底座、§九护栏、§十落地核对、§十一 R6 取消
裁定）；round5/r5l-forensic-verdict.md（三桶账）；round5/audit/（逐请求数据）；
先例：src/run/bg-sync.js、src/verify-draft.js、src/task-done.js。
