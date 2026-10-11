---
author: flow-machine-draft
created_at: 2026-10-11T15:28:47.984Z
---
# 需求规格（Requirements）— 2026-10-11-flow-start-redline-frontload

## 功能需求

### FR-01: flow start 新建横幅在书写面细则之前渲染「🚫 收口拒收红线」块，首条为 design 四问文本/FR 标题锚逐字钉死不许改写（改写即拒收），源码仍含「勿改写」子串（batch-tick-gate 回归兼容）

- flow start 新建横幅必须在「书写面」细则段之前渲染「🚫 收口拒收红线」块，且该块首条必须申明 design 四问文本与 FR 标题锚逐字钉死、勿改写、改写即收口拒收；横幅输出必须保留「勿改写」字样（源码断言兼容 batch-tick-gate）。

#### 场景：红线块先于书写面细则

- Given 一个新初始化的仓与全新变更
- When 运行 `flow start --change <名> --input <合格输入>`（非 --json）
- Then stdout 中「🚫 收口拒收红线」的行号先于「书写面」细则行，红线首条同时含「钉死」与「拒收」，横幅含「勿改写」

### FR-02: flow start 重入恢复简报含一行红线重申（钉死规则 + task-NN token 形态）

- flow start 重入渲染的恢复简报必须包含一行红线重申，该行必须同时申明钉死规则（四问文本/FR 标题锚勿改写）与勾选证据 task-NN token 合法形态（逐个列出或 /、，连写，区间写法不认）。

#### 场景：重入简报红线行

- Given 一个已存在的活跃变更（flow-state.yaml 在场）
- When 重跑 `flow start --change <名>`
- Then 恢复简报中含「红线重申」行，且该行含「钉死」与「task-NN」

### FR-03: flow done 哨兵假完成拒收文案写明合法 token 形态（逐个列出或 /、，连写；task-01..task-05 区间写法不认）

- flow done 哨兵假完成（全勾零证据）拒收文案必须写明合法 token 形态——逐个列出或 /、，连写——并必须明示「task-01..task-05」区间写法不认；零证据判定语义必须保持不变（收口门不放宽）。

#### 场景：拒收文案自释格式

- Given tasks.md 全勾且提交消息用「task-01..task-05」区间写法（零合法 token 证据）
- When 运行 `flow done`
- Then 收口以假完成拒收，文案含「区间写法不认」与连写分隔符说明，missing 任务清单照旧逐个列出

### FR-04: 新增回归测试钉上述三处文案；全量测试零失败

- 上述三处文案必须各有回归测试钉住（横幅/简报走真实 CLI 输出断言，哨兵文案走源码断言），且仓内全量测试必须零失败。

#### 场景：文案回归钉住

- Given 本变更交付的测试文件
- When 运行仓内全量测试
- Then 新增回归用例全绿且既有套件零失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-redline-frontload.test.mjs「① 新建横幅：红线块先于书写面细则且首条钉死勿改写」
FR-02: test/flow-redline-frontload.test.mjs「② 重入恢复简报：红线重申行在场」
FR-03: test/flow-redline-frontload.test.mjs「③ 哨兵假完成拒收文案：写明 token 合法形态」
FR-04: test/flow-redline-frontload.test.mjs「④ 三处文案回归同文件钉住」
