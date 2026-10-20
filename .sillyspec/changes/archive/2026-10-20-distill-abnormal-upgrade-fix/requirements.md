---
author: flow-machine-draft
created_at: 2026-10-20T02:58:34.269Z
---
# 需求规格（Requirements）— 2026-10-20-distill-abnormal-upgrade-fix

## 功能需求

### FR-01: distillIntoKnowledge 返回 needsWait 非空字符串时，flow done distill 子步必须真实升厚（flow-state tier=thick 落盘、upgrade_reason 留痕）

- 升厚判定必须以 distillIntoKnowledge 返回的 needsWait 字段为唯一异态信号：needsWait 为非空字符串时判定必须为真，触发 tier=thick 落盘与 upgrade_reason 留痕。
- upgrade_reason 文案必须不得引用蒸馏返回值不存在的字段。

#### 场景：主路径

Given decisions.md 含 rejected 条目缺否决理由（distill 返回 needsWait 非空）
When 升厚判定执行
Then 判定为真：tier=thick 落盘 + upgrade_reason 留痕

### FR-02: needsWait 为 null（正常路径）时升厚判定必须恒不触发，既有行为零回归

- needsWait 为 null 时判定必须为假；入参 res 为 null/undefined 时判定必须为假且不抛错。
- 判定为假时 flow-state tier 必须保持 thin、零升厚副作用。

#### 场景：主路径

Given 正常蒸馏（needsWait=null，含 skipped 零输出形态）
When 升厚判定执行
Then 判定为假，tier 不变

### FR-03: 升厚判定必须不再引用蒸馏返回值不存在的字段（rejected 幽灵引用清除）

- 判定逻辑必须提取为 decision-distill.js 导出的纯函数（与 needsWait 产出单一源同处），src/flow.js 必须改为调用该函数，原内联表达式（res.rejected > 0 || res.needsWait > 0）必须删除。

#### 场景：主路径

Given src/flow.js distill 子步
When 检查升厚判定调用
Then flow.js 调用导出纯函数，内联幽灵表达式不在场

### FR-04: 判定逻辑有测试覆盖；既有 distill 相关套件零回归

- 新增测试必须覆盖：needsWait 非空→真、needsWait null→假、res null→假三态，以及 flow.js 调用点钉（源码断言）。
- 既有 decision-distill-flat-list、decision-caliber-unify 两套件必须零回归。

#### 场景：主路径

Given 本变更交付完成
When node --test 跑新套件与两既有套件
Then 全部 pass、零 fail

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/distill-abnormal-upgrade.test.mjs「① needsWait 非空判真」
FR-02: test/distill-abnormal-upgrade.test.mjs「② 正常路径判假零副作用」
FR-03: test/distill-abnormal-upgrade.test.mjs「③ 幽灵引用清除与调用点钉」
FR-04: test/distill-abnormal-upgrade.test.mjs「④ 既有套件零回归」
