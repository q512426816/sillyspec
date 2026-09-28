---
author: flow-machine-draft
created_at: 2026-09-28T13:26:52.950Z
---
# 提案书（Proposal）— 2026-09-28-knowledge-reason-overlap

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:e69619f966d8932284108d387da566610f26cd887bdb1cc0cdbb74069ea45cd9:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-reason-overlap 留痕重锚 -->
任务原话转写：排序评分纳入理由文本：近义措辞（词在理由不在标题）时死路条目仍可命中。

动机：多角度加测实测——查询「穷举/关键词表/分类表」（这些词在 D-001 理由文本里、不在标题里）时相关死路条目不进前 5，前 3 被空标题 rejected 条目以文件序霸占；relScore 只算 id+标题重叠，理由里的实词不参与评分。

成功标准：
- 查询「穷举」「关键词表」「分类表」等仅出现在理由文本的近义词时，D-001@v1 枚举开放世界死路条目进 decisionHits 前 5
- 主场景（标题词如 枚举/开放世界）排序不回归，仍置顶
- 空标题 rejected 条目在近义查询下不再以文件序压制相关死路条目
- 测试钉住近义/主场景/精度三面；npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:85e74a909052024a3015f20187fdacc2e7e6f9af8d25452d16ae15b6a815d342:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-reason-overlap 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. 查询「穷举」「关键词表」「分类表」等仅出现在理由文本的近义词时，D-001@v1 枚举开放世界死路条目进 decisionHits 前 5
2. 主场景（标题词如 枚举/开放世界）排序不回归，仍置顶
3. 空标题 rejected 条目在近义查询下不再以文件序压制相关死路条目
4. 测试钉住近义/主场景/精度三面
5. npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:1c7dbe8f9a28b257c9ef74e0d3e0e4d9fcc33c92d825c2cea14b9178a51b1bf1:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-reason-overlap 留痕重锚 -->
1. 查询「穷举」「关键词表」「分类表」等仅出现在理由文本的近义词时，D-001@v1 枚举开放世界死路条目进 decisionHits 前 5
2. 主场景（标题词如 枚举/开放世界）排序不回归，仍置顶
3. 空标题 rejected 条目在近义查询下不再以文件序压制相关死路条目
4. 测试钉住近义/主场景/精度三面
5. npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
