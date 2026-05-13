---
author: qinyi
created_at: 2026-05-13T09:02:46
---

# Dashboard 双层布局优化 — 技术方案

## 需求背景

用户反馈：dashboard 展示内容太乱。

**核心诉求**：监控多个项目

**问题分析**：
- 布局混乱，信息密度过高
- 所有区域都有问题（左栏、中间、右栏、顶部）
- 现有三栏布局更适合单项目深度查看，不适合多项目监控

## 设计方案

### 整体架构：双层布局

Dashboard 采用上下分层结构：

| 区域 | 默认占比 | 可拖动范围 | 说明 |
|------|----------|------------|------|
| 上层概览 | 30% | 15%-75% | 多项目卡片列表 |
| 下层详情 | 70% | - | 单项目详情 |

### 上层：多项目概览

**布局**：水平滚动的紧凑卡片列表

**卡片规格**：
- 尺寸：280px × 120px
- 间距：16px
- 圆角：12px

**卡片内容**：
| 位置 | 内容 | 样式 |
|------|------|------|
| 左上 | 项目名称 | 16px, 粗体 |
| 右上 | 最近活动时间 | 11px, 灰色 |
| 中部 | 当前阶段标签 | 徽章样式 |
| 底部 | 进度条 + 百分比 | 6px 高度 |

**状态颜色编码**：
| 状态 | 背景色 | 文字色 |
|------|--------|--------|
| 进行中 | #DBEAFE | #1D4ED8 |
| 已完成 | #D1FAE5 | #047857 |
| 未开始 | #F3F4F6 | #6B7280 |

**交互**：
- 鼠标悬停：边框变橙色 (#D97706)，阴影增强
- 当前选中：橙色边框 + 外发光效果

### 下层：详情区域

**三栏布局**（默认 1:1:1，可拖动）：

| 栏 | 默认占比 | 最小宽度 | 内容 |
|----|----------|----------|------|
| 左栏 | 33.33% | 150px | 项目信息 |
| 中栏 | 33.33% | 200px | Pipeline 阶段流程 |
| 右栏 | 33.33% | 200px | 日志/详情 |

**左栏：项目信息**
- 项目名称
- 项目路径
- 当前阶段
- 进度（步骤数）
- 耗时

**中栏：Pipeline**
- 阶段时间线
- 每个阶段显示图标、名称、状态
- 当前阶段高亮

**右栏：日志**
- 最近活动列表
- 等宽字体显示
- 状态颜色编码

### 拖动调整

**垂直拖动**（概览 ↔ 详情）：
- 分割线高度：6px
- 拖动时变为橙色 (#D97706)
- 限制范围：概览 15%-75%
- 显示实时比例提示

**水平拖动**（三栏分割）：
- 分割线宽度：4px
- 拖动时变为橙色
- 每列最小宽度：10%
- 显示实时列宽提示

### 布局记忆

使用 `localStorage` 持久化：
```javascript
const STORAGE_KEY = 'dashboard-layout-v2';
{
  overviewHeight: 30,      // 概览区域百分比
  columnWidths: [33.33, 33.33, 33.33]  // 三栏宽度百分比
}
```

### 动画效果

- 项目切换：详情区域淡入动画（200ms fade-in）
- 分割线悬停：背景色过渡（200ms）
- 卡片悬停：阴影过渡（200ms）

## 文件变更清单

### 修改文件

| 文件 | 变更 |
|------|------|
| `packages/dashboard/src/App.vue` | 重构布局为双层结构，添加拖动逻辑 |
| `packages/dashboard/src/components/ProjectOverview.vue` | 新增概览卡片容器 |
| `packages/dashboard/src/components/ProjectCard.vue` | 新增项目卡片组件 |
| `packages/dashboard/src/components/DetailPanel.vue` | 调整为三栏布局 |
| `packages/dashboard/src/composables/useLayout.js` | 新增布局管理 composable |

### 新增组件

| 组件 | 职责 |
|------|------|
| `ProjectCard.vue` | 单个项目卡片展示 |
| `VResizeHandle.vue` | 垂直拖动分割线 |
| `HResizeHandle.vue` | 水平拖动分割线 |

## 技术实现要点

### 1. 布局结构

```vue
<template>
  <div class="dashboard">
    <!-- 上层概览 -->
    <div class="overview-section" :style="{ height: layout.overviewHeight + '%' }">
      <ProjectOverview />
    </div>

    <!-- 垂直拖动分割线 -->
    <VResizeHandle @resize="handleVResize" />

    <!-- 下层详情 -->
    <div class="detail-section">
      <DetailPanel :column-widths="layout.columnWidths" />
    </div>
  </div>
</template>
```

### 2. 拖动实现

```javascript
// 垂直拖动
function onVResize(deltaY) {
  const newHeight = overviewHeight + deltaY;
  const newPercent = (newHeight / windowHeight) * 100;
  if (newPercent >= 15 && newPercent <= 75) {
    layout.overviewHeight = Math.round(newPercent * 10) / 10;
    saveLayout();
  }
}

// 水平拖动
function onHResize(colIndex, deltaX) {
  const containerWidth = detailContent.offsetWidth;
  const deltaPercent = (deltaX / containerWidth) * 100;
  // 更新对应列宽度...
}
```

### 3. 状态管理

使用 `useLayout` composable：
```javascript
export function useLayout() {
  const layout = reactive({
    overviewHeight: 30,
    columnWidths: [33.33, 33.33, 33.33]
  });

  function loadLayout() {
    const saved = localStorage.getItem('dashboard-layout-v2');
    if (saved) Object.assign(layout, JSON.parse(saved));
  }

  function saveLayout() {
    localStorage.setItem('dashboard-layout-v2', JSON.stringify(layout));
  }

  function resetLayout() {
    layout.overviewHeight = 30;
    layout.columnWidths = [33.33, 33.33, 33.33];
    saveLayout();
  }

  return { layout, loadLayout, saveLayout, resetLayout };
}
```

## 验收标准

### 功能验收
- [ ] 上层显示所有项目卡片，可水平滚动
- [ ] 点击卡片切换详情区域内容
- [ ] 垂直拖动可调整概览/详情比例（15%-75%）
- [ ] 水平拖动可调整三栏宽度（每列最小 10%）
- [ ] 刷新页面保持布局设置
- [ ] 重置按钮恢复默认布局

### UI 验收
- [ ] 卡片状态颜色正确（蓝色/绿色/灰色）
- [ ] 选中卡片有橙色高亮
- [ ] 拖动时分割线变橙色
- [ ] 切换项目有淡入动画
- [ ] 实时显示比例提示

### 兼容性验收
- [ ] 窗口缩放时布局自适应
- [ ] 最小宽度限制生效
- [ ] 拖动不破坏页面结构

## 自审检查

### 需求覆盖 ✅
- [x] 多项目监控核心诉求
- [x] 布局混乱问题解决
- [x] 信息密度优化

### 约束一致性 ✅
- [x] 与现有 Vue 3 + Naive UI 架构一致
- [x] 遵循 CONVENTIONS.md 组件命名规范
- [x] 不破坏现有 WebSocket 通信

### 真实性 ✅
- [x] 组件名称来自现有代码库
- [x] 新增组件标注为"新增"
- [x] localStorage 键名唯一（dashboard-layout-v2）

### YAGNI ✅
- [x] 无冗余功能
- [x] 拖动范围有合理限制
- [x] 不引入额外依赖

### 验收标准 ✅
- [x] 功能验收具体可测试
- [x] UI 验收有明确颜色/数值
- [x] 兼容性验收覆盖边界情况
