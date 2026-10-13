---
source: scan/CONVENTIONS.md
section: 文档 / prompt 约定
generated_at: 2026-10-13T00:36:46.771Z
---

# CONVENTIONS — 文档 / prompt 约定

- **用户面向语言**：全中文（prompt、错误消息、`console.warn/error` 文案、注释、阶段 title/description 均中文）。`throw new Error('changeName 不能为空')` 这类也是中文。
- **prompt 结构**：步骤 prompt 普遍含「状态检查 → 加载锚定 → 主体 → 铁律/护栏」四段式；带 emoji 标记位（`✅/❌/⚠️/⛔`）做视觉分级。
- **护栏段位置**：阶段级护栏放 `definition._globalGuardrails`（下划线前缀表示「元字段，非 step」）；step 级护栏放 prompt 结尾 `### 铁律`。
- **design.md 是 truth source**：`verify` 阶段 prompt 明确写 `design.md 是唯一 truth source，不符合 design.md 的实现 = Bug`（`src/stages/verify.js:121`），且 quick 阶段要求 **Reverse Sync**（发现 Bug 是 design 遗漏时先改 design 再改代码，`src/stages/quick.js:64`）。
- **提示词文档单一数据源**：`src/stages/*.js` 的 `definition.steps[].prompt` + `src/run/prompt.js` 是唯一数据源，`docs/prompt/*.md` 是机械提取镜像（`node docs/prompt/_extract.mjs` 再生），**禁止手改 md 里的 prompt 原文**。
- **worktree 隔离纪律**：CLI 一律在主仓库根跑（`cd` 进 worktree 会写分裂进度库）；execute/verify 副本漂移由 command.js 守卫自动锚回主仓 specBase（不 exit，纠正后继续）——新命令实现须保持「进度/产出落主仓」的锚定语义。