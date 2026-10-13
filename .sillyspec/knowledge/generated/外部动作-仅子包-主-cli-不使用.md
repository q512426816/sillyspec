---
source: scan/INTEGRATIONS.md
section: 外部动作（仅子包，主 CLI 不使用）
generated_at: 2026-10-13T00:36:46.797Z
---

# INTEGRATIONS — 外部动作（仅子包，主 CLI 不使用）

- **open** — 打开系统默认浏览器
  - 使用位置：`packages/dashboard/server/index.js:7`
  - 用法要点：**仅 dashboard 子包使用**，启动面板后自动打开浏览器（`--no-open` 关闭）。