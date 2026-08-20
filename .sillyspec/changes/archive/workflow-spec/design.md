---
author: qinyi
created_at: 2026-06-03T09:20:00+08:00
doc_type: design
---

# Workflow Spec 设计文档

## 背景

### 现状

scan/brainstorm/archive 阶段内的子代理调度逻辑全靠 prompt 描述（"你必须使用子代理并行，不要自己写"），存在三个问题：

1. **无结构化定义**：子代理数量、职责、输入输出全靠主 agent 理解 prompt
2. **无状态检查**：子代理报告"完成"但文件可能未落盘（实测 2/4 失败率）
3. **失败定位模糊**：主 agent 只知道"缺文件"，不知道哪个角色失败、为什么失败

### 外部信号

Anthropic 推出 Claude Code Dynamic Workflows（JS 编排脚本 + 后台执行 + subagent 调度），验证了"控制流从对话上下文剥离"的方向。但它是 Claude Code 内部能力，acceptEdits 模式下文件编辑自动批准，与 SillySpec 的 patch→confirm→write 原则冲突。

详见 CLAUDE.md 中关于 Dynamic Workflows 的分析记录。

## 定位

### 核心定义

Workflow 是**阶段内任务的结构化执行协议**，不是新阶段。

```
Stage 负责生命周期顺序（scan → brainstorm → plan → execute → verify → archive）
Workflow 负责阶段内任务的结构化执行
Executor 负责具体怎么执行角色任务
Check 负责判断产物是否真的完成
```

### Workflow 的核心价值

不是并行，不是多 Agent，而是：

**把"口头完成"变成"可验证完成"。**

具体来说：
- 定义每个角色的输入、输出、约束
- 自动检查产物是否真正落盘且符合要求
- 失败时精确到角色级别，附带失败证据
- 重试时携带失败上下文，不重复成功角色

## ADR（架构决策记录）

### ADR-01：Workflow 是阶段内执行协议，不是新阶段

Workflow 不参与 Stage 生命周期，不替代 scan/brainstorm 等阶段。它是一个 Stage 内部可引用的执行模板。

理由：如果 Workflow 变成独立阶段，会打破现有的"阶段状态机"语义，增加生命周期复杂度。

### ADR-02：Workflow Spec 归 SillySpec 所有，不绑定 Claude Dynamic Workflows

Workflow 文件放在 `.sillyspec/workflows/` 下，是 SillySpec 自己的 YAML 规范，不是 Claude 的 `.claude/workflows/` JS 文件。

理由：
- 保持工具中立性（Claude / Codex / Cursor / GLM / 通义灵码均可复用）
- 避免 research preview 行为变更导致 SillySpec 不可用
- 权限、Git identity、confirm/write 机制由 SillySpec 控制

### ADR-03：第一版以产物校验为核心，不承诺直接调度 subagent

第一版只做 workflow spec 定义 + 产物自动检查 + 失败项重试提示。不实现 SillySpec runtime 直接启动子代理。

理由：当前 run.js 没有真正的 agent runtime 控制权，强行做代码调度会引入架构风险。先验证"定义 + 检查"模式的价值。

### ADR-04：完成状态由检查器判定，不由 agent 自述判定

子代理说"完成"不等于完成。必须由代码检查器验证：
- 文件是否存在
- 文件是否非空
- 文件是否包含必要章节

理由：实测子代理 2/4 报告完成但文件未落盘，agent 自述不可靠。

### ADR-05：执行层采用渐进式能力等级

| 等级 | 能力 | 改动范围 |
|------|------|----------|
| Level 0 | 只生成 workflow prompt，由主 agent 执行 | scan.js prompt |
| Level 1 | 代码执行 post_check，主 agent 仍负责调度 | run.js + 检查器 |
| Level 2 | 代码生成 role prompts，并要求主 agent 分别执行 | run.js + prompt 生成 |
| Level 3 | SillySpec runtime 直接调用 agent CLI / SDK 执行 role | 新增 executor 模块 |
| Level 4 | 适配 Claude Dynamic Workflow / Codex / 自研 executor | adapter 层 |

第一版目标是 Level 1，不承诺 Level 3。

## Workflow 文件格式

### 存放位置

```
.sillyspec/workflows/
  scan-docs.yaml
  archive-impact.yaml
  regression-check.yaml
```

### Schema 定义

```yaml
# .sillyspec/workflows/scan-docs.yaml
name: scan-docs
description: 并行生成 7 份扫描文档
version: 1

# 全局输入
inputs:
  - name: project_dir
    type: path
    required: true
  - name: env_summary
    type: text
    required: false

# 角色
roles:
  - id: arch
    name: "技术架构"
    task: "生成 ARCHITECTURE.md"
    inputs:
      paths:
        - "src/*.js"
        - "package.json"
      hints:
        grep_patterns: ["class ", "export ", "import ", "schema", "CREATE TABLE"]
    outputs:
      - name: architecture_doc
        path: ".sillyspec/docs/{project}/scan/ARCHITECTURE.md"
        required: true
        checks:
          - type: file_exists
          - type: min_lines
            min: 20
          - type: contains_sections
            sections: ["技术栈", "架构概览", "数据模型"]
    constraints:
      - "禁止读源码全文，只 grep"
      - "Schema 只记表名+说明+字段数"

  - id: conventions
    name: "代码约定"
    task: "生成 CONVENTIONS.md"
    inputs:
      paths: ["src/"]
      hints:
        grep_patterns: ["function ", "const ", "async ", "try ", "catch "]
    outputs:
      - name: conventions_doc
        path: ".sillyspec/docs/{project}/scan/CONVENTIONS.md"
        required: true
        checks:
          - type: file_exists
          - type: min_lines
            min: 15

  - id: structure
    name: "目录结构 + 外部集成"
    task: "生成 STRUCTURE.md 和 INTEGRATIONS.md"
    inputs:
      paths: ["./"]
      hints:
        grep_patterns: ["fetch", "http", "WebSocket", "ws", "chokidar"]
    outputs:
      - name: structure_doc
        path: ".sillyspec/docs/{project}/scan/STRUCTURE.md"
        required: true
      - name: integrations_doc
        path: ".sillyspec/docs/{project}/scan/INTEGRATIONS.md"
        required: true

  - id: quality
    name: "测试+债务+概览"
    task: "生成 TESTING.md、CONCERNS.md、PROJECT.md"
    inputs:
      paths: ["src/", "packages/"]
      hints:
        grep_patterns: ["TODO", "FIXME", "deprecated", "test", "describe"]
    outputs:
      - name: testing_doc
        path: ".sillyspec/docs/{project}/scan/TESTING.md"
        required: true
      - name: concerns_doc
        path: ".sillyspec/docs/{project}/scan/CONCERNS.md"
        required: true
      - name: project_doc
        path: ".sillyspec/docs/{project}/scan/PROJECT.md"
        required: true

# 编排规则
orchestration:
  mode: parallel          # parallel | sequential | fan-out-fan-in
  max_concurrent: 4
  timeout_per_role: 120

# 检查机制
checks:
  role_level:
    - type: file_exists
      source: role.outputs
    - type: min_lines
      min: 10
    - type: no_empty_files
  workflow_level:
    - type: file_count
      path: ".sillyspec/docs/{project}/scan/"
      pattern: "*.md"
      min: 7
    - type: no_duplicates

# 重试策略
retry:
  max_attempts: 1
  include_failure_context: true
  retry_scope: failed_role_only
  # 重试 prompt 自动携带：
  # - 失败角色 ID
  # - 失败原因（文件不存在 / 文件为空 / 缺少章节）
  # - 目标路径

# 检查失败策略
on_check_failure: prompt_retry  # prompt_retry | abort | manual_review

# 权限控制
permissions:
  write_mode: direct       # direct | patch_only | readonly
  write_scope:
    - ".sillyspec/docs/{project}/scan/"
  allow_shell: true        # grep/find/ls
  allow_network: false
  allow_git: false

# 全局产出
outputs:
  - name: scan_documents
    type: file_list
    path: ".sillyspec/docs/{project}/scan/"
    min_files: 7
```

### Schema 设计要点

1. **扫描实现细节不进角色顶层**：`grep_patterns` 放在 `inputs.hints` 里，不是 workflow 顶层语义。到了 archive 场景，hints 变成 `commands: [git diff --name-only]`。

2. **输出分两级**：每个 role 有自己的 outputs + checks，全局 outputs 只做聚合验收。哪个 role 没落盘，一眼定位到 role id。

3. **检查分两级**：role_level 检查单个角色产物，workflow_level 检查全局一致性。

4. **重试只重失败角色**：不重跑成功的子任务，避免覆盖风险。重试 prompt 自动携带失败证据。

5. **write_mode 三种模式**：
   - `direct`：可直接写文件（适合 scan 文档生成）
   - `patch_only`：只允许生成 patch（适合 archive）
   - `readonly`：只读分析（适合 doctor / verify）

## 落地节奏

### Phase 0：workflow schema + post_check runner ✅ IMPLEMENTED

**改动范围**：run.js + 新增 workflow 模块

**已实现**：
1. ✅ workflow YAML schema（`.sillyspec/workflows/*.yaml`）
2. ✅ scan step 5 后 run.js 自动 post_check
3. ✅ 检查失败 → 明确报告（结构化 result：workflow/status/roles/failures/retry_prompts）
4. ✅ CLI `sillyspec workflow check <name> --project <p> [--json] [--save]`
5. ✅ exit code 语义：0=pass, 1=check fail, 2=param/schema error


### Phase 1：role-level checks + failed role retry prompt ✅ IMPLEMENTED

- ✅ 按 role id 汇总检查结果（结构化 roles[].outputs[].checks）
- ✅ 自动生成 retry_prompts（内建在 result 对象中）
- ✅ `generateRetryPrompt()` deprecated，直接用 `result.retry_prompts`

### Phase 2：scan step 5 引用 workflow spec ✅ IMPLEMENTED

- ✅ scan 阶段按项目展开步骤，每步引用 workflow spec
- ✅ post_check 在 scan 完成后自动检查所有项目

### Phase 3：run.js 代码调度 role ✅ IMPLEMENTED

- ✅ `generateRolePrompt()` 根据 role 定义生成子代理 prompt
- ✅ `generateAllRolePrompts()` 批量生成
- ✅ depends_on 依赖输出自动注入 prompt
- Level 2 能力已实现

### Phase 4：archive impact extraction workflow ✅ IMPLEMENTED

- ✅ `archive-impact.yaml` 已定义（impact-analyzer + doc-syncer）
- ✅ write_mode: patch_only
- ✅ depends_on 显式声明依赖
- ✅ 真实 git diff 验证通过（PASS）

### Phase 5：executor adapter（远期）

- 抽象 executor 接口
- Level 3/4 适配器
- 不做承诺时间表

## 不做什么

1. **不绑定 Claude Code** — workflow spec 是 SillySpec 自己的 YAML
2. **不替代 stage** — stage 管整体流程，workflow 管阶段内并行执行
3. **不做通用 DAG** — 先只支持 parallel 和 sequential
4. **不着急接 Claude Dynamic Workflow adapter** — 先验证 SillySpec 自己的检查+重试模式
5. **不实现 Level 3 executor** — 不承诺 agent runtime
6. **不做 UI**
7. **不改 workflow schema** — 当前 schema 已验证稳定
