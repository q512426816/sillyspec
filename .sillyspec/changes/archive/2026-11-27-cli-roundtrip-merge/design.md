---
author: t
created_at: 2026-11-27 07:43:29
generated_by: sillyspec-design-init
scale: small  # 触及 complete.js + stages/execute.js 两面，改动局部；单上下文可吞吐
---

# 设计文档（Design）— 2026-11-27-cli-roundtrip-merge

## 背景

平台库 `agent_run_logs` 实测：长会话（300+ 轮）里 ~20% 工具调用是 sillyspec 协议往返——`fire-equipment`（500 轮）中 272 次 sillyspec 调用（85 次 `--done` 步进）；`voice-meeting-notes`（351 轮）中 20 次 `wt-commit` + 14 次 `run execute`。每步「渲染 + `--done`」两次 CLI 调用是流程固有的往返税，本设计省掉其中一次（D-001）。

## 设计目标

- `--done` 收尾时同一次 stdout 输出尾接下一步 prompt（省一次独立渲染调用），长会话省 ~15-20% 轮次
- 旧 `run <stage>` 单独渲染保留兼容（幂等，拿到同一步重复渲染）
- execute prompt 加一段「多次编辑合并一次 wt-commit」行为引导（D-002）
- watcher 事件密度减半（D-03 接受，不补心跳）

## 非目标

- 不做 wt-commit 自动化机制（watcher 自动提交/新命令）
- 不动 CLI 协议调用次数的其余面（flow start/done 协议、quick 已退役）
- 不做心跳事件补偿
- 本变更只设计，不写码（立项原话）

## 拆分判断

不适用——单变更两处改动（complete.js 尾接 + execute.js 引导段），无批量特征。

## 总体方案

### ① 下一步尾接：机制已在，改为 prompt 引导（D-004 实证修正）

**实证**：`src/run/complete.js:1021` 的 `printNext` 分支在每步完成时已 `await outputStep(stageName, nextPendingIdx, ...)`——同一次 stdout 尾接下一步完整 prompt。平台日志样本（fire-equipment run）：`✅ Step 2/8 完成` 的 tool_result 里直接跟着 `step: 3/8` 的完整 prompt。**每步两次调用的前提不成立**；多余调用是 agent 习惯性重复 `run <stage>`。

**方案**：`src/run/prompt.js` 的完成契约（`--done` 执行命令模板段）加一句：

> 本步 `--done` 的输出已在末尾尾接下一步 prompt——**不要**为此再调 `run <stage>`；直接执行尾接的 prompt。仅阶段切换（`run <nextStage>`）需要新调用。

**stage 边界**（阶段完成后渲染下一阶段首步）留二期——每变更只省 1-3 调用，收益小、跨阶段 progress 未初始化的风险大。

### ② wt-commit 行为引导

`src/stages/execute.js` 的 Wave 执行 prompt 加一段：

> 完成一个 task 单元（实现+测试绿）时，将本 task 的全部文件编辑**合并为一次 `sillyspec wt-commit --change <名> --task task-NN`**——不要每改一个文件就 commit，等 task 完成后一次性提交（省协议轮次、消息带完整 task token）。

纯 prompt 文案，无机制改动。

### ③ watcher 事件流

无代码改动——合并后每步只推一次事件（`--done` 时），watcher 事件密度自然减半。平台投影以步骤推进为准（进度库 stages/steps 表），不依赖事件频率。接受（D-003）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/prompt.js | 完成契约加「下一步已尾接，勿重复 run」引导句（D-004） |
| 修改 | src/stages/execute.js | Wave 执行 prompt 加 wt-commit 合并引导段（~1 行） |
| 新增 | NEW:test/cli-roundtrip-merge.test.mjs | 两段引导的文本断言 |

## 接口定义

- `completeStep` 签名不变；新增内部行为：完成时尾接渲染下一步（对外可见——agent 收到的 stdout 变长，末尾多一段下一步 prompt）。
- `outputStep` 评审确认 import 已在 `run/complete.js:45` 在场——零新增 import。
- 本变更接口面：0 端点（无对外 API 变更）。

## 生命周期契约表

生命周期契约：不涉及（本变更不改 session/lease/daemon/state transition 语义——completeStep 的完成管线照常，只是输出追加了渲染段）。

## 数据模型

无 schema 变更——进度库 stages/steps 表照常写入，事件流（watcher）格式不变。

## 测试 seam 约定

- `sillyspec run <stage> --done`：能查出「完成后 stdout 含下一步 prompt 尾接段」；查不出「agent 是否真的省了一次调用」（需平台侧 agent_run_logs 验证，留二期）。
- `outputStep` 兼容性：能查出旧路径单独渲染仍工作（幂等——同一步重复渲染不报错）。
- execute prompt 文案：能查出引导段在场（grep 断言）。

## 兼容策略（brownfield 必填）

- 旧行为完全保留：`run <stage>` 单独渲染、`--done` 不带尾接的旧 agent 均可正常使用
- 尾接是**追加**不是替代——不删除任何现有输出行
- 断点续跑：中断后重跑 `--done`，尾接的下一步 prompt 会再次输出（幂等）

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | completeStep 输出 + 下一步 prompt 合计超 CLI 截断上限 → 尾接段被截 | P2 | 尾接前打印分隔线；检查 outputStep 的截断逻辑是否对追加段独立截断；实测确认 |
| R-02 | 旧 agent/旧 skill 不认识尾接段，可能重复调用 run <stage> 渲染同一步 | P2 | 幂等兼容——重复渲染不报错不推进，agent 侧浪费一轮但不出错；skill 文档同步说明 |
| R-03 | waiting 步（requiresWait）被尾接 → agent 看到 prompt 但无法 --done | P2 | 设计排除——requiresWait 步不尾接（需先 --wait/--answer） |
| R-04 | 省轮效果低于预期（agent 行为不变，只是 prompt 到得更早） | P2 | 接受：设计目标 15-20% 是估算；实测后可迭代（如 burst 化多步尾接） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案①（--done 尾接）；FR-01 | 已覆盖 |
| D-002@v1 | 总体方案②（prompt 引导）；FR-02 | 已覆盖 |
| D-003@v1 | 总体方案③（接受减半）；FR-03 | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=small）
- [x] 引用所有当前版本 D-001@v1~D-003@v1（决策追踪表全覆盖）
- [x] 生命周期关键词未命中（不改状态机语义，已写豁免短语）
- [x] UI 原型：不适用——纯 CLI 后端变更
- [x] 无「⚠️ 自审存疑」残留项
