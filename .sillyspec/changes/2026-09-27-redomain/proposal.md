---
author: flow-machine-draft
created_at: 2026-09-27T11:37:00.042Z
---
# 提案书（Proposal）— 2026-09-27-redomain

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:c35c9547300b6851956eea617ec4a142a4d8d34e91d06da57dc56425fd8d3d5c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-redomain 留痕重锚 -->
任务原话转写：伪域信号卡指出迁移建议但无机器通道：本仓 37 条 auto-* 伪域条目只能手工 markdown 节切割搬家（切段/拼目标/INDEX 路由行），清存量不现实。三层治理 v2 第③件。
成功标准：
- 新增 tests redomain 子命令：--from <域> --to <域> [--anchor <FR-id>]，干跑缺省列出将迁移条目，--write 落盘
- 条目 ID 保持不变（单一身份——绑定/supersede 链/最近确认锚全靠 ID，迁域不换号；前缀与域不符属历史痕迹，文档说明）
- 段切割用 splitKnowledgeSections/joinKnowledgeFile 单源；目标域文件缺席则按 loadDomainSections 同款头新建；目标域无 INDEX 路由行则经 syncIndexRoutingLines 补
- 全域迁移后源域文件剩 0 条目时删除源文件（防空壳域）；anchor 模式精确单条
- 测试：单条迁移/全域迁移/目标文件新建/INDEX 补行/幂等（迁过的不再迁）/干跑不落盘
- 全仓测试绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:00efbea28f8ff063f253b210e62b27eb5e79a3ab4d13f70f1f177779658a9201:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-redomain 留痕重锚 -->
按成功标准机械推导，共 11 条验收面：
1. 新增 tests redomain 子命令：--from <域> --to <域> [--anchor <FR-id>]，干跑缺省列出将迁移条目，--write 落盘
2. 条目 ID 保持不变（单一身份——绑定/supersede 链/最近确认锚全靠 ID，迁域不换号
3. 前缀与域不符属历史痕迹，文档说明）
4. 段切割用 splitKnowledgeSections
5. joinKnowledgeFile 单源
6. 目标域文件缺席则按 loadDomainSections 同款头新建
7. 目标域无 INDEX 路由行则经 syncIndexRoutingLines 补
8. 全域迁移后源域文件剩 0 条目时删除源文件（防空壳域）
9. anchor 模式精确单条
10. 测试：单条迁移/全域迁移/目标文件新建/INDEX 补行/幂等（迁过的不再迁）/干跑不落盘
11. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:2bbb53dc900cd3f5c0ae4f669aa07fd8365c6dbbbf24f4b3214e3e99e0173cc8:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-redomain 留痕重锚 -->
1. 新增 tests redomain 子命令：--from <域> --to <域> [--anchor <FR-id>]，干跑缺省列出将迁移条目，--write 落盘
2. 条目 ID 保持不变（单一身份——绑定/supersede 链/最近确认锚全靠 ID，迁域不换号
3. 前缀与域不符属历史痕迹，文档说明）
4. 段切割用 splitKnowledgeSections
5. joinKnowledgeFile 单源
6. 目标域文件缺席则按 loadDomainSections 同款头新建
7. 目标域无 INDEX 路由行则经 syncIndexRoutingLines 补
8. 全域迁移后源域文件剩 0 条目时删除源文件（防空壳域）
9. anchor 模式精确单条
10. 测试：单条迁移/全域迁移/目标文件新建/INDEX 补行/幂等（迁过的不再迁）/干跑不落盘
11. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
