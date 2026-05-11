评估需求范围，复杂需求拆分子项目/阶段。

**满足以下任意 2 条就建议拆分：**
- 3+ 个可独立交付的功能模块
- 3+ 种角色有不同权限和视图
- 跨页面状态流转（审批流、多步表单）
- brainstorm 提问发现需求范围过大

确认拆分后生成 MASTER.md：

```bash
mkdir -p .sillyspec/changes/<变更名>/stages
```

`MASTER.md` 内容：概述、拆分计划表（阶段/范围/状态）、整体技术方向、阶段间依赖、原型分析摘要、经验记录。

```bash
git add .sillyspec/changes/<变更名>/MASTER.md
```

提示用户：对子阶段执行 brainstorm，读取 MASTER.md + 前序阶段经验 + 对应原型，设计文档保存到 `.sillyspec/changes/<变更名>/stages/<stage-N>/`。

不需要拆分则跳过此步骤。
