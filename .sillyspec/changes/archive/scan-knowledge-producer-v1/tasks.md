---
author: qinyi
created_at: 2026-06-19T11:10:00+08:00
---

# Tasks: scan-knowledge-producer-v1

## task-01: 定义 knowledge 文件结构和写入契约
- 在 init.js 中补充 conventions.md / patterns.md / known-issues.md 模板初始化
- 或在 scan 步骤中按需创建（第一版按需创建更合适）
- 定义写入格式规范

## task-02: scan 阶段新增 Extract Project Knowledge 步骤
- 在 src/stages/scan.js 的 steps 数组中插入新步骤
- 步骤位置：文档生成步骤之后、postcheck 之前
- prompt 包含分类定义 + 硬规则 + INDEX.md 格式示例

## task-03: scan prompt 注入 knowledge 写入规则
- 确保步骤 prompt 包含 5 条硬规则
- 注入 knowledge 目录路径（spec_root 模式适配）

## task-04: postcheck 校验 knowledge 产物路径与索引
- 在 scan-postcheck.js 新增 knowledge 校验规则
- 覆盖本地模式和平台 spec_root 模式
- INDEX.md 引用完整性检查

## task-05: 补测试
- 覆盖本地模式 knowledge 产物校验
- 覆盖平台 spec_root 模式路径隔离
- 覆盖 INDEX.md 引用完整性（虚假引用 → fail）
