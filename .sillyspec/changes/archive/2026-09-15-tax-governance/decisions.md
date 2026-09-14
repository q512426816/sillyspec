---
author: qinyi
created_at: 2026-09-14 16:55:28
generated_by: sillyspec-fourpiece-init
change: 2026-09-15-tax-governance
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 税可见化走「软警告 + 幸存台账」而非硬门禁
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 自维护税怎么治——decisions 故障面/退役判据必填硬拦 / 软警告+数据积累 / 只做台账不动决策格式？
- answer: 软警告+台账双轨：字段链（模板示例+distill 携带+gate 软警告）先让新决策自然带上故障面与退役判据，存量不回填；摩擦历史靠归档时滚动进幸存台账（friction-ledger.json 上限 200），doctor 渲染聚合+阈值提示。硬必填被否——官僚本身会变税（每个小决策都要编故障面）；只做台账被否——不写退役判据的机制永远没有「该删」的判据锚点。
- normalized_requirement: 新 architecture 类决策缺故障面/退役判据 → gate 软警告不阻断；归档时摩擦摘要进台账且 doctor 可见聚合
- impacts: [FR-01, FR-02, FR-03]
- evidence: 会话方案 5 锋利化 + 用户批准；knowledge-baseline 软警告哲学同源；17 批摩擦修复史实证必要性
- 故障面: 软警告长期被无视（字段仍缺失）→ 一个观测周期后按棘轮升级；台账 append 并发交错 → 单行小 JSON + 容忍残行（同 hits.jsonl 模式）
- 退役判据: 若台账积累 50+ 条后 doctor 阈值提示从未触发任何人行动，或字段覆盖率（有故障面的 architecture 决策占比）三个月 <50%，本机制降级为纯台账记录
- 模块域: core-engine, change-management


## D-001@v2: 台账格式定案 JSON 数组 + 锁（supersedes D-001@v1 的 JSONL 措辞）
- type: definition
- priority: P1
- status: accepted
- supersedes: D-001@v1
- source: design-grill
- question: 台账格式 JSONL（残行容忍）还是 JSON 数组（原子读改写）？
- answer: JSON 数组 + withFileLock + writeAtomicSync（friction-tally 锁先例）——改动面最小；坏文件=空数组重启全量历史为容忍立场（台账是行为数据非审计账，friction-tally history 本就 20 条截尾同哲学）。v1 answer 中「单行小 JSON + 容忍残行（同 hits.jsonl 模式）」措辞作废。滚动挂 consume 侧 merge-by-change（v1 未涉，Grill P1-1 补）。
- normalized_requirement: 台账为 JSON 数组原子写；同 change 重复 consume 合并不双计
- impacts: [FR-02]
- evidence: Grill X-05/X-06；friction-tally.js:180-193 锁先例
- 故障面: 台账坏文件=全量历史重启（容忍立场）；merge 写失败 fail-soft 丢本条不阻断收尾
- 退役判据: 台账积累 50+ 条后阈值提示从未触发行动，或字段覆盖率三个月 <50%，降级纯记录
- 模块域: core-engine
