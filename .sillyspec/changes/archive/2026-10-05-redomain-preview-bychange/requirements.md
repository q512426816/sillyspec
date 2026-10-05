---
author: flow-machine-draft
created_at: 2026-10-05T13:03:31.030Z
---
# 需求规格（Requirements）— 2026-10-05-redomain-preview-bychange

## 功能需求

### FR-01: tests --redomain --by-change 预览与落盘同口径：只列该变更条目，计数带「（仅「变更：X」）」标注

- `tests --redomain` 预览分支必须透传 byChange 给 planRedomain（与落盘分支同口径）：带 --by-change 时预览只列该变更条目，计数行带「（仅「变更：X」）」标注；禁止预览列整域而落盘只迁子集的口径分裂。

#### 场景：主路径

- Given: knowledge fr/<from>.md 含多变更条目（change-alpha 2 条 + change-beta 1 条）
- When: tests --redomain --from <from> --to <to> --by-change change-alpha（无 --write 干跑）
- Then: 预览计数为 2 并带「（仅「变更：change-alpha」）」标注

### FR-02: 他变更条目不进预览清单

- 预览清单必须只含 byChange 等值条目——他变更条目（如 change-beta）禁止出现在预览行中。

#### 场景：主路径

- Given: 同 FR-01 fixture
- When: 同 FR-01 命令
- Then: 输出不含 FR-<域>-102（change-beta 条目）行

### FR-03: CLI 级单测锁定（execFileSync 走真实 CLI 预览路径断言子集计数与排除项）

- 必须有 CLI 级单测：真实 CLI 进程跑预览路径，断言子集计数标注与排除项（防 planRedomain 纯函数级测试漏掉 CLI 参数组装层回归）。

#### 场景：主路径

- Given: 临时 knowledge fixture
- When: execFileSync 真实 CLI tests --redomain --by-change
- Then: 断言 /N 条（仅「变更：X」）/ 与他变更条目缺席

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/fr-domain-guard-and-redomain-bychange.test.mjs「⑥ CLI 预览与落盘同口径：--by-change 干跑只列分批子集」
FR-02: test/fr-domain-guard-and-redomain-bychange.test.mjs「⑥ 他变更条目不进预览清单」
FR-03: test/fr-domain-guard-and-redomain-bychange.test.mjs「⑥ CLI 级单测（execFileSync 真实 CLI 路径）」
