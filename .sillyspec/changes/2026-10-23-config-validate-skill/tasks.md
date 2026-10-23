---
author: flow-machine-draft
created_at: 2026-10-23T01:30:19.883Z
---
# 任务注册表（Tasks）— 2026-10-23-config-validate-skill

- [x] task-01: src/config-validate.js（validateLocalYamlContent 纯函数：YAML 解析/顶层归类/逐键类型枚举/段内必填/deprecated info；cmdConfigValidate：resolveLocalYaml 路径链+双态渲染+退出码）——验证：unit 八态
- [x] task-02: index.js config 分发接线 validate 子命令＋help 文案行——验证：CLI e2e --json 双态
- [x] task-03: .claude/skills/sillyspec-config/SKILL.md 技能（零配置契约首节/必填场景决策表/探测流程/末步硬门 validate exit 0）——验证：技能文件锚
- [x] task-04: 新增 test/config-validate.test.mjs（①unit 八态 ②CLI e2e ③技能锚 ④help 锚）全绿——验证：node --test 批跑＋config 族既有面回归
