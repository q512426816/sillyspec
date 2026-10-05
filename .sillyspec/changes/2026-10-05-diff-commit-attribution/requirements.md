---
author: flow-machine-draft
created_at: 2026-10-05T04:38:09.259Z
---
# 需求规格（Requirements）— 2026-10-05-diff-commit-attribution

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（收口做门柱对比）；正文与场景块归你。

### FR-01: 集成场景（临时 git 仓双变更混窗）：他侧提交的交付文件不进本变更 patch 冻结面与 attributedChangedFiles，FR 域不再触达他侧文件的域

baseline..HEAD 窗口内，凡「全部提交均携带他侧变更名后缀」的交付文件必须被提交事实归属切分判为他侧：禁止进入本变更的 patch 冻结面（filterCommittedFace）与归属文件面（splitOwnVsForeignDiffFiles 的 own——即实测面与 FR 域路由的输入）；归属依据必须是提交 message 携带的变更名（提交事实），而非任何变更的声明清单（不触碰否决决策 sentinel-evidence-freeze⑤ 的「声明抢已提交文件」禁区）。

#### 场景：主路径

- Given：临时 git 仓，本变更 start 后他侧会话提交 `src/other.js`（message 含 `(他侧变更名)`）并归档其变更目录
- When：本变更收口跑 `filterCommittedFace` 与 `splitOwnVsForeignDiffFiles`
- Then：`src/other.js` 不在冻结面与 own 面；本变更自己提交的文件不受影响

### FR-02: 本变更提交的文件（含被无后缀裸提交触碰过的）归属不变

归属切分必须保守：文件窗口内任一提交携带本变更名 → 恒判本变更；文件被无变更名后缀的裸提交触碰过（归属不明）→ 禁止剔除（fail-closed 保留）；本变更 design 清单/quick 声明的文件优先级必须保持最高（ownDeclared 先于任何提交归属判定）。

#### 场景：主路径

- Given：本变更窗口内含本变更自己提交的 `src/mine.js`、被裸提交 `chore: misc` 触碰过的 `src/shared.js`、design 清单声明的 `src/declared.js`
- When：跑归属切分
- Then：三者均判本变更（own），无一被误剔

### FR-03: 声明面优先级、7 天陈旧规则、非 git 仓与 git 失败的行为均维持现状

既有行为必须零回归：active 变更声明面的优先级与合并语义不变；7 天陈旧忽略规则不变；非 git 仓 / git 命令失败 / flow-state 无 baseline_commit 时必须退化为现状行为（不切分、不剔除），禁止因新逻辑引入新的失败面。

#### 场景：降级面

- Given：cwd 为非 git 目录（或 git 调用超时失败）
- When：跑 splitOwnVsForeignDiffFiles / filterCommittedFace
- Then：行为与改动前一致（own=输入全集，无剔除），无异常抛出

### FR-04: 新增测试锁定上述三面，全量测试绿

上述三面必须有自动化测试锁定（混窗剔除 / 保守保留 / 降级现状），含临时 git 仓的真实提交集成场景与解析纯函数单测；全量测试套必须绿，既有 foreign-declared / filter-committed-face / foreign-own-priority 断言零回归。

#### 场景：主路径

- Given：新增测试文件
- When：单独运行与全量运行
- Then：三面断言全过，既有断言不变绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/commit-attribution-split.test.mjs「混窗集成：他侧提交文件出冻结面与 own 面」
FR-02: test/commit-attribution-split.test.mjs「保守保留：本变更名/裸提交/声明文件不误剔」
FR-03: test/commit-attribution-split.test.mjs「降级现状：非 git 仓与无 baseline 行为不变」
FR-04: test/commit-attribution-split.test.mjs「三面断言齐全 + 解析纯函数单测」
