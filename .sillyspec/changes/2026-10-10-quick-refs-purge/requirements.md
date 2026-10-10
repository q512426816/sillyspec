---
author: flow-machine-draft
created_at: 2026-10-10T00:59:29.412Z
---
# 需求规格（Requirements）— 2026-10-10-quick-refs-purge

## 功能需求

### FR-01: 指引面（根 SKILL.md / README.md / CLAUDE.md / .claude/CLAUDE.md / brainstorm、auto skill）无 sillyspec run quick、/sillyspec:quick 引用及「已退役/存量收尾」注记，小改动指引统一指向 flow start/done

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: .claude/skills/sillyspec-quick/ 目录与 assets/command-cards/run-quick.md 删除，src/command-cards.js 的 COMMAND_CARD_NAMES 同步移除 run-quick

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: test/command-cards.test.mjs 与 test/input-teach-copyable.test.mjs 同步更新且跑绿

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-02: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-03: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
