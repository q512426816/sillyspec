---
author: qinyi
created_at: 2026-05-13T11:05:00
---

# Requirements: CLI 子代理强制 + currentChange 自动探测

## 功能需求

### FR-1: currentChange 自动探测
**Given** 项目有一个非 archive 的变更目录
**When** 用户运行 `sillyspec run plan` 且未指定 `--change`
**Then** 系统自动探测唯一变更目录并设置 `progress.currentChange`

**Given** 项目有多个非 archive 变更目录
**When** 用户运行 `sillyspec run plan` 且未指定 `--change`
**Then** 系统不自动设置，保持 null，不报错

### FR-2: Plan 蓝图单步协调器
**Given** plan.md 已生成且包含 N 个任务
**When** "展开任务并分组"步骤完成
**Then** 系统插入 1 个"生成任务蓝图（子代理并行）"步骤（而非 N 个）

**Given** 协调器步骤的 prompt
**When** AI 执行该步骤
**Then** prompt 明确要求使用 Agent tool 启动子代理，并包含子代理 prompt 模板

### FR-3: Execute Wave 强制子代理
**Given** Execute 阶段输出 Wave prompt
**When** AI 执行某个 Wave
**Then** prompt 明确要求每个任务由独立子代理执行，主代理只做协调和审查

### FR-4: Brainstorm HTML 原型可选步骤
**Given** brainstorm 阶段进入"HTML 原型生成"步骤
**When** 设计包含可视化元素（UI/布局/流程图）
**Then** AI 生成独立 HTML 文件保存到变更目录

**When** 设计无可视化意义（纯后端/配置）
**Then** AI 跳过此步骤

## 非功能需求

### NFR-1: 向后兼容
- 不使用 `--change` flag 时行为与修复前一致（除了自动探测）
- 已有的 progress.json 不受影响
- 其他阶段（brainstorm/verify/quick/archive）不受影响

### NFR-2: 单文件改动原则
- 每个文件的改动内聚，不跨文件扩散副作用
- 新增函数（resolveChangeDir、autoDetectChange、buildCoordinatorStep）都有明确单一职责

### NFR-3: 无新依赖
- 不引入任何 npm 包
- 纯 Node.js fs/path 实现
