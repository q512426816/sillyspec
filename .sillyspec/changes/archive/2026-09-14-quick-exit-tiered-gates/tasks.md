---
author: qinyi
created_at: 2026-09-14 09:49:09
---
# 任务清单（Tasks）

<!-- Wave 划分与依赖见 plan.md；TaskCard 明细在 tasks/ 目录（plan Step3 生成） -->

- [x] task-01: 信号层——quick-gate-profile.js 纯函数+风险路径表+矩阵单测 (depends_on: —)
- [x] task-02: 门禁接线——audit 链挂画像+[gate] 落账+--no-docs flag (depends_on: task-01)
- [x] task-03: scope-audit 出口——画像进表格与 --json 双出口+重放回归 (depends_on: task-01, task-02)
- [x] task-04: 规则面——AGENTS.md 判规模条款改写+init 模板镜像 (depends_on: —)
- [x] task-05: 阈值校准——sillyhub 真实图谱重放重算交叉表定稿 THRESHOLDS (depends_on: task-03)
- [x] task-06: 模块卡同步——core-engine/runtime/cli-entry 三卡更新 (depends_on: task-01, task-02, task-03, task-05)
- [ ] ql-20260914-005-5dd0 CLI 自回声归属升级身份优先：平台回传 last_pusher（服务端 ql-20260914-006-e395 已落）后，pusher≠本人一律真冲突堵跨机慢钟盲区；pusher==本人且血统不新于本地才自愈；身份缺失回退血统窗口
