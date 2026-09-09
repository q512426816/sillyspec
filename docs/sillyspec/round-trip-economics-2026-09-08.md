# 轮次经济学 × noAI 下沉分析（agent 轮次裁剪清单）

> updated_at: 2026-09-08
> author: qinyi
> 定位：与 `archify-ir-stage-proposal-2026-09-05.md`（IR 事实层方案）**正交切片**——那篇管「事实表 schema 与机器核验」，本文管「agent 轮次经济学」：哪些轮次可以清零、哪些判定可以下沉到 CLI、哪些上下文可以注入替代 cat。本文**只做收益盘点与分工，不含实施设计**（实施归 P3 brainstorm，以两文为双输入）。

## 0. 核心原则

清零的是两类轮次，**不是让 agent 少做判断**：

1. **agent 手写机器要读的格式** → CLI 骨架预生成，agent 只填语义字段；
2. **agent 转述机器已有的数据** → CLI 注入 / sidecar 回灌，agent 不当传话筒。

判断层散文（权衡、理由、风险）永远留给 agent——与 09-05 的双层原则一致。

## 1. 与 09-05 的分工（互指）

| 维度 | 09-05（IR 方案） | 本文（轮次经济学） |
|---|---|---|
| 职责 | 事实层 schema：design/tasks/touched/verify/delta facts.yaml + 机器核验 gate | 轮次裁剪：整段 noAI、骨架预生成、注入、判定下沉 |
| 关系 | verify sidecar（刀 B）= 09-05 §4 `verify.facts.yaml`；Wave 派生 = 09-05 §2 预计算 | doctor / quick 注入 / archive 收口 / 骨架缺口为 09-05 未覆盖的横切面 |
| 约束 | schema 命名一律跟 09-05，不另起一套事实表 | 轮次裁剪条目落地时引用 09-05 既有分期（P3a~P3d） |

大件（verify.facts.yaml、Wave 派生、archive 收口、doctor 扩展、集成回执）**并进同一 P3 brainstorm，双输入**，不开平行 change。

## 2. 已动工现状盘点（开 brainstorm 前必读，防重复设计）

09-05 的分期里有一部分**已经落地**，盘点如下（2026-09-08 基线）：

- **P3a target_files 对账已落地**：verify-postcheck 的 git 三源（diff/status/pathspec）对账声明没做=ERROR 阻断（`src/verify-postcheck.js` target-files 对账段，接线 `src/run/gates.js` verify 收尾）；task 卡 `target_files[]` 字段与 `NEW:` 前缀语义已存在。
- **P3b 已收口**（2026-09-08-ir-verify-facts 归档：facts v2 五段/证据分类核验/cannot_verify 硬门/回执槽/基线对比全落地）：探针预填段锚点对账（`src/verify-postcheck.js` PROBE1/3/5 锚点正则族，注释自标「2026-09-07 P3b 基线」）；`verify-probes --init` 七章节骨架 + 机械预填 + fail-closed；test-result.json 实测时间线（status/exitCode/failure_remaining）。
- **IR 回灌 sidecar 先例已开**：archive-delta `withSummary` 结构化对象、complete-handlers IR 回灌 sidecar（注释自标「2026-09-07-ir-hardening D-006」）、verify-postcheck IR 严格档（D-001~D-003）。

**结论**：brainstorm 时把上述从「待办」挪到「地基」，增量设计只补缺口（verify 结论槽、evidence 精确对账、cannot_verify 闭环、探针复跑抽查）。

## 3. 轮次裁剪清单（收益盘点）

### 3.1 整段 noAI 候选

| 候选 | 现状 | 判定 |
|---|---|---|
| quick step1 注入化 | agent cat 六类文件复述"任务理解" | **最高频**，复用 buildModuleContextInjection 注入；保留"任务模糊则问一句"语义出口，不删成启动横幅 |
| doctor 阶段折叠 | 6 步教 agent 跑 bash/node 探测 | doctor-diagnostics 已覆盖 SillySpec 内部（含 orphan_dirs、pointer_health、change_db 一致性）；**净增三类探测器**：worktree/.gitignore、构建工具+Maven 私服、Context7/grep.app MCP。`_cliAction` 样板 |
| archive 尾段 | agent 复述完成度报告 + 数 checkbox | 机械项：git×map 三重核对、文件移动、`--confirm` 收口；**保留**：模块卡正文语义更新、人类审批 |
| 模块文档同步命令化 | quick/verify/archive 三处重复 | sidecar 追加行 + 状态回填 CLI 化，模块卡正文留 agent；需新命令 |

### 3.2 骨架预填缺口（格式返工轮根源）

- decisions.md 九字段条目（brainstorm prompt 内嵌格式模板，后续步骤还要"补全缺失字段"自我往返）
- proposal/requirements/tasks frontmatter（author/created_at 等纯机械值）
- module-impact.md 首版（`generateModuleImpactSkeleton` 已存在 + `sillyspec module-impact` 命令已接线，plan 侧手写是返工根源）→ **本批刀②**
- plan.md 任务总表重抄 tasks.md（已知双写漂移源；Wave 段已改纯 ID 引用，总表未改）
- design 格式自检步（`validateDesignForPlan` 已有同款字面校验，agent 复检纯浪费）——**未认领**
- TaskCard / 任务 id 连续性 agent 自查步（plan-postcheck 已硬校验，重复）
- 生命周期豁免短语字面契约（"否定词必须紧邻"类）

### 3.3 判定下沉（关键词/自述 → 结构化）

- **verify 结论**：关键词窗口正则（400 字符窗口找 PASS/FAIL，标题措辞两次历史坑）→ 固定枚举槽 → **本批刀③**
- **evidence 对账**：任务 id `includes` 子串 + agent 自报告满足度（advisory）→ id→文件→diff 精确对账（随 verify.facts.yaml / 09-05 P3b）
- **cannot_verify 兑现闭环**：requiredEvidence 无机器对账 → sidecar 化后自动闭环
- **集成证据**：literals 蹭词（'端到端'/'docker up' 字面命中）→ **回执槽位中间档**（命令、exit 枚举、日志路径存在 + mtime 落 verify 窗口 + 失败签名扫描）；"CLI 代跑"等 `commands.integration` 配置出现后再议，防假确定性
- **lint advisory → 硬门**：先加 advisory 失败计数器（落 quicklog/db），有数据再决定，防"更硬换更吵" → 计数器**本批刀③顺路**
- **agent 自由裁量加第二把尺子**：plan_level（design 变更文件数/diff 行数可算）、quick vs full 选档、任务粒度（allowed_paths 数/跨模块数）——CLI 复核不一致 warn，不剥夺裁量

### 3.4 注入减负（省 token）

- quick step1 的 cat 清单（projects.yaml、CONVENTIONS、design、knowledge INDEX、module-map、命中模块卡）→ 仿 `{SCAN_FACTS}`/`{TASKS_CHECKBOX}` 注入先例
- 危险文件预检前移：现只在 `--done` 时 blocked（带 --force-baseline 重跑一轮），前移到 step1 的 `_cliAction`——**未认领**
- MSYS 路径污染仅 warn → 阻断或 CLI 自动矫正（agent 易忽略告警落盘脏标题）

### 3.5 IR 一致性债（结构治理，进 P3 brainstorm）

- 任务完成态三写（DB steps / plan.md checkbox / review.json verdict）：checkbox 降级为 CLI 渲染视图，agent 永不手改
- frontmatter/表格解析器多套并存（allowed_paths 正则、provides 用 js-yaml、模块卡又一套、design.scale 两处重复）→ 统一 parser 模块
- DB↔markdown 平台同步两份独立事实（六表 JSON + 文档 tar 直推）→ 字段级对账探针
- Wave 手排正文 vs depends_on 拓扑双写（已有 plan-adopt-waves 收敛命令佐证痛点）→ Wave 派生化（09-05 §2 同向）

## 4. 本批落地切分（三刀 quick，均 ≤3 文件档）

| 刀 | 内容 | 文件面 | 状态 |
|---|---|---|---|
| 刀② | plan postcheck 调 `generateModuleImpactSkeleton` 生成首版（已存在不覆盖），删 prompt 手写指令 | plan.js / plan-postcheck.js / module-impact.js | ✅ 2026-09-08 ql-20260908-010 |
| 刀③ | verify 结论改固定枚举槽（解析只认该槽，legacy 窗口降级回退）+ lint advisory 计数器 | verify-probes.js / stage-contract.js / verify-postcheck.js / verify.js | ✅ 2026-09-08 ql-20260908-012（顺带修掉旧占位符被窗口正则误读成 PASS 的自通过缺陷） |
| 刀① | quick step1 注入化（{QUICK_CONTEXT_DIGEST} + 模块上下文注入扩展到 quick 首步） | quick.js / prompt.js / stage.js | ✅ 2026-09-08 ql-20260908-013 |

三刀拆三次 quick 完成（原约定不捆档）。IR 大件不开 quick，进 P3 brainstorm。

### §4b 后续批次落地记录（2026-09-09 补记）

| 批次 | 内容 | 形态/状态 |
|---|---|---|
| §7 债批 | doctor 悬空声明/quick 会话过滤/空壳宽限/cancel 字段名 bug/autoReanchor 扩展 | ✅ ql-20260909-001 |
| plan 派生化 | Wave 违规自动修复（提案-验证-落盘）+ 合法串行静默 + plan_level 客观复核（§3.5 Wave 项收口） | ✅ 全流程归档 d05fb87（Design Grill 抓 P0 合法串行陷阱后重设计） |
| doctor 折叠 | 6→3 步 + noAI 诊断步（13 维含三新 detector）+ 顶层改道（§3.1 doctor 项收口） | ✅ 全流程归档 862370e（三轮审查抓 6 blocker） |
| 四件套骨架 + MSYS 阻断 | fourpiece-init 命令 + brainstorm 指引 + --output/--input 污染 exit 2（§3.2/§3.4 部分收口） | ✅ ql-20260909-003 |
| archive 收口 | 三重核对 CLI 代算 + {ARCHIVE_IMPACT_AUDIT} 注入（§3.1 archive 机械项收口） | ✅ ql-20260909-004 |
| flaky 治理 | 失败文件串行真实环境复核（§7-1 收口） | ✅ 01704d5 |

## 5. 风险与防覆盖（落地约束）

- **骨架预填被 agent 覆盖** → 盖章字段复用三先例：scan frontmatter CLI 盖章、verify-probes 预填段锚点对账、review docHash；提炼通用机制进 P3 brainstorm，不每处各写一套
- **注入不全 → 跳过理解就动手** → 注入项与 cat 清单一一对照 + 保留模糊时提问出口
- **判定下沉 → 假确定性门禁** → 集成/lint 类先计量后加硬；代跑类等配置入口

## 6. 互指

- IR 事实层 schema 与分期：`docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md`
- quicklog 条目（按日轮转——按 ql-ID 检索 `.sillyspec/quicklog/` 目录）：三刀 ql-20260908-010/-012/-013；债批 ql-20260909-001~005

## 7. 实施期新发现（2026-09-08 三刀落地时实证，待立项）

1. **全量套件 11 个并行 flaky 文件**（agent-automation-batch4 / auto-driver-meta / config-cat / local-register / next-command / platform-temp-residue-heal / pull-spec-bundle / feedback-batch2-hardening / quick-start-input-hint / quick-files-resume-append / worktree-auto-anchor）：并发 12 下子进程/git/tmpdir 竞态假红、单跑全过。**这是门禁可信度问题（判定下沉的地基）**——失败清单常红会让"真红被忽略"（本批 verify-probes 的真 bug 正是与 flaky 混在同一清单里靠单跑分离出来的）。候选治理：并发降档、失败文件自动串行重跑一轮、按文件粒度隔离 tmpdir/端口。
2. **quick-recommend 把活跃 quick 会话推荐为关联变更**：冒烟会话（quick-34dbed08）被自动挂上另一活跃 quick 会话（quick-33876a4a）——活跃 quick 会话无 design 语义、不是完整流程变更，不应进关联推荐池。
3. **空壳会话探测误报**：刚启动 2 分钟、零步骤完成的**进行中**会话被点名「疑似空壳残留」——判据需加"会话年龄/最后活跃时间"缓冲。
4. **`quick --cancel` 找不到 guard qlId**：guard.json 在场仍报「缺失/损坏」需 `--ql` 兜底（ql-20260908-014 实证）——cancel 路径的 guard 解析与启动路径疑似不同源。
5. **平台接管声明悬空指针泄漏**：`.sillyspec-platform-managed` 指向已不存在的 tmp 目录（本日实证，挡住一切 CLI 命令）——doctor 的 pointer_health 没覆盖这个入口；建议加「声明 specRoot 不存在 → 提示 disconnect/重建」检测。
6. **doc-ref 行号漂移的预防面**：本批顺路修的 13 处漂移是 WIP 改 src 不改 docs 造成；autoReanchorDocRefs（ql-20260908-008）只在 quick --done 接线，verify/archive 收尾未接。这也佐证 09-05「ref+token 结构化」方向——行号字面引用是高维护成本 IR 形态。
