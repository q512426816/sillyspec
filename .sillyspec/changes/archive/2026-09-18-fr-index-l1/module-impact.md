# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/fr-index.js | 新增（FR 索引核心：五导出+epoch 常量；knowledge 族新成员） | 否（35 断言+独立验收两轮） |
| core-engine | src/decision-distill.js | 接口变更（四函数参数化导出+内部正则经参——decisions 侧缺省等价零回归，四测试族钉死） | 否 |
| core-engine | src/stage-contract.js | 逻辑变更（validateBrainstormOutputs 增 FR 软门 advisory 块+静态 import；签名不变） | 否 |
| core-engine | src/doctor-diagnostics.js | 逻辑变更（D14 第四检查分支+frEntries 预计算+import 块） | 否（doctor 40 断言） |
| core-engine | src/verify-probes.js | 逻辑变更（facts.handover 恒落盘死锁修复——verify 期 Reverse Sync，一行+注释） | 否（pass-eligibility 37 断言绿） |
| docs-consistency | docs/sillyspec/platform-interface-map.md | 配置变更（行锚重锚 44→50——import 位移机械修复） | 否 |
| stages | src/stages/brainstorm.js | 逻辑变更（step8 模板：{FR_INDEX_DIGEST} 段+承接行指引+格式示例更新） | 否 |
| runtime | src/run/archive-distill.js | 逻辑变更（executeArchiveDistill 追加 FR 索引调用+两遥测；签名与降级语义不变） | 否 |
| runtime | src/run/prompt.js | 逻辑变更（新增 ①c FR_INDEX_DIGEST 替换块+fr-inject 遥测；既有块零改动） | 否 |

## 未匹配文件

测试文件（test/fr-index.test.mjs、test/doctor-archive-integrity.test.mjs）co-located 于 test/，承接 core-engine 验收；全部源文件已归属（fr-index.js 已录 core-engine paths——verify 期 lint 拦截驱动补录）。

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：


## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | core-engine paths 补录 src/fr-index.js（verify 步 6 lint 盲区拦截驱动） | done |
| `modules/core-engine.md`（模块卡） | 最近变更行+frontmatter+changelog 边车（收尾批次） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
