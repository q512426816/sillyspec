---
author: t
created_at: 2026-11-27T08:05:00
---
# 需求规格（Requirements）— 2026-11-27-cli-roundtrip-merge

## 功能需求

### FR-01: --done 尾接下一步渲染
- completeStep 完成分支在 gate 全绿+落盘+sync 后**必须**尾接调 outputStep 渲染下一步；requiresWait 步**必须**不尾接；旧 run <stage> **必须**幂等兼容。

### FR-02: execute prompt 合并引导
- execute Wave prompt **必须**含「多次编辑合并一次 wt-commit」引导段。

### FR-03: watcher 事件密度减半
- 合并后每步**必须**只推一次事件；平台投影以进度库为准**不得**依赖事件频率。

## 非功能需求
- 零 schema 变更；零新增 CLI 命令面。

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR |
|---|---|
| D-001@v1 | FR-01 |
| D-002@v1 | FR-02 |
| D-003@v1 | FR-03 |

## 测试绑定
FR-01: test/cli-roundtrip-merge.test.mjs「--done 尾接段在场 + 幂等」
FR-02: test/cli-roundtrip-merge.test.mjs「execute prompt 含引导段」
FR-03: 不适用：行为观测面归平台侧 agent_run_logs，本地无断言面
