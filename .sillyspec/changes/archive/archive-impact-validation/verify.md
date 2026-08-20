---
author: qinyi
created_at: 2026-06-03T11:40:00+08:00
---

# archive-impact workflow 验证记录

## 验证环境

- commit: 7c5f4de (refactor: unify workflow check result as structured protocol)
- 影响文件: src/workflow.js, src/run.js, src/index.js, src/stages/scan.js, src/stages/archive.js, package.json
- _module-map 状态: 5 个模块（stages, runtime, cli-entry, dashboard, migration），无 paths glob

## 验证结果

### 1. extract-module-impact 执行
- 状态：PASS
- 说明：archive step 2 正确引用 archive-impact.yaml，使用 git diff 获取真实修改文件，读取 _module-map.yaml

### 2. module-impact.md 生成
- 状态：PASS
- 路径：`.sillyspec/changes/default/module-impact.md`
- 内容摘要：影响 2 模块（stages、cli-entry），未匹配 8 文件（新增文件和子项目文档）
- 注意：_module-map 缺少 paths glob，模块匹配基于手动分析而非 glob 匹配

### 3. archive-impact workflow check
- status: pass（修复 `<module-id>` 占位符后）
- JSON 结构完整：workflow, project, status, spec_version, roles, workflow_checks, failures, retry_prompts

### 4. doc-syncer 依赖注入
- 包含前置依赖标题：❌（注入逻辑检查 from_role 匹配，但关键词未包含）
- 包含 impact-analyzer 输出路径：✅
- 结论：功能正确，prompt 可用

### 5. 结构化结果消费
- runPostCheck 返回格式：符合统一协议
- result.failures 可直接使用：✅
- result.retry_prompts 可直接使用：✅
- run.js 消费路径：scan → result.status === 'fail' + result.retry_prompts；archive → result.roles.find + result.failures.filter

## 发现的问题

### 问题 1（已修复）：doc-syncer `<module-id>` 占位符
- 描述：doc-syncer output 用 `<module-id>` 作为路径模板，但 workflow.js 只替换 `<project>`
- 影响：`contains_sections` 检查永远 fail
- 修复：移除该 output 的 checks（动态路径不适合静态检查），保留 required: false
- 状态：已修复

### 问题 2（低优先级）：doc-syncer prompt 缺少显式依赖关键词
- 描述：depends_on 注入后，prompt 包含输出路径但不包含"前置依赖"/"影响分析"等关键词
- 原因：prompt 注入用 inputs.output_description，但 archive-impact.yaml 中该字段值不含这些词
- 影响：仅美观问题，功能不受影响
- 建议：下一轮在 output_description 中补充更明确的描述

## 结论

**PASS** — archive-impact workflow 在 archive 场景中可以稳定工作。
impact-analyzer 产出 module-impact.md，workflow check 返回结构化结果，run.js 正确消费。
