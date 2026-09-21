---
author: qinyi
created_at: 2026-09-21 11:48:28
---
# 需求规格（Requirements）— R5 效率优化第 1 批

## 角色
| 角色 | 说明 |
|---|---|
| 编排 agent | sillyspec run execute 的主代理，按派发指令组装子代理 prompt 与回收审查 |
| 实现子代理 | 每 task/batch 一个独立上下文，读材料包实现源码 |
| R5 验收执行者 | 重放对撞实验并按硬门判法核验 |

## 功能需求

### FR-01: plan 并批默认与护栏提醒
覆盖决策：D-002@v1
#### 场景：文件正交任务默认并批
Given plan 生成阶段，Wave 内存在 target_files 互斥且无 provides/expects_from 契约链的任务 ≥2 个
When 编排 agent 按 plan 步骤指令拆 Wave
Then 指令要求默认并批 2–4 任务/批，且并批后整 Wave 批数 ≥ min(3, 该 Wave 任务数)（N≥3 即至少 3 批）
#### 场景：postcheck 正交未并批提示
Given tasks/plan 已落盘，某 Wave 任务文件正交但全未并批
When plan-postcheck 运行 checkBatchAdvisory
Then 产出 warning 级提示（code=batch_orthogonal_unbundled），不阻断 --done
#### 场景：护栏缺口提示
Given 某 Wave 并批后批数 < min(3, 任务数)
When plan-postcheck 运行 checkBatchAdvisory
Then 产出 warning 级提示（code=wave_inflight_below_floor），不阻断；单 Wave 可双码并存（返回数组）

### FR-02: execute 任务材料包（只摘不译）
覆盖决策：D-003@v1
#### 场景：两段式装配
Given 变更目录含 design.md（「接口定义」「文件变更清单」节）与 tasks/task-NN.md
When 调用 assembleExecuteTaskMaterials
Then 落盘 materials/task-NN.md：稳定段（固定节名机械选取原文 + 签名锚点）在前、专属段（task 要点 + allowed_paths + 符号锚点）在后；稳定段内容与 design.md 原文逐字一致（无语义转写）
#### 场景：上限截尾
Given 材料包超过 24576B
When 装配完成
Then 专属段尾部优先截；稳定段超限按节优先级（接口定义 > 文件变更清单）逐节截断，每节保留节头 + 首个代码块/表格 + 回源指引行；truncated=true 返回
#### 场景：派发引用
When buildWavePrompt 渲染
Then 「子代理 prompt 要点」含材料包路径行与「先读材料包、按锚点回源核对」指令

### FR-03: 派发契约（轮数纪律 / 返回契约 / 回收瘦身）
覆盖决策：D-001@v1, D-002@v1
#### 场景：轮数纪律注入
When buildWavePrompt 渲染
Then 派发要点含三行：相邻同文件改动合并单次 Edit / TodoWrite 阶段边界用不中途连发 / 测试验证合并单次 Bash 跑完
#### 场景：子代理返回契约
When 编排 agent 组装子代理 prompt
Then 含返回契约：≤25 行结构化摘要（verdict=done|blocked / 触碰文件数 / 测试一行结果 / 偏差说明），细节不贴正文
#### 场景：回收瘦身
When 回收约定段渲染
Then 含「审查回收输出 = verdict 一行 + blockers + review.json 路径，细节按需 Read 工件」；git diff 对账逻辑零改动

### FR-04: 错键探针套件
覆盖决策：D-002@v1
#### 场景：错键形态可判
Given fixtures 含三类 R4 真实错键形态（键名单复数错配 / 前后端 payload 键漂移 / 路径段后缀错配）
When 测试以 fixtures 喂 verify-probes 键原语（extractPayloadKeys / extractFrontendPayloadFields / isSegmentSuffix）
Then 原语对错键形态判不匹配/不覆盖（防线敏感性机械可证）

## 非功能需求
- 兼容性：Windows/Linux/macOS 路径与换行；既有 warning 机制先例（{ok,errors,warnings}）同构
- 可回退：全部为 prompt 渲染 + 新增导出函数 + 测试资产，无 schema/状态机改动，单提交可 revert
- 可测试：五件新测试 + 全量存量零回归

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-03 | B-⑥ 轮数纪律进派发契约（B-① 验靶换位） |
| D-002@v1 | FR-01, FR-02, FR-03, FR-04 | 五项范围与红线 |
| D-003@v1 | FR-02 | 只摘不译 + 稳定段先行 + 上限截尾 |
