---
author: flow-machine-draft
created_at: 2026-10-05T04:38:09.259Z
---
# 提案书（Proposal）— 2026-10-05-diff-commit-attribution

## 动机

任务原话转写：两个 P1 同根：多会话共享仓 baseline..HEAD 混入他侧交付——① patch 冻结件夹带（评审实证：他会话 knowledge-stats 的 hunk 进了本变更审计件）② FR 域路由污染（他侧 src/knowledge-stats.js 匹配 core-engine paths → 本变更 FR 落错域）。根因：归属切分器只认 active changes/ 声明面（archive/ 下不算——他会话窗口内交付并归档后声明不可见）；patch 面另有否决决策 sentinel-evidence-freeze⑤ 禁声明切分（防陈旧声明抢已提交文件——但那是意图抢文件，非提交事实）。修法：新增提交事实归属切分——按提交 message 携带的变更名后缀（项目提交惯例）判每个文件的窗口内提交归属；foreign-declared.js 的 splitOwnVsForeignDiffFiles 与 flow-parity.js 的 filterCommittedFace 内部自取 baseline_commit（不改 flow.js 调用点）：前者并入 foreignMap，后者剔除「全部提交均属他侧变更」的交付文件。保守规则：无后缀裸提交触碰的文件不剔（fail-closed）；含本变更名的文件恒 own；ownDeclared 声明优先级不变。
成功标准：
- 集成场景（临时 git 仓双变更混窗）：他侧提交的交付文件不进本变更 patch 冻结面与 attributedChangedFiles，FR 域不再触达他侧文件的域
- 本变更提交的文件（含被无后缀裸提交触碰过的）归属不变
- 声明面优先级、7 天陈旧规则、非 git 仓与 git 失败的行为均维持现状
- 新增测试锁定上述三面，全量测试绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 集成场景（临时 git 仓双变更混窗）：他侧提交的交付文件不进本变更 patch 冻结面与 attributedChangedFiles，FR 域不再触达他侧文件的域
2. 本变更提交的文件（含被无后缀裸提交触碰过的）归属不变
3. 声明面优先级、7 天陈旧规则、非 git 仓与 git 失败的行为均维持现状
4. 新增测试锁定上述三面，全量测试绿

## 成功标准（可验证）

1. 集成场景（临时 git 仓双变更混窗）：他侧提交的交付文件不进本变更 patch 冻结面与 attributedChangedFiles，FR 域不再触达他侧文件的域
2. 本变更提交的文件（含被无后缀裸提交触碰过的）归属不变
3. 声明面优先级、7 天陈旧规则、非 git 仓与 git 失败的行为均维持现状
4. 新增测试锁定上述三面，全量测试绿
