---
author: flow-machine-draft
created_at: 2026-10-05T13:53:52.768Z
---
# 需求规格（Requirements）— 2026-10-05-tests-confirm-hint

## 功能需求

### FR-01: flow start 抽查提示教的命令形态与实现一致：sillyspec tests --confirm --anchor <id> --evidence <真实测试路径>（flag 形态）

- flow start 抽查确认提示必须教 flag 形态 `sillyspec tests --confirm --anchor <id> --evidence <真实测试路径>`——与 index.js case 'tests' 的 has('--confirm') 实现及其 fail 用法文案逐字一致；禁止教实现不认的子命令形态（照抄静默降级为行展示，confirm 空转）。

#### 场景：主路径

- Given: flow start 注入未确认 FR（unconfirmed>0）
- When: 输出抽查提示
- Then: 提示命令为 tests --confirm --anchor 形态，逐字可执行

### FR-02: 全仓不再有「tests confirm 」（子命令形态）的提示残留

- src/ 全域禁止再出现「tests confirm 」（带空格子命令形态）提示文本——防第二漂移源。

#### 场景：主路径

- Given: src/ 任意 .js 文件
- When: 全文扫描
- Then: 无「tests confirm 」命中

### FR-03: 单测锁定提示语形态（防回漂）

- 必须有源级回归测试：断言 flow.js 提示含 flag 形态、全仓 src 无子命令形态残留。

#### 场景：主路径

- Given: 仓内源码
- When: 回归测试执行
- Then: 两断言成立

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/tests-confirm-hint-syntax.test.mjs「① 抽查提示含 flag 形态 tests --confirm --anchor」
FR-02: test/tests-confirm-hint-syntax.test.mjs「② 全仓 src 无「tests confirm 」子命令形态提示残留」
FR-03: test/tests-confirm-hint-syntax.test.mjs「① + ② 双断言齐备」
