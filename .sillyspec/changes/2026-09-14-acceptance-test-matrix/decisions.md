---
author: qinyi
created_at: 2026-09-14 15:32:03
generated_by: sillyspec-fourpiece-init
change: 2026-09-14-acceptance-test-matrix
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 覆盖矩阵判定权归 agent 语义判定 + 槽位 fail-closed，关键词只做提示
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: acceptance×测试的对应关系由谁判定——纯关键词机械匹配 / agent 语义判定 / 硬性全覆盖门禁？
- answer: 三层分工：机械层只做结构归属（allowed_paths∩测试模式 ∪ review.changedFiles∩test/）与关键词命中提示（从 acceptance 提取标识符 grep 归属测试文件，展示命中词）；判定层归 agent 四枚举（covered/partial/uncovered/non-testable）+ 证据必填（测试名或 file:line）；门禁层 fail-closed 只查「槽位已填 + 证据在场」，不查判定内容（防关键词误报阻断 + 防橡皮图章两头堵）。备选否决：纯机械判定——中文 acceptance 与测试名语义鸿沟大，误报会逼 agent 假对齐；硬性全覆盖——文档/部署类 acceptance 合法无测试，需要 non-testable 逃生门。
- normalized_requirement: 矩阵每行判定为四枚举之一且 covered/partial 附证据；未填槽阻断 verify --done；关键词命中只出现在提示列不参与门禁
- impacts: [FR-01, FR-02, FR-03]
- evidence: 会话方案 3 锋利化讨论 + 用户批准；probe 3 模块目录法的误归属实证（verify-result 预填曾把 src/ 下非测试文件计入）
- 故障面: 判定橡皮图章（agent 批量写 covered 不看代码）——证据必填抬高造假成本但非零；non-testable 滥用逃生门——矩阵列提示可回查
- 退役判据: 若连续 5 个变更矩阵 non-testable 占比 >50%，或 agent 判定与事后抽审偏差率 >30%，说明语义判定层失真，降级回存在性核对或改为抽审制
- 模块域: core-engine, stages
