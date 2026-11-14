---
author: flow-machine-draft
created_at: 2026-11-14T14:12:32.544Z
---
# 需求规格（Requirements）— 2026-11-14-wait-ask-tool-and-selfcheck-output

## 功能需求

### FR-01: src/stages/brainstorm.js 方案步「### 输出」行补自检结果产物（四行检查逐行打勾，有 ✗ 回到对应处理），使自检可审计

- 方案步「### 输出」契约必须包含自检结果：四行检查（逐方案×逐约束打勾 / 取舍轴差异 / 方案完整度 / 单方案如实上报）逐行打勾输出；任一 ✗ 必须回到对应处理（剔除/合并/补全/重写）后重新输出，禁止跳过自检直接给推荐。

#### 场景：自检可审计

- Given 方案步 prompt 已含「### 自检」节
- When agent 组织产物
- Then 输出含自检结果块（四行逐行打勾），未跑自检的输出即不完整

### FR-02: src/run/prompt.js 完成后执行段的 requiresWait 分支与 mayNeedWait 分支注入提问方式指引：优先用 harness 交互询问工具（Claude Code 即 AskUserQuestion）呈现问题与候选项，拿到回答逐字带入 --answer 收口；harness 无该工具才退纯文字提问

- requiresWait 与 mayNeedWait 两分支的注入文本必须各含提问方式指引：优先用 harness 交互询问工具（Claude Code 即 AskUserQuestion）把 waitReason 与候选项呈现给用户等待作答，拿到回答后逐字带入 `--answer` 一步合并收口；禁止只发纯文字问题了事；harness 无询问工具时才退回纯文字提问。

#### 场景：wait 步触发询问卡

- Given 一个 requiresWait 步骤被渲染（如 brainstorm 方案选择）
- When 输出步骤 prompt
- Then 注入段含 AskUserQuestion 优先指引，候选项来自 waitOptions

### FR-03: auto 模式不注入该指引（脚本驱动无交互 UI）

- auto 模式（autoMeta 为真）必须跳过该提问方式指引注入，保持既有命令模板不变（脚本驱动无交互 UI，指引无消费方）。

#### 场景：auto 模式零变化

- Given autoMeta 为真
- When 渲染 requiresWait 步骤
- Then 注入段不含 AskUserQuestion 指引，命令模板与改前逐字一致

### FR-04: docs/prompt/_extracted.json 与 docs/prompt/brainstorm.md 镜像逐字同步，README 注入框架节同步新指引

- 修改 prompt 后必须运行 `node docs/prompt/_extract.mjs` 刷新 `_extracted.json`，`docs/prompt/brainstorm.md` 提示词正文逐字同步，且 `docs/prompt/README.md` 的注入框架说明（完成后执行节）必须反映提问方式指引。

#### 场景：三面一致

- Given 源码 prompt 与注入段已改
- When 运行提取脚本并同步文档
- Then _extracted.json / brainstorm.md / README.md 均反映新文案

### FR-05: test/brainstorm-solution-constraint-gate.test.mjs 与 test/output-step-render.test.mjs 补断言并全绿

- 必须在两个测试文件补断言：brainstorm 测试锁方案步输出契约含自检结果；output-step-render 测试锁 requiresWait/mayNeedWait 注入含 AskUserQuestion 指引、auto 模式不含；相关测试全部通过。

#### 场景：回归

- Given 新文案与注入已落盘
- When 运行两个测试文件
- Then 全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/brainstorm-solution-constraint-gate.test.mjs「输出契约含自检结果产物」
FR-02: test/output-step-render.test.mjs「requiresWait/mayNeedWait 注入含 AskUserQuestion 指引」
FR-03: test/output-step-render.test.mjs「auto 模式不注入询问指引」
FR-04: test/brainstorm-solution-constraint-gate.test.mjs「三面一致（源码==提取产物==镜像）」
FR-05: test/output-step-render.test.mjs「相关测试全部通过」
