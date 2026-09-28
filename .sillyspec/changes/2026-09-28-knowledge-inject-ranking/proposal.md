---
author: flow-machine-draft
created_at: 2026-09-28T13:11:00.996Z
---
# 提案书（Proposal）— 2026-09-28-knowledge-inject-ranking

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:df5f08ffd84a5aa88bfe9f1a4b69aa1c02f923dd4739eea57fd23336f037236c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-inject-ranking 留痕重锚 -->
任务原话转写：修复知识库防复潮注入两个实测缺陷（入口 flowKnowledgeDigest 与设计时点 knowledge-gate 同源共犯）。

动机：实测（函数级+主仓实弹）证实：① 教训型死路条目 status=implemented 被 rejected 过滤压制——D-001@v1「枚举开放世界是错误方向」排在 decisionHits 第 148/188 位永远不可见，恰是最该防复潮的；② routing 命中后整文件条目无相关度排序，回显前 5 全是无关噪音（空标题 SillyHub 决策）。

成功标准：
- 查询含枚举/词表/开放世界时，D-001@v1「枚举开放世界是错误方向」出现在 decisionHits 前 5，且 flow start 知识注入段与 knowledge-gate 回显均可见
- 理由含「死路：」注记的条目不受 implemented 状态压制，进防复潮优先组并带标记渲染
- 无关查询（如 pnpm 语料）不出现否决/死路误注入——精度不回归，主题相关命中仍在
- 新增真实库钉子测试（枚举词表查询→目标条目必进前 5）；既有测试与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:518de2cbda32b8e46bdf3c2c24e465a64a470338f087de0082ef9bdf64f8ef38:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-inject-ranking 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. 查询含枚举/词表/开放世界时，D-001@v1「枚举开放世界是错误方向」出现在 decisionHits 前 5，且 flow start 知识注入段与 knowledge-gate 回显均可见
2. 理由含「死路：」注记的条目不受 implemented 状态压制，进防复潮优先组并带标记渲染
3. 无关查询（如 pnpm 语料）不出现否决/死路误注入——精度不回归，主题相关命中仍在
4. 新增真实库钉子测试（枚举词表查询→目标条目必进前 5）
5. 既有测试与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:9596390a62ef43ade537869b26e6da49c0ab0de72e98d507eb9070d6f302bbe4:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-inject-ranking 留痕重锚 -->
1. 查询含枚举/词表/开放世界时，D-001@v1「枚举开放世界是错误方向」出现在 decisionHits 前 5，且 flow start 知识注入段与 knowledge-gate 回显均可见
2. 理由含「死路：」注记的条目不受 implemented 状态压制，进防复潮优先组并带标记渲染
3. 无关查询（如 pnpm 语料）不出现否决/死路误注入——精度不回归，主题相关命中仍在
4. 新增真实库钉子测试（枚举词表查询→目标条目必进前 5）
5. 既有测试与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
