---
author: flow-machine-draft
created_at: 2026-09-25T15:41:34.993Z
---
# 需求规格（Requirements）— 2026-09-25-quick-channel-retire

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->

### FR-01: quick 新会话硬拒
Given 目标 quick 会话的 guard.json 不存在（新会话），When 渲染入口收到 `sillyspec (run) quick`（任意非 --done/--cancel 形态），Then exit 1 并输出指路文案（新工作走 `sillyspec flow start` 轻量变更），且不发生任何副作用——不落 guard.json、不分配 ql-ID、不写 QUICKLOG 条目、不追加 tasks.md 挂载行。

### FR-02: 在途会话收尾不受影响
Given quick 会话 guard.json 已存在（升级前启动），When 执行渲染/续跑（含 `--files` 追加边界）、`--done`、`--cancel`、`--status` 任一操作，Then 行为与退役前完全一致（复用既有幂等/审计/清理路径，零语义变化）。

### FR-03: 文档与模板去 quick 通道化（新项目视角重写）
Given 新项目经 init 拿到的注入面（templates/agents-instruction.md、命令卡 assets/command-cards/、skills .claude/skills/），When 使用者按指引操作，Then 不再出现把 quick 当可用通道的表述；模板以「轻量变更（flow start→干活→flow done）」为默认道重构（选道表/--input 过门格式/常用命令速查/12 条核心规则，吸收会话身份与加厚 git pathspec 纪律）；本仓 AGENTS.md 与 CLAUDE.md 同步；package.json 3.30.0→3.31.0（init 版本感知幂等依赖版本差刷新）。

### FR-06: 快道配套面补齐与 thin 感知
Given quick 退役后轻量变更为默认道，When 使用者经 skills/命令卡/handoff/next 触达，Then sillyspec-quick skill 与 run-quick 命令卡转退役重定向、新增 sillyspec-flow skill 与 flow 命令卡（zcode/claude 双落点）；brainstorm scale=small、auto 分类提示、--status 无会话文案均改指 flow start；handoff 与 next 对 flow-state.yaml 在场的（thin）变更输出 flow start 恢复/收口建议（run <stage> 建议不再出现——会被混跑守卫拒）；stage 兜底网清理含 DB 幻影行注销（guard.json 存在含损坏时绝不清）。

### FR-04: 存量数据工具行为不变
Given 已存在的 QUICKLOG 条目 / quick 会话历史，When 执行 `quicklog commit`、`scope-audit --change quick-<id>`、`tests --anchor ql-…` 等读侧工具，Then 行为与退役前一致（本变更不触碰这些模块）。

### FR-05: 全量测试与 lint 绿
Given 本变更合入后，When 执行 `npm test`（全量）与 `npm run lint`，Then 全部通过；新启会话的既有 quick 测试改造后语义保留（夹具预置在途会话）或转为拒绝断言。


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/quick-retired.test.mjs（新增）：新启 `run quick` 断言 exit≠0＋指路文案＋guard.json 不存在＋QUICKLOG 无新条目。

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/quick-retired.test.mjs（夹具预置在途会话→渲染→三步 --done 全通）＋ test/quick-cli-managed-e2e.test.mjs / test/quick-done-fallback-guard.test.mjs 改造后全绿（在途收尾链路回归）。

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/quick-retired.test.mjs 文档断言组：模板与 AGENTS.md 含「已退役」墓碑、不含「存量过渡通道」表述；package.json 版本断言 3.31.0。

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
既有测试面回归即覆盖：test/commit-guard.test.mjs、test/quicklog-*.test.mjs、scope-audit 相关测试全量跑绿（本变更零触碰对应模块）。

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/command-cards.test.mjs（8 卡资产+flow 卡内容锚+run-quick 墓碑断言）+ test/handoff.test.mjs 2f/2g（thin 交接走 flow start）+ test/next-command.test.mjs 3b（thin 下一步走 flow start）。

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
会话侧亲跑全量：`npm test` 633 个测试文件 0 失败 exit 0（2026-09-26，日志 /tmp/sillyspec-full-test.log）＋ `npm run lint` 809 文件绿；CLI 实测门 lint passed（39.7s）——test 按本地 test_strategy=module 且 0 模块命中跳过（账本 gate_summary 如实记录 skipped），故全量证据由会话侧补证而非声称 CLI 亲测（独立评审 P1 清偿，如实改口）。