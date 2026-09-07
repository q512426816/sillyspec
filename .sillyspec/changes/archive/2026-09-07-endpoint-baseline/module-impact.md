---
author: qinyi
created_at: 2026-09-07T09:10:00+08:00
---

# 模块影响分析（Module Impact）— 端点 before/after 基线

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 说明 |
|---|---|---|---|
| core-engine | src/endpoint-baseline.js | 新增 | capture/diff 纯函数（复用 endpoint-extractor 组装） |
| cli-entry | src/index.js | 修改 | endpoints baseline 子命令（case 子分发改造） |
| stages | src/stages/execute.js | 修改 | Step3 基线指引一行 |
| docs-consistency | src/archive-delta.js | 修改 | 第五源 + After 端点增删节 |
| （测试域） | test/endpoint-baseline.test.mjs、test/archive-delta.test.mjs | 新增/修改 | 测试 |

## 未匹配文件

| 文件 | 处置说明 |
|---|---|
| src/endpoint-baseline.js | 新文件（建议归 core-engine，后续 modules 同步补录） |

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/core-engine.md` | 更新模块卡（endpoint-baseline） | done |
| `modules/cli-entry.md` | 更新模块卡（baseline 子命令） | done |
| `modules/stages.md` | 更新模块卡（Step3 指引） | done |
| `modules/docs-consistency.md` | 更新模块卡（delta 第五源） | done |
| `_module-map.yaml` | endpoint-baseline.js 后续批量补录 | skipped |
