---
author: qinyi
created_at: 2026-09-28 09:20:52
generated_by: sillyspec-fourpiece-init
change: 2026-09-28-unclear-req-to-brainstorm
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent 会话 | 走 sillyspec 协议的编码 agent——前门盘问与知识检索回显的直接读者 |
| 开发者 | 仓主/用户——事后闭环提示的最终受益人与校准对象 |

## 功能需求

### FR-01: 前门选道盘问重述
覆盖决策：D-001@v1, D-005@v1
承接: FR-cli-entry-016, FR-cli-entry-019
Given agent 对全新变更执行 `sillyspec flow start --change <名> --input "<需求>"` 且通过既有格式门
When 变更创建成功输出渲染
Then 输出 MUST 含固定自检段：「对本需求，你还有没有必须问用户才能动手的问题？」并给出两条出路指引——有→`sillyspec run brainstorm --change <名>`（结构化问询协议，产物随后 flow start 自动收编）；无→继续
Then 自检段 MUST NOT 阻断流程、MUST NOT 要求新增 --input 节或声明 flag
Then adopt（头脑风暴收编）、resume（重入恢复）与既有变更路径 MUST NOT 出现该自检段
#### 场景：模板选道表改写
Given templates/agents-instruction.md 随版本 bump 刷新
Then 选道表第 1 行 MUST 为前提式表述（自检通过才走轻量道），第 2 行负面信号 MUST 标注为「举例」身份（明示举例非机制），速查行 MUST NOT 再含「勿自行重复检索」并 MUST 改为引导设计时点主动 search

### FR-02: 后门事后闭环（疑似该走预段未走）
覆盖决策：D-001@v1, D-003@v1, D-005@v1
Given 轻量变更执行 `sillyspec flow done --change <名>` 收口
When 收口完成后计算封闭面指标（design.md 终稿 vs 机器起草首版重写比、tasks.md 终稿 vs 机器预填稿改写率、收口评审盲维命中数、实测失败次数——全部为 diff 比例与计数，MUST NOT 引入任何关键词/词表语义判定）
Then 任一指标超阈（重写比 >50%、改写率 >60%、盲维 ≥2、实测失败 ≥2，阈值常量可调）时 MUST 将「疑似该走预段未走」标记连同指标与变更名落 `.sillyspec/.runtime/route-hindsight.json`
#### 场景：下次 start 点名提示
Given 本仓存在 hindsight 标记
When 下一次全新变更 `flow start` 渲染
Then 输出 MUST 点名提示（含上个变更名与形态计数，措辞用「疑似」非定罪，提示可无视不阻断）
Then 无标记或文件缺失时 flow start 输出 MUST 与现状完全一致（新装零影响）

### FR-03: 设计时点知识检索面
覆盖决策：D-004@v1
Given agent 在 brainstorm 阶段方案步/设计步工作
When 阅读步骤指引
Then 指引 MUST 含固定动作：落盘方案/决策前，把方案引入的机制词跑 `sillyspec knowledge search --query "<机制词>"`，命中必读再定稿（关键词由 agent 现场生成，指引中机制词 MUST 标注为举例）
#### 场景：方案步 --done 门自动检索
Given 方案步 `--done` 携带 --output 且 decisions.md 自上轮新增条目
When 门校验执行
Then CLI MUST 对 --output 与新增条目标题/question 拼串自动跑既有知识检索匹配器，命中时 MUST 在收口输出回显命中摘要（条目 id＋标题＋一句话理由）并提示 evidence 应回应或说明不复潮
Then 回显 MUST 为 warn 级（不阻断、不要求改写）；无命中时输出 MUST 与现状一致

## 非功能需求
- 兼容性：Windows/Linux/macOS 路径与换行（hindsight json 读写跨平台）；无 hindsight 文件的仓零行为变化；旧版 AGENTS.md 模板不受影响
- 可回退：hindsight 文件删除即回零；门检索 warn 面可经 local.yaml 关闭（预留 commands.knowledge-gate: off）
- 可测试：三件新测试覆盖指标/渲染/检索回显正反例（反例取自本仓已归档变更真实输入——FP 必须为 0）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02 | 判断面+行为面双轮修复（三重根因见 design 背景） |
| D-002@v1 | FR-01, FR-02, FR-03 | 范围限定 thin 道入口与 brainstorm 指引，run 族入口零改动 |
| D-003@v1 | FR-02 | rejected 落实为禁区：指标 MUST 全封闭面（比例与计数），禁词表语义判定 |
| D-004@v1 | FR-03 | 设计时点检索面三件套（指引动作/门回显/速查行改写） |
| D-005@v1 | FR-01, FR-02 | 方案 Ⅱ：前门纯提示＋事后闭环；硬门与声明 flag 不做 |

## 测试绑定（收编追加——每条 FR 至少一行：test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

FR-01 → test/flow-clarity-probe.test.mjs「选道自检段渲染（新建有/adopt与resume无）」
FR-02 → test/route-hindsight.test.mjs「指标计算与阈值」「标记落库与下次提示」「无标记零变化」
FR-03 → test/design-knowledge-check.test.mjs「门检索命中回显」「无命中零变化」
