# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/knowledge-hits.js | 新增（hits.jsonl 事件流 append/read） | 否（41+36 断言覆盖） |
| core-engine | src/knowledge-classify.js | 新增（三通道寻址四步迁移） | 否（79 断言） |
| core-engine | src/knowledge-stats.js | 新增（命中矩阵聚合） | 否（36 断言） |
| stages | src/stages/knowledge.js | 逻辑变更（cmdKnowledge 注册 classify/stats，动态 import） | 否（路由 e2e 冒烟） |
| stages | src/stages/quick.js | 逻辑变更（step1 prompt 知识段来源说明） | 否（inject A/B 断言） |
| stages | src/stages/execute.js | 逻辑变更（Wave 知识段本地孪生注入） | 是→已审（ESM TDZ 偏差 execute 级审查记档） |
| runtime | src/run/prompt.js | 逻辑变更（report 升级正文注入 + quickFirstStep 注入） | 否（41 断言含字节 A/B） |
| runtime | src/run/complete-handlers.js | 逻辑变更（提议器+棘轮+抽审渲染） | 是→已审（preflight 31/31 敏感断言过） |
| 测试 | test/knowledge-{classify,inject,baseline,stats}.test.mjs | 新增（4 文件 189 断言） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- 无（骨架生成时点的 12 项未匹配系当时 map 尚未收录三新文件所致；execute 期 task-02/05 已补录 core-engine paths，现全部命中。验证期另有 7 个 .sillyspec/knowledge/ 数据面文件被 18 条迁移真实修改——知识库运行数据非代码模块，不参与模块归属，随归档提交）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | core-engine paths 补录 knowledge-hits/classify/stats 三文件（task-02/05 卡内执行，W1 实证 lint 覆盖门禁） | done |
| `modules/stages.md` | knowledge 子命令族七项 + 知识闭环注入段现状更新（task-05） | done |
| `modules/runtime.md` | 注入/提议器/棘轮/hits 事件流契约摘要 bullet（task-05） | done |
| `stages.changelog.md` / `runtime.changelog.md` | 变更索引条目各一行（task-05） | done |
| `knowledge/{INDEX,conventions,patterns,known-issues,uncategorized,decisions/*}.md` | verify 期 18 条存量条目 classify 迁移（AC-4 实证，uncategorized 清零） | done（随归档提交） |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
