---
author: flow-machine-draft
created_at: 2026-09-26T00:34:45.764Z
---
# 提案书（Proposal）— 2026-09-26-thin-workunits

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:a3ce9c10e04331d22a949cd6572e2a6790c4fa35bfd531b07db42983d66850b8:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-workunits 留痕重锚 -->
任务原话转写：动机：R18 实证 thin 的 tasks.md 是验收标准镜像（R18-thin 15 条 checkbox）而非工作分解——勾选语义错配导致「收口前一把全勾」（R18-thin 被哨兵拦、R17 同模式、主会话自身多条变更同模式），进度信号失真（中途 0 或 15）、哨兵证据链弱化（一提交带 15 token）、每轮上下文粒度税。OpenSpec 侧任务即工作分解（agent 自拆 6 任务边干边勾）行为贴合。修法（用户拍板中档）：机器起草时把成功标准按域聚类为粗粒度工作单元——保留 thin 机器起草哲学（2 调用协议不破，agent 不改任务稿），语义对齐 OS 的工作分解。
成功标准：
- groupCriteriaToUnits：>5 条标准时按域关键词（后端 api/端点/pytest/迁移/存储/鉴权；前端 组件/面板/页面/渲染/vitest；E2E curl/端到端/验收；文档 usage/readme）聚类为工作单元，每单元行内标注覆盖标准号与摘要（验收锚可追），单元数≤8；≤5 条标准不聚类保持逐条 checkbox（小变更零变化）
- tasks.md 单元形态：task-NN: <域标签>——<覆盖标准摘要串>（覆盖标准 i,j,k）；行长度经 clipTaskText 管控；requirements FR 区/测试绑定槽形态不变（FR 仍是验收标准完整形态进知识索引）
- flow start 简报勾选纪律文案同步：完成一个工作单元（该域实现+测试绿）勾一条——替代不贴合的「完成一条勾一条」
- 哨兵/指纹/收口对既有逐条形态零破坏（向下兼容：在途变更的 15 条式 tasks 照常收口）
- 测试：聚类分组/≤5 不聚类/单元行含覆盖号与长度帽/回归 flow-draft 等既有套件全绿；本变更自身 flow done 狗粮验证新形态
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:61ac90b4344a1a1f0ad588fcaabb5f14c4cbb470c873b8b410a3f20f3626e0ef:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-workunits 留痕重锚 -->
按成功标准机械推导，共 14 条验收面：
1. groupCriteriaToUnits：>5 条标准时按域关键词（后端 api/端点/pytest/迁移/存储/鉴权
2. 前端 组件/面板/页面/渲染/vitest
3. E2E curl/端到端/验收
4. 文档 usage
5. readme）聚类为工作单元，每单元行内标注覆盖标准号与摘要（验收锚可追），单元数≤8
6. ≤5 条标准不聚类保持逐条 checkbox（小变更零变化）
7. tasks.md 单元形态：task-NN: <域标签>——<覆盖标准摘要串>（覆盖标准 i,j,k）
8. 行长度经 clipTaskText 管控
9. requirements FR 区
10. 测试绑定槽形态不变（FR 仍是验收标准完整形态进知识索引）
11. flow start 简报勾选纪律文案同步：完成一个工作单元（该域实现+测试绿）勾一条——替代不贴合的「完成一条勾一条」
12. 哨兵/指纹/收口对既有逐条形态零破坏（向下兼容：在途变更的 15 条式 tasks 照常收口）
13. 测试：聚类分组/≤5 不聚类/单元行含覆盖号与长度帽/回归 flow-draft 等既有套件全绿
14. 本变更自身 flow done 狗粮验证新形态
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:1d1545bf0fc2f19f565df4ce71b34a3786c42c80f32ea5228a615d7143e91473:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-workunits 留痕重锚 -->
1. groupCriteriaToUnits：>5 条标准时按域关键词（后端 api/端点/pytest/迁移/存储/鉴权
2. 前端 组件/面板/页面/渲染/vitest
3. E2E curl/端到端/验收
4. 文档 usage
5. readme）聚类为工作单元，每单元行内标注覆盖标准号与摘要（验收锚可追），单元数≤8
6. ≤5 条标准不聚类保持逐条 checkbox（小变更零变化）
7. tasks.md 单元形态：task-NN: <域标签>——<覆盖标准摘要串>（覆盖标准 i,j,k）
8. 行长度经 clipTaskText 管控
9. requirements FR 区
10. 测试绑定槽形态不变（FR 仍是验收标准完整形态进知识索引）
11. flow start 简报勾选纪律文案同步：完成一个工作单元（该域实现+测试绿）勾一条——替代不贴合的「完成一条勾一条」
12. 哨兵/指纹/收口对既有逐条形态零破坏（向下兼容：在途变更的 15 条式 tasks 照常收口）
13. 测试：聚类分组/≤5 不聚类/单元行含覆盖号与长度帽/回归 flow-draft 等既有套件全绿
14. 本变更自身 flow done 狗粮验证新形态
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
