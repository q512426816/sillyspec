# 合成时间线快照 — 2026-09-28-known-failures-hardening

> 烤制于归档链（2026-09-28T07:01:54.163Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-09-28-known-failures-hardening — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
14:39:48  🁢 变更诞生（工件 frontmatter created_at）
14:50:13  📝 requirements.md 内容变更
14:50:13  📝 design.md 内容变更
14:50:13  📝 tasks.md 内容变更
14:50:13  ✅ checked 0→4
14:50:13  ⚠️ fake-check  tasks 勾选 task-01、task-02、task-03、task-04 无对应提交（消息不含该 task id）且无…
14:50:30  📝 requirements.md 内容变更
14:50:30  🔀 309f6ffa  fix(gate): known_failures 豁免收紧与分层入库——锚定式语法（^…/$… 整行正则）+…

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈14:50:13   匹配语义——锚定式语法 + 泛用裸模式停用 + exemptedBy 追加字段 + P…  309f6ffa
task-02  ≈14:50:13   分层入库——known-failures.yaml（24 条审计迁移）+ loader…  309f6ffa
task-03  ≈14:50:13   裁判披露——锚定与裸子串命中分计、裸命中收敛提示 (FR-04)              309f6ffa
task-04  ≈14:50:13   测试 +11 断言（锚定豁免、M1 kill-shot 三连、兼容非硬行、裁判披露、合…  309f6ffa

墙钟：10min｜事件 7 条｜提交 1｜任务 4/4 勾选
阶段墙钟：requirements 17s｜design 0s｜tasks 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。