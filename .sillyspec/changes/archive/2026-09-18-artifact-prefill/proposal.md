---
author: qinyi
created_at: 2026-09-18 15:48:45
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
主会话成本第三刀（轮次轴）：写作轮次-10%+产物变薄；verify-result 预填模式推广，白名单槽制防假完成。

## 关键问题
①design 决策追踪表/taskcard 的 ids 槽是纯机械推导却要 agent 手写；②task 卡 target_files 已声明过的文件清单 design 里再写一遍；③骨架 <!--TODO--> 全人工。

## 变更范围
三槽预填（清单/决策表/ids）+生成器接线+prefill-refresh 重放+注清零门禁梯度+本变更自身对表批1/2效果。

## 不在范围内（显式清单）
- 非白名单槽不预填（非目标/取舍/风险正文）
- 不做 LLM 预 draft
- 不改骨架纪律与 CLI 单一写入方

## 成功标准（可验证）
- - 三槽预填直测+refresh 幂等+已确认跳过
- 定向回归（生成器测试）零破坏
- 对表数据落 baseline 附录
- 全量绿
