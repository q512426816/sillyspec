---
author: flow-machine-draft
created_at: 2026-10-15T13:02:13.308Z
---
# 需求规格（Requirements）— 2026-10-15-eval-adapter-permissions

## 功能需求

### FR-01: adapter command 追加 --dangerously-skip-permissions（两臂同旗标），headless 被测 agent 可写 workdir

- 必须：`eval/eval.config.json` 的 `adapter.command` 数组追加 `--dangerously-skip-permissions`——headless（`claude -p`）无交互授批通道，无权限旗标时 Write/Bash 全部自动拒绝（claude 自身 JSON 输出 `permission_denials` 实证）；被测工作目录是一次性 gitignored 草稿目录（每次重跑清空重建），skip-permissions 的作用面仅限评测子进程。
- 禁止：不改 promptTemplate/setup/arms 语义与其余 adapter 配置。

#### 场景：旗标在场

- Given：eval/eval.config.json
- When：JSON.parse 后检查 adapter.command
- Then：含 `--dangerously-skip-permissions`，且原有 `claude`/`-p`/`--output-format`/`json`/`--max-turns` 占位形态不变

### FR-02: 配置漂移保护测试 + 根因修正留痕 + lint

- 必须：新增 `test/eval-adapter-config.test.mjs`：断言 adapter.command 含 `--dangerously-skip-permissions`（有人移除旗标时测试红）；断言两臂 setup/promptTemplate 关键语义未动（B 臂含 sillyspec init）。
- 必须：`eval-workdir-naming` 变更的根因修正留痕：该变更 design 风险节采纳的 `\0NN` 转义理论被受控重跑证伪（run- 前缀命名下仍被拦）——在本变更 design.md 风险节完整记录证伪证据链（permission_denials 实锤 → 转义理论废弃 → 命名前缀降级为无害加固）。
- 必须：`npm run lint` 通过。

#### 场景：漂移保护与留痕

- Given：test/eval-adapter-config.test.mjs + 本变更 design.md
- When：node --test + 检索 design 证伪记录
- Then：测试全绿；design 含「证伪」与 permission_denials 关键词

## 测试绑定（每条 FR 至少一行）

FR-01: test/eval-adapter-config.test.mjs「adapter command 含 skip-permissions 旗标」
FR-02: test/eval-adapter-config.test.mjs「adapter command 含 skip-permissions 旗标」（B 臂 setup 断言同文件；lint 面收口亲测）
