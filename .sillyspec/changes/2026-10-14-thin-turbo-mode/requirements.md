---
author: qinyi
created_at: 2026-10-14 08:27:24
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 用户（仓主） | 唯一有权显式触发极速模式的人；通过自然语言（「极速/别验证/只要 spec 和代码」类原话）向 agent 表达 |
| agent（执行侧） | 读提示词面理解触发判据，仅在用户显式意图在场时携带 `--turbo`；禁止自主启用（D-001） |
| CLI（SillySpec） | 硬承载面：`flow start --turbo` 留痕、`flow done` 读态生效跳过面并逐项留痕 |

## 功能需求

### FR-01: 极速触发与留痕
Given 用户显式表达极速意图，agent 执行 `sillyspec flow start --change <名> --input "..." --turbo`
When flow start 处理该 flag
Then flow-state.yaml 落盘 `turbo: true` 与 `turbo_since: <ISO 时间戳>`，start 输出一行极速工作指引（只产 spec+代码，收口自动跳验证仪式）；不带 `--turbo` 时 flow-state 不含 turbo 字段、start 输出与改动前逐字一致
- 系统 MUST：带 `--turbo` 时在 adopt/全新两路 flow-state 落盘 turbo/turbo_since 并输出极速指引行；不带 flag 时禁止出现 turbo 字段与极速行（缺省路径输出逐字不变）。

### FR-02: flow done 跳过面（读态生效）
Given 变更 flow-state 含 `turbo: true` 且 `tier !== 'thick'`（升厚即失效，D-007），执行 `flow done`
Then 以下各项跳过/降档且逐项在收口输出留痕：
- test+lint 实测（runQuickTestLintGate）早退 skip，reason 带「极速模式（用户显式触发 <turbo_since>）」
- hunk 归属门（src/flow.js:2123）降 advisory：警告留痕不阻断
- dirty 收口阻断门降 advisory：缺口数留痕不 exit
- ui 视觉探针（src/flow.js:2107）跳过（skipped 标注）
- 评审子步强制豁免：理由=用户显式极速声明，进 telemetry
收口 gateSummaryText 带「⚡极速模式」标注与 skipped 明细
- 系统 MUST：turbo && tier!=='thick' 时对上列各项跳过/降档且逐项在收口输出留痕；tier==='thick'（升厚/--thick 起步）时禁止任何跳过生效（D-007）。

### FR-03: 必留面语义不变
Given turbo 变更 flow done
Then spec 结构校验（verifyThinDocsV2）、tasks 全勾门、ledger 门、patch 冻结（change.patch/change-patch.json，D-006）、distill（决策+FR 索引+模块回写）、archive 照常执行，校验语义与缺省路径逐字一致；失败升厚语义不变（升厚仅由实测失败触发，turbo 无实测——必留面失败照常报错不升厚）
- 系统 MUST：spec 结构校验/tasks 全勾/ledger/patch 冻结/distill/归档在 turbo 下照常执行且判定语义不变（未全勾、design 空槽在 turbo 下同样拒收）。

### FR-04: 提示词面三处同步
Given 极速模式落地
Then ① AGENTS.md 选道表新增极速行：触发判据=用户显式极速原话，携带 `--turbo`，禁 agent 自启；② flow 命令卡（assets/command-cards/flow.md）补 `--turbo` 文档与极速语义；③ 预段极速形态约定入册：头脑风暴预段走轻量跑判定+单轮合并问询+burst 一次 `--done` 收口（纯提示词面，阶段机零改动，D-004）
- 系统 MUST：AGENTS.md 极速行与 flow 命令卡含 `--turbo` 触发判据文案，且明文「仅用户显式触发，禁止 agent 自启」（文案在场由测试锚定防漂移）。

### FR-05: 作用域隔离
Given 任意厚道命令 `run <stage>` 或未带 turbo 的薄道变更
Then 行为与改动前逐字一致：厚道全族代码路径零改动；跳过面仅由 flow-state turbo 字段激活，无环境变量/全局态旁路
- 系统 MUST：厚道 `run <stage>` 全族零改动；跳过面仅由 flow-state turbo 字段激活，禁止环境变量/全局态旁路（env 在场对非 turbo 仓零作用）。

## 非功能需求
- 兼容性：缺省零回归三态各有测试锚——① 无 `--turbo`（缺省路径输出与改动前逐字一致）② flag 值非法/重复（按未知参数既有语义拒绝，不静默吞）③ flow-state 读取失败/字段缺失（fail-soft 回退非 turbo，不拦主流程）
- 跨平台：留痕时间戳 ISO 串；flow-state 读写复用既有 js-yaml 链路（Windows 路径面零新增）
- 审计：跳过决策全部落收口输出与 flow-state（谁/何时/档位），pre-push git hook（仓级 lint+test+docs gate）不受影响、照常兜底

## 测试绑定
FR-01: test/turbo-mode-start.test.mjs「flow start --turbo 留痕与指引行；无 flag 零回归」
FR-02: test/turbo-mode-done-skip.test.mjs「turbo done 跳过面逐项留痕；升厚失效 D-007」
FR-03: test/turbo-mode-done-keep.test.mjs「全勾门/design 空槽拒收不放松；非 turbo 零回归」
FR-04: test/turbo-mode-scope.test.mjs「提示词面三处文案锚（用例③）」
FR-05: test/turbo-mode-scope.test.mjs「无 env 旁路；--turbo --thick 同给不生效」

<details><summary>绑定明细（人读面）</summary>

| FR | 测试 | 文件 |
|---|---|---|
| FR-01 | turbo 留痕落盘 + start 指引输出 + 无 flag 逐字一致 | NEW:test/turbo-mode-start.test.mjs |
| FR-02 | 跳过面逐项 skipped 断言 + gateSummary 极速标注 | NEW:test/turbo-mode-done-skip.test.mjs |
| FR-03 | 必留面照常执行断言（docs 校验/全勾/patch/distill 不因 turbo 缺席） | NEW:test/turbo-mode-done-keep.test.mjs |
| FR-04 | 提示词面三处在场（AGENTS.md 极速行 + 禁自启判据 + flow 卡 --turbo 文档） | NEW:test/turbo-mode-scope.test.mjs（用例③文案锚） |
| FR-05 | 厚道零改动（run <stage> 参数面回归）+ 无旁路断言 | NEW:test/turbo-mode-scope.test.mjs |

</details>

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01、FR-04 | 触发权=仅用户显式；禁 agent 自启写入提示词面判据 |
| D-002@v1 | FR-02、FR-03 | 跳过面清单与必留面清单 |
| D-003@v1 | FR-01、FR-02、FR-04 | 双层承载：提示词语义 + CLI flag 硬承载 |
| D-004@v1 | FR-04、FR-05 | 作用域=薄道+预段极速，厚道零改动 |
| D-005@v1 | FR-01、FR-02 | 方案 A 落地形态（rejected-B/C 见 decisions.md 防复潮条目） |
| D-006@v1 | FR-03 | patch 冻结件保留（证据非验证） |
| D-007@v1 | FR-02、FR-05 | turbo 升厚即失效（tier!=='thick' 前提） |
