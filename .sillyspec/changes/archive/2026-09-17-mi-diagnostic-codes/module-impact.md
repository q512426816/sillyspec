# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| machine-interface | src/diagnostic-codes.js | 新增（码表单一源：冻结表 10 码 + checkCode 映射，零依赖叶子模块） | 否（独立审查已覆盖：parity + 代码审查） |
| machine-interface | src/machine-interface.js | 接口变更（加法式：buildEnvelope 增 codes 可选参/checks[].code 恒挂/信封级错误路径单码——errors/退出码/schema_version 零改动，非破坏性） | 否（四场独立审查 diff 行级核实） |
| machine-interface | test/machine-interface.test.mjs | 逻辑变更（新增第 11 节 codes 加法式行为 5 断言，既有 127 断言零回归） | 否 |
| docs-consistency | docs/sillyspec/interface-contract.md | 逻辑变更（对账三项 + informational 清扫 + §8 码目录 + §9 语义变更记录 + §1.4 progress show 入约——文档与实现恢复单一真相） | 否（parity 测试钉死 + 3a/3b 语义断言） |
| machine-interface | test/diagnostic-codes-parity.test.mjs | 新增（双向 parity + 发射抽查 + 文档语义抽查，24 断言） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- ~~`src/diagnostic-codes.js`~~ 已归属：machine-interface 模块（verify 步 6 lint 盲区拦截后补录 `_module-map.yaml` paths，2026-09-17）
- ~~`src/machine-interface.js`~~ 已归属：machine-interface 模块（骨架生成时未匹配系索引读取时序，现行 paths 命中）
- ~~`docs/sillyspec/interface-contract.md`~~ docs-consistency 域文档（契约基准，非模块卡面；变更已由 parity 测试与 verify 走查覆盖）
- ~~`test/diagnostic-codes-parity.test.mjs`~~ 测试文件（co-located 于 test/，承接 machine-interface 模块验收）
- ~~`test/machine-interface.test.mjs`~~ 同上

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | machine-interface 模块 paths 补录 `src/diagnostic-codes.js`（verify 步 6 lint「未录 module-map」拦截驱动，2026-09-17） | done |
| `modules/machine-interface.md` | 模块卡同步：:28 旧 informational 说法改写为参与综合 ok（指向契约 §9）+ 契约摘要补 codes/checks[].code 语义与 parity 说明 + frontmatter updated_at | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
