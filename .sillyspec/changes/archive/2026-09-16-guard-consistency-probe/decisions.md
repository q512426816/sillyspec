---
author: qinyi
created_at: 2026-09-16 20:10:00
---
# 决策记录（Decisions）

## D-001@v1: 守卫一致性探针走「同实体方法组比对 + advisory」路线（注解式并入守卫信号集；否决纯注解审计/组合双案）
- **type**: architecture
- **status**: confirmed
- **source**: user（brainstorm Step 4 方案选择轮——用户全局指令「有价值的继续做」覆盖推荐路线，AskUserQuestion 未获逐项应答，选标注「推荐」的方案A 并集注解信号；如实记录非逐项应答）
- **question**: 守卫一致性检查的实现路线——同实体方法组编码式比对 vs Spring 注解审计 vs 组合？
- **answer**: 方案A：改动 .java 文件内按实体聚类变更方法（submit/delete/withdraw/update/handle/confirm/reject/audit 前缀 × 同实体名词），组内检测守卫信号（编码式：当前用户比对/角色判定/canHandle 类调用/操作人参数校验；注解式：@PreAuthorize/@RolesAllowed 并入信号集），有守卫与无守卫方法并存 → WARNING「同资源守卫不一致」。advisory 不阻断（探针8 先例：误报面未知先放行）。
- **evidence**: 2026-09-15 wp EHS 二次独立复核实证——doSubmit 全链无操作人校验而同实体 deleteOrder（开立人∪管理员）/withdraw（同款）/handle（canHandle）齐备，越权 P1；编码式校验形态（BaseResult+manager 参数）注解审计完全不覆盖。
- **impacts**: verify-probes.js 新增探针9；verify-postcheck.js 一致性抽查纳入 probe9 维度（对齐 probe8 接线先例）。
