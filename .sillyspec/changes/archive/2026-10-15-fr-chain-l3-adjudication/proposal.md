---
author: flow-machine-draft
created_at: 2026-10-15T02:31:15.905Z
---
# 提案书（Proposal）— 2026-10-15-fr-chain-l3-adjudication

## 动机

任务原话转写：按 2026-09-18-fr-index-l1 design 实验裁决条款（护栏①·证伪出口）执行正式裁决。观察期：epoch 2026-09-18 后归档变更 20 个（20-30 带内达标）。证伪三条件全中：①承接引用率趋零——窗口 1/452≈0%（分子 fr-supersede 涉及变更 1/分母索引来源变更 452）；②fr-supersede 事件稀少——窗口 2 次（1 变更）；③重复 FR 仍靠人眼发现——fr-duplicate-warning 24 次零候选动作。四类遥测计数：fr-inject 22 次（11 变更）/fr-supersede 2 次（1 变更）/fr-duplicate-warning 24 次（0 候选）/fr-unreferenced unmapped×625、cli-entry×195 等。按条款裁决：杀掉/冻结 L3（活规格树不建），fr 索引降级保留为检索/注入面（L2 素材）——此为条款明文的合法结局而非失败。落地：stats FR 实验区头注记已裁决状态+指标转历史观察，裁决候选 Top-10 视图（L3 决策仪表盘，用途已终）替换为冻结注记，JSON 数据面保留；裁决决策入 decisions.md 随归档蒸馏。

成功标准：
- decisions.md 落 D-xxx@v1 裁决条目（引用四类遥测计数+条款原文依据，状态 implemented）
- knowledge stats FR 实验区（--fr-only 与全量两渲染位）头行带已裁决注记，裁决候选块替换为冻结注记
- fr 检索/注入面零变化（fr-inject/域注入/绑定面不动）；既有 stats 测试零回归

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. decisions.md 落 D-xxx@v1 裁决条目（引用四类遥测计数+条款原文依据，状态 implemented）
2. knowledge stats FR 实验区（--fr-only 与全量两渲染位）头行带已裁决注记，裁决候选块替换为冻结注记
3. fr 检索/注入面零变化（fr-inject/域注入/绑定面不动）；既有 stats 测试零回归

## 成功标准（可验证）

1. decisions.md 落 D-xxx@v1 裁决条目（引用四类遥测计数+条款原文依据，状态 implemented）
2. knowledge stats FR 实验区（--fr-only 与全量两渲染位）头行带已裁决注记，裁决候选块替换为冻结注记
3. fr 检索/注入面零变化（fr-inject/域注入/绑定面不动）；既有 stats 测试零回归
