---
author: flow-machine-draft
created_at: 2026-10-14T01:42:48.352Z
---
# 提案书（Proposal）— 2026-10-14-guide-anchor-adopt-proto

## 动机

任务原话转写：sess_fb51d988 实证：CLI 已把含原型分级/真码五要素的完整步骤指引落盘 step-guides（5294B 全文在场），但 agent 收到的工具结果被尾部截断（1896 字符、从 ### 铁律 起）——操作/分级/生成要求整段丢失，agent 临场发明「复用既有设计系统」跳过原型、补的手绘件。repo 自知此坑（complete.js task-08 注释「长 prompt 易被 tail 截断」）但锚定行只报位置不带全文路径。另查证：头脑风暴转轻量变更（adopt）时原型会被采用（flow.js 枚举产物+🖼️ 原型在场必看行）但该行在输出中部，尾部材料清单只列 scan 面——截断同样丢指针，resume 简报同病。

成功标准：
- outputStep 渲染（首见与复入两分支）输出末尾带「指引全文落盘路径」锚行——输出被截断时 agent 从末几行即可拿到 step-guides 全文路径 Read 回完整规则；SILLYSPEC_STEP_GUIDE=0 时零新增输出（确定性测试面不变）；--json 劫持态不打印
- flow adopt 尾部材料清单重列变更原型 HTML（截断不丢「原型在场」指针）；resume 简报对变更目录含 prototype-*.html 的变更同样补尾部原型必看行——头脑风暴收编的原型在轻量道全程可发现
- 新增测试锁三处锚行（含 guide 关闭零输出回归）；npm test 全绿、lint 绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. outputStep 渲染（首见与复入两分支）输出末尾带「指引全文落盘路径」锚行——输出被截断时 agent 从末几行即可拿到 step-guides 全文路径 Read 回完整规则；SILLYSPEC_STEP_GUIDE=0 时零新增输出（确定性测试面不变）；--json 劫持态不打印
2. flow adopt 尾部材料清单重列变更原型 HTML（截断不丢「原型在场」指针）；resume 简报对变更目录含 prototype-*.html 的变更同样补尾部原型必看行——头脑风暴收编的原型在轻量道全程可发现
3. 新增测试锁三处锚行（含 guide 关闭零输出回归）；npm test 全绿、lint 绿

## 成功标准（可验证）

1. outputStep 渲染（首见与复入两分支）输出末尾带「指引全文落盘路径」锚行——输出被截断时 agent 从末几行即可拿到 step-guides 全文路径 Read 回完整规则；SILLYSPEC_STEP_GUIDE=0 时零新增输出（确定性测试面不变）；--json 劫持态不打印
2. flow adopt 尾部材料清单重列变更原型 HTML（截断不丢「原型在场」指针）；resume 简报对变更目录含 prototype-*.html 的变更同样补尾部原型必看行——头脑风暴收编的原型在轻量道全程可发现
3. 新增测试锁三处锚行（含 guide 关闭零输出回归）；npm test 全绿、lint 绿
