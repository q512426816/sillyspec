---
author: flow-machine-draft
created_at: 2026-11-04T07:29:28.378Z
---
# 需求规格（Requirements）— 2026-11-04-doctor-injection-budget

## 功能需求

### FR-01: doctor 新增 injection_budget 维度：扫描 AGENTS/CLAUDE/根 SKILL.md 与 .claude/skills/*/SKILL.md 及模板源，任一超 20000 字节 WARN 并给瘦身指引（超线不 FAIL 收口）

- sillyspec doctor 必须新增 injection_budget 探测维度：扫描仓根 AGENTS.md、CLAUDE.md、SKILL.md、templates/agents-instruction.md（存在才扫）与 .claude/skills/*/SKILL.md 逐个文件字节量，任一超过 20000 字节（harness 压缩截断线）必须报 WARNING 级 finding（列出超线文件与体量）并附 references/ 拆分模式瘦身指引；WARNING 级不得改变 doctor 收口通过性（超线不 FAIL）。

#### 场景：主路径

- Given 仓内某 SKILL.md 为 21000 字节，When 跑 doctor，Then injection_budget 维度 pass=false、severity=WARNING、finding 含该文件路径与体量及瘦身指引。
- Given 仓内最大注入面 18.9KB（sillyspec-execute SKILL.md 实况），When 跑 doctor，Then 该维度 pass=true 不告警。

### FR-02: 预算内回显最大面与预算（可观测）；非 init 仓跳过不误报

- 预算内时 finding 必须回显扫描面数与最大文件及其体量（体积可观测面）；仓内无任何注入面文件（非 init 仓/未安装）时必须 pass=true 并注记跳过原因，不得误报。

#### 场景：主路径

- Given 注入面全部在预算内，When 跑 doctor，Then finding 形如「扫描 N 个面，最大 <路径> X.XKB / 预算 20KB」。
- Given 空目录（无 AGENTS/CLAUDE/SKILL.md），When 跑 doctor，Then 维度 pass=true 且 finding 注记无注入面跳过。

### FR-03: 新增单测覆盖超线/预算内/跳过三态，既有回归面零破坏

- 必须新增单测以临时目录夹具覆盖三态（超线 WARN/预算内 PASS/无注入面跳过），并在本仓实跑断言当前全部注入面在预算内；落地后既有测试面零失败。

#### 场景：主路径

- Given 实现落地，When 跑新增单测与收口实测面，Then 零失败零超时。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/doctor-injection-budget.test.mjs「超线 SKILL.md 报 WARNING 附瘦身指引」
FR-02: test/doctor-injection-budget.test.mjs「预算内回显最大面」＋「空仓跳过不误报」
FR-03: test/doctor-injection-budget.test.mjs「本仓实跑全预算内」＋收口 CLI 推断实测面（fail-closed）
