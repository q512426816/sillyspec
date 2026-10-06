---
author: flow-machine-draft
created_at: 2026-10-06T15:05:12.232Z
---
# 决策记录（Decisions）— 2026-10-06-verify-docs-prefill

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：②的候选注入是变更级近似（frHits 无逐卡文件映射面，无法精确到「这张卡的 acceptance 连哪个 FR」）——无归属卡收到的是全部 FR 关联文件的并集，可能含无关用例。缓解：只注入无归属卡（有归属卡零噪音）、注记行明示「候选，命中≠结论，判定由你复核」、判定枚举仍由 agent 改写；宁可多给候选不回到「无归属测试——大概率 uncovered」的零信息预填。第二个风险：①的占位检查可能被 driver 误读为「测试通过」——warnings 三处明示「本档不含测试客观核验，以完整 gate/--done 为准」，exit code 语义不变（占位 ok=true 但整 envelope 的 ok 仍由 artifacts 等真检查决定）。试过但放弃：a) docsOnly 用命令子形态（gate docs <stage>）——与既有 --full flag 家族不一致；b) probe7 逐卡精确映射（requirement_ids→active FR）——本变更新 FR 与知识库 active FR 是两个编号系，映射需标题相似度启发（frTitleOverlap），误配代价高于并集噪音；c) guide 清理按 mtime 过期——时间窗语义在多变更并行下比引用白名单更粗暴。另：本变更撤销了最初计划的「评审三档」——档位机器已存在（review-tier S0/S1→self + flow-review 五路证据定档 + 1/4 抽样校准），再加 self 档会破坏抽样校准机制；55 万 token 病根是厚流程选道错位（运维修复应走轻量道），属选道纪律非档位缺失。
