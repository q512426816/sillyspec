---
source: scan/TESTING.md
section: pre-push 三道关
generated_at: 2026-10-13T00:36:46.836Z
---

# TESTING — pre-push 三道关

`.husky/pre-push` 依次跑：`npm run lint` → `npm test` → `node bin/sillyspec.js docs gate`（文档引用 ratchet 门：docs check 失效数 ≤ 基线 `.sillyspec/docs-check-baseline` 放行，超基线拦；基线缺失 fail-closed exit 2）。任何一道失败 abort push，**禁止跳过 hook 提交**。