---
author: qinyi
created_at: 2026-09-20 13:56:11
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| plan 门禁（validateCrossTaskContracts） | 硬校验执行方：task 卡 frontmatter 非法 YAML 即 ERROR 阻断 |
| verify 探针 7（renderProbe7Lines） | 如实渲染方：区分坏 YAML 与真无 acceptance |
| task 卡作者（agent） | 数据方：手填 frontmatter 字段，坏值在 plan 门被定位到行:列 |

## 功能需求

### FR-01: 单一 frontmatter 解析源
Given task 卡内容（任意形态：无 frontmatter / 合法 / 非法 YAML）
When plan-postcheck 与 verify-probes 解析其 frontmatter
Then 两者消费同一实现（src/taskcard-frontmatter.js），提取与 jsYaml 解析行为一致（CRLF 容错）

### FR-02: plan 门禁硬校验（fail-closed）
Given task 卡 frontmatter 非法 YAML（jsYaml 抛错）
When validatePlanFeasibility 运行（plan 门单点拦截，D-001@v2——先于契约校验同 pass）
Then 返回 ok=false，errors 含 `frontmatter 非法 YAML（<file>:<行>:<列> <message>）`（行=js-yaml mark.line+2 文件 1 基，列=mark.column+1）；聚合 pass 中契约校验不再空真过门

### FR-03: 探针 7 如实文案
Given task 卡 frontmatter 非法 YAML
When 探针 7 构建+渲染
Then 输出 `- ⚠️ frontmatter 非法 YAML（...）` 行而非「卡无 acceptance——防御，plan-postcheck 已拦」；真无 acceptance 的合法卡仍渲染原防御行

### FR-04: 零回归
Given 合法 task 卡（有/无 provides、expects_from、acceptance 字段）
When 全链路（parseTaskContracts / validateCrossTaskContracts / parseTaskAcceptance / 探针 7）运行
Then 行为与现状一致（parseTaskContracts 仅 additive 新增 yamlError 键）

## 非功能需求
- 兼容性：Windows/Linux/macOS（CRLF 归一既在 splitFrontmatter 内处理）；parseTaskContracts 返回 additive 扩展；parseTaskAcceptance 契约变更收口于仓内唯一调用方+直测
- 防环：新模块除 js-yaml 零依赖（plan-postcheck↔worktree-apply 既有依赖边不可加重）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01/03/04 | 方案 A 主体（共享源+如实文案+零回归） |
| D-001@v2 | FR-02 | 硬校验落点 feasibility 入口（supersedes v1 落点条目） |
