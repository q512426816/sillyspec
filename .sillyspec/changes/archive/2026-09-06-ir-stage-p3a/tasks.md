---
author: qinyi
created_at: 2026-09-07T00:25:17+08:00
---

# 任务清单（Tasks）

- [x] task-01: taskcard 骨架与 taskcard-rules 增加 target_files 字段支持
- [x] task-02: plan 阶段 prompt 填写指引（src/stages/plan.js 任务清单步 + TaskCard 生成步）
- [x] task-03: plan-postcheck validateTargetFiles 检查（严格解析 + 存在性/格式核验 + design/allowed_paths 双交叉）
- [x] task-04: verify-postcheck reconcileTargetFiles 纯函数（三源 actual 口径 + 三类差集 + 过滤降级）(depends_on: task-03)
- [x] task-05: gates.js verify 块接线 reconcileTargetFiles（阻断语义照先例）(depends_on: task-04)
- [x] task-06: 测试套件 test/plan-target-files.test.mjs（声明核验 + 对账差集 + 两形态×三模式矩阵 + 门禁冒烟）(depends_on: task-03,task-04,task-05)
