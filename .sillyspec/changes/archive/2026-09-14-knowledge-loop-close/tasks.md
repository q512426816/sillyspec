---
author: qinyi
created_at: 2026-09-14 19:45:00
---
# 任务清单（Tasks）

<!-- plan 阶段展开细节（allowed_paths/验收）并写回本文件；Wave 划分见 design.md 总体方案 -->

- [x] task-01: 基础设施——NEW:src/knowledge-hits.js（append/读/残行容忍）+ src/stages/knowledge.js cmdKnowledge 路由注册 classify/stats (depends_on: —)
- [x] task-02: classify 主体——NEW:src/knowledge-classify.js 双格式寻址 + 四步迁移（追加/INDEX 路由行 keywords+anchor/删除/幂等）+ --dry-run/--title 兜底 + NEW:test/knowledge-classify.test.mjs (depends_on: task-01)
- [x] task-03: 归类提议器 + 棘轮——src/run/complete-handlers.js 提议渲染（handleQuickStageCompletion 进程内 outputText×matchKnowledge）+ 抽审清单（handleArchiveConfirmStep）+ knowledge-baseline 软警告棘轮 + NEW:test/knowledge-baseline.test.mjs (depends_on: task-01)
- [x] task-04: 机械注入——src/run/prompt.js 升级 {KNOWLEDGE_HIT_REPORT} 至正文级（top-3+截断+hits 落盘）+ src/stages/quick.js quickFirstStep 注入 + src/stages/execute.js Wave 粒度 + NEW:test/knowledge-inject.test.mjs (depends_on: task-01)
- [x] task-05: stats + 收口——NEW:src/knowledge-stats.js 聚合矩阵/死重对照 + NEW:test/knowledge-stats.test.mjs + 模块卡同步（按 _module-map 归属） (depends_on: task-02, task-03, task-04)
