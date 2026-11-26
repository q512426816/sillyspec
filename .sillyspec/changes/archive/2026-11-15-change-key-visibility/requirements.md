---
author: flow-machine-draft
created_at: 2026-11-14T16:34:36.996Z
---
# 需求规格（Requirements）— 2026-11-15-change-key-visibility

## 功能需求

### FR-01: flow start 新建路径横幅含变更身份行：完整 key 与名称 + 必须转述给用户的指令

- CLI 必须（MUST）在 flow start 新建变更的横幅输出中包含一行变更身份指令：同一行内嵌完整变更 key 与变更名称（标题），并带「必须原样转述给用户」的明确指令——agent 读到该行即可照抄向用户展示。

#### 场景：主路径

Given 全新变更（无 flow-state、净新建），When agent 运行 `sillyspec flow start --change <名> --input "<首行 10-30 字概括…>"`，Then stdout 横幅含变更身份行（key=--change 值、名称=提炼标题），行内含转述指令词。

### FR-02: flow start 头脑风暴收编（adopt）路径含同款变更身份指令行

- CLI 必须（MUST）在头脑风暴产物收编（adopt）输出中包含同款变更身份行：完整 key 与收编时点名称 + 转述指令；标题推导失败时允许该行缺失（best-effort），但横幅仍须含 key。

#### 场景：主路径

Given 变更目录已有头脑风暴产物（proposal.md 等、无 flow-state），When agent 运行 `sillyspec flow start --change <名>`（无 --input），Then 收编输出含变更身份行（key=变更名、名称=收编推导标题）。

### FR-03: run brainstorm 自动创建变更输出含完整 key + 名称 + 转述指令

- CLI 必须（MUST）在 `run brainstorm` 零活跃自动创建变更时输出变更身份行：完整自动生成的 key（`YYYY-MM-DD-new-change-<hex>`）与创建时点名称 + 转述指令。

#### 场景：主路径

Given 仓内零活跃变更，When agent 运行 `sillyspec run brainstorm`（无 --change），Then stdout 含「自动创建变更」行之后的变更身份行。

### FR-04: run <stage> 显式 --change 净新建（brainstorm 显式入口走此路径）输出含完整 key + 名称 + 转述指令

- CLI 必须（MUST）在 `run <stage> --change <名>` 净新建（DB 无行且目录无）注册变更成功后输出变更身份行：完整 key 与创建时点名称 + 转述指令——brainstorm 显式 --change 入口走此路径。

#### 场景：主路径

Given 变更未存在（DB 无行、无目录），When agent 运行 `sillyspec run brainstorm --change <YYYY-MM-DD-名>`，Then stdout 含变更身份行（key=--change 值）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/change-identity-line.test.mjs「FR-01 flow start 新建横幅含变更身份行（key+名称+转述指令）」
FR-02: test/change-identity-line.test.mjs「FR-02 adopt 收编输出含变更身份行」
FR-03: test/change-identity-line.test.mjs「FR-03 run brainstorm 自动创建输出含变更身份行」
FR-04: test/change-identity-line.test.mjs「FR-04 run brainstorm 显式 --change 净新建输出含变更身份行」
