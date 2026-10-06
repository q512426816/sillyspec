---
author: flow-machine-draft
created_at: 2026-10-06T13:20:05.429Z
---
# 需求规格（Requirements）— 2026-10-06-resume-domain-flip

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: resume 路由面 = 过滤后的基线以来文件面 ∪ --input 路径语料路由面（重入知识面 ⊇ fresh 知识面）

必须：flow start 重入（恢复简报）的知识注入域路由面等于「FR-02 过滤后的基线以来文件面」与「--input 路径语料路由面（extractRoutingInputPaths 同源）」的并集去重——重入简报的触达域与 FR 注入必须是 fresh 简报对应面的超集；禁止让重入路由面仅由任何单一面退化构成。

#### 场景：重入早于干活（复现面）

- Given 变更刚建（无区间提交、无本变更工作树改动），仓内存在他侧遗留未跟踪目录
- When 重跑 `flow start`（恢复简报）
- Then 触达域包含 --input 语料路由出的域（fresh 同款），不显示「该域暂无 active FR 索引条目」的误导行

### FR-02: 未跟踪条目「变更出生时刻之前从未写过」（最新 mtime 早于变更出生时刻；目录递归取成员最大 mtime，walk 带安全帽；stat 失败/超帽/无出生时戳保守保留）时不再进入路由面——判据是时间不是路径形态，不建路径白名单

必须：重入路由面对 `git status --porcelain` 的未跟踪（`??`）条目做时间过滤——条目最新 mtime（目录递归取成员最大值，walk 带条目数安全帽）早于变更出生时刻即从路由面剔除；判据必须是时间语义，禁止按路径形态/前缀/扩展名建白名单或黑名单（开放世界：文件系统时间戳是唯一裁判）。保守保留：stat 失败、walk 超安全帽、无出生时戳——三者一律不过滤（行为同现状）。跟踪条目（区间 diff 与 M/D）禁止过滤。

#### 场景：他侧遗留垃圾

- Given 未跟踪目录的全体成员 mtime 均早于变更出生时刻
- When 计算重入路由面
- Then 该目录不在路由面（域不被劫持成伪域）

#### 场景：干活期新写的未跟踪文件

- Given 未跟踪文件 mtime 晚于变更出生时刻（干活期创建未提交）
- When 计算重入路由面
- Then 该文件保留在路由面（fr-rot-precision 评审 P2 语义不回潮）

### FR-03: 变更出生时刻取进度库 changes.created_at（best-effort：无 DB/无行不过滤，行为同现状）

必须：变更出生时刻从进度库 `changes` 表 `created_at` 列读取（Date.parse）；读取失败、无 DB、无行或解析非有限数时不过滤（保守=现状行为）。禁止引入第二份出生时刻存储。

#### 场景：无 DB 的存量变更

- Given .sillyspec/.runtime 无 sillyspec.db（或 changes 无此行）
- When 重跑 `flow start`
- Then 路由面不做时间过滤（与现状一致），简报仍正常渲染

### FR-04: fr-rot-precision ⑥ 的源码级钉（resume 复用 changedFilesSinceBaseline）保持绿

必须：test/fr-rot-precision.test.mjs ⑥（resume 注入复用 `changedFilesSinceBaseline(cwd, st.baseline_commit)`、不用裸双提交区间 diff）保持通过——过滤与并集必须在调用侧包裹，禁止改 changedFilesSinceBaseline 的既有签名与语义。

#### 场景：主路径

- Given 本变更落地
- When 运行 test/fr-rot-precision.test.mjs
- Then ⑥ 断言通过（源码钉不破坏）

### FR-05: 新增回归测试覆盖：过滤判据各分支 + 重入简报端到端（垃圾未跟踪目录不再劫持触达域、input 域恢复注入）

必须：新增回归测试覆盖：过滤判据各分支（旧 mtime 剔除/新 mtime 保留/目录递归/stat 失败保留/无出生时戳不滤/跟踪条目不滤）+ 重入简报端到端（夹具：他侧未跟踪目录 + input 域语料 → 重入触达域为 input 域且无「该域暂无」误导行）。收录进 npm run test:core。

#### 场景：主路径

- Given 本变更落地
- When 运行新增回归测试
- Then 全部通过

### FR-06: npm run test:core 全绿

必须：`npm run test:core` 全部通过（含既有回归与新增测试）。

#### 场景：主路径

- Given 本变更落地
- When 运行 `npm run test:core`
- Then exit 0 全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/resume-domain-flip.test.mjs「② 重入早于干活：垃圾未跟踪目录不劫持触达域、input 域恢复注入」
FR-02: test/resume-domain-flip.test.mjs「① filterPreChangeUntracked 过滤判据各分支」（fresh-work.txt 干活期保留断言、mixed-dir 成员最大 mtime 拉高断言、old-junk/ 递归剔除断言、stat 失败注入缝保留断言）
FR-03: test/resume-domain-flip.test.mjs「① filterPreChangeUntracked 过滤判据各分支」（birthTs=null 原样返回断言）
FR-04: test/resume-domain-flip.test.mjs「③ 源码钉：resume 路由面包裹 filterPreChangeUntracked 并并集 input 路由面（⑥ 调用形态不变）」
FR-05: test/resume-domain-flip.test.mjs「① filterPreChangeUntracked 过滤判据各分支」「② 重入早于干活：垃圾未跟踪目录不劫持触达域、input 域恢复注入」「④ test:core 清单驻留：本测试文件在 package.json test:core 内」
FR-06: test/resume-domain-flip.test.mjs「test:core 亲测全绿」（npm run test:core 收口实测，非单测断言）
