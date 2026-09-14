---
plan_level: full
---

# 实现计划（Plan）

## 来源
brainstorm 四件套（design.md Grill 复核 passed 版）：学习闭环收口五子机制——归类提议 / knowledge classify / knowledge-baseline 棘轮 / 机械注入升级 / stats 矩阵。

## Wave 1（并行，无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02
- task-03
- task-04

## Wave 3（依赖 Wave 2）
- task-05

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 基础设施：knowledge-hits.js + 子命令路由注册 | W1 | P0 | — | FR-02..05 底座, D-001@v1, D-002@v1 | hits.jsonl append/读（单行 JSON+'\n'、残行容忍）；stages/knowledge.js cmdKnowledge switch 注册 classify/stats + available 列表（index.js 仅转发无需改）；**注册用动态 import**（先例 index.js:2613）——W1 时点 classify/stats 实现尚未存在，静态 import 会断链整个 knowledge 命令 |
| task-02 | classify 主体：双格式寻址 + 四步迁移 | W2 | P0 | task-01 | FR-02, D-001@v1 | 标题行 `## <qlId> \|` ∪ 尾注 `（<qlId>）` ∪ --title 兜底；追加目标文件/INDEX 路由行（keywords 显式或标题分词、anchor=条目标题）/删除/幂等/--dry-run；归类审计落 hits.jsonl |
| task-03 | 归类提议器 + 棘轮 | W2 | P0 | task-01 | FR-01, FR-03, D-001@v1 | complete-handlers.js handleQuickStageCompletion 用进程内 outputText×matchKnowledge 渲染提议（纯新增形态/未命中不渲染）；handleArchiveConfirmStep 抽审清单；knowledge-baseline 计数（validate 同款正则 /^#{2,3}\s+\S/gm）超线软警告、降线自动收紧、缺失不启用 |
| task-04 | 机械注入（升级既有） | W2 | P0 | task-01 | FR-04, D-002@v1 | prompt.js 升级 {KNOWLEDGE_HIT_REPORT} 至正文级（top-3 按 INDEX 行序取前 3 不同 file、单文件截断、未命中零字节）+ hits 落盘（旧 report.json 兼容）；quickFirstStep 注入（readQuickGuardField('taskDescription')）；buildWavePrompt Wave 任务名串 |
| task-05 | stats 矩阵 + 测试收口 + 模块卡同步 | W3 | P1 | task-02, task-03, task-04 | FR-05, D-002@v1 | knowledge-stats.js 聚合（近 N 天矩阵+死重对照 INDEX 全集）+ stats 测试；模块卡按 _module-map 归属同步（stages/runtime 域卡 + changelog sidecar） |

## 关键路径
task-01 → task-02/03/04（并行）→ task-05

## 全局验收标准
1. 所有单元测试通过（含新增 4 个测试文件，全量 npm test 0 fail）
2. 集成冒烟：临时仓实测 classify 全链路（uncategorized 条目迁移→INDEX 路由→validate 通过）+ quick --done 提议渲染 + 注入段出现在 step1 prompt（本变更判级 integration-critical，CLI 子进程级集成证据必须有）
3. brownfield：INDEX/baseline/hits.jsonl 缺失时全链路 no-op 不炸；旧 knowledge-hit-report.json 照旧落盘
4. 存量 uncategorized 17 条全量迁移成功（标题行 9 条 + --title 兜底 8 条）；尾注格式以单测构造样例实测（实测存量为 0 条，plan-review X-9）

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02, task-03 | AC-2（classify 全链路集成冒烟）、AC-4（存量条目迁移实测） |
| D-002@v1 | task-01, task-04, task-05 | AC-2（注入段 prompt 实证）、AC-1（stats 测试） |
