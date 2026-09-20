# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| stages | src/taskcard-frontmatter.js | 新增（plan/verify 双侧消费的单一解析源） | 是——verify-probes 归 core-engine 域跨域消费，已过 execute 独立审查 |
| stages | src/stages/plan-postcheck.js | 逻辑变更（parseTaskContracts 归一+yamlError；feasibility 0b 硬校验） | 否——13 直测+邻接全绿 |
| core-engine | src/verify-probes.js | 接口变更（parseTaskAcceptance 三态契约；探针 7 fmError 渲染） | 否——63/0+13/13 |
| stages | test/taskcard-frontmatter-hardgate.test.mjs | 新增（直测套件） | 否 |
| stages | test/plan-adopt-waves.test.mjs | 逻辑变更（§4c 夹具 deps 去预引号，连带债） | 否——30/0 |

## 未匹配文件

骨架生成时点（map 补录前）的未匹配清单已消解；测试夹具为测试资产，按仓惯例不录模块 paths：

- `src/taskcard-frontmatter.js` → 已补录 stages paths（见更新结果）
- `src/stages/plan-postcheck.js` / `src/verify-probes.js` → 骨架生成时 map 快照滞后，实属 stages / core-engine 既有模块文件
- `test/fixtures/taskcard-bad-yaml/task-0{1,2,3}.md`、`test/acceptance-matrix-probe.test.mjs`、`test/cross-task-contracts.test.mjs` → 测试资产，不录模块 paths（lint 门只拦 src/）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | stages.paths 补录 src/taskcard-frontmatter.js（lint 门模块归属盲区拦截后补登；随 worktree 交付 3f854037） | done |
| `modules/stages.md` | 契约摘要补 frontmatter YAML 硬校验段（0b 语义/双报豁免/yamlError 降级键/单一解析源） | done |
| `modules/core-engine.md` | verify-probes 条目补探针 7 坏 YAML 区分（parseTaskAcceptance 三态契约/fmError 渲染） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
