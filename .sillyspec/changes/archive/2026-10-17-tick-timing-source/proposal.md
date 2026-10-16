---
author: flow-machine-draft
created_at: 2026-10-16T16:30:30.520Z
---
# 提案书（Proposal）— 2026-10-17-tick-timing-source

## 动机

任务原话转写：勾选时点判定换源tick时戳流
坑 tick-timing-squash-blindspot（multi-agent-platform docs/sillyspec，2026-10-16 收口实证）：flow done 勾选时点判定读 tasks.md git 历史（首提交==HEAD 即警告一把勾），官方允许的 reset --soft 压扁会无声摧毁该依据（边干边勾被压扁后警告照出，结构性误报）；「对应提交」横幅文案歧义（token 哨兵与时点判定双判据）；反馈只在收口终点。三点修复：①判定换源 task-ticks.jsonl 侧车墙钟时戳（压扁免疫，与节奏门共享观测采集）②task tick 回显现成提交命令（pathspec 含 tasks.md/侧车）+ 此前勾选未入库当场提醒 ③三处教学文案消歧（对应提交=消息带 task-NN 且 pathspec 含 tasks.md 同一提交入库）。

成功标准：
- detectTickTiming 纯函数：时戳分散→spread；挤尾窗且变更存活≥10×跨度→concentrated；单格/无观测/无锚各有态，缺锚 fail-open
- 压扁形态回归：侧车时戳分散的变更在 git 历史被压扁后 flow done 不再出一把勾警告（结构性误报消除）
- task tick 翻格成功回显含可抄提交命令（消息模板带 task-NN、pathspec 含 tasks.md 与 task-ticks.jsonl）
- 横幅/教学/拒收文案明确勾选修改与任务交付同一提交入库口径

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. detectTickTiming 纯函数：时戳分散→spread；挤尾窗且变更存活≥10×跨度→concentrated；单格/无观测/无锚各有态，缺锚 fail-open
2. 压扁形态回归：侧车时戳分散的变更在 git 历史被压扁后 flow done 不再出一把勾警告（结构性误报消除）
3. task tick 翻格成功回显含可抄提交命令（消息模板带 task-NN、pathspec 含 tasks.md 与 task-ticks.jsonl）
4. 横幅/教学/拒收文案明确勾选修改与任务交付同一提交入库口径

## 成功标准（可验证）

1. detectTickTiming 纯函数：时戳分散→spread；挤尾窗且变更存活≥10×跨度→concentrated；单格/无观测/无锚各有态，缺锚 fail-open
2. 压扁形态回归：侧车时戳分散的变更在 git 历史被压扁后 flow done 不再出一把勾警告（结构性误报消除）
3. task tick 翻格成功回显含可抄提交命令（消息模板带 task-NN、pathspec 含 tasks.md 与 task-ticks.jsonl）
4. 横幅/教学/拒收文案明确勾选修改与任务交付同一提交入库口径
