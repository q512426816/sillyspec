---
author: flow-machine-draft
created_at: 2026-10-10T00:59:29.412Z
---
# 需求规格（Requirements）— 2026-10-10-quick-refs-purge

## 功能需求

### FR-01: 指引面（根 SKILL.md / README.md / CLAUDE.md / .claude/CLAUDE.md / brainstorm、auto skill）无 sillyspec run quick、/sillyspec:quick 引用及「已退役/存量收尾」注记，小改动指引统一指向 flow start/done

- 指引面六个文件必须不含 `sillyspec run quick`、`/sillyspec:quick`、「已退役」「存量收尾」quick 注记；小改动/轻量路径指引必须指向 `flow start`/`flow done`。边界：scan skill `--quick` 档位、commit skill QUICKLOG 条目规则、src 存量收尾机制与 docs/prompt 镜像不属指引面，禁止顺手改动。

#### 场景：主路径

Given 六个指引文件 / When grep 检索 quick（忽略 quicklog）/ Then 零命中；小改动引导语均含 flow start 或 flow done。

### FR-02: .claude/skills/sillyspec-quick/ 目录与 assets/command-cards/run-quick.md 删除，src/command-cards.js 的 COMMAND_CARD_NAMES 同步移除 run-quick

- `.claude/skills/sillyspec-quick/` 与 `assets/command-cards/run-quick.md` 必须从仓库删除；`COMMAND_CARD_NAMES` 必须不再含 `'run-quick'`（init 注入 7 卡，无资产缺失警告）。

#### 场景：主路径

Given 卡资产目录与枚举 / When `node test/command-cards.test.mjs` / When readCardAssets 读取 / Then 资产数 7、逐名在列、注入双落点 14 文件零警告。

### FR-03: test/command-cards.test.mjs 与 test/input-teach-copyable.test.mjs 同步更新且跑绿

- 两个测试必须与 7 卡现实同步（计数 7/14、无 run-quick 墓碑断言、夹具清单无 run-quick.md），且必须实测跑绿（command-cards 40/40、input-teach 7/7）；不得为凑绿删除断言弱化覆盖（墓碑断言随实体删除属同步，非弱化）。

#### 场景：主路径

Given 更新后的两测试 / When `node test/command-cards.test.mjs` 与 `node --test test/input-teach-copyable.test.mjs` / Then 全 PASS exit 0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档指引面，无代码路径可测；核验面为 grep 检索零命中（本次已验：六文件 quick 检索忽略 quicklog 后零命中）
FR-02: test/command-cards.test.mjs「资产齐全 + 双落点 7 卡」——readCardAssets 计数与 COMMAND_CARD_NAMES 逐名断言直接覆盖枚举/资产一致性
FR-03: test/command-cards.test.mjs「40/40 ALL PASS」＋ test/input-teach-copyable.test.mjs「②b 非 src 教学面实例在场」——实测全绿
