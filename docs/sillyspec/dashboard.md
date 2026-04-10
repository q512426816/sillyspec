# Dashboard

## 启动

```bash
sillyspec dashboard              # 默认端口 3456
sillyspec dashboard --port 8080  # 指定端口
sillyspec dashboard --no-open    # 不自动打开浏览器
```

## 功能

### 📂 项目发现

自动扫描当前目录及子目录中的 `.sillyspec/` 项目，显示项目列表和状态。

### 🔄 流水线视图

可视化展示项目的工作流阶段：

```
scan → brainstorm → plan → execute → verify → archive
  ✅       ✅        ✅      🔄       ⏳
```

每个阶段的完成状态一目了然。

### 📄 文档浏览

浏览项目中 `.sillyspec/docs/` 下的所有文档，按类型分组：

- **scan/** — 代码库扫描文档
- **brainstorm/** — 头脑风暴和设计文档
- **plan/** — 实现计划
- **changes/** — 变更记录
- **archive/** — 归档文档
- **quicklog/** — 快速任务日志

## 统一文档管理

Dashboard 支持新的统一文档结构，所有项目文档集中管理在 `.sillyspec/docs/<project>/` 下。

### 迁移旧结构

如果你有旧版的 `.sillyspec/` 目录（codebase/、specs/、changes/ 等），可以迁移：

```bash
sillyspec docs migrate
```

会自动将旧路径的文档迁移到新的统一结构。
