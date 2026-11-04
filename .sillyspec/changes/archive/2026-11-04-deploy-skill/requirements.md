---
author: flow-machine-draft
created_at: 2026-11-04T11:20:00.000Z
---
# 需求规格（Requirements）— 2026-11-04-deploy-skill

## 功能需求

### FR-01: .agents/skills/deploy/SKILL.md 存在且含五步链+坑清单速查表，frontmatter name/description 合规

- 仓内必须存在 `.agents/skills/deploy/SKILL.md`：frontmatter 含 name=deploy 与带触发词的 description（发布/deploy/部署/发版/publish/升版本）；正文必须覆盖五步顺序链（暂存区清障→版本面→验证门→推送→npm publish 与 202 异步核验）与坑清单速查表；所有步骤与坑必须来自本仓真实发布执行（2026-11-04 3.34.1 发布实证），禁止臆造步骤。

#### 场景：主路径

- Given 用户在 ZCode 会话说「发布个最小版本」，When skill 触发，Then 按五步链执行且顺序与锚点测试/暂存区门/202 传播窗口约束一致。

### FR-02: 不影响交付面（shipped-hygiene 扫描面不含 .agents）与既有测试

- 本变更必须只新增 `.agents/skills/deploy/SKILL.md` 单文件：不得放进 `.claude/skills/`（产品交付面，维护者技能不随 npm 包发给消费者）或 `templates/`；既有测试面（shipped-hygiene、prompt-golden）必须保持全绿。

#### 场景：主路径

- Given 本变更落地，When 跑 shipped-hygiene 与 prompt-golden，Then 全绿（.agents 不在卫生扫描面、未触 stage 提示词）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档资产（SKILL.md 无可执行面；内容正确性由 skill-creator 评审与下次真实发布回放验证）
FR-02: test/shipped-hygiene.test.mjs「交付面无开发物料」＋test/prompt-golden.test.mjs「stage 提示词金档比对」（回归确认 .agents 不入扫描面）
