---
author: flow-machine-draft
created_at: 2026-11-04T11:20:10.416Z
---
# 提案书（Proposal）— 2026-11-04-deploy-skill

## 动机

任务原话转写：部署流程 skill 固化入库
本会话刚走完一次完整 npm 发布（3.34.1：暂存区归属判别清障→版本面 bump+锚点同步→验证门→sillyspec push→npm publish 202 异步核验），流程含多个本仓特有坑（push 暂存区门、quick-retired 精确版本锚、202 传播窗口勿重发、反引号提交信息、既有红 stash 归属判别）。已写为 .agents/skills/deploy/SKILL.md（维护者技能，不入 .claude/skills 交付面）。

成功标准：
- .agents/skills/deploy/SKILL.md 存在且含五步链+坑清单速查表，frontmatter name/description 合规
- 不影响交付面（shipped-hygiene 扫描面不含 .agents）与既有测试

## 变更范围

按成功标准机械推导，共 2 条验收面：
1. .agents/skills/deploy/SKILL.md 存在且含五步链+坑清单速查表，frontmatter name/description 合规
2. 不影响交付面（shipped-hygiene 扫描面不含 .agents）与既有测试

## 成功标准（可验证）

1. .agents/skills/deploy/SKILL.md 存在且含五步链+坑清单速查表，frontmatter name/description 合规
2. 不影响交付面（shipped-hygiene 扫描面不含 .agents）与既有测试
