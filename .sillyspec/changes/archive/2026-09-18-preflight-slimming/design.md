---
author: qinyi
created_at: 2026-09-18 20:36:24
generated_by: sillyspec-design-init
scale: large
risk_level: integration-critical
---
<!-- risk_level 覆盖说明（收口对账纠正版，2026-09-18 verify 双跑首战实录）：设计期初判 unit-sufficient 系乐观——实际 diff 27 文件跨 4 模块（docs-consistency/cli-entry/runtime/stages）+wait 协议/prompt 注入/文档多面；blast 事实面词命中 S3 属保守但按事实结算（D-003：预价信声明，结算信事实；懒 agent 低报在收口被抓获——本变更即首个案例）。仪式面实质等价 S3 菜单（独立评审三回路：设计 fail→修→改判/计划/执行验收）。 -->

# 设计文档（Design）— 2026-09-18-preflight-slimming

## 背景

基线锚（docs/sillyspec/cost-baseline-2026-09-18.md）实证主会话成本双因子：轮次 172（2.2× OpenSpec）、平均上下文 249k（1.8×）。轮次大头=9 次摩擦的「提交→打回→重读→重改」循环（≈20-30 请求）；上下文大头=每步重注的模块/scan 事实与滚动产物重发。批 2 对这两因子各下一刀，评审三约束（本步相关+条数帽+单步中位不反弹）为验收红线。

## 设计目标

1. 产出型步骤 prompt 注入 --done 面门的当前失败清单——摩擦重试轮次砍大半。
2. 阶段首步全量注入、后续摘要引用——上下文均值 249k → ≤210k。
3. wait 继承盖章（--inherit-from）省 2-4 轮/变更。
4. 测选路引导：中间验证定向优先，全量留 verify 收口。

## 非目标

- 不改 test_strategy 默认值（D-004：module-zero-hit→skip 静默无测试风险）。
- 不做步骤合并（动状态机契约，批 2/3 后按数据再议）。
- 不触碰已上线定价面（基线章程）。
- 不动 L1 机械门任何存在性（守恒红线 D-005）。

## 拆分判断

四件共享 prompt.js 主战场（前置注入/瘦身同文件；wait 协议在 run/command.js+complete.js，引导在 stages/templates——复审 gap③ 纠前提：非全同文件但互不冲突），单变更四 Wave 承载拆分仍优于拆变更（Phase 间接口耦合）。

## 总体方案

**Phase 1 门禁前置（D-001）**：【execute 评审 gap 回写：本期收录 design-file-list/four-piece-rules 两 validator；execute 任务步的 allowed-paths-scan 与 plan 步的 postcheck-lite 留 v2（D-006@v1）——机制与通路完整，纯映射表扩展位，原 design 的「execute→越界速查」表述以 v2 归期解读】outputStep 渲染产出型步骤（brainstorm 写文档/生成规范、plan 生成计划、execute 任务步）时，新增 {PREFLIGHT_FAILURES} 占位符：只读快跑该步骤 --done 将消费的 validator 子集（brainstorm→design-file-list+四件套规则；plan→postcheck 轻子集；execute→本 task allowed_paths 越界速查），条数帽 5、超时帽 3s/validator、异常静默不注（fail-open 注入面）；清单尾部固定行「完整清单：sillyspec gate <stage> --json」。防打架三约束（评审）写死：只注本步相关、帽后截断、验收盯中位长度。

**Phase 2 注入瘦身（D-002）**：模块上下文/scan 事实注入改为阶段感知——每阶段首步全量；同阶段后续步骤注摘要行（「本阶段上下文已于步骤 N 注入（digest 前 8 位）；需要时 Read <module-map 路径>/<scan 文档路径>」）；.runtime/prompt-inject-<change>.json 账本记 {stage, step, digest, at}（幂等；**回收经 pruneArchivedChangeRuntime 显式登记**（complete-handlers.js:181 枚举制——Grill 评审 fail②修复：prompt-inject-<change>.json 加入 prune 清单，否则孤儿累积））。占位符实现层不动（_module-map 匹配逻辑复用），只改注入分叉。

**Phase 3 wait 继承盖章（D-003）**：run <stage> --wait 新增 --inherit-from <D-xxx@vN>（参数解析在 src/run/command.js:339/:378-380，盖章落账在 src/run/complete.js wait_answers 写入点——Grill 评审纠锚）——CLI 解析 decisions.md 的 ## D-xxx@vN 标题（decisions-io 读取器），存在则同命令落答案轮（wait_answers 追加「第N轮: 由 D-xxx@vN 继承确认（CLI 盖章）」）完成该 wait 的记录态；不存在 exit 2 报错（fail-closed，防伪造锚点）。回放链不动（续跑照常回放盖章轮）。

**Phase 4 测选路引导（D-004）**：templates/ 任务卡骨架 verify 段与 stages/execute.js 任务步 prompt 加固定行「中间验证定向优先：node --test <本任务测试文件>；全量 npm test 留 task 收口与 verify --done」；docs/prompt 镜像三步流水线同步。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/prompt.js | {PREFLIGHT_FAILURES} 占位符+阶段感知注入分叉（Phase1+2 主战场） |
| 修改 | src/run/command.js | --wait --inherit-from 参数解析（:339 现有 --wait 面/:378-380 解析先例——Grill 评审纠锚） |
| 修改 | src/run/complete.js | 盖章答案轮落 wait_answers（:92-93/:1577-1578 现有写入点——Grill 评审纠锚） |
| 修改 | src/index.js | help 文本 --inherit-from 行（仅文案面） |
| 修改 | src/run/complete-handlers.js | pruneArchivedChangeRuntime 枚举补 prompt-inject-<change>.json（复审 gap①——不补则任务生成漏掉登记改动） |
| 修改 | src/decisions-io.js | 导出决策 ID 存在性校验（listDecisions 或等价轻读） |
| 修改 | src/stages/brainstorm.js | 产出型步骤标注 preflight 面（步骤定义与占位符声明） |
| 修改 | src/stages/plan.js | 同上（postcheck 轻子集标注） |
| 修改 | src/stages/execute.js | 任务步 preflight 标注+测选路引导行 |
| 修改 | templates/prompts/taskcard-rules.md | verify 段定向优先引导行（taskcard 骨架规则模板） |
| 修改 | docs/prompt/brainstorm.md | 镜像 |
| 修改 | docs/prompt/plan.md | 镜像 |
| 修改 | docs/prompt/_extracted.json | 镜像流水线再生成 |
| 新增 | NEW:test/preflight-slimming.test.mjs | 四相位直测：前置清单条数帽/超时降级、注入账本幂等与摘要形态、inherit-from 存在性双态、引导行在场 |

数据流向：stage 定义（preflight 声明）→ outputStep 渲染时只读快跑 validator → {PREFLIGHT_FAILURES} 进 prompt；_module-map/scan 注入 → 账本分叉 → 全量或摘要；--wait --inherit-from → decisions.md 校验 → wait_answers 盖章。

## 接口定义

```js
// src/run/prompt.js 新增（导出）
export async function renderPreflightFailures({ stageName, stepName, cwd, specBase, changeName })
// → Promise<string>（outputStep 本为 async :536——Grill 评审 gap 修复：同步签名与超时帽矛盾）（条数帽 5、超时帽 3s/validator、异常/无失败返 ''——fail-open）

export function shouldInjectFullContext({ changeName, stageName, runtimeRoot })
// → { full: boolean, digest?: string, firstStep?: number }（读 .runtime/prompt-inject-<change>.json 账本）

// src/run/command.js --wait 扩展（解析）+ src/run/complete.js（落账）——复审 gap③ 纠残锚
// sillyspec run <stage> --wait --reason ... --inherit-from D-003@v1
//   → decisions-io.hasDecisionId(specBase/changeDir, 'D-003@v1') 为真：落 wait+盖章答案轮（同命令）
//   → 为假：exit 2「决策 ID 不存在于 decisions.md——继承盖章 fail-closed」

// src/decisions-io.js 新增
export function hasDecisionId(changeDir, id) // 解析 ## D-xxx@vN 标题，字面存在性（机械）
```

本变更接口面：0 端点（纯 CLI prompt 注入/wait 协议/文案面，无 HTTP/RPC 接口产出——critical 档零接口面显式声明，非静默）

## 生命周期契约表

本设计不涉及 session/lease/daemon/lifecycle 状态转移——注入账本是 change 级派生文件（.runtime 生命周期，archive 回收），wait 盖章是既有 wait_answers 记录态的追加轮（协议不变）。无生命周期契约。

## 数据模型

无 sillyspec.db schema 变更。新派生文件：.runtime/prompt-inject-<change>.json（{stages: {<stage>: {firstStep, digest, at}}}）。

## 兼容策略（brownfield 必填）

- 未配 preflight 声明的 stage/步骤：{PREFLIGHT_FAILURES} 不渲染（占位符零出现，旧 prompt 逐字节不变）。
- 注入瘦身分叉失败（账本读写异常）：回退每步全量（现状），摘要形态只在职账本健康时启用。
- --wait 不带 --inherit-from：行为与现状逐字节一致。
- 回退路径：三分支各自独立摘除；账本文件纯派生可删。
- 不改变：L1 机械门、gate 判定逻辑、wait 回放协议、test_strategy 语义。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 前置注入与瘦身打架（清单全文重注顶回上下文） | P1 | 三约束写死：本步相关/条数帽 5/中位长度验收（D-005③） |
| R-02 | 只读快跑 validator 拖慢 prompt 渲染 | P2 | 超时帽 3s/validator+并行；渲染路径 fail-open（异常不注不阻） |
| R-03 | 摘要引用致 agent 丢上下文（该读没读） | P2 | 摘要行带可 Read 路径+digest；摩擦若反升（ledger 可观测）即回退分叉 |
| R-04 | inherit-from 伪造锚点 | P3 | fail-closed 字面校验+盖章轮标注来源（回放链可审计） |
| R-05 | 镜像测试红（prompt 文案断言） | P2 | 三步流水线同批次落盘+定向回归 |
| R-06 | 账本多会话 read-modify-write 丢更新 | P2 | withFileLock 写入（.tasks.md.lock 先例）——Grill 评审补遗 |
| R-07 | 前置清单被当「待办清单」应试打磨（清单外质量失查） | P2 | 清单头固定「已知失败项（非全部要求）」明示+守恒红线验收（Grill 评审补遗，入 FR-01） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 Phase 1 / 接口 renderPreflightFailures / R-01/R-02 | 已落实 |
| D-002@v1 | 总体方案 Phase 2 / shouldInjectFullContext / R-03 | 已落实 |
| D-003@v2 | 总体方案 Phase 3 / hasDecisionId / R-04（@v1 问题+@v2 答案=版本链，引用取当前版） | 已落实 |
| D-004@v1 | 总体方案 Phase 4 / 非目标第一条 | 已落实 |
| D-005@v1 | 非目标第三条 / R-01 验收 / verify-result 验收段 | 已落实 |

无未解决决策；剩余风险挂账见 R-01~R-07。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1 ~ D-005@v1 全入决策追踪）
- [x] 涉及生命周期关键词时含豁免短语（生命周期契约表节内明示无契约）
- [x] UI 原型分级核对（纯 CLI 注入面，无前端文件，原型跳过）
- [x] 不确定的问题标注「⚠️ 自审存疑」（无存疑项；validator 子集映射在 plan 期按步骤逐一对表）
