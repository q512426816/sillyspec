---
author: qinyi
created_at: 2026-09-11 10:10:51
---
# 提案书（Proposal）

## 动机
sillyspec 的摩擦事件（gate 失败回滚、verify 实测失败、审查打回）全部流经 CLI 自身状态机，但没有任何计数与消费——经验沉淀全靠人手动想起来。借鉴 teamai-cli 的摩擦信号设计立场（确定性代码数结构化信号、顺利零打扰、每会话最多一次、可关），把触发器升级为 CLI 结构化计数。

## 关键问题
1. verify/doctor 已有 advisory postmortem 提示，但触发条件写在 prompt 里靠 agent 自判——信噪比取决于模型自觉，与 docs-debt D-006「CLI 算事实」立场相悖。
2. 三类高摩擦事件（gate 回滚/verify 实测失败/审查打回）零提示零记录，摩擦发生后无任何机制引导沉淀。
3. QUICKLOG 与 knowledge 生命周期链路齐全，缺的只是「该记的时候提醒一句」的触发器。

## 变更范围
- 新增 src/friction-tally.js：摩擦计数 record/consume（落 .runtime，平台同步排除区）
- gates.js 回滚路径、verify-quality-scan 失败路径、quick 失败分支共 16 处埋点
- quick/verify --done 收尾非零一行 advisory 提示（提示后清零）
- config-schema.js 注册 friction_hint.enabled（默认 true）

## 不在范围内（显式清单）
- 不做 reopen/revision 计数消费、archive 输出点、wait/rounds、stall 信号
- 不新建 QUICKLOG/knowledge 写入链路，不自动写草稿
- 不做跨机/团队级摩擦聚合
- 不改 verify.js/doctor.js 既有 agent 自判 advisory

## 成功标准（可验证）
- 顺利会话（全零摩擦）收尾零新增输出
- gate 回滚/实测失败/审查打回后 quick/verify --done 输出恰好一行提示，且计数文件清零
- friction_hint.enabled: false 时 record/consume 双直通，.runtime 零写入
- 计数文件只含计数/类型/时间戳/结构化短标签，两路径均落 .runtime 树内（单测断言）
- 未配置新键时行为=默认开（advisory 不阻断任何流程）
