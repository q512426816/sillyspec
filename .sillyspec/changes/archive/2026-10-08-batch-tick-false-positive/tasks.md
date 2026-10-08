---
author: flow-machine-draft
created_at: 2026-10-08T08:12:53.293Z
---
# 任务注册表（Tasks）— 2026-10-08-batch-tick-false-positive

- [x] task-01: watcher.inferEvents：非 tasks 阶段文件（design.md 形态）首现带预勾框不再发 task-done；tasks.md 首现带已勾格仍发（保住「tasks.md 整卡预勾创建」的真实捕捉面）
- [x] task-02: detectBatchCheckCadence 只消费 stage='tasks' 事件（纵深防御）；混流（design 0→8 + 六次独立 tick）判无单拍跳；tasks 段无 CLI 覆盖的单拍大跳仍可检出
- [x] task-03: 既有 watcher/sentinel 相关测试全绿 + 新增误伤场景回归测试
