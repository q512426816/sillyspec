---
author: flow-machine-draft
created_at: 2026-10-05T05:04:04.105Z
---
# 需求规格（Requirements）— 2026-10-05-guidance-consistency

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（收口做门柱对比）；正文与场景块归你。

### FR-01: AGENTS.md 轻量变更行的 --input 提法包含「成功标准：独立成行＋每行一条 - 可验证标准」格式要点

AGENTS.md 选道表与恢复节的 `--input` 提法必须包含过门格式要点：动机/背景在前，「成功标准：」独立成行，随后每行一条 `- <可验证标准>`——与 flow start 实测格式门一致；禁止只写「描述＋成功标准」而无格式说明（首调必撞 exit 2 的实测摩擦面）。

#### 场景：主路径

- Given：新会话 agent 只读 AGENTS.md 不看 CLI 报错
- When：按选道表写 --input 起轻量变更
- Then：写出的 input 首次即过格式门（成功标准条目提取 ≥1 条）

### FR-02: command.js READONLY 短路注释与 constants.js 实态一致（只列 status，注明 doctor 已移出）

src/run/command.js 只读短路注释必须与 READONLY_AUXILIARY_STAGES 实态一致：只列 status，并注明 doctor 已于 2026-09-09-doctor-noai 移出（阶段形态走状态机、顶层 doctor 只读语义由 index.js 拦截保真）；禁止残留 status/doctor 并列的过时表述。

#### 场景：主路径

- Given：读者依注释理解只读短路覆盖面
- When：核对 constants.js 的 READONLY_AUXILIARY_STAGES
- Then：注释清单与常量逐项一致，移出史有出处

### FR-03: 纯文档/注释改动零行为面，全量测试绿

本变更必须零行为面：不改任何执行逻辑，AGENTS.md 与注释外零触碰；全量测试套与 lint 保持绿。

#### 场景：主路径

- Given：交付 diff 仅含 AGENTS.md 与 src/run/command.js 注释行
- When：跑全量测试与 lint
- Then：零新增失败（行为面与基线一致）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例」`）

FR-01: 不适用：纯文档指引，无代码行为可断言（格式门自身由 flow start 实测门背书——本 FR 即按该门写出并首调通过）
FR-02: 不适用：纯注释纠偏，constants.js 实态由既有测试面锁定
FR-03: 不适用：零行为面变更无专属测试——全量绿由收口实测门（CLI 亲测）背书
