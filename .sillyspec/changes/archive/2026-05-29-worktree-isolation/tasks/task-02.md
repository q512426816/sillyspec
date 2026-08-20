---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-02
title: design.md 文件变更清单解析
priority: P0
estimated_hours: 2h
depends_on: []
blocks: [task-03]
allowed_paths:
  - src/change-list.js (新增)
---

# task-02: design.md 文件变更清单解析

## 修改文件（必填）
- 新增 `src/change-list.js`

## 实现要求
1. 创建 `src/change-list.js`，导出 `parseFileChangeList` 函数
2. 从 design.md 中解析"文件变更清单"表格，提取文件路径集合
3. 返回 `Set<string>`（文件路径集合，相对路径）
4. 处理表格变体：有无 header 行、操作列不同值（新增/修改/删除/重构等）

## 接口定义（代码类任务必填）

```javascript
import { readFileSync, existsSync } from 'fs'

/**
 * 从 design.md 解析文件变更清单
 * @param {string} designMdPath - design.md 文件路径
 * @returns {Set<string>} 文件路径集合（相对路径，如 "src/worktree.js"）
 */
export function parseFileChangeList(designMdPath) {}
```

### 控制流伪代码
```
parseFileChangeList(designMdPath):
  1. 读取 designMdPath 文件内容（不存在 → 返回空 Set）
  2. 定位"文件变更清单"标题（支持 ## 文件变更清单 / ### 文件变更清单）
  3. 从标题后开始解析表格行，直到遇到下一个 ## 标题或文件末尾
  4. 对每行：
     - 跳过以 |--- 开头的分隔行
     - 跳过以 # 开头或为空的行
     - 匹配表格格式：| 操作 | 文件路径 | 说明 |
     - 提取第二列（文件路径），trim 空格
     - 忽略 .sillyspec/ 开头的路径
     - 忽略空路径
  5. 返回 Set<string>
```

## 边界处理（必填）
- designMdPath 文件不存在 → 返回空 Set（不抛错）
- design.md 中无"文件变更清单"章节 → 返回空 Set
- 表格列数不一致（某些行缺少列）→ 跳过该行，不报错
- 文件路径列有多余空格 → trim 处理
- 操作列值不统一（新增/修改/删除/重命名/重构等）→ 不影响提取，只取路径
- .sillyspec/ 内的文件 → 忽略（不在变更范围内）
- 空路径（空格或 —）→ 忽略
- 同一文件路径出现多次 → Set 自动去重

## 非目标（本任务不做的事）
- 不校验文件是否实际存在
- 不解析操作类型（新增/修改/删除），只提取路径
- 不处理非表格格式（纯列表等）

## 参考
- 参考 design.md 中的表格格式示例
- 项目中已有的 markdown 解析模式（见 `src/stages/plan.js` 的 `parseTaskNames`、`parseTaskCount` 中的正则用法）

## TDD 步骤
1. 创建测试用 design.md，包含标准表格格式
2. 手动验证：`node -e "import('./src/change-list.js').then(m => { const s = m.parseFileChangeList('.sillyspec/changes/2026-05-29-worktree-isolation/design.md'); console.log([...s]) })"`
3. 验证返回值包含预期的文件路径
4. 验证 .sillyspec/ 路径被忽略
5. 测试不存在的文件路径 → 返回空 Set

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | 解析当前变更的 design.md | 返回 Set 包含 src/worktree.js、src/change-list.js、src/worktree-apply.js、src/hooks/worktree-guard.js 等 |
| AC-02 | .sillyspec/ 开头的路径 | 不出现在返回值中 |
| AC-03 | 不存在的文件路径 | 返回空 Set，不抛错 |
| AC-04 | 无"文件变更清单"章节的 design.md | 返回空 Set |
| AC-05 | 表格有多余空格 | 正确 trim 并提取路径 |
