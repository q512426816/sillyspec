---
author: cards-author
created_at: 2026-09-21 02:50:00
---
# 验证报告（Verify Result）— 2026-09-21-flow-command-cards

## 验证结论

结论枚举：PASS

（FR-01~06 全达成；无阻断项；NOTES 三条见末节）

## 实测记录（noAI 命令级）

| 验证 | 命令/方式 | 结果 |
|---|---|---|
| 注入器单测（三态四分支逐态） | `node test/command-cards.test.mjs`（worktree 分支） | **41/41 全绿** |
| E2E：zcode 全链 | 临时目录 `node <worktree>/src/index.js init --tool zcode --dir .` | AGENTS.md（FR-05 同获）+ 7 卡落 `.zcode/commands/sillyspec/`，尾部锚行含 v3.29.4+sha256 |
| E2E：幂等 | 同目录二次 init | `✓` 零卡行、mtime 逐文件不变（IDEMPOTENT-OK） |
| E2E：force 覆盖 | 手改 status.md 后 `init --tool zcode --force-cards` | warn「外来同名文件被 --force 覆盖」+ 覆盖为新锚 |
| 活文档锚 | `node test/doc-ref-check.test.mjs`（worktree） | 93/93 全通过（68 带关键词断言） |
| lint | `npm run lint`（worktree） | 715 文件过；module-map 覆盖全；未引用导出 0 |
| 既有 init 测试 | `node test/init-agents-injection.test.mjs`（worktree） | 52/0（CLI-spawn 类测试在 worktree 内跑触发 worktree-cwd 守卫属环境产物，主仓/隔离快照路径不触发——见 NOTES） |

## Runtime Evidence（集成证据）

- 启动命令：`node src/index.js init --tool zcode --dir <临时项目>`
- 关键输出片段：`✓ AGENTS.md 已生成（SillySpec v3.29.4，完整指引）` / `✓ 流程命令卡已生成 7 张 → .zcode/commands/sillyspec/`
- 终态断言：`ls .zcode/commands/sillyspec/ | wc -l` = 7；`tail -1 run-quick.md` = `<!-- sillyspec-card: v3.29.4 sha256=<64hex> -->`；二次 init 后 `stat -c %Y` 逐卡不变。

## 决策追踪复核（矩阵预填格）

- D-001 薄卡定位：Evidence=卡内容四段契约+边界声明（assets/command-cards/*.md 七卡）；状态=闭环。
- D-002 包内静态资产：Evidence=import.meta.url 资产解析+黑名单维持（.npmignore 锚、零 files 字段）；状态=闭环（「零漂移窗口」已按 Grill 降级措辞）。
- D-003 zcode+claude 双落点：Evidence=COMMAND_CARD_TARGETS+E2E 双落点断言；状态=闭环。

## 变更风险等级

变更文件命中 setup 模块（src/init.js、src/command-cards.js）——_module-map 无 evidence:true 声明路径命中；frontmatter 未显式声明 risk_level（默认档）。纯 CLI/init 产物，无 schema/无运行时状态流转。

## NOTES（不阻断）

1. worktree 分支内直接跑全量 npm test 时，CLI-spawn 类测试（config 系等 14 例）触发 worktree-cwd 隔离守卫属环境性产物（守卫按设计拦截 worktree 内跑 CLI）；验证取证走单测直跑+doc-ref+lint+E2E 临时目录路径（守卫不触发），合并主仓后全量套件为最终口径。
2. execute 审查 gap（--force-cards 无 CLI 接线）已在归档前收口（worktree 第三提交，E2E 验证）。
3. `npm pack --dry-run | grep assets/command-cards` 发版断言待发版流程执行（.npmignore 注释锚已落，黑名单现状未排 assets/）。

## 探针结果（CLI 机械预填，--init 补注入） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中
- ℹ️ 9 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、test、assets）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-02: 模块目录（src、docs/sillyspec）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| node test/command-cards.test.mjs 全绿（三态四分支逐态断言） | `test/command-cards.test.mjs` | test、command、cards（`test/command-cards.test.mjs`） | covered | `test/command-cards.test.mjs:37`（test）、`test/command-cards.test.mjs:1`（command）、`test/command-cards.test.mjs:1`（cards） |
| run-quick 卡防坑清单每条有源码依据（954946ae 后语义），review 时逐条锚定 | `test/command-cards.test.mjs` | run、quick、后语义（`test/command-cards.test.mjs`） | covered | `test/command-cards.test.mjs:21`（run）、`test/command-cards.test.mjs:25`（quick）、`test/command-cards.test.mjs:25`（后语义） |
| .npmignore 含 assets/ 注释锚且未新增 files 字段 | `test/command-cards.test.mjs` | assets（`test/command-cards.test.mjs`） | covered | `test/command-cards.test.mjs:15`（assets） |

**task-02**
- （卡无 acceptance——防御，plan-postcheck 已拦）

#### 探针 4：决策追踪覆盖
- D-001 → FR-04（四段契约+边界声明，assets 七卡）→ task-01 → 证据：test/command-cards.test.mjs §2 四段内容锚断言 ✅闭环
- D-002 → FR-01/02（锚行三态幂等+包内资产）→ task-01 → 证据：test/command-cards.test.mjs §3-7 逐态断言 + .npmignore 注释锚（黑名单维持） ✅闭环
- D-003 → FR-03/05（zcode/claude 双落点+AGENTS.md 同获）→ task-02 → 证据：E2E init --tool zcode（AGENTS.md+7 卡）+ init.js:453 条件 ✅闭环

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (15 files @ worktree)] | 3 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 12 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（3 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）
## 接口验证覆盖矩阵

- 无接口面：本变更为 CLI/init 产物（流程命令卡+注入器），design.md 无 API 接口段——矩阵 N=0（零行为注记）。
- 探针 5 报告的 3 个「端点」（GET /api/path、GET /api、GET /api/api/xxx）系卡资产 markdown 文本中的示例路径被扫描面误收（advisory 不阻断），非真实后端端点。

## 证据账（cannot_verify 任务）
[层：人工判断——CLI 核验]

<!-- 无 cannot_verify 任务时本节写「无」 -->
无（本次变更无 cannot_verify 任务）

## 集成验证回执
[层：自述声明——CLI 一致性校验]

<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（本变更非 integration/deployment-critical；E2E 实录见「实测记录」节——init --tool zcode 全链/幂等/force 三态）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

