
## ql-20260807-011-d831 | 2026-08-07 19:20:30 | plan TaskCard 规则抽模板 include + 自检清单诚实化（sss.md B4+B5）
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（buildCoordinatorStep 删内联 ~60 行 TaskCard 规则，改 {{include: taskcard-rules}}）
- templates/prompts/taskcard-rules.md（新建：公共格式规则 + 自检清单硬校验 9 / 规范约定 5 分组）
- docs/prompt/_extracted.json（重跑 _extract.mjs 刷新 plan coordinator 步）
- docs/prompt/plan.md（3 处子代理规则段替换为 include + include 指令说明）
- docs/prompt/README.md（include 指令表补 taskcard-rules）
- test/plan-taskcard-include.test.mjs（新建：8 断言回归，防规则内联回流 + include 注入完整性）
需求：落地 sss.md/sss1.md 审计剩余 P2 项 B4+B5——plan Step4 协调器 TaskCard 公共格式规则在 N 个 task 子代理 prompt 间逐字重复（改一处需同步 N 处），且自检清单未区分硬校验字段与规范约定字段（agent 白检 author/created_at/priority/depends_on/blocks）
根因：buildCoordinatorStep 对每个 task 拼相同 ~60 行格式规则字符串；P2.2.3 已建 {{include}} 机制（verify-probes 先例）可复用抽公共片段，收益=维护性 + 可单独校验（token 不省是机制固有）；自检清单 14 字段一锅列，而 validatePlanFeasibility 只硬校验 9 个
方案：新建 templates/prompts/taskcard-rules.md 抽公共规则，src/stages/plan.js buildCoordinatorStep 内联段替换为 {{include: taskcard-rules}}（resolvePromptIncludes 运行时全注入，agent 收到行为不变）；自检清单拆分硬校验 9 字段 vs 规范约定 5 字段；重跑 _extract.mjs 同步 docs/prompt 镜像（plan.md 3 处 + README include 表）；新增回归测试
结果：npm test 全量 0 失败（退出码 0）、lint 72 文件通过、plan 相关 6 测试全过（taskcard-include 8/8、task-numbering 4/4、plan-execute-contract 56/56、plan-optimization 13、plan-postcheck 15、brainstorm-plan-contract 11）；quick 变更边界审计 SAFE
