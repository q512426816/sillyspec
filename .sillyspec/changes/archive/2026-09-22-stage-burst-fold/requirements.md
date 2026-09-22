---
author: qinyi
created_at: 2026-09-22 15:56:14
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent（执行者） | 通过 CLI 走 run 族流程的开发会话；burst 下一次渲染吃全部说明书、一次 --done 收口 |
| CLI（流程状态机） | 渲染/校验/推进；burst 下守卫链逐轮原样生效，失败即断点 |
| 用户 | 关键决策点（requiresWait 步）回答 --answer；本变更授权全程免询问 |

## 功能需求

### FR-01: readStageBurst 配置读取（三态）
Given 仓库 local.yaml 可读（或缺失/坏 YAML）
When 调 readStageBurst(cwd)
Then local.yaml `stage.burst === true` → true，否则 false；env `SILLYSPEC_STAGE_BURST=0` 强制 false、`=1` 强制 true（优先于配置）；任何读/解析失败 → false（fail-safe）

### FR-02: burst 渲染折叠（白名单阶段）
Given brainstorm/plan/execute 阶段存在剩余非 completed/skipped 步且 readStageBurst(cwd) 为 true，且无 waiting 步（waiting 被 runStage 既有硬拦 exit(1) 指引 --continue，burst 分支不可达）
When `sillyspec run <stage>`
Then noAI 步就地执行 _cliAction 并标 completed 落库；AI 步逐个按既有 outputStep 输出（首可渲染步带 persona 注入）；尾部打印 burst 收口提示；若遍历后无剩余步则走 completeStageGates 收尾。非白名单阶段或 burst 关闭时行为与现状逐字节一致

### FR-03: burst done 循环收口（守卫零改动）
Given burst 开启且白名单阶段有待完成步
When `sillyspec run <stage> --done [--output ...] [--answer ...]`
Then completeStepBurst 循环调既有 completeStep（printNext:false、每轮 outputText=null 走 P0-2 事实合成）：每轮前对首个非 completed/skipped 步做 stale→pending 拉回（同 runStage 单步语义，渲染集合=完成集合）；每轮后重读 progress 重算 pending；守卫失败（WAIT/waiting/requiresWait 无答案/门禁/漂移）即 process.exit 停在失败步，重跑幂等续推；--answer 至多消费一次（轮前后 waitAnswer 快照比对检测，防 waiting 重定向漏检）；--step 断言仅首轮生效；循环上限 50 轮；agent 的整体 --output 仅横幅打印不落步记录；auto --done 路径 burst 分支跳过 --output 预合成（横幅单点）

### FR-04: env 逃生阀
Given local.yaml 配置 `stage: burst: true`
When 以 `SILLYSPEC_STAGE_BURST=0` 运行 `sillyspec run <stage>`
Then 走既有单步渲染路径（仅当前步说明书、无 burst 尾提示）

### FR-05: flow.mode 缺省翻回 legacy
Given 仓库 local.yaml 无 flow 配置（或读取失败）
When 调 readFlowConfig(specBase)
Then mode === 'legacy'；显式 `mode: thin` / `flow: thin` 照旧生效；受影响测试 fixture（test/flow-protocol.test.mjs ①②③⑤⑥、test/flow-route.test.mjs、test/flow-draft.test.mjs ⑥）补 `flow: mode: thin` 后全绿（断言本体不动；test/fr-index.test.mjs 核实不受影响零改动）；src/config-schema.js flow.mode desc 文案同步为 legacy（缺省）

### FR-06: command.js 两处 --done 分发接线
Given burst 开启且 stage ∈ 白名单
When 主 --done 分发（src/run/command.js:1727 一带）或 auto --done 路径（:2073 一带）执行
Then 走 completeStepBurst；burst 关闭或非白名单走 completeStep 原路径——两路径 options 透传语义不变

## 非功能需求
- 兼容性：burst 缺省 OFF，未配置时全部既有行为零变化（全量测试零回归锚）；completeStep/outputStep/runStage 签名与语义不变（新增并行包装不改本体）
- 平台：Windows/Linux/macOS 兼容（路径 join、无 shell 拼接依赖）
- 测试纪律：env 门控断言的 spawn 显式剥净相关变量；行为翻转断言走被跟踪 fixture 文件（conventions 实证）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001 | FR-01, FR-04 | 缺省 OFF + env 阀优先级 |
| D-002@v2 | FR-02 | 渲染器零改动（outputStep 签名照旧；一致判据=首访渲染形） |
| D-003@v2 | FR-03 | completeStep 本体零 diff，循环包装+尾随 stale 拉回+auto 路径跳过预合成 |
| D-004@v2 | FR-03 | --answer 单次消费（快照比对检测） |
| D-005 | FR-03 | --step 断言仅首轮 |
| D-006 | FR-02, FR-03, FR-06 | 白名单=brainstorm/plan/execute（排除 quick 四字段契约） |
| D-007 | FR-01 | readLocalYamlRaw+js-yaml 范式 |
| D-008 | FR-02 | executeNoAiCliAction 抽取共用 |
| D-009 | FR-03 | 整体 --output 横幅不落步记录 |
| D-010@v2 | FR-05 | flow 缺省翻转 + 三测试文件 fixtures + config-schema 文案 |
| D-011 | 全部 | 方案 A 冻结版 |
