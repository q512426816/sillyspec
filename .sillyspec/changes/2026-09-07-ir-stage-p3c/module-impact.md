---
author: qinyi
created_at: 2026-09-07T05:15:00+08:00
---

# 模块影响分析（Module Impact）— IR 五阶段 P3c

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 说明 |
|---|---|---|---|
| docs-consistency（建议归属） | src/design-facts.js | 新增 | design 事实核验纯函数集（新文件，paths 待 modules 同步补录） |
| runtime | src/run/complete.js | 修改 | 步骤级钩子链新增核验调用（ERROR exit 1） |
| runtime | src/run/prompt.js | 修改 | Step2 _facts.md 注入（fail-soft） |
| cli-entry | src/index.js | 修改 | design-init 命令 case |
| stages | src/stages/brainstorm.js | 修改 | Step3/6 prompt 更新（NEW 写法指引 + 卸责） |
| （测试域） | test/design-facts.test.mjs | 新增 | 测试套件 |

## 未匹配文件

| 文件 | 处置说明 |
|---|---|
| src/design-facts.js | 新文件未入 _module-map（建议归 docs-consistency，下次 modules 同步补录） |
| test/design-facts.test.mjs | 测试域，无需归属 |

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/runtime.md` | 更新模块卡（complete.js 核验接线 + prompt.js 注入） | done |
| `modules/cli-entry.md` | 更新模块卡（design-init case） | done |
| `modules/stages.md` | 更新模块卡（Step3/6 prompt） | done |
| `modules/docs-consistency.md` | 更新模块卡（design-facts 归属注记） | done |
| `_module-map.yaml` | design-facts.js paths 补录（后续 modules 同步批量处理） | skipped |
