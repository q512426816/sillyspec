# 平台 Scan 产物协议

SillySpec 平台执行模式的核心设计：**SillySpec 写产物，SillyHub 读产物**。平台不看 stdout，只靠文件系统判断 scan 成功、失败原因和证据文件位置。

## 目录结构

```
<spec_root>/
├── manifest.json                          # 扫描元数据 + 产物索引
├── docs/<project>/scan/                    # 项目文档
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   ├── PROJECT.md
│   ├── STACK.md
│   ├── STRUCTURE.md
│   └── ... (7 份必需文档)
├── projects/*.yaml                         # 子项目注册
├── changes/<change-name>/                  # 变更目录
└── .runtime/
    ├── postcheck-result.json              # post-check 结构化结果
    └── platform-scan.json                  # 平台参数持久化（主文件）

<runtime_root>/
└── scan-runs/<scan_run_id>/
    └── workflow-runs/
        └── <timestamp>-<workflow>-<project>-<status>.json  # workflow 检查结果

<source_root>/
├── .sillyspec-platform.json               # 平台参数恢复指针（轻量，不在 .sillyspec 内）
└── (源码，禁止 .sillyspec/ 污染)
```

## manifest.json

scan 完成后写入 `<spec_root>/manifest.json`，是 SillyHub 判断 scan 结果的入口文件。

### 结构

```json
{
  "workspace_id": "ws-xxx",
  "scan_run_id": "scan-2026-06-14-test-001",
  "source_root": "/path/to/source",
  "spec_root": "/path/to/spec",
  "runtime_root": "/path/to/runtime",
  "source_commit": "abc123...",
  "source_commit_error": null,
  "generated_at": "2026-06-14T01:50:00.000Z",
  "schema_version": 1,
  "postcheck_result_path": "<spec_root>/.runtime/postcheck-result.json",
  "workflow_runs_dir": "<runtime_root>/scan-runs/<scan_run_id>/workflow-runs",
  "platform_pointer_path": "<source_root>/.sillyspec-platform.json",
  "platform_pointer_status": "active",
  "scan_post_check": {
    "status": "success | completed_with_warnings | failed_post_check",
    "checks": [...]
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `workspace_id` | string \| null | SillyHub workspace 标识 |
| `scan_run_id` | string \| null | 本次 scan 唯一标识 |
| `source_root` | string | 源码目录绝对路径 |
| `spec_root` | string \| null | 规范目录（specDir） |
| `runtime_root` | string \| null | 运行时产物目录 |
| `source_commit` | string \| null | 源码 HEAD commit hash |
| `source_commit_error` | string \| undefined | commit 获取失败原因 |
| `generated_at` | string (ISO 8601) | manifest 生成时间 |
| `schema_version` | number | 产物协议版本，当前为 1 |
| `postcheck_result_path` | string \| null | post-check 结构化结果路径 |
| `workflow_runs_dir` | string \| null | workflow 检查结果目录 |
| `platform_pointer_path` | string | 平台指针文件路径 |
| `platform_pointer_status` | string | 初始 `active`，由指针文件独立更新 |
| `scan_post_check` | object \| undefined | post-check 结果（写入后追加） |

### 判断 scan 结果

SillyHub 消费 manifest 的方式：

1. 读取 `<spec_root>/manifest.json`
2. 检查 `scan_post_check.status`：
   - `success` → scan 成功
   - `completed_with_warnings` → scan 成功但有警告
   - `failed_post_check` → scan 失败
3. 如果失败，读 `scan_post_check.checks` 获取具体失败项
4. 读 `postcheck_result_path` 获取完整结构化结果
5. 读 `workflow_runs_dir` 获取 workflow 检查证据

## .sillyspec-platform.json

跨 `--done` 生命周期的轻量指针文件，存储在 `<source_root>/.sillyspec-platform.json`（不在 `.sillyspec/` 内，不污染源码结构）。

### 生命周期

| 阶段 | 行为 |
|---|---|
| **创建** | `run scan --spec-root` 时，写入 cwd 根目录 |
| **读取** | 每次 `run`/`--done`/`--skip` 时，优先从 pointer 恢复平台参数 |
| **更新** | 每次 `run` 时刷新 `savedAt` |
| **完成标记** | scan post-check 后追加 `status=scan_completed` + `completedAt` + `scanStatus` |
| **异常检测** | pointer 存在但缺 `specRoot` 时报错退出 |
| **清理** | 当前无自动清理，由 SillyHub 或用户手动管理 |

### 结构

```json
{
  "specRoot": "/path/to/spec",
  "runtimeRoot": "/path/to/runtime",
  "workspaceId": "ws-xxx",
  "scanRunId": "scan-2026-06-14-test-001",
  "savedAt": "2026-06-14T01:50:00.000Z"
}
```

scan 完成后追加：

```json
{
  "status": "scan_completed",
  "completedAt": "2026-06-14T01:52:00.000Z",
  "scanStatus": "success"
}
```

## postcheck-result.json

写入 `<spec_root>/.runtime/postcheck-result.json`（平台模式）或 `<cwd>/.sillyspec/.runtime/postcheck-result.json`（本地模式）。

### 结构

```json
{
  "workspace_id": "ws-xxx",
  "scan_run_id": "scan-2026-06-14-test-001",
  "status": "success | completed_with_warnings | failed_post_check",
  "source_root": "/path/to/source",
  "spec_root": "/path/to/spec",
  "runtime_root": "/path/to/runtime",
  "checks": [
    {
      "name": "source_root_docs_leak",
      "severity": "failed | warning",
      "detail": "..."
    }
  ],
  "source_root_leak": true,
  "docs_missing": ["ARCHITECTURE.md"],
  "profile": {
    "mode": "quick | standard | deep",
    "file_count": 10,
    "source_bytes": 102400,
    "project_count": 1,
    "reason": "..."
  }
}
```

### check 类型

| check name | severity | 说明 |
|---|---|---|
| `source_root_docs_leak` | failed | docs 文档泄漏到 source_root |
| `source_root_leak` | failed | projects/workflows/knowledge/manifest/local 泄漏到 source_root |
| `all_docs_missing` | failed | 7 份必需文档全部缺失 |
| `partial_docs_missing` | failed | 部分文档缺失 |
| `docs_missing_header` | warning | 文档缺少 frontmatter |
| `local_config_invalid` | warning | local.yaml 中命令不存在 |
| `tool_use_error` | warning | AI 执行工具调用错误 |
| `api_error` | warning | API 错误（529/429/超时） |

## workflow-runs

写入 `<runtime_root>/scan-runs/<scan_run_id>/workflow-runs/`（平台模式）或 `<cwd>/.sillyspec/.runtime/workflow-runs/`（本地模式）。

每个文件命名：`<timestamp>-<workflow>-<project>-<status>.json`

### 结构

```json
{
  "run_id": "20260614015000-scan-docs-test-project-pass",
  "created_at": "2026-06-14T01:50:00.000Z",
  "source": "run.js",
  "stage": "scan",
  "step": "深度扫描",
  "workflow": "scan-docs",
  "project": "test-project",
  "status": "pass | fail",
  "spec_version": 1,
  "roles": [...],
  "workflow_checks": [...],
  "failures": [...],
  "retry_prompts": [...]
}
```

## source_root 零污染

平台模式的核心约束：source_root 下不产生 `.sillyspec/` 目录。

post-check 会检查以下路径是否存在泄漏：
- `<source_root>/.sillyspec/docs/` — 文档泄漏
- `<source_root>/.sillyspec/projects/` — 项目注册泄漏
- `<source_root>/.sillyspec/workflows/` — 工作流泄漏
- `<source_root>/.sillyspec/knowledge/` — 术语泄漏
- `<source_root>/.sillyspec/manifest.json` — manifest 泄漏
- `<source_root>/.sillyspec/local.yaml` — 配置泄漏

## 产物消费优先级

SillyHub 判断 scan 结果的推荐顺序：

1. `manifest.json` → `scan_post_check.status` → 快速判断成功/失败
2. `postcheck-result.json` → 完整检查明细
3. `workflow-runs/*.json` → workflow 检查证据
4. `docs/<project>/scan/*.md` → 实际文档内容

不需要解析 stdout。
