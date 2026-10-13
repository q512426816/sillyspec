---
source: scan/INTEGRATIONS.md
section: WebSocket（仅子包，主 CLI 不使用）
generated_at: 2026-10-13T00:36:46.795Z
---

# INTEGRATIONS — WebSocket（仅子包，主 CLI 不使用）

- **ws（WebSocket / WebSocketServer）** — 实时通信
  - 使用位置：`packages/dashboard/server/index.js:2`（`new WebSocketServer({ server })` 行 456）、`packages/dashboard/src/composables/useWebSocket.js`（前端 `new WebSocket(wsUrl)`）
  - 用法要点：**仅 dashboard 子包使用**，主 CLI 未引入（历史上 sync.js 曾用 ws 做实时事件，已移除——grep `src/` 无 ws import 实证）。服务端推送文件变更事件至前端面板。