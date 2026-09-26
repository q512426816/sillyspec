---
author: flow-machine-draft
created_at: 2026-09-26T00:55:08.576Z
---
# 提案书（Proposal）— 2026-09-26-thin-agent-tasks

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:c37060af9bb03a44aca1a9954ef5b03c06eb5f11b40d19a445855c6c431ec5d7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-agent-tasks 留痕重锚 -->
任务原话转写：动机：thin-workunits 的域关键词聚类（WORK_UNIT_BUCKETS 四桶枚举）被用户否决——开放世界的任务形态不可穷举（数据管道/CLI/重构/基础设施全落 misc），枚举分类表是错误方向（本会话第三次同款错误：标点自检被评审否决、复合拆分劈碎词表实证）。正确定位：任务是 agent 的实现计划（OS/厚道流程实证 agent 自拆贴合实际、边干边勾自然），机器稿的正确边界是验收面（proposal/requirements 标准受指纹锚定）而非计划面；tasks.md 去年已去指纹化，机器预填只是零冷启动兜底。修法：回退聚类器，tasks.md 恢复逐条标准预填+简报明示「预填草稿可按实际实现路径覆写（保持 - [ ] task-NN: 行形态），完成自己的任务单元即勾」；哨兵证据重心本就在提交面（任务面降级为进度信号）。
成功标准：
- groupCriteriaToUnits/WORK_UNIT_BUCKETS 聚类路径回退（draftTasks 恢复逐条标准预填渲染）；thin-workunits 的聚类测试同步回退
- 简报（fresh/adopt）与 done advisory 三处文案改为「预填计划草稿+可覆写」语义（覆写保持 task-NN 行形态）
- tasks.md 机器稿头注释同步（说明草稿可覆写）
- design 槽4 把「枚举开放世界」教训落为决策记录（distill 蒸馏进 knowledge——第三次同款错误与正确定位）
- 测试与既有套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:2e91ecd0f3265d28cfd8164ed9f5594dcaab513bd668e2343c9ddf8cb85acacc:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-agent-tasks 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. groupCriteriaToUnits
2. WORK_UNIT_BUCKETS 聚类路径回退（draftTasks 恢复逐条标准预填渲染）
3. thin-workunits 的聚类测试同步回退
4. 简报（fresh
5. adopt）与 done advisory 三处文案改为「预填计划草稿+可覆写」语义（覆写保持 task-NN 行形态）
6. tasks.md 机器稿头注释同步（说明草稿可覆写）
7. design 槽4 把「枚举开放世界」教训落为决策记录（distill 蒸馏进 knowledge——第三次同款错误与正确定位）
8. 测试与既有套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:b6c890335771737a8123e0e637a331b607155940da07fc186f420c120aab47cf:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-agent-tasks 留痕重锚 -->
1. groupCriteriaToUnits
2. WORK_UNIT_BUCKETS 聚类路径回退（draftTasks 恢复逐条标准预填渲染）
3. thin-workunits 的聚类测试同步回退
4. 简报（fresh
5. adopt）与 done advisory 三处文案改为「预填计划草稿+可覆写」语义（覆写保持 task-NN 行形态）
6. tasks.md 机器稿头注释同步（说明草稿可覆写）
7. design 槽4 把「枚举开放世界」教训落为决策记录（distill 蒸馏进 knowledge——第三次同款错误与正确定位）
8. 测试与既有套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
