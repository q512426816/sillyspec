---
author: qinyi
created_at: 2026-05-13T09:03:30
---

# Dashboard 双层布局优化 — 提案

## 动机

用户反馈 Dashboard 展示内容太乱，核心诉求是**监控多个项目**。

现有三栏布局更适合单项目深度查看，在多项目监控场景下存在以下问题：
- 信息密度过高，难以快速定位
- 布局混乱，缺乏清晰的信息层次
- 需要在多个面板间频繁切换

## 变更范围

### 新增组件
- `ProjectCard.vue` — 项目卡片组件
- `VResizeHandle.vue` — 垂直拖动分割线
- `HResizeHandle.vue` — 水平拖动分割线
- `useLayout.js` — 布局管理 composable

### 修改组件
- `App.vue` — 重构为双层布局结构
- `ProjectOverview.vue` — 调整为卡片容器
- `DetailPanel.vue` — 调整为三栏布局

### 新增文件
- `packages/dashboard/public/prototype-dashboard.html` — 交互原型

## 不在范围内

- 后端 API 变更
- WebSocket 协议变更
- 数据模型变更
- 新增功能（仅布局优化）

## 成功标准

### 用户可感知
- 能在一个屏幕内快速浏览所有项目状态
- 拖动调整布局符合直觉
- 刷新页面保持布局设置

### 技术指标
- 原型与实现一致性 > 90%
- 拖动响应延迟 < 50ms
- 布局持久化可靠性 100%
