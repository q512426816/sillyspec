# 提示词纪律原语盘点（prompt-primitives-survey）

> **扫描基线**：commit `2eebe7de`（2026-11-22）；对象＝`src/stages/*.js`（14 文件 7936 行）+ `templates/prompts/`（3 模板 89 行）+ `src/run/shared.js` include 机制段。
> **用途**：批 3b（include 参数化+首批抽取）与批 3c（指令层/证据层分离）的施工输入——登记于 docs/ROADMAP.md「mattpocock/skills 吸收路线」。行号定位随 stages 演化会漂移，施工前以各条「原文锚」（段首 15 字）双核对。
> **入册门槛**：同一纪律段被 ≥2 阶段/步骤承载。

## A. 已由 {{include:}} 机制承载的原语（现状盘点）

| 模板 | 被引用处 | 内容概括 |
|---|---|---|
| testcase-design.md (17行) | quick.js:66、execute.js:1553（Wave prompt，main/dispatch 两模式共用） | 测试按层适用判据（纯逻辑/行为契约/视觉配置）+ 7 条逐项检查 |
| taskcard-rules.md (36行) | plan.js:499（taskcardTemplate 尾） | TaskCard 格式规则：20-40 行、9 字段、frontmatter 闭合、中间验证定向优先文案 |
| verify-probes.md (36行) | verify.js:133 | 探针先跑 CLI 机械面 + 半语义探针 2/3.4/3.5/4/7 执行清单 |

## B. 散文级重复待抽取的原语（按抽取优先级）

### 高优先级（跨阶段逐字/近逐字，量大）

**1. 长输出跑批纪律（token 减负）**：改写 ×4——execute.js:538「长输出跑批纪律（token 减负，R9 实证…）」／execute.js:1525「输出纪律：测试/安装/构建类长输出命令一律重定向落盘」／quick.js:64「长输出跑批纪律（token 减负）」／plan.js:173「测试跑批输出落文件只取摘要」。核心＝重定向落盘+tail/grep 回看。参数化：各处命令面不同（测试+lint / 测试+安装+构建），需 `scope` 参数；execute 版多一条「CLI 门禁自跑不受约束」例外行。

**2. 前台同步执行禁后台**：逐字 ×2——execute.js:537 与 verify.js:37「长测试/构建/lint 命令必须**前台同步执行**，禁止 run_in_background:true / & / nohup / disown」。无侧重差异，可整段直抽，零参数。

**3. spec 产物只写主仓勿写 worktree 副本**：改写 ×6——execute.js:466「模块卡/sidecar 一律写主仓绝对路径」／execute.js:1297「spec 流程产物只写主仓 {SPEC_ROOT}，绝不写 worktree 副本」／verify.js:32 与 verify.js:204「绝不写进 worktree 的 .sillyspec 副本…随 worktree 清理蒸发」／execute.js:1185、1517（读侧「读主仓路径，不要读 worktree 副本」）／execute.js:1295、1342（蓝图读侧「读取蓝图时使用主工作区路径」）。参数化：需 `action=read|write` 与 `targets=`（模块卡/verify-result/decisions/module-impact）两个形态；实证引文（2026-09-10）可留模板。

**4. 审查子代理纪律包（时间盒收敛+写通道降级+经济学三律+只读纪律）**：近逐字 ×3 阶段——brainstorm.js:482-490「子代理执行纪律（坑 review-subagent-stall…）」／plan.js:403-405「执行纪律…写通道降级…审查经济学三律」／execute.js:503-505「执行纪律…审查经济学三律（同 brainstorm/plan 审查步）」。侧重差异：请求预算数 12/10/15，复审倍率实证措辞同源；plan 版多「既往结论直接引用勿重验」。参数化：`budget` 数字 + `scope`（design 审查/plan 审查/QA 对照 diff）；这是最大单体（每处 8-12 行）。

**5. 评审豁免（review-unsupervised 声明）**：近逐字 ×4——brainstorm.js:477、plan.js:399、execute.js:491、execute.js:1487「🚪 评审豁免（2026-09-26-review-unsupervised-exit）：若本会话环境无嵌套派发能力…写 review-unsupervised.md…不自审表演」。零参数直抽。

**6. 收口输出转达义务（知识收件箱）**：近逐字 ×2——archive.js:90 与 quick.js:90-95「收口输出转达义务（知识可见性契约，2026-09-23）…必须在最终回复中原文转达用户…未出现则不提及（不得编造）」。差异：quick 版列 3 块（收件箱/待归类提议/资产尾），archive 版仅收件箱——需 `blocks` 参数。

**7. CLI 已代劳勿重跑**：逐字族 ×8——「构建命令（CLI 自 local.yaml 注入，勿再读文件）」verify.js:70 / execute.js:528 / quick.js:25 逐字 ×3；「CLI 已…机械匹配知识库…勿自行重跑 INDEX 匹配」quick.js:28 / execute.js:453 ×2；scan.js:79、85、119、139「禁止重新 grep 发现（机械事实以 _facts.md 为准）」×4；quick.js:135「CLI 注入，勿重跑 git status」。参数化：`thing`（构建命令/知识命中/事实底稿/dirty 清单）单变量即可。

**8. git 暂存纪律（精确 pathspec·禁 -A·勿裹挟·不 commit）**：改写 ×6——quick.js:137-139「git add -- <file...>…禁止使用 git add -A」／execute.js:1587「禁 git add -A…wt-commit 自动处理」／brainstorm.js:626、657「精确到变更目录，勿用 .sillyspec/ 整目录——会裹挟其他活跃变更；不要 commit」／brainstorm.js:665「禁止自动 commit」／archive.js:85。参数化：`mode=quick暂存|brainstorm暂存|execute提交`（execute 语境反而要求 wt-commit 提交）。

### 中优先级

**9. 材料包基准面四句（只对包作答/包外定向列明/禁全量扫读/不足→cannot_verify）**：改写 ×3——brainstorm.js:508-511、plan.js:397、execute.js:508（各自包名 grill-first/plan-review/execute-qa）。需 `pack` 名参数。

**10. 中间验证定向优先**：execute.js:1524、1535 ×2（自注「与 taskcard-rules.md 同款文案」——模板已载一份，execute 又内联两份）+ verify.js:41、quick.js:63 改写。抽原语后可让 execute 两处改 include 或引用。

**11. 编码铁律一行**：逐字 ×2——execute.js:1520、1531「先读后写、TDD、不编造方法、只做蓝图里写的事、遵守边界处理规则、不超出 allowed_paths」+ quick.js:60 改写。

**12. 任务边界铁律（allowed_paths 越界停）**：近逐字 ×3——execute.js:1526、1536、1537（main/子代理/batch 三语境，尾句不同：回 plan 层/回主代理/越权即停）。需 `escalate` 参数。

**13. 增量落盘与中断接手**：近逐字 ×2——execute.js:1523、1534「每完成一个可见产出…立即写盘…429/API 配额/会话中断…已完成清单」+ brainstorm.js:188 改写（决策粒度「会话随时可能中断，未落盘的决策无法跨会话恢复」）。需 `unit=产物|决策`。

**14. Reverse Sync**：改写 ×3——quick.js:79、verify.js:146、execute.js:1581（发现实现合理但 design 未覆盖→先修文档）。零参数。

**15. 知识沉淀宁缺毋滥**：近逐字 ×2——execute.js:1604-1607、quick.js:141-144「真正的项目特有坑…不要硬凑…宁缺毋滥」。

**16. 模块卡纪律（结构化事实与语义分离·勿堆历史条目·sidecar 迁出）**：改写 ×4——execute.js:465、quick.js:152-153、archive.js:51、scan.js:240-242/363-365。

**17. 跨仓路径口径（相对仓根·禁仓库名前缀·禁绝对路径）**：近逐字 ×4——brainstorm.js:375、plan.js:579（两处均含「git -C <仓根> diff…前缀/绝对路径永不命中」论证）、plan.js:468、execute.js:1280。

**18. 歧义裁决分级（非破坏性自裁+落盘／破坏性停人 fail-closed）**：近逐字 ×2——execute.js:468-472、1566-1567（同一纪律在确认范围步与 Wave prompt 双写）。零参数，主仓 decisions.md 路径句与原语 3 重叠。

**19. postmortem 四子字段提示**：近逐字 ×2——verify.js:150-151、doctor.js:55-61（现象/根因/护栏/证据 + known-issues 归档链路句完全同源）+ quick.js:116 变体。

**20. lint check+formatter 双跑**：逐字 ×2——execute.js:531、1591「不要只跑 check——只 check 不 format 会把格式问题留到 commit 时被 pre-commit hook 拦截」。

### 低优先级（改写或同文件内复用）

**21. 写完不回读**：execute.js:536、scan.js:120（「不要自己读回文件核对」）×2 改写。
**22. decisions.md 记录纪律**（supersedes 新版本不覆盖+幂等查重+「我的判断」标注）：brainstorm.js:211、530、113、212、543 内部 ×5 + execute.js:470 缩写。
**23. 事实引用真实**（path:line 反引号·禁猜行号）：scan.js:150、brainstorm.js:204 ×2。
**24. 标题/文档中文（sillyhub 平台解析识别用）**：brainstorm.js:671、scan.js:142、423、532 ×4。
**25. 原子写入 tmp+rename**：scan.js:171、261 ×2。

## C. include 机制现状速记（批 3b 施工面）

- 语法：`{{include: <name>}}`（正则 `\{\{include:\s*([\w.-]+)\s*\}`，src/run/shared.js:125-135）；实现位于 shared.js，prompt.js:1051 在占位符替换前调用。
- 特性：单次替换不递归（模板内不能再嵌 include）；模板缺失保留占位符并 console.warn；模板读仓库根 `templates/prompts/<name>.md`。
- 缺口：①**无参数化管道**（不支持 `|focus=`/`|budget=`，B-4/B-9 等侧重差异只能整段复制改词）②无条件包含 ③无变量注入。另注意 execute.js:1178 注释与测试约束：知识注入段**禁用 include**（有 include 计数测试），新原语若加 include 需核对既有计数测试。

## D. 统计与施工路径建议

- 扫描：src/stages/ 14 个 js 文件共 7936 行（其中含 agent prompt 的 10 个；knowledge/cmd-existence/index/plan-postcheck 无 prompt 纪律段）+ 3 模板 89 行。
- B 类 25 条；高优 8 条（逐字重复 3 条：前台同步、CLI 代劳族、编码铁律；最大单体＝审查子代理纪律包，3 阶段每处 8-12 行）。
- **批 3b 抽取顺序建议**：①高 2+5（零参数直抽，最小风险起步）→ ②include 参数化管道落地后抽高 4、9（需 `budget`/`pack` 参数）→ ③高 1、3、6、7、8（各需 `scope`/`action`/`blocks`/`thing`/`mode` 参数）→ ④中优按需。每抽一批跑 prompt 金档再生与 include 计数测试。
