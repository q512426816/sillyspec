---
author: flow-machine-draft
created_at: 2026-10-15T13:21:52.280Z
---
# 需求规格（Requirements）— 2026-10-15-eval-b-arm-turn-budget

## 功能需求

### FR-01: adapter.maxTurns 60 → 120，B 臂流程获得完成空间

- 必须：`eval/eval.config.json` 的 `adapter.maxTurns` 由 60 改为 120。依据（004 实测）：B 臂走完整 SillySpec 流程，60 轮被掐断时（terminal_reason=max_turns）产物已正确（本机实跑与期望逐字一致）——轮次帽低于流程仪式开销时测的是帽不是方法；A 臂裸跑实测 16 轮内完成，不受影响。
- 禁止：不改 timeoutMs（900s 独立于轮数帽）与双臂 prompt 语义（B 臂话术修正见 FR-02）。

#### 场景：轮数帽修正

- Given：eval/eval.config.json
- When：JSON.parse 检查 adapter.maxTurns
- Then：等于 120

### FR-02: B 臂 promptTemplate 去除退役通道话术

- 必须：`arms.B.promptTemplate` 移除「小任务走 quick 模式」（quick 通道 v3.30.0 已退役，陈旧话术诱发 agent 对账空转），改为与现行协议一致的表述（按 SillySpec 轻量流程完成：flow start → 直接干活 → flow done）。
- 禁止：保留「当前项目已安装 SillySpec 工作流」与 `{instruction}` 占位。

#### 场景：话术修正

- Given：arms.B.promptTemplate
- When：检索
- Then：不含「quick」，含 `flow start` 与 `{instruction}`

### FR-03: 配置测试扩展 + lint

- 必须：`test/eval-adapter-config.test.mjs` 扩展：maxTurns=120 断言；B 臂 promptTemplate 不含「quick」断言。
- 必须：`npm run lint` 通过。

#### 场景：测试扩展

- Given：test/eval-adapter-config.test.mjs
- When：node --test
- Then：全绿（含新增断言）

## 测试绑定（每条 FR 至少一行）

FR-01: test/eval-adapter-config.test.mjs「maxTurns 轮数帽与 B 臂话术」
FR-02: test/eval-adapter-config.test.mjs「maxTurns 轮数帽与 B 臂话术」
FR-03: test/eval-adapter-config.test.mjs「maxTurns 轮数帽与 B 臂话术」（lint 面收口亲测）
