---
author: flow-machine-draft
created_at: 2026-10-10T00:59:29.412Z
---
# 提案书（Proposal）— 2026-10-10-quick-refs-purge

## 动机

任务原话转写：quick 残留引用清除改指 flow（含退役注记）
quick 通道已退役，但指引面残留教学式引用与退役墓碑注记：.claude/CLAUDE.md 规则 4/6/7/8 仍教 quick、brainstorm/auto skill 指向 run quick、根 SKILL.md/README.md 含 /sillyspec:quick 行与「已退役/存量收尾」注记、quick skill 目录与 run-quick 命令卡仍在。统一清除并改指 flow。

成功标准：
- 指引面（根 SKILL.md / README.md / CLAUDE.md / .claude/CLAUDE.md / brainstorm、auto skill）无 sillyspec run quick、/sillyspec:quick 引用及「已退役/存量收尾」注记，小改动指引统一指向 flow start/done
- .claude/skills/sillyspec-quick/ 目录与 assets/command-cards/run-quick.md 删除，src/command-cards.js 的 COMMAND_CARD_NAMES 同步移除 run-quick
- test/command-cards.test.mjs 与 test/input-teach-copyable.test.mjs 同步更新且跑绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 指引面（根 SKILL.md / README.md / CLAUDE.md / .claude/CLAUDE.md / brainstorm、auto skill）无 sillyspec run quick、/sillyspec:quick 引用及「已退役/存量收尾」注记，小改动指引统一指向 flow start/done
2. .claude/skills/sillyspec-quick/ 目录与 assets/command-cards/run-quick.md 删除，src/command-cards.js 的 COMMAND_CARD_NAMES 同步移除 run-quick
3. test/command-cards.test.mjs 与 test/input-teach-copyable.test.mjs 同步更新且跑绿

## 成功标准（可验证）

1. 指引面（根 SKILL.md / README.md / CLAUDE.md / .claude/CLAUDE.md / brainstorm、auto skill）无 sillyspec run quick、/sillyspec:quick 引用及「已退役/存量收尾」注记，小改动指引统一指向 flow start/done
2. .claude/skills/sillyspec-quick/ 目录与 assets/command-cards/run-quick.md 删除，src/command-cards.js 的 COMMAND_CARD_NAMES 同步移除 run-quick
3. test/command-cards.test.mjs 与 test/input-teach-copyable.test.mjs 同步更新且跑绿
