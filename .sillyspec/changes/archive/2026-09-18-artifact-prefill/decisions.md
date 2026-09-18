---
author: qinyi
created_at: 2026-09-18 23:48:46
---

# 决策记录

## D-001@v1 预填白名单槽制
- 类型：architecture
- 问题：哪些产物槽可预填？
- 答案：三槽白名单：①design.md 文件变更清单←各 task 卡 target_files 并集（含 NEW: 前缀保形）②决策追踪表←decisions.md 的 D-xxx@vN 清单机械预填（状态列留待人工）③TaskCard requirement_ids/decision_ids←requirements.md FR 抽取+decisions 清单。槽外一律不预填——评审明确红线：非目标/取舍理由/风险声明正文预填=假完成雪球，评审/verify 反而更贵

## D-002@v1 预填时机与生成器归属
- 问题：何时填？谁填？
- 答案：生成器骨架阶段即填（fourpiece-init/design-init/taskcard CLI 三入口——预填随骨架一次落盘，agent 拿到即'核对改写'而非'从零写'）；CLI 单一写入方纪律不变（预填=骨架的一部分）

## D-003@v1 预填≠结论语义
- 问题：怎么防预填被当结论？
- 答案：预填值带来源标记（如「(预填自 task 卡 target_files 并集，核对后删本注)」行内注）；--done 门禁对预填注未删的槽按'未确认'处理（沿用 verify-result 预填≠结论先例）；空槽仍走 <!--TODO--> 骨架纪律

## D-004@v1 本变更是批1/2效果首个实测点
- 问题：对表怎么拿？
- 答案：本变更走完整流程全程消费：定价（预期 S2 span）+前置失败清单+注入瘦身+wait 盖章（有继承场景就用）——归档后按基线锚对表（主会话请求/上下文均值/摩擦 vs 172/249k/9），delta 附录记录；守恒三红线照验

## D-005@v1 预填值的更新语义
- 问题：骨架生成后 decisions/tasks 变了怎么办？
- 答案：预填值是快照不自动追更（骨架纪律本就如此）；但 design-init/taskcard 再跑幂等不覆盖已存在文件——提供 sillyspec prefill-refresh --change 单命令重放预填（仅白名单槽、保留人工槽），归档前 docs-check 型校验预填注清零

## D-006@v1 design-facts 两断言随新注格式更新（执行期裁决）
- 问题：task-02 接线后 test/design-facts.test.mjs L552/L576 钉旧无注行格式 2 断言失败——行为变更系 D-003 预填注协议的既定语义
- 答案：断言更新为带注新格式，归属 task-04（allowed_paths 扩 test/design-facts.test.mjs）——被取代行为随新真相，非为过改测（AGENTS 规则 11 边界：实现先行且裁决在案）
