---
plan_level: full
---
# plan — verify-reuse-friction 实施计划

## 1. 阶段划分

四 Wave，Wave 编号以任务卡 frontmatter wave 字段为唯一口径（与 design/tasks.md 一致）：

- W1（task-01 → task-02，串行）：快照口径死循环修复 → 快照失败可见性+摩擦记账（两卡共触 src/run/verify-quality-scan.js 的快照 catch 段，01→02 串行）。
- W2（task-03 → task-04，串行）：code-face-key 单点+两指纹树键化（依赖 01 同文件）→ 复用判定落盘观测（依赖 03 同文件）。
- W3（task-05，依赖 02 共触 gates.js）：纯事实门前移。
- W4（task-06 → task-07 串行共触 verify-postcheck.js，06 显式依赖 04（共触该文件）、07 经 06 传递覆盖；task-08 触 index.js/wt-commit.js 与他卡零共触、独立并行）：trace repo 归属 → 锚点窗口；wt-commit 识别。
- 收尾（task-09，依赖全部）：模块卡+changelog 同步、node test/run-tests.mjs 全量回归。

## 2. 依赖边（depends_on）

- task-02 → task-01（共触 verify-quality-scan.js）；task-03 → task-01；task-05 → task-02（共触 gates.js）；task-04 → task-03；task-07 → task-06（共触 verify-postcheck.js）；task-06 → task-04（共触 verify-postcheck.js，跨波显式边）；task-03 → task-02（共触 verify-quality-scan.js，跨波显式边，04 经 03 传递覆盖）；task-09 → task-01..08 全部。

## 3. 每任务完成标准

任务卡 frontmatter acceptance 逐条 + verify 命令绿。勾选时机：实现+相关测试绿当场勾（tasks.md + 卡 status）。

## 4. 协调与风险

- worktree-apply.js 与活跃变更 2026-10-09-close-trace-single-set 潜在共触：本计划不触该文件；若执行期需触碰，Edit 前重读最新态。
- W4 三任务「先复现后修」：复现测试先行钉住现行缺陷行为，修不动面时如实降级记录。
- 声明纪律：落点/范围偏差当场回写卡 target_files 与 design 清单（2026-10-09 取证事故 8 处欠账教训）。
