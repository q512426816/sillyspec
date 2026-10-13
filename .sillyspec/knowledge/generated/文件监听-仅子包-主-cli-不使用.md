---
source: scan/INTEGRATIONS.md
section: 文件监听（仅子包，主 CLI 不使用）
generated_at: 2026-10-13T00:36:46.790Z
---

# INTEGRATIONS — 文件监听（仅子包，主 CLI 不使用）

- **chokidar** — 跨平台文件监听
  - 使用位置：`packages/dashboard/server/watcher.js:219`（`chokidar.watch(watchPaths, ...)`，import 在行 1）
  - 用法要点：**仅 dashboard 子包使用**，主 CLI（src/、bin/）未引入。监听项目文件变更并推送至面板。