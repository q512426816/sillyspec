---
author: flow-machine-draft
created_at: 2026-10-21T12:14:13.558Z
---
# 需求规格（Requirements）— 2026-10-21-lint-to-prepush

## 功能需求

### FR-01: local.yaml 标 unavailable 后 flow done 收口 lint 子步 skipped 且理由可见

- `.sillyspec/local.yaml` 的 `commands.lint` 必须标为 `unavailable`（CLI `extractLintCommand` 既有认法，带引号/裸写均可），flow done 收口 lint 子步必须落到 skipped 分支并显示理由「local.yaml 未配置 commands.lint（或标记 unavailable）」；本条为配置级改动，禁止触及 src/。

#### 场景：标 unavailable 后收口跳过

- Given local.yaml lint 原配置 npm run lint、收口 lint 每次全仓跑（实测 50.6s）
- When commands.lint 改标 unavailable
- Then flow done 实测对账里 lint 显示 skipped 且理由可见，收口不被 lint 阻断

### FR-02: .husky/pre-push 零改动（仍跑 npm run lint + docs gate）

- `.husky/pre-push` 必须保持原样——lint 门移交 git 钩子/CI 后钩子是唯一本地 lint 门，禁止随本变更弱化或删改。

#### 场景：钩子零改动

- Given 收口侧 lint 移出（FR-01）
- When 本变更交付
- Then git diff 面不含 .husky/pre-push，钩子行为与改动前一致

### FR-03: AGENTS.md 与模板规则 4 保持逐字一致且措辞含 unavailable 跳过语义，test-runner-failed-face.test.mjs ③ 更新后绿

- `AGENTS.md` 与 `templates/agents-instruction.md` 的规则 4 必须逐字一致（test-runner-failed-face.test.mjs ③ 锚定），措辞必须补充「未配置/标 `unavailable` → 收口跳过并留痕理由，归 pre-push/CI 门」语义；自验口径句必须改为「变更测试面即收口证据（lint 已配置时并入；标 unavailable 的仓归 git 钩子/CI 门）」；`CLAUDE.md` 规则 8 的 lint 相关句必须同步为同语义；测试 ③ 的 KEY 句必须随措辞更新并保持绿。

#### 场景：双文件一致与测试同步

- Given 既有测试 ③ 要求 AGENTS.md 与模板规则 4 逐字一致、KEY 句钉旧口径
- When 两文件规则 4 同步改写、测试 KEY 句更新
- Then rule4(a) === rule4(tpl) 仍成立，node --test test/test-runner-failed-face.test.mjs 全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：配置标记触发 CLI 既有分支（verify-postcheck.js:149-166 认 unavailable），验证面为收口 lint: skipped 回显，本变更不改 CLI 行为
FR-02: 不适用：git diff 面零改动即证据，无行为可断言
FR-03: test/test-runner-failed-face.test.mjs「③ AGENTS 双文件自验口径句逐字一致」
