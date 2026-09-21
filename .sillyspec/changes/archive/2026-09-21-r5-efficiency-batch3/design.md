---
author: qinyi
created_at: 2026-09-21T22:50:00
plan_level: full
risk_level: medium
---
# 设计文档 — R5 效率优化第 3 批（收尾事务稳定性）

## 背景与证据链

batch2 归档全程实证（本会话）：门禁失败的真实代价不是 CLI 检查的毫秒级，而是**触发一条诊断-修复-重试级联，每节一个全量上下文重发的 agent 回合**——收尾段 13 起阻断/15 回合，其中 5 起已被 ql-009/M2 落地根治（幽灵守卫/字节等值误拦×3/快照分叉），剩余成本归三类：

- **--done 独有的贵门失败**（stage review 缺失/reconcile 两轮/manifest 缺行）：预检（`sillyspec gate X`）查不到，失败即整回合级联；
- **重复全量测试**（7 跑：execute 收口×3/gate verify/verify --done 快照/失败复刻废跑/apply 后主仓对账——真实必要 2-3 跑）+ agent 因怕被拦的恐惧性预跑；
- **归档三查（apply 面/manifest/module-impact）全部在 archive 时段首查**，且 verify PASS→archive 之间的窗口期 main 前进（batch2 实证 118bb92f 插入）制造合并面。

用户裁决（会话内）：fail-closed 为不可让步红线；**单会话跑到底是既定使用形态，不做 handoff 强化**；验收用可数指标不信感觉。

## 总体方案（范围）

四模块共同服务「门第一次就过」：P1 预检补全（--done 检查面只读前置）、P2 测试结果记账（同码同环境 fail-closed 复用，消重复跑与恐惧预跑）、P3 归档就绪度前置（verify 收口预查归档三查+草拟修法+apply 即时强提示）、P4 M1 翻默认（既定退役路径，长会话每轮注入减负）。红线不动：四道防线判定语义/请求钳/allowed_paths 门禁/状态机步数/DB schema/ceremony 定价零触碰；P2 不得引入假绿路径。Wave：W1=P2+P4（文件正交），W2=P1+P3（gates.js 与 complete-handlers.js 不同文件可并行，P1 消费 P2），W3=文档收口。

## 模块 P1：预检补全（gate 层，D-002@v1）

**落点**：`src/run/gates.js`（gate 命令装配处）+ `src/verify-postcheck.js`（只读检查复用）。

**机制**：`sillyspec gate <stage>` 增 `--full` 档——补齐 --done 独有检查面的只读版：
1. module 子集实测（test/lint）——**经 P2 记账**：指纹一致直接复用最近结果（预检不再付全量价），不一致才真跑（跑完记账，--done 再检时即复用）；
2. target_files reconcile 只读跑（现有 reconcileTargetFiles 已可只读，接 `--dry-run` 形态）；
3. stage review 缺失探测（tier=independent 时检查 marker/骨架存在性——只报缺不生成）；
4. quick --done 的 test/lint 实测门同口径纳入 `gate quick --full`。

**语义边界**：--full 全只读零副作用（不写账本以外任何文件）；默认档（无 --full）保持现状零成本；「预检过=必过」的口径承诺=--full 报告的每项检查与 --done 同源同引擎（复用 batch1「gate verify lint parity 同引擎」先例）。

**验收**：--full 对 batch2 实证的四类失败（stage review 缺/reconcile 缺/manifest 缺/test 红）在同回合暴露（测试钉：人为构造四态，--full 全报）；默认档输出与改前逐字节一致。

## 模块 P2：测试结果记账（fail-closed，D-001@v1）

**落点**：新 `src/run/test-ledger.js`（纯函数+账本 IO）+ 消费点接线（gates.js verify-test / quick --done 实测门 / P1 --full）。

**机制**：
1. **三键指纹**：`codeFingerprint`（HEAD + porcelain 脏文件路径与内容摘要——同 quality-scan 先例口径）× `testSetHash`（测试命令串 + 测试文件清单+内容摘要）× `envProfile`（结构化探针：cwd 是否 worktree 内、平台模式、SILLYSPEC_* 相关键集、node 版本、平台名——**布尔/枚举形态不含裸路径**，worktree 与主仓天然分键）；
2. 账本 `.runtime/test-ledger-<changeName>.json` 记 {三键, 结果（pass/fail/失败文件清单/耗时）, ranAt}；任一键分量不可得（git 失败/读不到测试面）→ **不记不复用**（fail-closed 第一层）；
3. 消费点查询：三键全等 → 复用（打印 ♻️ 一行+结果摘要）；任一分量漂移或账本缺失 → 真跑（跑完记账）。**宁假红不假绿**：复用只跳过「重跑已绿的同类检查」，失败结果不缓存（失败即真跑修复路径），且复用判定增加代码指纹的严格全等（不含模糊匹配/时间窗放宽）。

**与既有 quality-scan 复用的关系**：P0-1 是「noAI 质量扫描步→verify 门」单向复用；P2 泛化为跨 gate/--done/预检的多消费点账本，两者共存（quality-scan 指纹口径可后续归一，本批不动它）。

**验收**：同码同环境二次 gate 只复用不重跑（耗时断言 <5s）；改一行 src → 指纹变 → 真跑；worktree 与主仓互不复用（envProfile 分键钉）；git 不可达 → 永远真跑（fail-closed 钉）。

## 模块 P3：归档就绪度前置（收尾编排层，D-003@v1）

**落点**：`src/run/complete-handlers.js`（verify 完成处理器尾部）+ `src/worktree-apply.js`（checkOnly 复用，零改或微导出）。

**机制**：
1. verify `--done` 成功输出尾部增「**归档就绪度报告**」：①未-apply 交付面（applyWorktree checkOnly 只读，含 ql-009② 合并感知口径）②manifest 缺行**草拟**（对账失败项生成 design.md §6 补行文本——**生成后经 parseFileChangeList round-trip 校验**确保草拟行可被清单解析器吃下，agent 确认后落）③module-impact 归因**草拟**（三重核对报告转成未匹配章节的归因行草稿）——**只草拟不代写**，agent 逐项确认（代写会弱化声明门禁的确认语义）；
2. **apply 即时强提示**：verify PASS 且 main HEAD 已前进过 worktree 基点、且前进文件与交付面有交集 → 打 ⚠️ 强提示「基线老化中，建议立即 apply」（附命令行；batch2 实证窗口期=118bb92f 插入制造三方合并面）；
3. 归档门保持现状全查（预检不取代门——「状态可能在 verify→archive 间变化」由归档时的复查兜底）。

**验收**：三草拟项格式钉（可解析）；apply 强提示只在「main 前进∩交付交集」态出现（四态测试：前进有交集/前进无交集/未前进/无 worktree）；verify 正常输出在无就绪问题时零附加噪音（逐字节回归钉——报告只在有发现时出现）。

## 模块 P4：M1 翻默认（渲染层，D-004@v1）

**落点**：`src/run/prompt.js`（SILLYSPEC_STEP_GUIDE 判定）+ 受影响测试族迁移。

**机制**：缺省逻辑翻转——`SILLYSPEC_STEP_GUIDE` 未设=开（短输出+落盘），`=0` 显式关（逃生门保留）。前置迁移：stdout 确定性测试族（别名路由奇偶校验等 5 断言，task-01 review 在案的冲突面）逐个改 fixture 内 `SILLYSPEC_STEP_GUIDE=0` 或改为断言短形态（按测试语义择一，逐例留一行迁移注记）。D-001 退役判据就此兑现，`--json` 全量与动态段永不缓存语义不动。

**验收**：翻转后全量测试零红；不设 env 的复入输出为短形态（≤10 行断言沿用）；`SILLYSPEC_STEP_GUIDE=0` 显式关回到全量（逃生门钉）。

## 红线（全部不动）

四道防线判定语义 / 请求钳 / allowed_paths 门禁 / 状态机步数 / DB schema / ceremony 定价引擎。P2 复用**永不放行该拦的失败**（失败不缓存+指纹严格全等）；P1 --full 永不写门禁产物；P3 草拟永不代 agent 落声明。

## Wave 划分

- **W1（并行）**：P2（test-ledger 新模块+消费点接线）+ P4（prompt.js+测试迁移）——文件正交。
- **W2（依赖 W1）**：P1（--full 档消费 P2）+ P3（complete-handlers 尾部+apply 提示）——不同文件可并行。
- **W3（依赖全部）**：文档收口（镜像重生成+模块卡+docs-check 重锚）。

## 验收协议（本批 → R5 对撞重跑）

硬门：全量测试零回归 + lint；P2 fail-closed 四态钉；P1 四类失败同回合暴露钉；P3 草拟格式钉；P4 逃生门钉。**可数指标**（外部执行，R5 重跑协议搭载）：同类收尾场景门禁失败次数（batch2 基线 13 → 目标 ≤4）与 agent 回合数（基线 15 → 目标 ≤6）；全量测试执行次数（基线 7 → 目标 ≤3）。

## 风险登记

| 风险 | 等级 | 缓解 |
|---|---|---|
| P2 假绿（指纹漏维度放走回归） | 高 | fail-closed 三层：键分量不可得不复用/失败不缓存/严格全等无模糊；envProfile 用结构化探针（本会话实证 worktree/快照/主仓对环境族测试表现不同，裸路径不入键、worktree 布尔入键）；验收含「改一行必重跑」钉 |
| P1 --full 与 --done 口径漂移 | 中 | 同引擎同源调用（lint parity 先例）；「预检过=必过」写进测试（--full 绿→--done 不因同因再拦） |
| P3 草拟被当自动确认 | 低 | 草拟格式带「待确认」标记+agent 确认后才落声明（代写禁令写进模块约束） |
| P4 迁移漏测试面 | 中 | 以翻转后全量零红为硬门；5 断言逐例迁移注记可审计 |
| 主仓并行会话同文件冲突 | 中 | W2 两件不同文件；提交显式 pathspec；基线老化由 P3 强提示缓解 |

## 自审（Self-Review）

- 四模块共同服务同一目标且 P1 依赖 P2 的依赖关系显式（W1→W2），无环。
- 全部设计点有本会话 batch2 实证锚点（13 阻断逐起归因对应到模块），非纸面推断。
- 与用户裁决对齐：fail-closed 红线、单会话形态（无 handoff 项）、可数验收。
- 假绿风险单列最高级+三层缓解——本批唯一非纯减法件。
- ql-009/M2 已根治的 5 起不在本批范围（不重复付费）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新建 | NEW:src/run/test-ledger.js | P2 三键指纹账本（纯函数+IO） |
| 修改 | src/run/gates.js | P1 --full 档装配+P2 消费接线 |
| 修改 | src/verify-postcheck.js | P1 reconcile 只读形态+P2 消费 |
| 修改 | src/run/complete-handlers.js | P3 就绪度报告+apply 强提示 |
| 修改 | src/run/prompt.js | P4 缺省翻转 |
| 修改 | src/index.js | P1 gate 命令 --full flag 注册（gate 子命令装配点） |
| 新建 | NEW:test/test-ledger.test.mjs | P2 四态钉（复用/指纹变/fail-closed/env 分键） |
| 新建 | NEW:test/gate-full-preflight.test.mjs | P1 四类失败同回合暴露+默认档零回归 |
| 新建 | NEW:test/archive-readiness.test.mjs | P3 草拟格式+强提示四态+零噪音钉 |
| 新建 | NEW:test/step-guide-default-on.test.mjs | P4 缺省开+逃生门+迁移后全量绿 |
| 修改 | docs/sillyspec/platform-interface-map.md | task-04 附带：--full flag 行号锚重锚（737→744） |
| 修改 | src/machine-interface.js | P1 --full 档主体（实际装配落位——清单原指 gates.js 侧，归位声明） |
| 修改 | src/run/quick-audit.js | P2 消费点接线（quick --done 实测门，卡 01 声明面补录） |
| 修改 | test/cli-top-level-aliases.test.mjs | P4 迁移面：runCLI 助手锁 STEP_GUIDE=0 |
| 修改 | test/preflight-slimming.test.mjs | P4 迁移面：金丝雀锁 =0 |
| 修改 | test/semantic-guard-prompt-inject.test.mjs | P4 迁移面：renderQuickStep1 锁 =0 |
| 修改 | test/step-guide-fingerprint.test.mjs | P4 契约反转：v1 默认关断言→P4 缺省开 |
| 修改 | docs/prompt/_extracted.json | W3 镜像机械重生成 |
| 修改 | docs/prompt/plan.md | W3 镜像（DYNAMIC 策展面按需） |
| 修改 | docs/prompt/execute.md | W3 镜像（DYNAMIC 策展面按需） |
| 修改 | .sillyspec/docs/sillyspec/modules/*.md(+changelog) | W3 模块卡行为行（runtime/stages 域） |
