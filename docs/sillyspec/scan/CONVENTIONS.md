---
author: qinyi
created_at: 2026-05-13T08:37:40
---

# 代码约定

## 框架隐形规则

### 1. 阶段定义规范
所有阶段必须在 `src/stages/` 下定义，并导出 `definition` 对象：

```javascript
export const definition = {
  description: "阶段描述",
  steps: [
    { prompt: "步骤 prompt..." },
    // ...
  ]
}
```

### 2. 步骤 Prompt 铁律
每个步骤的 prompt 必须包含：
- **铁律**：文档是核心资产，代码是文档的产物
- **禁止**编造不存在的 CLI 子命令
- **必须**立即执行 --done 命令
- **文档头部**：author + created_at（精确到秒）

### 3. local.yaml 优先级
执行构建/测试前必须先读 `local.yaml`，优先使用其中配置的命令、路径和环境变量；未配置时才使用默认值。

### 4. 辅助命令独立执行
辅助阶段（`['scan', 'quick', 'archive', 'status', 'doctor']`）在没有活跃变更时也可独立执行。

## 实体继承规范

### ProgressManager 类
位置：`src/progress.js`

核心职责：
- 管理 `.sillyspec/.runtime/sillyspec.db`（SQLite 数据库）
- 提供状态恢复、备份、版本迁移功能
- 纯 Node.js 实现，无外部依赖

关键方法：
- `load()` — 读取进度，自动恢复损坏文件
- `save(data)` — 保存进度，原子写入
- `getStage()` — 获取当前阶段
- `advance()` — 推进到下一步

### Stage Registry
位置：`src/stages/index.js`

- `stageRegistry`: 所有阶段定义的注册表
- `auxiliaryStages`: 可独立执行的辅助命令列表

## 代码风格

### 模块导出
- 阶段定义：使用具名导出 `export const definition`
- 工具函数：具名导出 `export function`
- 类定义：`export class`

### 文件命名
- 阶段文件：小写，`src/stages/<name>.js`
- Skill 文件：`sillyspec-<name>/SKILL.md`
- 配置文件：`.sillyspec/projects/<name>.yaml`

### Prompt 编写规范
1. **操作步骤**：用 `### 操作` 标题，编号列表
2. **输出说明**：用 `### 输出` 标题
3. **铁律强调**：用 `### ⚠️ 铁律` 标题
4. **完成指令**：用 `### 完成后执行` 标题，指定 --done 命令格式

### 进度标记模式
```bash
sillyspec run <stage> --done --output "摘要描述"
```

摘要应简洁描述完成的工作和产出。
