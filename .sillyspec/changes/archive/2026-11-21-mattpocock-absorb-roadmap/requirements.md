---
author: flow-machine-draft
created_at: 2026-11-21T15:18:20.037Z
---
# 需求规格（Requirements）— 2026-11-21-mattpocock-absorb-roadmap

## 功能需求

### FR-01: docs/ROADMAP.md 新增吸收路线章节，含批次表（批0-批5：内容/立项形态/依赖）与搁置区（wayfinder/retro/triage 及触发条件）

- docs/ROADMAP.md 必须新增「mattpocock/skills 吸收路线」章节：批次表必须覆盖批 0 至批 5 六个批次（列含内容/建议变更名/立项形态/依赖），并必须含搁置区（wayfinder、retro 环境轴、triage 等条目各附观察触发条件）。

#### 场景：主路径

- Given 四子代理调研收敛结论已在会话产出且未落盘
- When 本变更收口
- Then docs/ROADMAP.md 读者不依赖会话上下文即可看到完整吸收路线（批次+搁置+不抄）

### FR-02: 含明确不抄清单（frontier 整轮齐发/spec 禁路径/双轴并行评审/triage 状态机等）及各条理由

- 章节必须含「明确不抄」清单，至少覆盖 frontier 整轮齐发、spec 禁写文件路径、双轴并行子代理评审、triage 状态机四条；每条必须附不抄理由（与 SillySpec 内核机制的冲突点）。

#### 场景：主路径

- Given 后续变更可能误吸收 mattpocock/skills 的提示词纪律形态
- When 查阅本章节
- Then 每条不抄项均有理由可引用，能一句回应「为什么不照抄」

### FR-03: 每个批次条目可直接按行引用立项（含建议变更名与立项形态）

- 每个批次条目必须含建议变更名（YYYY-MM-DD-名 形态，标注「建议名，以实际立项为准」）与立项形态（轻量变更/完整流程），使后续 session 可直接按行引用立项。

#### 场景：主路径

- Given 新 session 接手执行某批次
- When 读到该批次行
- Then 无需回看调研会话即可拿到立项所需要素（内容/变更名/形态/依赖）

### FR-04: 纯文档变更，不触及 src/test

- 本变更必须只修改 docs/ROADMAP.md 与本变更治理工件（.sillyspec/changes/2026-11-21-mattpocock-absorb-roadmap/），禁止触及 src/ 与 test/ 下任何文件。

#### 场景：主路径

- Given 收口时采集 diff 面
- When 冻结对账执行
- Then 变更交付面不含 src/、test/ 路径（治理工件除外）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档登记无代码行为面，验收靠收口 diff 核对章节齐备
FR-02: 不适用：纯文档登记无代码行为面，验收靠收口 diff 核对清单与理由齐备
FR-03: 不适用：纯文档登记无代码行为面，验收靠收口 diff 核对批次要素齐备
FR-04: 不适用：纯文档变更（不触及 src/test，收口实测门自动跳过；diff 面核对无 src/test 文件）
