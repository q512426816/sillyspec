---
author: qinyi
created_at: 2026-06-03T10:50:00+08:00
updated_at: 2026-06-03T12:30:00+08:00
---

# Workflow 引擎模块文档

## 模块信息

| 属性 | 值 |
|------|-----|
| 模块 ID | workflow |
| 文件 | src/workflow.js |
| 行数 | ~650 |
| 依赖 | js-yaml（YAML 解析） |

## 定位

Workflow 引擎是 SillySpec 阶段内任务的结构化执行协议层。

**负责什么**：
- 加载 `.sillyspec/workflows/*.yaml` 定义文件
- 校验 workflow YAML 结构（depends_on 存在性、循环、from_role 一致性）
- 运行 post_check 验证产物（按角色、按全局两级检查），返回结构化结果对象
- 将结构化结果归档到 `.sillyspec/.runtime/workflow-runs/`
- 按角色定位失败，生成带失败证据的重试 prompt
- 根据 role 定义生成子代理 prompt（Level 2），自动注入 depends_on 依赖输出

**不负责什么**：
- 不直接启动子代理/agent 进程（那是 executor adapter 的职责）
- 不管理阶段生命周期（那是 run.js / ProgressManager 的职责）
- 不定义 workflow YAML 内容（那是具体 workflow 文件的职责）
- 不做 DAG 拓扑排序或并行调度

## 完整链路

```
workflow spec 定义（YAML）
  → loadWorkflow() + validateWorkflow()
    → runPostCheck() 执行检查
      → 结构化 result 对象
        → index.js 展示（--json / 人类可读）
        → run.js 消费（failures / retry_prompts）
          → saveWorkflowRun() 归档到 .runtime/workflow-runs/
```

## 契约摘要

### 加载 + 校验

```js
loadWorkflow(cwd, name, validate?) → object|null
// validate=true 时自动校验，失败返回 { _validationErrors: [...], ...wf }
validateWorkflow(wf) → string[]
listWorkflows(cwd) → string[]
```

### 校验规则

- `depends_on` 引用的 role id 必须存在
- `depends_on` 不能形成循环（A→B→A）
- `inputs.from_role` 必须存在且已声明在 `depends_on` 中
- `inputs.output` 必须在源 role 的 outputs 中存在

### 结构化检查结果

```js
runPostCheck(wf, cwd, projectName, placeholders?) → {
  workflow: string,          // workflow 名称
  project: string,           // 项目名
  status: 'pass'|'fail',    // 总体状态
  spec_version: number,      // spec 版本
  roles: [{
    id: string,
    name: string,
    status: 'pass'|'fail',
    outputs: [{
      path: string,
      status: 'pass'|'fail',
      checks: [{ type: string, status: 'pass'|'fail', detail: string }]
    }]
  }],
  workflow_checks: [{ type: string, status: 'pass'|'fail', detail: string }],
  failures: [{ level: 'role'|'workflow', role_id?, output?, check: string, message: string }],
  retry_prompts: [{ role_id: string, role_name: string, prompt: string }]
}
```

### 报告格式化

```js
formatCheckReport(result) → string   // 从结构化结果生成人类可读报告
```

### 重试（deprecated，保留兼容）

```js
generateRetryPrompt(wf, checkResult, projectName) → string
// @deprecated 直接用 runPostCheck 返回的 retry_prompts
```

### 结果归档

```js
saveWorkflowRun(result, options?) → string|null
// options: { cwd, source, stage?, step? }
// 保存到 .sillyspec/.runtime/workflow-runs/<timestamp>-<workflow>-<project>-<status>.json
// 保存失败返回 null，只输出 warning 不影响 check 结果
```

写入侧滚动回收（2026-09-08 ql-20260908-007）：`saveWorkflowRun` 落盘后调 `runtime-hygiene.js pruneTimestampedEntries({ dir: runDir, keep: 30 })` 裁旧归档——workflow run 无 change 归属语义、无生命周期事件可挂，只有时间价值，写入侧保留最新 30 份是唯一合适量身工具（文件名零填充时间戳开头，name 字典序==时间序；`SILLYSPEC_RUNTIME_KEEP` 可覆盖）。变更归属类证据不走此路，分野见 file-lifecycle/storage-and-state.md。

### Prompt 生成

```js
generateRolePrompt(wf, roleId, projectName, context?) → string|null
// 自动注入 depends_on 角色的输出路径和描述
generateAllRolePrompts(wf, projectName, context?) → Array<{roleId, roleName, prompt}>
```

## CLI 用法

```bash
# 列出 workflow
sillyspec workflow list

# 检查（人类可读）
sillyspec workflow check scan-docs --project dashboard

# 检查（JSON 输出，给 AI 程序化读取）
sillyspec workflow check scan-docs --project dashboard --json

# 检查 + 归档到 runtime
sillyspec workflow check scan-docs --project dashboard --save

# 检查 + JSON + 归档（stdout 纯净）
sillyspec workflow check scan-docs --project dashboard --json --save

# exit code: 0=pass, 1=check fail, 2=param/schema error
```

## 检查类型

| 类型 | 参数 | 说明 |
|------|------|------|
| file_exists | — | 文件是否存在 |
| min_lines | min: number | 文件最小行数 |
| no_empty_files | — | 文件非空 |
| contains_sections | sections: string[] | 必须包含的 ## 章节 |
| no_placeholder | patterns?: string[] | 过滤独立成行的 AI 水文（"待补充"/"TODO"/"TBD"等），行内引用不触发 |

## 关键逻辑

```
workflow YAML → 替换 <project>/<change-name> 占位符
  → validateWorkflow() 校验结构
    → 按 role 遍历 outputs
      → 按 check 类型执行验证
        → 汇总 role 级 + workflow 级结果
          → 生成 retry_prompts（内建，不再需要单独调用）
            → 输出结构化结果
              → 归档到 .runtime/workflow-runs/
```

## 注意事项

- `replaceProjectPlaceholder` 用 JSON 序列化做全局替换，性能对当前规模无影响
- retry_prompts 由 `_checkWorkflow` 自动生成，`generateRetryPrompt` 标记为 deprecated
- 占位符只替换 `<project>`（`runPostCheck` 自动）和 `<change-name>`（需调用方手动替换）
- `depends_on` 校验是两层循环检测，不做完整 DAG 拓扑排序
- `no_placeholder` 只匹配独立成行的占位文本，避免误伤文档中行内引用的 TODO/FIXME
- `inputs` 支持两种格式：mapping（推荐，含 from_role）和数组（兼容旧版）
- `.sillyspec/.runtime/` 已在 .gitignore，runtime 文件不进 git
- CLI `--save` 默认关闭，run.js 在 scan/archive post_check 后自动保存
- 保存失败只输出 warning，不影响 workflow check 的 exit code
- execute 阶段创建 worktree 时自动 overlay 主工作区 dirty baseline 并创建 baseline checkpoint
  - 无 dirty baseline 时 baselineCommit = null（正常行为，不是异常）
  - 子代理产物从 baselineCommit 计算 task diff，merge 只合 task diff
  - merge 前校验主工作区 baseline hash 未变化，防止 execute 期间主工作区被修改
  - 详见 `worktree.md` 模块文档

## 已知约束

- 不做 Level 3 executor（直接启动子代理进程）
- 不做 DAG 并行调度（只有 sequential）
- 不做 workflow run 历史查询命令（查询命令待后续实现）
- 不做 run diff 对比

## 人工备注

<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
