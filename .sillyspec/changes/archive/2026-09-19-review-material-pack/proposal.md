---
author: qinyi
created_at: 2026-09-19 14:55:00
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
2026-09-19 成本复盘：评审降耗的结构病根是每次独立评审从零重建仓库认知（five-cuts 实测 ~200x 信息放大，9.1M token）。最尖锐实证：复审增量机制 2026-09-16 已进引擎（{PRIOR_REVIEW_FACTS} 建议语），QA 二轮仍烧 135 万全量重读——根因是同 prompt 里必读清单（「必须读取完整 design.md」brainstorm.js:417、「素材宁可多读」:424）优先级更高。子代理服从必读清单，不服从回灌块。

## 关键问题
1. 评审贵的不是次数是单价——每次评审的成本是「重建整个仓库认知」而非「消费增量信息」。
2. 必读清单与增量注入的契约矛盾：引擎有增量机制但被清单压死。
3. 缺可证伪验收——「省 X%」是无法证伪的希望值。

## 变更范围
评审材料包契约（详见 design.md 三 Wave）：{REVIEW_MATERIALS} 注入位＋包组装 helper（热区/diff/差量抽取，execute 热区先例泛化）；四阶段 prompt 契约改写（Grill 首轮包/plan 差量包/QA diff+热区+清单包/再审唯一材料化）；机械验收钉（两原语绝迹 grep＋包形态单测＋排他语断言）；docs/prompt 三步流水线镜像同步。

## 不在范围内（显式清单）
- 不改评审轮次与 S2/S3 菜单（少审这条路不通——两轮 QA 拦下的真 bug 价值大于全部评审成本）。
- 不改填卡步骤（plan.js:500 batch 子代理——同病不同单据，另立）。
- 不动事实面计量（checkpoint 污染已由 quick-450636f3 修复）。
- 不吞 verify 级联死锁（postmortem ql-013 在案）。
- token 节省比例不作验收（仅观测注记）。

## 成功标准（可验证）
- 验收①：四阶段评审的 checklist 每一条都能只靠材料包回答（评审者自检 cannot_verify＋列缺件兜底）。
- 验收②：阶段 prompt 模板无「必须读取完整」/「素材宁可多读」两原语（机械 grep 钉）。
- 再审排他语在场（{PRIOR_REVIEW_FACTS} 复审基线段为本轮唯一基准面）。
- 全量 npm test＋lint 通过；docs/prompt 三步流水线同步完成。
