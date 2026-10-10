---
author: flow-machine-draft
created_at: 2026-10-10T01:27:30.829Z
---
# 任务注册表（Tasks）— 2026-10-10-cli-uninit-cwd-gate

- [x] task-01: CLI 入口统一硬拦：非豁免命令在祖先链+平台指针+--spec-dir 均未命中 .sillyspec 的目录运行 → exit 2，文案含当前目录、git root（如有）、三条修复指引（cd 回项目根 / 先 init / --spec-dir 显式指定）
- [x] task-02: 豁免命令（init/scan/doctor/status/progress/next/workspace/setup/knowledge/local/config/mcp/dashboard/platform/wt-commit/agent-log——按设计可在未初始化目录运行或有自身 fail-closed）行为不变
- [x] task-03: 子目录命中祖先链 → 放行且 dir 重锚定 spec 根：裸 join(dir,'.sillyspec') 调用点（如 task）子目录运行与根目录行为一致
- [x] task-04: 平台模式（pointer/接管声明/--workspace-id/--runtime-root）与 --spec-dir 显式不受影响
- [x] task-05: 新增测试覆盖以上各面，相关回归全绿
