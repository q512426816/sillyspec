---
author: flow-machine-draft
created_at: 2026-10-14T15:33:12.786Z
---
# 提案书（Proposal）— 2026-10-14-decision-legacy-renumber

## 动机

任务原话转写：动机与背景：
决策号 epoch 全局化（2026-10-14-decision-global-id-epoch）落地后，存量 701 条 legacy 局部号节段将长期共存（决策条目无跨变更承接机制、不会自然退役——D-001@v1 ×296 形态永续）。用户裁决：存量一次性迁移为全局号，平台侧（spec 树/向量索引）一起迁移。实测底数：701 legacy 节段（另有 1 条 epoch 形态 D-unmapped-001）、其中 75 组跨文件 fanout（179 节，同变更同号副本）、迁移后 ≈597 全局号；平台已连接（crrcdt.ppdmq.top）。

成功标准：
- 迁移 CLI（sillyspec knowledge renumber）：--dry-run 输出迁移计划（总号数/fanout 收敛组数/无变更条目数/各域号段起点），--apply 执行重写——legacy 节段标题改 D-<域>-NNN@vN（域=所在文件名；fanout 组=同变更同号跨文件副本取字母序首文件域、全组同号；无变更行条目逐节独立发号不分组）、「原编号：<旧号>」插入变更行后（无变更行则状态行后）、其余行逐字节保留、节段次序不变；epoch 形态节段零触碰；各域发号从全域既有 epoch 号 max+1 起
- 幂等与安全：--apply 重跑零变化（原编号在场的节段不再迁移）；计划与重写分离为纯函数；真实库执行走 dry-run 先行（计划数与实测底数对账 701→≈597）
- 兼容：docs-check isDecisionExempt 认原编号（消费仓旧裸键 decisions.D-002@vN 迁移后仍命中）；迁移后 parseDecisionEntries 全节段可见、graph 构建正常、doctor 计数=节段总数
- 平台迁移：真实库 apply 后 platform sync 推送 spec 树；向量检索验证（查询探针核对锚点形态或如实记录重建窗口降级）
- 新增/更新测试跑绿；全量测试 + lint 绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 迁移 CLI（sillyspec knowledge renumber）：--dry-run 输出迁移计划（总号数/fanout 收敛组数/无变更条目数/各域号段起点），--apply 执行重写——legacy 节段标题改 D-<域>-NNN@vN（域=所在文件名；fanout 组=同变更同号跨文件副本取字母序首文件域、全组同号；无变更行条目逐节独立发号不分组）、「原编号：<旧号>」插入变更行后（无变更行则状态行后）、其余行逐字节保留、节段次序不变；epoch 形态节段零触碰；各域发号从全域既有 epoch 号 max+1 起
2. 幂等与安全：--apply 重跑零变化（原编号在场的节段不再迁移）；计划与重写分离为纯函数；真实库执行走 dry-run 先行（计划数与实测底数对账 701→≈597）
3. 兼容：docs-check isDecisionExempt 认原编号（消费仓旧裸键 decisions.D-002@vN 迁移后仍命中）；迁移后 parseDecisionEntries 全节段可见、graph 构建正常、doctor 计数=节段总数
4. 平台迁移：真实库 apply 后 platform sync 推送 spec 树；向量检索验证（查询探针核对锚点形态或如实记录重建窗口降级）
5. 新增/更新测试跑绿；全量测试 + lint 绿

## 成功标准（可验证）

1. 迁移 CLI（sillyspec knowledge renumber）：--dry-run 输出迁移计划（总号数/fanout 收敛组数/无变更条目数/各域号段起点），--apply 执行重写——legacy 节段标题改 D-<域>-NNN@vN（域=所在文件名；fanout 组=同变更同号跨文件副本取字母序首文件域、全组同号；无变更行条目逐节独立发号不分组）、「原编号：<旧号>」插入变更行后（无变更行则状态行后）、其余行逐字节保留、节段次序不变；epoch 形态节段零触碰；各域发号从全域既有 epoch 号 max+1 起
2. 幂等与安全：--apply 重跑零变化（原编号在场的节段不再迁移）；计划与重写分离为纯函数；真实库执行走 dry-run 先行（计划数与实测底数对账 701→≈597）
3. 兼容：docs-check isDecisionExempt 认原编号（消费仓旧裸键 decisions.D-002@vN 迁移后仍命中）；迁移后 parseDecisionEntries 全节段可见、graph 构建正常、doctor 计数=节段总数
4. 平台迁移：真实库 apply 后 platform sync 推送 spec 树；向量检索验证（查询探针核对锚点形态或如实记录重建窗口降级）
5. 新增/更新测试跑绿；全量测试 + lint 绿
