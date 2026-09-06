---
author: qinyi
created_at: 2026-09-07T03:32:51+08:00
scale: large
---

# 设计文档（Design）— IR 五阶段 P3b：verify 验证结论表 + 探针复跑抽查

## 背景

种子稿 `docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md` §4：把 archify 的「visual-check 可独立复核」搬到验证域——verify claims 三层分级（确定性检查 / 可复跑探针 / 人工判断），探针命令可由 CLI 复跑抽查，防「声称测过」。

代码侧现状（2026-09-07 核实，P3a 合入 6d72aca 后）：
- 四探针已 CLI 化：`runVerifyProbes`（src/verify-probes.js:96）返回 probe1/3/5/6 结构化结果；`verify-probes --change X --init` 生成 verify-result.md 七章节骨架，探针结果由 `renderVerifyProbesReport` 机械预填。
- test/lint 由 CLI 亲自对账（runVerifyTestCheck/runVerifyLintCheck，--done 链）——「确定性检查」层已有。
- **缺口 ①**：预填内容落盘后 agent 可篡改/删除（无一致性核验）——「声称测过」的残余风险。
- **缺口 ②**：探针命令行与首跑快照未持久化——无可复跑审计底稿（reviewer 事后无从知道当时跑了什么、结果是什么）。
- **缺口 ③**：verify-result.md 章节无 claims 分层标注——读者无从分辨哪段是机器结论、哪段是 agent 判断。

## 设计目标

1. **可复跑探针层**：`verify-facts.json` 机器底稿（CLI 全权写入：探针命令行 + 首跑关键指标 + 时间戳），供事后独立复跑审计。
2. **防篡改**：verify --done gate 新增探针一致性检查——重跑探针对比 verify-result.md **正文预填段**（对比基准是正文而非底稿，删除底稿绕不过防护）。
3. **claims 三层标注**：骨架章节头标注层属（确定性检查/可复跑探针/人工判断），层间不混同。
4. agent 零新增负担、存量变更零红门禁（无 facts/预填段形态的旧报告 → WARNING 跳过）。

## 非目标

- 不做 agent 手写 facts 表（verify.facts.yaml 原案的 agent 半边）——agent 写 IR 是已知前科风险（frontmatter 手抄），判断层保持 verify-result.md 散文 TODO 章节（D-001@v1）。
- 不做探针 2/4（半语义，留 agent）的命令化——它们本就是「人工判断」层。
- 不做 P3a 侧联动的变更（已落地）；不做 P3c/P3d（各自独立变更）。
- 不改 runVerifyProbes 既有探针逻辑与 renderVerifyProbesReport 既有渲染语义（一致性检查消费其输出，不改变其行为）。

## 拆分判断

单 change 不拆分：三件事（底稿/抽查/标注）共一个闭环且文件集中（verify-probes/verify-postcheck/gates/verify prompt），4 文件级改动。

## 总体方案

### Wave 1：机器底稿 + 一致性检查

**verify-facts.json**（`verify-probes --init` 时同步落盘到变更目录）：
```json
{ "schemaVersion": 1, "change": "<name>", "generatedAt": "<iso>",
  "probes": {
    "probe1": { "command": "sillyspec verify-probes --change <name>", "metrics": { "matches": N, "skippedFiles": N, "worktreeHits": N, "globEntries": N } },
    "probe3": { "command": "sillyspec verify-probes --change <name>", "metrics": { "tasks": N, "hasTest": N } },
    "probe5": { "command": "sillyspec verify-probes --change <name>", "metrics": { "backendEndpoints": N, "frontendCalls": N } },
    "probe6": { "command": "sillyspec verify-probes --change <name>", "metrics": { "deletions": N, "unavailable": false } }
  } }
```
CLI 全权写（生成器在 verify-probes.js，`--init` 入口追加落盘调用；重新 --init 覆盖为最近一次 init 快照——语义是「最近一次机械预填的审计底稿」而非不可变首跑）。

**一致性检查** `checkProbeConsistency`（纯函数，src/verify-postcheck.js 导出，照 P3a reconcileTargetFiles 同款模式，签名含 specBase/runtimeRoot——平台模式取根口径与 P3a 先例一致，缺参场景同款兜底）：
1. 重跑 `runVerifyProbes({ cwd, changeName })` 取当前指标；
2. 解析变更目录 verify-result.md **正文**的预填段，**以 `#### 探针 N` 子节为定界**（非 ## 节——探针 2/4 的 agent 补写内容在同一 ## 节内，子节定界防 `- ⚠️` 模式碰撞假 ERROR，G4/G8），锚点按子节内紧锚正则提取：
   - probe1：`- ⚠️ \`file:line\`` 行计数（渲染 :223 同源）；
   - probe3：`- ✅ task-N: …找到 N 个测试文件` 的 hasTest 计数（渲染 :242 同源）；
   - probe5：锚 **summary 行存在性与 missing 计数**（渲染 :256 实际输出 probe5.summary——backend/frontend 总数在 FAIL 形态不进渲染文本，G2：锚 summary 行而非计数；fail 形态锚 missing 数，pass 形态锚行存在）；
   - probe6：`- <verdict> \`path\`` 删除条目计数（渲染 :285 同源）。
   锚点正则与渲染函数同文件导出共享常量（R-01 兜底：round-trip 测试锁定）；
3. 分级判定（D-002@v1 + G1 判别子）：
   - **判别子**：`#### 探针` 定界子节**任一存在** = 新格式报告；全部子节缺失时——verify-facts.json 在场 → **ERROR**（agent 删除预填段）；facts 也不在场（存量旧报告）→ WARNING 跳过。残余（agent 同时删正文预填段+facts.json）降级 skip——防护弱化非绕过，如实声明；
   - probe1 命中数不符 / probe6 删除数不符 = **ERROR**（除 HEAD 前进子案：init→done 间产生新 commit 时 probe6 的 `git diff HEAD` 口径整体漂移 → 降 WARNING 提示复跑 init，G8 子案）；
   - probe3/probe5 锚不符 = **WARNING**（环境敏感）；
   - 重跑异常 = WARNING 降级（fail-soft）。
4. 接线：gates.js verify 块，P3a reconcileTargetFiles 接线之后追加（同一接线风格：ERROR → rollback，WARNING 放行；结果进诊断信封，随 reconcile 同款落盘 verify-runs）。envelope code 四值（execute 审查勘误：ok 态补 probe_consistency_ok，对齐 P3a reconcile_ok 先例与四状态全落盘规格）：`probe_consistency_mismatch`（ERROR 级不符）/ `probe_consistency_drift`（WARNING 级漂移）/ `probe_consistency_skipped`（跳过/降级）/ `probe_consistency_ok`。

### Wave 2：claims 分层标注 + prompt 卸责

- `generateVerifyResultSkeleton` 章节头加层标注（**后缀形式追加在既有章节标题行**，不新增行——G9 规格）：「结论」与「任务完成度」→ `[层：人工判断]`；「探针结果」→ `[层：可复跑探针（CLI 预填，gate 抽查防篡改）]`；「测试结果」→ `[层：确定性检查（CLI 实测对账）]`；其余语义章节 → `[层：人工判断]`。纯渲染层追加，不改既有章节语义与 TODO 占位（verify gate 的结论提取按关键词窗口制，标注无 PASS/FAIL token 不影响——审查核实 stage-contract.js:461-482）。
- src/stages/verify.js Step 7 prompt 增加两条纪律：预填探针段不可篡改/删除（gate 一致性抽查会拦）；verify-facts.json 是机器底稿勿手改（改了也会被重跑对比识破——对比基准是正文）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | buildVerifyFacts + --init 落盘 verify-facts.json；骨架章节层标注 |
| 修改 | src/verify-postcheck.js | checkProbeConsistency 纯函数（重跑+解析正文锚点+分级） |
| 修改 | src/run/gates.js | verify 块 reconcile 接线后追加一致性检查（信封+落盘同款） |
| 修改 | src/stages/verify.js | Step 7 prompt 防篡改纪律两条 |
| 新增 | test/verify-probes-facts.test.mjs | 底稿生成/幂等/一致性分级（篡改/缺失/漂移/存量跳过）断言 |

（纯主仓变更，无跨仓段。）

**字段数据流标注**（新增对外产物 verify-facts.json 与检查结果）：producer = CLI（verify-probes --init 全权写）→ consumer = ①事后审计（人/平台读命令行复跑）②checkProbeConsistency 的参照（仅审计参考，防护基准是正文）→ gates 信封透传（code=probe_consistency_*，additive）。agent 不读写该文件（prompt 明示禁改）。

## 接口定义

```js
// src/verify-probes.js
buildVerifyFacts(result, { changeName, now }) // → facts 对象（schema 上文）
// --init 入口：writeFileSync(join(changeDir,'verify-facts.json'), JSON.stringify(facts,null,2))

// src/verify-postcheck.js（纯函数，接线在 gates.js）
checkProbeConsistency({ cwd, changeName })
// 内部：重跑 runVerifyProbes + 解析 verify-result.md 正文预填段锚点
// → { status: 'ok'|'mismatch'|'skipped'|'degraded', severity: 'error'|'warning'|null,
//     mismatches: [{ probe, expected, actual, severity }], skipReason? }
```

envelope code：`probe_consistency_mismatch`（ERROR 级不符）/ `probe_consistency_drift`（WARNING 级漂移）/ `probe_consistency_skipped`（跳过/降级）。

## 生命周期契约表

不涉及生命周期契约（新增检查与底稿产物，无 session/lease/状态机语义）。

## 数据模型

无 DB schema 变更。新增产物 verify-facts.json（结构见总体方案，schemaVersion: 1）。

## 兼容策略（brownfield 必填）

- **存量变更**（verify-result.md 为旧格式无预填段 / 无 facts.json）：一致性检查 WARNING 跳过，零红门禁。
- **verify-result.md 骨架格式变更**（层标注）：verify gate 的结论提取只认 PASS/FAIL 关键词（章节头追加不影响）；既有断言骨架格式的测试在 task 卡声明更新义务。
- **SillyHub 消费**：仅 additive 信封 code 与新产物文件。
- runVerifyProbes/renderVerifyProbesReport 既有行为零改动（一致性检查是增量消费者）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 正文锚点解析与渲染模式漂移（渲染改版后解析失配→假 mismatch） | P1 | 锚点提取与渲染输出同文件同源定义（或导出共享锚点常量）；测试锁定渲染→解析 round-trip |
| R-02 | 环境噪音致 probe1/6 假 ERROR（如 worktree 清理时机差） | P1 | probe1 对比排除 worktreeHits 维度（worktree 存活态与 init 时刻可能不同）；probe6 以 HEAD 为锚与 init 同源；首轮真实变更观测 |
| R-03 | 重跑耗时（四探针全量重跑叠加 verify --done 时长） | P2 | 四探针均为轻量（探针 5 有 parity 缓存口径）；实测超预期则抽查降为 probe1+6 |
| R-04 | agent 误改 verify-facts.json | P2 | prompt 明示禁改；防护不依赖该文件（对比基准是正文）——误改无安全影响 |
| R-05 | 探针 2/4 agent 补写内容与锚点模式碰撞（`- ⚠️` 形态同形）| P2 | `#### 探针 N` 子节定界 + 子节内紧锚正则（G8）；round-trip 测试锁定 |
| R-06 | init→done 间 HEAD 前进（并行提交）致 probe6 口径整体漂移假 ERROR | P2 | 检测 init 快照后新 commit（facts.generatedAt 后 git log 非空）→ probe6 漂移降 WARNING 提示重跑 init（G8 子案） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1（范围） | 非目标章节（不做 agent 半边 facts） | 全覆盖 |
| D-002@v1（方案A 分级+正文基准） | 总体方案 Wave1（分级判定/对比基准） | 全覆盖 |
| D-003@v1（Grill 修正五项） | Wave1 锚点规格与判别子、R-05/R-06、兼容策略 | 全覆盖 |

无未解决决策。

## 自审

- 章节齐全 ✓；frontmatter（author/created_at/scale:large）✓；第一行中文标题 ✓
- 生命周期关键词：豁免短语紧邻 ✓
- decisions.md 引用：D-001/D-002 全引用 ✓
- 字段数据流标注：verify-facts.json producer→consumer ✓
- UI 原型：无前端文件，跳过（纯 CLI）✓
- ⚠️ 自审存疑 1：R-01 的锚点共享方式（导出常量 vs 同文件测试 round-trip）实现期定，接口签名不变。
- ⚠️ 自审存疑 2：层标注是否影响 SillyHub 平台对 verify-result.md 的章节解析（本仓不可见消费方）——标注为章节标题后缀而非新行，风险低，留意平台侧反馈。
