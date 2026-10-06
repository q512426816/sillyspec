---
author: flow-machine-draft
created_at: 2026-10-06T05:06:35.656Z
---
# 提案书（Proposal）— 2026-10-06-flow-status-json

## 动机

任务原话转写：多 agent 并行场景下，外层编排器与其他 agent 需要程序化读取轻量变更状态（阶段/槽位/任务勾选进度）来决定下一步动作；当前 flow status 只有人类可读渲染文本，脚本无法稳定解析，只能靠 fragile 文本匹配。给 flow status 增加 --json 输出：结构化给出变更状态全貌，人类可读路径行为保持不变。

成功标准：
- flow status --change <存在的活跃变更> --json 输出合法 JSON，含 change/phase/designFilled/frFilled/bindingsFilled/bindingsTotal/tasksChecked/tasksTotal/substeps 字段
- 变更不存在与已归档两种形态下 --json 亦输出结构化 JSON（带对应状态标记）且进程退出码与现有人类可读路径一致
- 新增单元测试覆盖上述三种形态并纳入 test:core，全部跑绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. flow status --change <存在的活跃变更> --json 输出合法 JSON，含 change/phase/designFilled/frFilled/bindingsFilled/bindingsTotal/tasksChecked/tasksTotal/substeps 字段
2. 变更不存在与已归档两种形态下 --json 亦输出结构化 JSON（带对应状态标记）且进程退出码与现有人类可读路径一致
3. 新增单元测试覆盖上述三种形态并纳入 test:core，全部跑绿

## 成功标准（可验证）

1. flow status --change <存在的活跃变更> --json 输出合法 JSON，含 change/phase/designFilled/frFilled/bindingsFilled/bindingsTotal/tasksChecked/tasksTotal/substeps 字段
2. 变更不存在与已归档两种形态下 --json 亦输出结构化 JSON（带对应状态标记）且进程退出码与现有人类可读路径一致
3. 新增单元测试覆盖上述三种形态并纳入 test:core，全部跑绿
