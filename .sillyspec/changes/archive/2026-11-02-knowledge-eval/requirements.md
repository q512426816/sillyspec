---
author: flow-machine-draft
created_at: 2026-11-02T02:07:32.486Z
---
# 需求规格（Requirements）— 2026-11-02-knowledge-eval

## 功能需求

### FR-01: 三源数据集：organic（遥测 query 去重池，本仓 110/平台 548，抽样人工 anchor 级标签 30 条起步）、self（211 条归档 input 回放，leave-one-out 防泄漏，只作 smoke 不作质量指标）、probes（合成缺陷 fixtures）

评测数据集必须且只能由三源组成：organic（从遥测 query 去重池分层抽样并人工标注 anchor 级期望命中，≥30 条）、self（归档 flow-state input 回放，leave-one-out 防泄漏，仅作链路 smoke）、probes（六类缺陷的合成 fixture）。每个 case 必须携带 repo、face、query、expected 字段且可机器校验；self 集禁止参与质量指标计算。self 的 leave-one-out 落地为 name-only 对照（leak_gap 量化同文泄漏，D-001）。

#### 场景：organic 标签缺失

Given 某 organic case 未填 expected 或 expected 为空数组
When runner 加载数据集
Then 该 case 必须被跳过并计入 skipped_cases，禁止静默当作零命中参与指标

#### 场景：self 集泄漏

Given self case 的查询来自归档 input 且期望命中的知识由同一变更蒸馏
When 计算指标
Then 该 case 必须仅出现在 smoke 段，且 leave-one-out 剔除自身变更蒸馏的知识后仍可检出链路是否连通

### FR-02: 缺陷探针 fixtures 覆盖六类：score 输出契约（=命中标签数）、词边界（_/- 策略）、fr/decisions 路由行混入 entries 率、scope 层手工条目可达性、known-issues 已修复条目注入率、决策↔代码关联率

缺陷探针必须覆盖六类已确认缺陷，每类以最小合成知识库 fixture 固定正反例期望行为；fixture 断言必须在缺陷存在时失败、在修复后通过。六类为：score 输出契约（score 必须等于实际命中标签数且为 tags 子集）、词边界策略（_ 与 - 的边界语义单一化并有正反例）、fr/decisions 路由行混入 entries 率（entries 不得含路由行）、scope 层手工条目可达性（scopeRecall 必须能返回手工文档条目）、known-issues 已修复条目注入率（默认注入/检索必须排除 fixed 条目）、决策↔代码关联率（语料健康段必须报告总条目/有锚点/任一关联占比）。

#### 场景：缺陷存在时

Given 当前代码仍带某类缺陷
When 运行对应 probe fixture
Then 断言必须失败并给出缺陷类别与实测值，禁止 fail-open 跳过

### FR-03: 分面 runner 输出 Top-1/Top-3（entries@3、decisionHits@5、search@10、scope@3/20 四个核心面），raw 与 rendered 两套结果可区分引擎未召回与渲染截断

分面 runner 必须输出四个核心检索面的 Top-1/Top-3 与 MRR：entries@3（matchByRouting 的 entries 前 3，渲染为 flow 📚 行）、decisionHits@5（rejected/死路优先通道前 5）、search@10（cmdSearch 等价 entries 序前 10）、scope@3/20（scopeRecall 的 entries 前 3 与 decisionHits 前 20）。每个面必须同时输出 raw（引擎 JSON 命中）与 rendered（消费面切片后的可读命中）两套结果，差异必须能定位为截断或渲染丢弃。

#### 场景：渲染截断

Given 引擎在第 6 位命中了期望条目而消费面只取前 3
When 输出该 case
Then raw 段必须记录该条目的 rank=6，rendered 段必须记录未呈现，两者差异计入 truncated 计数

### FR-04: 全流程零网络零遥测副作用（SILLYSPEC_KNOWLEDGE_VECTOR=off、SILLYSPEC_HITS_PUSH=0、临时 runtimeDir），结果带 git HEAD + knowledge 目录 hash 快照指纹

评测执行必须零网络零遥测副作用：禁止写入 knowledge-hits.jsonl、禁止发起平台请求、禁止写平台能力缓存；临时产物必须落 mkdtemp 目录并在结束时清理。每次结果必须携带快照指纹（git HEAD + knowledge 目录树内容 sha256），基线与当前跑的指纹不一致时必须显式告警而非静默对比。

#### 场景：副作用检测

Given runner 在真实仓上执行一轮评测
When 对比执行前后 knowledge-hits.jsonl 的行数与平台网络请求计数
Then 行数必须不变且零网络请求；缓存类写入仅允许出现在临时目录

### FR-05: baseline.json 可提交可 diff，npm run eval:knowledge 可复跑，附零网络 smoke test

baseline.json 必须是可提交、可 diff 的稳定 JSON（键序固定、浮点统一小数位），支持 --set-baseline 写入与默认读取对比；package.json 必须提供 eval:knowledge 脚本；必须附零网络 smoke test，在无遥测、无平台配置的环境下可跑通并验证 baseline 读写往返。

#### 场景：基线漂移

Given 当前快照指纹与 baseline.json 记录的指纹不同
When 默认运行（非 --set-baseline）
Then 输出必须显式标注 snapshot_mismatch 并同时给出两套指标，禁止静默覆盖基线

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/eval-knowledge-dataset.test.mjs「三源数据集加载与校验」
FR-02: test/eval-knowledge-probes.test.mjs「六类缺陷探针断言」
FR-03: test/eval-knowledge-runner.test.mjs「分面指标与 raw/rendered 对比」
FR-04: test/eval-knowledge-isolation.test.mjs「零副作用与快照指纹」
FR-05: test/eval-knowledge-smoke.test.mjs「baseline 读写往返与 CLI 冒烟」
