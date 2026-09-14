---
author: qinyi
created_at: 2026-09-14 12:45:00
---
# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> 影响类型与 review 标记是语义判断，以 git diff 为准（真实 > 声明）。
> 注：骨架生成于 _module-map.yaml 注册 src/quick-gate-profile.js 之前（Wave1 主代理已补注册），故初版全列未匹配；本表按注册后图谱人工回填。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/quick-gate-profile.js（新增）、src/change-risk-profile.js、src/scope-audit.js、test/quick-gate-profile.test.mjs（新增）、test/scope-audit.test.mjs | 新增（信号纯函数+矩阵单测）；接口变更（QUICK_RISK_PATH_PATTERNS 数据表导出、computeChangeScopeAudit 增 gateProfile 增量字段、renderScopeAuditTable 增 [gate] 段） | 是（task-01/03 review pass + execute acceptance review pass） |
| runtime | src/run/shared.js、src/run/complete-handlers.js、src/run/command.js、src/run/complete.js、src/run/quick-audit.js、test/audit-quick-completion.test.mjs | 逻辑变更（audit 链挂画像 fail-open、[gate] 落账/打印、--no-docs flag 链三跳透传）；advisory 语义不改 status | 是（task-02 review pass + acceptance review pass） |
| cli-entry | src/index.js | 逻辑变更（scope-audit 命令分支双出口注释与透出，零分支增量） | 否（spread 透出，acceptance review pass） |
| setup（规则面文档） | AGENTS.md、templates/agents-instruction.md | 配置变更（选道判据语义化+模板镜像） | 否（task-04 review pass） |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期还是真的游离文件：

- `src/config-schema.js`（setup paths 命中）、`.sillyspec/local.yaml.example`（配置示例，setup 域伴生）：setup 模块（paths 含 src/config-schema.js）——骨架生成时点旧图谱误列；现按注册后图谱归 setup（quick-gate 段四键登记，D-009）。已确认非游离。
- `test/audit-quick-completion.test.mjs`、`test/scope-audit.test.mjs`：测试文件历来不入 map paths（仓惯例），随各自源文件模块走，不触发 modules rebuild。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | core-engine paths 追加 src/quick-gate-profile.js（Wave1 主代理两侧落盘，task-06 核对在位） | done |
| `.sillyspec/docs/sillyspec/modules/core-engine.md` | task-06：quick-gate-profile 接口小节+QUICK_RISK_PATH_PATTERNS+scope-audit gateProfile/pickModuleMapProject+THRESHOLDS 定稿值 | done |
| `.sillyspec/docs/sillyspec/modules/runtime.md` | task-06：run/ 四接线点条目（挂载/落账/打印/flag 链，D-005/D-009 要点） | done |
| `.sillyspec/docs/sillyspec/modules/cli-entry.md` | task-06：scope-audit 命令双出口条目 | done |
| `.sillyspec/docs/sillyspec/modules/setup.md` | AGENTS.md/templates 选道规则改写未登记 setup 卡 | skipped（setup 卡 paths 仅源文件，规则面文档按惯例不逐条入卡；AGENTS.md 本身即规则载体） |
