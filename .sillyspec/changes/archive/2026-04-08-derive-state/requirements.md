# deriveState 状态推导 — 需求

author: qinyi
created_at: 2026-04-08 07:11:00

## 功能需求

### FR1: deriveState 核心函数
- 从 artifacts 目录扫描文件，解析 `{stage}-step{N}-{timestamp}.txt` 格式
- 与 progress.json 步骤状态对比
- 返回 issues 列表和修复计数

### FR2: 轻量模式（light）
- 只检查 currentStage 的当前步骤和前一步
- 用于 `--done` 完成时

### FR3: 全量模式（full）
- 检查所有阶段所有步骤
- 用于 doctor 和 validate --deep

### FR4: 安全修复策略
- artifacts 有但 progress 漏记 → 自动修复为 done
- artifacts 有 step5 但 progress 只到 step3 → 自动补齐
- progress 有但 artifacts 无 → 只警告，不修复

### FR5: CLI 集成
- `--done` 时静默调用轻量校验，有修复才输出
- `doctor` 第一步输出全量报告
- `sillyspec progress validate --deep` 手动触发

## 非功能需求
- 零外部依赖（仅 fs/path）
- 纯函数，易于测试
- 不改变现有 API 行为
