---
author: flow-machine-draft
created_at: 2026-10-08T01:03:04.661Z
---
# 任务注册表（Tasks）— 2026-10-08-thin-done-dirty-gate-and-paren-attribution

- [x] task-01: 全角/半角/混合括号与 thin 前缀形态的变更名提交都能被 parseChangeNamesFromSubject 解析；detectPatchDrift 对全角括号交付提交正确判 drifted
- [x] task-02: flow done 在 dirtyWarned>0 且无显式处置时停在 patch 子步（exit 1、半态可重入、不归档）；--freeze-dirty 并入照旧；新增 --accept-dirty-gap 显式接受缺口（缺口数随 change-patch.json 留痕）
- [x] task-03: 提交后重跑：patch 子步重跑自动并入已提交 src（漂移/全量冻结路径均可）
- [x] task-04: 全量测试绿；flow-protocol ⑥b 的旧行为断言按新门语义更新（行为变更是本变更目的，非迁就）
- [x] task-05: 不做归档态 --refreeze 入口（阻断门从源头消除坏状态；存量坏归档由各仓协议重入处理，后续如需另开变更——设计留档）
