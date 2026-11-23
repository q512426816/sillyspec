---
author: flow-machine-draft
created_at: 2026-11-23T06:29:59.143Z
---
# 提案书（Proposal）— 2026-11-23-probe1-bracket-path-blind

## 动机

任务原话转写：探针1方括号路径失明修复

动机与背景：
verify-probes.js 探针1用 /[*?[\]]/ 判断 glob，把 Next.js 动态路由 [id]、Vue [...slug] 这类方括号字面路径整文件跳过；报告仍输出「✅ 无 TODO 命中」。2026-11-22-workspace-redesign 归档时隐藏的 useWorkspaceActivity 占位 TODO 正是靠这条盲区过关，变更名义完成实则未接线。

成功标准：
- 方括号字面路径（含 [id] / [...slug]）在主仓或 worktree 真实存在时，按具体文件扫描，TODO/FIXME 可被命中
- 真 glob 路径（含 * 或 ? 通配）仍归入 globEntries，不误扫
- glob 项或跳过项非空且命中为空时，报告不再输出「✅ 无 TODO/FIXME/尚未实现 标记命中」，改为显式 ⚠️ 说明结论不完整
- 新增回归测试覆盖方括号字面路径命中、真 glob 不入扫描、报告措辞三态，相关测试全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 方括号字面路径（含 [id] / [...slug]）在主仓或 worktree 真实存在时，按具体文件扫描，TODO/FIXME 可被命中
2. 真 glob 路径（含 * 或 ? 通配）仍归入 globEntries，不误扫
3. glob 项或跳过项非空且命中为空时，报告不再输出「✅ 无 TODO/FIXME/尚未实现 标记命中」，改为显式 ⚠️ 说明结论不完整
4. 新增回归测试覆盖方括号字面路径命中、真 glob 不入扫描、报告措辞三态，相关测试全绿

## 成功标准（可验证）

1. 方括号字面路径（含 [id] / [...slug]）在主仓或 worktree 真实存在时，按具体文件扫描，TODO/FIXME 可被命中
2. 真 glob 路径（含 * 或 ? 通配）仍归入 globEntries，不误扫
3. glob 项或跳过项非空且命中为空时，报告不再输出「✅ 无 TODO/FIXME/尚未实现 标记命中」，改为显式 ⚠️ 说明结论不完整
4. 新增回归测试覆盖方括号字面路径命中、真 glob 不入扫描、报告措辞三态，相关测试全绿
