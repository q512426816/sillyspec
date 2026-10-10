---
author: flow-machine-draft
created_at: 2026-10-10T01:27:30.829Z
---
# 提案书（Proposal）— 2026-10-10-cli-uninit-cwd-gate

## 动机

任务原话转写：agent 在未初始化/错误目录跑非 init 命令是 fail-soft 散点报错且不说正确 cwd（实测：status 提示可开变更、flow start 到 local.yaml 才报错、knowledge 只报参数错）；另有约 10 个命令用裸 join(cwd,'.sillyspec') 解析，子目录误跑路径漂移（task/module-impact/endpoints/symbol-impact/design-init/fourpiece-init/prefill-refresh/plan-adopt-waves/delta）。

成功标准：
- CLI 入口统一硬拦：非豁免命令在祖先链+平台指针+--spec-dir 均未命中 .sillyspec 的目录运行 → exit 2，文案含当前目录、git root（如有）、三条修复指引（cd 回项目根 / 先 init / --spec-dir 显式指定）
- 豁免命令（init/scan/doctor/status/progress/next/workspace/setup/knowledge/local/config/mcp/dashboard/platform/wt-commit/agent-log——按设计可在未初始化目录运行或有自身 fail-closed）行为不变
- 子目录命中祖先链 → 放行且 dir 重锚定 spec 根：裸 join(dir,'.sillyspec') 调用点（如 task）子目录运行与根目录行为一致
- 平台模式（pointer/接管声明/--workspace-id/--runtime-root）与 --spec-dir 显式不受影响
- 新增测试覆盖以上各面，相关回归全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. CLI 入口统一硬拦：非豁免命令在祖先链+平台指针+--spec-dir 均未命中 .sillyspec 的目录运行 → exit 2，文案含当前目录、git root（如有）、三条修复指引（cd 回项目根 / 先 init / --spec-dir 显式指定）
2. 豁免命令（init/scan/doctor/status/progress/next/workspace/setup/knowledge/local/config/mcp/dashboard/platform/wt-commit/agent-log——按设计可在未初始化目录运行或有自身 fail-closed）行为不变
3. 子目录命中祖先链 → 放行且 dir 重锚定 spec 根：裸 join(dir,'.sillyspec') 调用点（如 task）子目录运行与根目录行为一致
4. 平台模式（pointer/接管声明/--workspace-id/--runtime-root）与 --spec-dir 显式不受影响
5. 新增测试覆盖以上各面，相关回归全绿

## 成功标准（可验证）

1. CLI 入口统一硬拦：非豁免命令在祖先链+平台指针+--spec-dir 均未命中 .sillyspec 的目录运行 → exit 2，文案含当前目录、git root（如有）、三条修复指引（cd 回项目根 / 先 init / --spec-dir 显式指定）
2. 豁免命令（init/scan/doctor/status/progress/next/workspace/setup/knowledge/local/config/mcp/dashboard/platform/wt-commit/agent-log——按设计可在未初始化目录运行或有自身 fail-closed）行为不变
3. 子目录命中祖先链 → 放行且 dir 重锚定 spec 根：裸 join(dir,'.sillyspec') 调用点（如 task）子目录运行与根目录行为一致
4. 平台模式（pointer/接管声明/--workspace-id/--runtime-root）与 --spec-dir 显式不受影响
5. 新增测试覆盖以上各面，相关回归全绿
