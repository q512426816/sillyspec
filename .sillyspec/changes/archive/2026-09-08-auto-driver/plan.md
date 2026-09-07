---
author: qinyi
created_at: 2026-09-08T07:05:00+08:00
plan_level: full
---

# 实现计划（Plan）— 2026-09-08-auto-driver

> 任务名唯一真相在 tasks.md；Wave 段纯 ID 引用。依据：design.md（Grill 修订版）+ decisions.md D-001~D-006。

## 全局验收标准

1. SS-META 块：auto 模式每步 prompt 尾部单行注释块；requiresUser 四源公式（三键 + WAIT_MARKER_RE）全缺兜底 false；正文「完成后执行」与 doneCommand 同源。
2. 单阶段 run 零回归：非 auto 路径 prompt 输出与改前逐字节一致（output-step-render / prompt-injection-gaps / brainstorm-auto-step2-conditional-wait 全绿）。
3. 三态 --change：单活跃回显 / 多活跃 exit 2 列候选 / 零活跃建变更（date-new-change-hex）。
4. --wait-interactive：TTY 直收走既有 wait+continue 状态机；非 TTY/异常回三段式；缺省逐字节不变。
5. 收尾总结：全完成时打印（变更/阶段/tasks 勾选/产物/last-delta 模块），未完成不打印。
6. auto SKILL.md 93→约 50 行，三段退役指令不再出现。
7. 全量套件 0 失败 + lint 0 告警。

## Wave 1

- task-01

## Wave 2

- task-02
- task-05

## Wave 3

- task-03

## Wave 4

- task-04

## Wave 5

- task-06

## Wave 6

- task-07

## Wave 依赖说明

- 受「同 Wave 禁改同文件」硬约束：task-02/03/04 同改 src/run/command.js → 分驻 W2/W3/W4 串行。
- 依赖闭合：task-05←01（W1）；task-03←01（W1）；task-06←01/02/03/04（W4 后全齐）；task-07←06。

## 跨任务契约

- task-01 产出 `requiresUser(step, promptText)` 纯函数与 SS-META 渲染（prompt.js 导出）——task-03/06 的唯一消费源，签名以 design.md 接口定义为准。
- doneCommand 字符串由 task-01 的渲染层单点构造（正文模板与元数据块同源）——task-02 的 --change 解析只负责 changeName 供给。
- 信封/文案常量不新增（SS-META 是渲染产物非 gate 信封）。
