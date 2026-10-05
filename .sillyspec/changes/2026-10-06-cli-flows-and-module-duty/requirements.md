---
author: flow-machine-draft
created_at: 2026-10-05T16:43:34.502Z
---
# 需求规格（Requirements）— 2026-10-06-cli-flows-and-module-duty

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: .sillyspec/docs/sillyspec/flows/ 新增 4 篇 CLI 业务流程文档（lightweight-change 轻量变更 / full-pipeline 完整五阶段 / platform-sync 平台同步与远端派发 / recovery-concurrency 中断恢复与多 agent 并发），结构含「目标 / 参与模块 / 流程摘要 / 关键规则」与平台侧 flows 同构

- 必须：4 篇文档存在于 `.sillyspec/docs/sillyspec/flows/`，每篇含「## 目标」「## 参与模块」「## 流程摘要」「## 关键规则」四节；内容压缩自仓内既有事实源（AGENTS.md / README / capability-highlights / module-map），不新造口径。

#### 场景：主路径

- Given 读者要查 CLI 某业务流程（如轻量变更怎么走）
- When 打开 `.sillyspec/docs/sillyspec/flows/lightweight-change.md`
- Then 目标节＋流程摘要可直接读通，参与模块给出 src 锚点

### FR-02: 12 张 CLI 模块卡（stages / runtime / cli-entry / progress / docs-consistency / machine-interface / redlines / dispatch / sillyhub-mcp / migration / workflow / dashboard）各补「职责」节一行实文

- 必须：12 张卡片各含「## 职责」节，节内为一行业务实文（非占位符）；卡片其余章节不动。

#### 场景：主路径

- Given 任一清单内模块卡
- When 读其「职责」节
- Then 一句话讲清该域业务角色与核心职责

### FR-03: 不引入任何新地图 / 索引 / 刷新机制：docs/PROJECT-MAP.md 不存在，README.md 与 HEAD 一致

- 必须：收口时 `docs/PROJECT-MAP.md` 不存在于工作树，`README.md` 与 HEAD 版本一致（git diff 为空）。
- 禁止：残留任何地图原型（渲染脚本 / 预览产物 / README 链接行）。

#### 场景：主路径

- Given 本变更收口核验
- When 检查 `docs/PROJECT-MAP.md` 存在性与 `git diff README.md`
- Then 前者不存在、后者为空

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档新增（doc-only），无逻辑可测；四节结构齐全由收口门按成功标准比对。
FR-02: 不适用：纯文档补节，无逻辑可测。
FR-03: 不适用：负向核对（文件不存在 / 无 diff），收口时人工核验，无测试面。
