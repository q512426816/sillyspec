# 平台 Scan 产物协议

SillySpec 平台执行模式的核心设计：**SillySpec 写产物，SillyHub 读产物**。平台不看 stdout，只靠文件系统判断 scan 成功、失败原因和证据文件位置。

## 状态枚举（src/constants.js）

所有平台产物共享同一套枚举值，SillyHub 直接使用常量，不猜字符串。

### SCAN_STATUS

| 值 | 说明 |
---|---|
| `pending` | scan 未开始 |
| `in_progress` | scan 进行中 |
| `success` | scan 成功，所有检查通过 |
| `completed_with_warnings` | scan 成功但有警告 |
| `failed_post_check` | scan 失败，post-check 不通过 |

### POINTER_STATUS

| 值 | 说明 |
---|---|
| `active` | 指针活跃，任务进行中 |
| `scan_completed` | scan 已完成 |
| `stale` | 指针过时（完成超过 24h，建议清理） |
| `corrupted` | 指针损坏（缺少必要字段） |

### CHECK_SEVERITY

| 值 | 说明 |
---|---|
| `failed` | 严重：阻止成功 |
| `warning` | 警告：不阻止成功 |
| `passed` | 通过 |

## 目录结构

```
<spec_root>/
├── manifest.json                          # 扫描元数据 + 产物索引
├── docs/<project>/scan/                    # 项目文档
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   ├── PROJECT.md
│   ├── STRUCTURE.md
│   └── ... (共 7 份：ARCHITECTURE/STRUCTURE/CONVENTIONS/INTEGRATIONS/TESTING/CONCERNS/PROJECT)
├── projects/*.yaml                         # 子项目注册
├── changes/<change-name>/                  # 变更目录
└── .runtime/
    ├── postcheck-result.json              # post-check 结构化结果（仅无 scan-run 标识的回落路径；正常平台链路写 scan-runs/，见下节）
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
  "scan_profile": { "mode": "quick | standard | deep", "reason": "..." },
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
| `scan_profile` | object \| null | scan profile：`{mode, reason}`，`mode` ∈ `quick`/`standard`/`deep`。`quick` 表示快速接入（仅 4 份核心文档，待 `--deep` 深度扫描覆盖补齐）；平台据此区分接入态 scan 与完整 scan |
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
| **清理** | 无自动清理。`sillyspec platform pointer` 查看状态，`sillyspec platform pointer --cleanup` 手动清理 |

### CLI 检查命令

```bash
# 查看指针状态
sillyspec platform pointer

# 清理过时/损坏指针
sillyspec platform pointer --cleanup
```

输出示例：
```
📄 指针文件: /path/to/source/.sillyspec-platform.json
   specRoot: /path/to/spec
   runtimeRoot: /path/to/runtime
   workspaceId: ws-xxx
   scanRunId: scan-2026-06-14-test-001
   savedAt: 2026-06-14T01:50:00.000Z
   状态: stale ⚠️
   completedAt: 2026-06-12T01:00:00.000Z
   scanStatus: success
   ⚠️ 指针已过时（完成超过 24h），可以安全删除。
```

状态判定逻辑：
- 缺少 `specRoot` → `corrupted`
- `status=scan_completed` 且 `completedAt` 超过 24h → `stale`
- `status=scan_completed` 且未超时 → `scan_completed` ✅
- 无 `status` 字段 → `active` 🔄

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

落点（HUB-04 对齐 `writeStructuredResult` 实际行为）：

- **平台模式带 scan-run 标识**（`--runtime-root` + `--scan-run-id`，正常平台链路）：`<runtime_root>/scan-runs/<scan_run_id>/postcheck-result.json`
- **平台模式缺 scan-run 标识**（仅 `--spec-root`）：回落 `<spec_root>/.runtime/postcheck-result.json`
- **本地模式**：`<cwd>/.sillyspec/.runtime/postcheck-result.json`

> manifest.json 的 `postcheck_result_path` 字段始终指向真实落盘路径，消费方优先信它而非按上表猜路径。

### 结构

与 `formatStructuredResult`（src/scan-postcheck.js）输出一致：

```json
{
  "schema_version": 1,
  "generated_at": "2026-08-20T00:00:00.000Z",
  "overall_status": "success | completed_with_warnings | failed_post_check",
  "workspace_id": "ws-xxx",
  "scan_run_id": "scan-2026-06-14-test-001",
  "source_root": "/path/to/source",
  "spec_root": "/path/to/spec",
  "runtime_root": "/path/to/runtime",
  "summary": { "total_checks": 8, "critical": 0, "error": 0, "warning": 2 },
  "failure_categories": {
    "violations": [], "missing_outputs": [], "path_pollution": [],
    "bad_references": [], "quality_warnings": []
  },
  "checks": [
    { "name": "source_root_docs_leak", "severity": "critical", "detail": "..." }
  ]
}
```

字段说明（HUB-03 对齐，防两端解析错位）：

- 顶层状态字段名是 **`overall_status`**（manifest.json 内嵌的 `scan_post_check.status` 是另一个名字——两处契约不同名是现状，消费方各自对齐，勿混用）。
- `checks[].severity` 枚举为 **`critical | error | warning`**：内部判定用的 `failed` 在结构化输出时统一重映射为 `critical`。
- 可选元字段（workspace_id / scan_run_id / 三个 root 路径）仅在调用方提供时出现。
- 不输出 `source_root_leak` / `docs_missing` / `profile` 顶层字段（早期草案字段，从未实现；profile 信息走 manifest.json 的 `scan_profile`）。

### check 类型

| check name | 输出 severity | 说明 |
|---|---|---|
| `source_root_docs_leak` | critical | docs 文档泄漏到 source_root/.sillyspec/docs/ |
| `source_root_leak` | critical | projects/workflows/knowledge/manifest/local 等泄漏到 source_root |
| `all_docs_missing` | critical | 必需 scan 文档全部缺失 |
| `partial_docs_missing` | critical | 部分 scan 文档缺失（quick profile 按 4 份核心清单） |
| `missing_docs` | warning | quick profile 下缺少非核心文档（3 份深度文档，待 deep 补齐） |
| `quick_profile_notice` | warning | 本次为 quick scan（仅 4 份核心文档）提示 |
| `docs_missing_header` | warning | 文档缺少 frontmatter |
| `local_config_invalid` | warning | local.yaml 中命令不存在 |
| `api_error_529` | warning | AI 输出中多次 API Error 529 |
| `rate_limit_exhausted` | warning | AI 输出中多次 rate_limit exhausted |
| `knowledge_index_missing` | warning | knowledge/INDEX.md 不存在 |
| `knowledge_broken_refs` | warning | INDEX.md 引用了不存在的文件 |
| `knowledge_dir_missing` | warning | knowledge/ 目录不存在 |
| `manifest_write_failed` | critical | manifest.json 写入失败，平台无法消费 scan 结果 |
| `project_list_parse_failed` | warning | Step 2 项目列表解析失败，回退注册列表 |

> 早期草案的 `tool_use_error` / `api_error` check 已移除/改名（对应现 `api_error_529` / `rate_limit_exhausted`）。

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

1. `manifest.json` → `scan_post_check.status` → 快速判断成功/失败（注意：是 `status`，非 postcheck-result.json 的 `overall_status`——两处契约字段名不同，见上）
2. `postcheck-result.json` → 完整检查明细 + failure_categories
3. `workflow-runs/*.json` → workflow 检查证据
4. `docs/<project>/scan/*.md` → 实际文档内容

### failure_categories

`postcheck-result.json` 中的 `failure_categories` 提供分类视图：

| 类别 | 包含的 check |
---|---|
| `path_pollution` | source_root_leak, source_root_docs_leak |
| `missing_outputs` | all_docs_missing, partial_docs_missing, missing_docs |
| `bad_references` | local_config_invalid |
| `quality_warnings` | tool_use_error, api_error_529, rate_limit_exhausted, fallback_or_skip |
| `violations` | manifest_write_failed, project_list_parse_failed + 所有 path_pollution |

SillyHub 可以按类别快速定位问题域，而不需要遍历所有 checks。

不需要解析 stdout。
