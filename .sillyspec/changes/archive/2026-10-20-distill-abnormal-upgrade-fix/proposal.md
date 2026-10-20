---
author: flow-machine-draft
created_at: 2026-10-20T02:58:34.269Z
---
# 提案书（Proposal）— 2026-10-20-distill-abnormal-upgrade-fix

## 动机

任务原话转写：修复蒸馏异态升厚触发器死代码

动机与背景：src/flow.js distill 子步的升厚判定 `const abnormal = res && (res.rejected > 0 || res.needsWait > 0)` 两个条件恒 false——distillIntoKnowledge 返回值只有 written/skipped/needsWait 三键无 rejected 字段（幽灵引用恒 undefined），needsWait 是字符串、非空串与 > 0 比较恒 false。「distill 异态（rejected 缺否决理由/复潮条件等）自动升厚留人工裁决」实际永不触发，决策质量异态被静默吞掉。caliber-unify 变更让 implemented 入选后 needsWait 场景更常见，死触发器修复优先级上升。

成功标准：
- distillIntoKnowledge 返回 needsWait 非空字符串时，flow done distill 子步必须真实升厚（flow-state tier=thick 落盘、upgrade_reason 留痕）
- needsWait 为 null（正常路径）时升厚判定必须恒不触发，既有行为零回归
- 升厚判定必须不再引用蒸馏返回值不存在的字段（rejected 幽灵引用清除）
- 判定逻辑提取为可独立测试的纯函数并有测试覆盖；既有 distill 相关套件零回归

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. distillIntoKnowledge 返回 needsWait 非空字符串时，flow done distill 子步必须真实升厚（flow-state tier=thick 落盘、upgrade_reason 留痕）
2. needsWait 为 null（正常路径）时升厚判定必须恒不触发，既有行为零回归
3. 升厚判定必须不再引用蒸馏返回值不存在的字段（rejected 幽灵引用清除）
4. 判定逻辑提取为可独立测试的纯函数并有测试覆盖；既有 distill 相关套件零回归

## 成功标准（可验证）

1. distillIntoKnowledge 返回 needsWait 非空字符串时，flow done distill 子步必须真实升厚（flow-state tier=thick 落盘、upgrade_reason 留痕）
2. needsWait 为 null（正常路径）时升厚判定必须恒不触发，既有行为零回归
3. 升厚判定必须不再引用蒸馏返回值不存在的字段（rejected 幽灵引用清除）
4. 判定逻辑提取为可独立测试的纯函数并有测试覆盖；既有 distill 相关套件零回归
