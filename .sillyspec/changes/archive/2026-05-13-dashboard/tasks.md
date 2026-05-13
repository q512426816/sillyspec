---
author: qinyi
created_at: 2026-05-13T09:03:40
---

# Dashboard 双层布局优化 — 任务列表

## 阶段 1: 布局结构重构

### Task 1.1: 重构 App.vue 为双层布局
- 文件：`packages/dashboard/src/App.vue`
- 拆分为上层概览区域和下层详情区域
- 添加垂直拖动分割线位置

### Task 1.2: 创建布局管理 composable
- 文件：`packages/dashboard/src/composables/useLayout.js`
- 实现布局状态管理
- 实现 localStorage 持久化
- 实现重置功能

## 阶段 2: 概览区域

### Task 2.1: 创建项目卡片组件
- 文件：`packages/dashboard/src/components/ProjectCard.vue`
- 实现 280×120px 卡片布局
- 实现状态颜色编码
- 实现悬停/选中效果

### Task 2.2: 调整 ProjectOverview 组件
- 文件：`packages/dashboard/src/components/ProjectOverview.vue`
- 改为水平滚动卡片容器
- 连接 useWebSocket 数据

## 阶段 3: 详情区域

### Task 3.1: 调整 DetailPanel 为三栏布局
- 文件：`packages/dashboard/src/components/DetailPanel.vue`
- 实现三栏 1:1:1 默认布局
- 添加水平拖动分割线

### Task 3.2: 优化各栏内容展示
- 左栏：项目信息精简
- 中栏：Pipeline 时间线优化
- 右栏：日志格式优化

## 阶段 4: 拖动交互

### Task 4.1: 实现垂直拖动分割线
- 文件：`packages/dashboard/src/components/VResizeHandle.vue`
- 概览 ↔ 详情比例调整
- 限制范围 15%-75%
- 实时比例提示

### Task 4.2: 实现水平拖动分割线
- 文件：`packages/dashboard/src/components/HResizeHandle.vue`
- 三栏宽度调整
- 每列最小 10% 限制
- 实时列宽提示

### Task 4.3: 拖动状态管理
- 文件：`packages/dashboard/src/composables/useLayout.js`
- 拖动中禁用页面选择
- 拖动结束持久化

## 阶段 5: 动画与细节

### Task 5.1: 实现切换动画
- 项目切换淡入效果（200ms）
- 分割线悬停过渡

### Task 5.2: 响应式适配
- 窗口缩放自适应
- 最小宽度限制生效

## 阶段 6: 测试与验收

### Task 6.1: 功能测试
- 拖动功能测试
- 布局记忆测试
- 重置功能测试

### Task 6.2: 兼容性测试
- 窗口缩放测试
- 边界值测试

### Task 6.3: 原型对比验收
- 与 prototype-dashboard.html 一致性验收
