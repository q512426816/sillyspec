---
schema_version: 1
doc_type: module-card
module_id: eval
author: qinyi
created_at: 2026-10-15T20:05:00+08:00
updated_at: 2026-10-15T20:05:00+08:00
---
# eval

## 职责

A/B 评测域——客观量化「同一个 agent，走 SillySpec 流程（B 臂）比裸跑（A 臂）好多少」：同任务、同模型、同判分脚本（每任务一个 verify.mjs，退出码 0=通过），唯一变量是有没有 SillySpec。产出分臂通过率 + Wilson 95% 置信区间、Δ(B−A) 区间、token/费用/耗时，全部落 SQLite（eval/results/eval.db，gitignored）。

## 定位

评测基础设施，不是被测产品代码：`eval/run.mjs`（入口：--dry-run 零 token 验管道 / --preflight 探活 / --pilot 真跑 / --report / --set-baseline）+ `eval/lib/`（adapters=dry-run 假 agent 与 headless CLI 适配、tasks=任务加载与内容指纹、workdir=每 (task,arm) 独立工作副本、runner/reader/db）。任务库 `eval/tasks/<id>/` 四件套：task.json（id/instruction）· verify.mjs（cwd=被测工作目录）· files/（工作副本脚手架，进指纹）· solution/（dry-run 参考解，不进 agent 副本、不进指纹）。

## 契约摘要

- **任务判分契约**：verify.mjs 以被测工作目录为 cwd、退出码 0=通过；期望值硬编码独立于实现；新增任务放目录即被 loadTasks 自动发现（id 字典序、重复 id 拒载）。
- **种植缺陷探针**（2026-10-15-eval-planted-defect-probe 引入，004-phase-stats）：instruction 只命名表层契约，隐含输入由固定 fixture 承载（每类唯一合理解）——判别力=「只做表面」必拒、「覆盖隐含面」必过，由 test/eval-planted-defect-probe.test.mjs 钉死。公平性红线：隐含面不得破坏单遍扫描类合理解的唯一性（见该变更 design 风险节 fixture v1→v2 迭代留痕）。
- **指纹分组**：tasksFingerprint 覆盖 task.json+verify.mjs+files/（solution/ 排除）——指纹变化=评测分组正常演进，--set-baseline 语义照旧。
- **零 token 验证链**：--dry-run 假 agent 走整条管道（workdir→verify→落库→报告），mixed 模式按任务号奇偶确定性制造两臂差异。
