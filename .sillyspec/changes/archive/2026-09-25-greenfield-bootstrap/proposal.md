---
author: flow-machine-draft
created_at: 2026-09-25T16:03:45.338Z
---
# 提案书（Proposal）— 2026-09-25-greenfield-bootstrap

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:01f0c334da0633b442755030e4984bf69e5a5f03acdc379893674d0261fc4995:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-greenfield-bootstrap 留痕重锚 -->
任务原话转写：动机：R17 实证绿地/无模块图仓知识复利从第一条 FR 断流——臂2 落伪域 auto-claude、臂3 落 unmapped（后者直接成因是 archive 侧 indexRequirements 不传 deliverableFiles，域路由退化为 design 清单单源）；本仓 unmapped.md 720 条堆积同构。经子代理实证评审：方案=绿地草案模块图+archive 侧供清单对齐+unmapped 告警配治理指引+伪域升级提醒。
成功标准：
- flow start 绿地检测：模块图缺席（discoverModuleIndex null）且 --input 路径语料非空时，机器起草初始 _module-map.yaml 草案（generator: flow-bootstrap-draft、status: draft、按路径目录段聚合 modules.<id>.paths、不含 blast 段、不覆盖已有文件）并醒目提示草案身份与校准路径（跑 modules/scan）
- distill 前缺图告警：flow done distill 落伪域/unmapped 时收口输出提示升级路径（补模块卡后新变更自动落回真域）
- archive 侧 deliverableFiles 补供：archive-distill.js 与 complete-handlers.js 的 indexRequirements 调用对齐轻量道口径（git 归属切分供清单），域路由不再退化为 design 单源
- unmapped 超阈告警：indexRequirements 写盘尾部统计 unmapped 域条目数超 50 时 console.warn 配治理指引（补模块卡/认领条目/跑 modules），doctor 不动
- 测试：绿地草案起草（路径聚合/不覆盖/不含 blast）、archive 侧供清单（伪域形态复现夹具转真域或至少非 unmapped）、unmapped 告警；既有套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:f66bf87760157c5fce1a6889ee87e0d5e8d03bada5fc12eb7c97a16825f1ff6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-greenfield-bootstrap 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. flow start 绿地检测：模块图缺席（discoverModuleIndex null）且 --input 路径语料非空时，机器起草初始 _module-map.yaml 草案（generator: flow-bootstrap-draft、status: draft、按路径目录段聚合 modules.<id>.paths、不含 blast 段、不覆盖已有文件）并醒目提示草案身份与校准路径（跑 modules/scan）
2. distill 前缺图告警：flow done distill 落伪域
3. unmapped 时收口输出提示升级路径（补模块卡后新变更自动落回真域）
4. archive 侧 deliverableFiles 补供：archive-distill.js 与 complete-handlers.js 的 indexRequirements 调用对齐轻量道口径（git 归属切分供清单），域路由不再退化为 design 单源
5. unmapped 超阈告警：indexRequirements 写盘尾部统计 unmapped 域条目数超 50 时 console.warn 配治理指引（补模块卡/认领条目/跑 modules），doctor 不动
6. 测试：绿地草案起草（路径聚合/不覆盖/不含 blast）、archive 侧供清单（伪域形态复现夹具转真域或至少非 unmapped）、unmapped 告警
7. 既有套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:728ba2fe33e5a967b2d53ecf09101446306b48fc5cf0cfed75a448d6c1153fea:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-greenfield-bootstrap 留痕重锚 -->
1. flow start 绿地检测：模块图缺席（discoverModuleIndex null）且 --input 路径语料非空时，机器起草初始 _module-map.yaml 草案（generator: flow-bootstrap-draft、status: draft、按路径目录段聚合 modules.<id>.paths、不含 blast 段、不覆盖已有文件）并醒目提示草案身份与校准路径（跑 modules/scan）
2. distill 前缺图告警：flow done distill 落伪域
3. unmapped 时收口输出提示升级路径（补模块卡后新变更自动落回真域）
4. archive 侧 deliverableFiles 补供：archive-distill.js 与 complete-handlers.js 的 indexRequirements 调用对齐轻量道口径（git 归属切分供清单），域路由不再退化为 design 单源
5. unmapped 超阈告警：indexRequirements 写盘尾部统计 unmapped 域条目数超 50 时 console.warn 配治理指引（补模块卡/认领条目/跑 modules），doctor 不动
6. 测试：绿地草案起草（路径聚合/不覆盖/不含 blast）、archive 侧供清单（伪域形态复现夹具转真域或至少非 unmapped）、unmapped 告警
7. 既有套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
