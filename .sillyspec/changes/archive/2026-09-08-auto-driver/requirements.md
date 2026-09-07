---
author: qinyi
created_at: 2026-09-08T06:55:00+08:00
---

# 需求（Requirements）— 2026-09-08-auto-driver

## 功能需求

- **FR-01 SS-META 元数据块**：auto 模式下 outputStep 每步 prompt 尾部渲染单行 HTML 注释块 `<!--SS-META:{...}-->`（stage/stepIndex/stepName/requiresUser/doneCommand/waitHint）；requiresUser 四源公式（requiresWait/conditionalWait/requiresConfirm/WAIT_MARKER_RE.test(prompt)），全缺兜底 false；auto 模式正文「完成后执行」模板与 doneCommand 同源（双命令消除）；单阶段 run（autoMeta=null）零输出。
- **FR-02 三态 --change**：单活跃自动选中（既有）+ console 回显；多活跃报错列候选 exit 2 + auto 专门文案；零活跃新增 auto 建变更（复用 brainstorm date-new-change-hex 命名与 title 逻辑）。
- **FR-03 --wait-interactive**：旗标开 + requiresUser + stdin TTY → outputStep 返回后 readline 直收一行 → 走既有 wait+continue 状态机（无新状态）；非 TTY/异常 fail-open 回三段式；默认不开，不带旗标逐字节不变。
- **FR-04 CLI 收尾总结**：flowStages 全 completed（挂点 command.js:1726；:1616 重进入复用同 helper）→ 打印变更名/各阶段状态/tasks 勾选计数/产物存在清单/last-delta 模块清单（sidecar 缺失跳过）；未完成不打印。
- **FR-05 auto skill 瘦身**：删关键词猜/Change 记忆/自撰总结三段；改 SS-META 块消费（requiresUser=true 停 / 否则逐字跑 doneCommand）；终止条件以 CLI 收尾总结信号为准。

## 非功能需求

- **NFR-01 单阶段零回归**：非 auto 路径 prompt 输出与改动前逐字节一致（回归跑 output-step-render/prompt-injection-gaps/brainstorm-auto-step2-conditional-wait）。
- **NFR-02 fail-open**：TTY 探测/readline/元数据渲染异常均降级不阻断 auto 主流程。
- **NFR-03 跨平台**：Windows/macOS/Linux 的 TTY 探测与 readline 行为差异由「探测失败即回退」兜底。
