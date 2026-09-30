---
author: flow-machine-draft
created_at: 2026-09-30T06:52:12.312Z
---
# 提案书（Proposal）— 2026-09-30-verify-done-green-reuse

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:3a5a5b7e52e2bc4ac1535b120868c27140da4543ec166cf9dd036969511a2e60:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-verify-done-green-reuse 留痕重锚 -->
任务原话转写：verify 收口收敛循环的反馈效率治理，基于 2026-09-30 multi-agent-platform change tool-report-activation-wrong-machine 的实证（rollout + tool.call 日志）：①报错文案误导——stage-contract.js:1257「证据缺用例依据锚点」中「用例依据」是接口矩阵第 3 列列名（caseId），而实际校验只查第 5 列证据列（apiEvidenceHasAnchorForm 只收 c[4]），一周内两次把 agent 卡三轮（2026-09-23 分诊只修了 design接口表# 分叉，误导词未改）；②--done 收口实测重复真跑——gates.js runStageCompletionGates 的 test/lint 实测路径只有 P2 账本与质量扫描复用，green-cache 同指纹复用只挂在 machine-interface gate verify 模板；实证码态恒定（12:59-14:15 零 commit）下收敛循环 test 实测 10 轮 ×~290s 全部真跑。改法：文案直接点名证据列；--done 实测路径接入 green-cache（命中即复用近期绿并明示 cached，fail-open，语义对齐 R8 与 P2 账本先例）。

成功标准：
- 报错文案不再含「用例依据」误导词，直接写明锚点须在证据列（第 5 列）
- verify --done 的 test 实测在 HEAD+代码脏面+local.yaml 指纹全等且 30min 内有绿记录时复用缓存不真跑，输出明示 cached 复用
- verify --done 的 lint 实测同指纹复用（同上口径）
- 指纹失配/无记录/环境异常一律回退真跑，门禁语义零变化（fail-open）
- 全量测试回归绿，含新增的文案断言与复用命中/未命中用例
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:82e6223894ff7f6c45349f7122598bcb1c7699fadeee4f57ed388f6214b146a7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-verify-done-green-reuse 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. 报错文案不再含「用例依据」误导词，直接写明锚点须在证据列（第 5 列）
2. verify --done 的 test 实测在 HEAD+代码脏面+local.yaml 指纹全等且 30min 内有绿记录时复用缓存不真跑，输出明示 cached 复用
3. verify --done 的 lint 实测同指纹复用（同上口径）
4. 指纹失配/无记录/环境异常一律回退真跑，门禁语义零变化（fail-open）
5. 全量测试回归绿，含新增的文案断言与复用命中
6. 未命中用例
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:e6fe59f5cfaeca4d2b45cc9ef29ff4f27d35996abc017590ba804f3acfb3cedd:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-verify-done-green-reuse 留痕重锚 -->
1. 报错文案不再含「用例依据」误导词，直接写明锚点须在证据列（第 5 列）
2. verify --done 的 test 实测在 HEAD+代码脏面+local.yaml 指纹全等且 30min 内有绿记录时复用缓存不真跑，输出明示 cached 复用
3. verify --done 的 lint 实测同指纹复用（同上口径）
4. 指纹失配/无记录/环境异常一律回退真跑，门禁语义零变化（fail-open）
5. 全量测试回归绿，含新增的文案断言与复用命中
6. 未命中用例
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
