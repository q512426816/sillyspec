---
author: flow-machine-draft
created_at: 2026-11-23T06:29:59.143Z
---
# 任务注册表（Tasks）— 2026-11-23-probe1-bracket-path-blind

- [x] task-01: 方括号字面路径（含 [id] / [...slug]）在主仓或 worktree 真实存在时，按具体文件扫描，TODO/FIXME 可被命中
- [x] task-02: 真 glob 路径（含 * 或 ? 通配）仍归入 globEntries，不误扫
- [x] task-03: glob 项或跳过项非空且命中为空时，报告不再输出「✅ 无 TODO/FIXME/尚未实现 标记命中」，改为显式 ⚠️ 说明结论不完整
- [x] task-04: 新增回归测试覆盖方括号字面路径命中、真 glob 不入扫描、报告措辞三态，相关测试全绿
