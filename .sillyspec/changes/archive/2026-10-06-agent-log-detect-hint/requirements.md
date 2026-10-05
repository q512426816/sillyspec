---
author: flow-machine-draft
created_at: 2026-10-05T16:51:28.108Z
---
# 需求规格（Requirements）— 2026-10-06-agent-log-detect-hint

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: --detect 空态提示覆盖全部已注册 harness，且从 HARNESS_DETECTORS 派生（注册表新增 harness 时提示自动跟上，不再手工同步）

`sillyspec agent-log --detect` 探测结果为空时打印的支持提示，必须列出 HARNESS_DETECTORS 注册表中的全部 harness（precise 与 loose 档皆含），且提示文案必须由注册表数据在运行时派生；禁止以硬编码清单手工同步注册表（现文案只列 3 家，注册表实有 8 家，即为漂移实证）。

#### 场景：空态提示与注册表一致

- Given: 运行环境无任何可探测的活跃 agent 会话日志
- When: 执行 `sillyspec agent-log --detect`
- Then: 空态提示含全部已注册 harness 的展示名（映射缺省回退注册表 name 原样），且保留 SILLYSPEC_AGENT_LOG 显式指定通道指引

#### 场景：注册表扩项提示自动跟上

- Given: 注册表新增一项 harness（如 fake-cli，无展示名映射）
- When: 渲染空态提示
- Then: 提示自动包含该项（name 原样形态），无需改提示代码

### FR-02: 新增单元测试：断言提示含全部已注册 harness 名（现零覆盖）

必须新增单元测试覆盖空态提示派生逻辑：遍历 HARNESS_DETECTORS 断言提示含每项的展示名（注册表扩项时测试循环自动覆盖新项，无需手改断言）；并至少一条 CLI 集成断言验证 `--detect` 空态真实输出走派生提示。

#### 场景：主路径

- Given: 测试导入 renderDetectEmptyHint 与 HARNESS_DETECTORS
- When: 逐项检查提示串
- Then: 每个注册表项（映射名或 name 原样）都出现在提示中

### FR-03: npm test 全绿

本变更合入后 `npm test`（全量套件）与 `npm run lint` 必须全绿——既有 agent-session-log 测试无回归，新断言通过。

#### 场景：主路径

- Given: 本变更的代码与测试已就位
- When: 运行 npm test 与 npm run lint
- Then: 全部通过，无失败项

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/agent-session-log.test.mjs「§14 空态提示派生——注册表全项含于提示 / 注入假注册表项自动跟上 / CLI 空态输出走派生提示」
FR-02: test/agent-session-log.test.mjs「§14 空态提示派生——注册表全项含于提示 / 注入假注册表项自动跟上 / CLI 空态输出走派生提示」
FR-03: test/run-tests.mjs「全量套件（npm test）——本变更改动面无回归、新用例通过」
