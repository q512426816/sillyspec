---
id: task-01
title: shared.js — writePlatformPointer 三写 + checkPlatformManaged 读侧 helper
title_zh: shared.js — 平台指针三写 + 声明读侧 helper
author: qinyi
created_at: 2026-08-15T15:50:00+08:00
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04, task-05]
allowed_paths:
  - src/run/shared.js
provides:
  - contract: platform-managed-declaration
    fields: [managed, specRoot, workspaceId, declaredAt]
  - contract: check-platform-managed
    fields: [managed, specRoot, workspaceId, declaredAt]
goal: |
  平台接管声明落盘 + 读侧统一入口。writePlatformPointer 从双写扩三写：
  主文件 + 恢复指针 + <cwd>/.sillyspec-platform-managed 声明（四字段，无过期）。
  checkPlatformManaged(cwd) 读侧宽容返回声明对象或 null。
implementation: |
  改 src/run/shared.js：
  1. 新增导出常量 PLATFORM_MANAGED_FILENAME = '.sillyspec-platform-managed'。
  2. writePlatformPointer 写完主文件+指针后，同 try 块内第三写：
     join(cwd, PLATFORM_MANAGED_FILENAME)，payload {managed:true, specRoot, workspaceId, declaredAt:new Date().toISOString()}。
     注意声明字段集独立于指针 payload（无 status/savedAt/scanRunId）。
  3. 新增导出 checkPlatformManaged(cwd)：读声明文件，JSON.parse 成功且 managed===true
     → 返回 {managed:true, specRoot, workspaceId, declaredAt}；不存在/损坏/managed 非 true → 返回 null（宽容不抛错）。
acceptance: |
  - init/scan 带平台参数后三文件齐落（platform-scan.json / .sillyspec-platform.json / .sillyspec-platform-managed）
  - 声明含 managed:true + specRoot 副本 + workspaceId + declaredAt 四字段，无多余字段
  - checkPlatformManaged：有效声明返回对象；无文件/损坏 JSON/managed:false 返回 null
  - 重复调用幂等（覆盖写无害）
verify: |
  node 直测 + 场景①（task-06）：tmpdir 项目 init --spec-dir 外部 --workspace-id → 三文件 existsSync + JSON 字段断言。
constraints: |
  - 只改 src/run/shared.js；不改 writePlatformPointer 签名（cwd, platformOpts, extra）
  - 写失败静默返回 false 语义保持（与现有一致）
---
# task-01: 三写 + 读侧 helper
## 目标
见 frontmatter goal（D-A@v1 声明文件 / D-E@v2 四字段）。
## 验收
见 frontmatter acceptance。
