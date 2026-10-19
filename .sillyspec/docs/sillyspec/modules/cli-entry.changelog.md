# cli-entry 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。

- 2026-08-13-worktree-execute-loss-guard | execute 完成路径阶段级核验 warn（`handleExecuteDeliverableCheck` + `findMissingDeliverables`，聚合最新 execute run 各 task review.changedFiles 核验落盘，防空跑谎报 D-002@v1）+ 显式 worktree cleanup 命令 blocked 分支（D-001@v1）+ execute reset 清理 worktree 显式 `force:true`（D-006@v1）。
- ql-20260816-003-8a14 | quick 关联变更存在性守卫：--change/--linked-changes 装载的 linkedChanges 逐一 existsSync 校验，幻影名 exit(2) + 三条出路文案（坑 quick-change-phantom-linked，f70c9c3 后误用仍被静默接受的剩余面）。
- ql-20260807-001-a260 | gate/derive 顶层命令补 worktree drift 锚定：未显式 --spec-dir 时 detectWorktreeSpecDrift(resolveSpecDir(dir)) 命中即向 runGate/runDerive 传 specDriftAnchor（对齐 machine-interface 已扩展入参），execute/task-reviews marker 读主仓 .runtime（补 test/gate-derive-spec-drift.test.mjs 3 场景 e2e）。
- 2026-08-10-worktree-apply-dirty-resilient | apply/assess dirty 拦截补结构化 rescue 打印段（gated on rescueCommands 非空）：`🆘 Rescue commands (N safe / M excluded)` + 逐行 cp 指令（`generateRescueCommands` 逐文件四分类），旁路 git apply，cp 后提示手动 worktree cleanup；纯 additive，`rescueCommands===null` 零影响。
- 2026-08-10-platform-progress-sync | platform case 新增 `pull` 子命令（--change 单变更 / 无参先 pullList 再逐个 pull）+ `resolve` 子命令（三 flag --keep-local/--take-platform/--abort 互斥校验，多/缺均报错）+ `status` 扩展（collectStatus：落后标记 + 未决冲突列表）；stage case block（brainstorm/plan/execute/verify/archive）runCommand 前 + platform approve 前注入 `triggerPullActiveChange`/`triggerPull`（下行拉最新避免过期状态审批）；help 文本同步加 pull/resolve 行。
- ql-20260816-008-c809 | auto 顶层别名补 `case 'auto':` 路由（index.js 别名组，runCommand 已支持 auto 模式）——原 usage/topCommands 列了 auto 但 switch 无 case，`sillyspec auto` 报未知命令且 did-you-mean 自指（self-audit-2026-08-16 C14）。
- 2026-08-18-platform-map-auto-anchors | docs check 子命令增 --fix/--dry-run flag（BARE_FLAGS 白名单 + fixActive + applyFixes 写回 + fixReport；未知 flag exit 2 语义不变；无新 flag 时与旧版逐字节一致）。写回逻辑在 docs-consistency 模块（src/docs-check.js），本模块只记路由层。
- 2026-08-16-state-machine-fail-open | 状态机 fail-open 组修复（self-audit 批次②）：--done 补 checkTransition 转换守卫（含 fromStageData，D-004@v1）；status/doctor 只读短路（READONLY_AUXILIARY_STAGES，D-005@v2，不 initChange/不 seed steps/不刷 lastActive）；auxiliary 不写 currentStage（stage.js，D-003@v1）；gate 失败消费侧 `stageCompleted===false` → process.exitCode=1（D-002@v2，覆盖 rollback + scan 非平台 post-check）；brainstorm auto-create 按活跃变更数 gating（D-006@v1）；回归测试 state-machine-guards.test.mjs 29 断言。配套 docs/sillyspec/platform-interface-map.md 锚点行号重校。
- 2026-09-02 P1-1（跨 agent 工单） | resolveEffectiveDir 补第四层 worktree 主仓锚定：cwd 无 .sillyspec 且 git root 也无（.sillyspec gitignore 仓的 linked worktree 场景）时，按 detectIsolation 同源判据（--git-dir ≠ --git-common-dir 且非 submodule）解析 common-dir 父目录主仓根，主仓有 .sillyspec → 锚定 + warn 返回主仓（治 quick 新会话在 worktree 内分裂进度库——run 链路 D-03 守卫只覆盖「有副本」、quick drift 守卫只覆盖「有 guard」，均拦不住新会话）；主仓无 .sillyspec / 非 worktree / submodule → 行为不变。新增 test/worktree-auto-anchor.test.mjs（4 场景 11 断言，真实 git worktree fixture）；platform-interface-map.md 8 处行号平移重校。
- 2026-09-07-endpoint-baseline | index.js endpoints case 子分发：新增 baseline 分支（--change/--spec-dir/--json；worktree 主仓锚定双保险——git-dir≠common-dir 判定 + detectWorktreeSpecDrift 恒跑兜显式副本漏锚）；extract 分支零语义变化。execute.js Step3 增基线指引一行。
- ql-20260908-006-5f04 | doctor `--gc-unstamped-runs [--confirm]`：usage + case 'doctor' 接线 gcUnstampedExecuteRuns（默认 dry-run）；存量无戳 execute-runs 清扫，不进 archive 热路径。
- 2026-09-09-plan-derived | adoptPlanWaves proposal 档（只读草稿 + rewritten/conflicts）
- ql-20260911-017-0c35 | change-rename 入口新名日期前缀门禁（assertDatedChangeName，非日期前缀新名 exit 2；2026-09-11 实证 friction-signal-hint 重命名丢前缀被静默物化）
- ql-20260911-029-2892 | 紧急包小修：index.js next --apply 的 ESM __dirname ReferenceError 改 fileURLToPath；modules resolve --json 死条件改用顶层 json 变量
- ql-20260912-008-8eff | flag 值位守卫全量收口（52 三元形+解析器 5 分支）：值位为 flag 名/缺值视为未提供——--change --json 不再吞 flag
- ql-20260920-003 | P1-5 v1 阶段跑者瘦会话：sillyspec handoff 命令（src/handoff.js——交接块=新会话启动块[保持SILLYSPEC_SESSION_ID]+下一阶段建议[进行中续跑/完成后继]+状态摘要；纯只读；--json）+ 主流程阶段完成尾提示（complete.js——brainstorm/plan/execute/verify 完成时点一行 advisory）+handoff.test.mjs 12/12（CLI实跑夹具）——对撞实验主会话203请求63M肥上下文重发税的结构性出口
| 2026-10-07 | 2026-10-07-unify-close-trace | flow done 收尾留痕双轨统一（缺陷 thin-flow-done-no-scope-audit-snapshot 修复方向③）：flow-parity 新导出 writeCloseTraceArtifacts（一次写齐 change.patch/change-patch.json + scope-audit.patch/scope-audit.json 四件，同一 patchText 一次 sha256 双套同锚；空 patch 双标 failed 不落 patch 文件）与 buildThinSnapshotRows（thin 三态行纯函数：filterDeliverableFiles × pathMatches，stats 缺档 null 不出伪数据）；flow done 留档块改走共用函数（既有键结构/口径/console 前缀不变），冻结面排除面追加 scope-audit.json/patch（防重跑自嵌入）。thin/heavy 双通道留痕自此对称，读侧回退（2026-10-07-scope-audit-thin-patch-replay）退化为存量兜底；test/close-trace-unified.test.mjs 6 夹具 + flowdone-disposition-drift 增量断言。 |
| 2026-10-09 | 2026-10-09-close-trace-single-set | 收口留痕单套统一（用户裁决一套留痕）：writeCloseTraceArtifacts 改只写 change.patch + change-patch.json 两件——原 scope-audit.json 对账面（mode/ok/degradedReason/baseAnchor/totals/rows/excluded/closedBy/repos）并入 change-patch.json 的 scopeAudit 子对象，顶级键原位不动（fr-index/knowledge-graph/漂移检测与平台 assets.py 等顶级字段读方零改动）；scope-audit.json/.patch 停写，读侧旧名兼容链兜存量归档（247 个不动）。flow done 留档消息改单套措辞，自嵌入排除清单四名全保留（legacy 防护——旧轮冻结件可能仍含 scope-audit.*）。 |
- 2026-10-09-verify-reuse-friction | wt-commit 跨仓 worktree 识别（D-006@v1）——cwd 推断正则捕 <change>--<repoKey> 整段后：仅当后缀命中 repos 注册表（local.yaml）且剥出候选是已知变更目录才剥；全段命中已知变更不剥（防变更真名恰以 --repoKey 结尾误剥）；均不中原样透传（现状行为）。回归 test/wt-commit-crossrepo-infer.test.mjs。
| 2026-10-12 | 2026-10-12-close-trace-freeze-integrity | 平台仓 2026-10-12-ws-ref-ws-name 归档暴露收口留痕三缺陷（实证核查）：①轻量道 change. |
| 2026-10-12 | 2026-10-12-thin-module-gate-and-feed | 轻量变更（默认主流程）收口不产模块文档增量：未登记模块图的交付目录致 FR 蒸馏落伪域 auto-*（静默）、知识图谱模 |
| 2026-10-12 | 2026-10-12-approve-channel-attest | dogfood 实证驱动（2026-10-10~12 fire-equipment 会话复盘，子代理取证）：8 次 fl |
| 2026-10-12 | 2026-10-12-review-probe-injection | dogfood 实证驱动（fire-equipment 会话复盘）：三个生产缺陷（dva 双注册、MyBatis 别名冲 |
| 2026-10-12 | 2026-10-12-tick-evidence-multi-anchor | dogfood 实证驱动（fire-equipment 会话复盘）：限流 429 截断会话时 task-02 的构建证据 |
| 2026-10-12 | 2026-10-12-cli-friction-signal | dogfood 实证驱动（fire-equipment 会话复盘·子代理A/B取证）：a) deps 门控阻断首条只有标 |
| 2026-10-12 | 2026-10-12-thick-taskbook-cli | dogfood 实证驱动（fire-equipment 复盘·子代理C取证）：厚档阶段评审（brainstorm/pla |
| 2026-10-13 | 2026-10-12-closeout-task-guidance | 今日三次「哨兵抓收口型任务零证据」复盘结论落地（fire-dogfood-retrospective / verify- |
| 2026-10-13 | 2026-10-13-design-question-autorepair | 动机：sess_dcb57f25 实证（变更 2026-10-13-multiturn-changeid-misjudg |
| 2026-10-13 | 2026-10-13-thin-empty-face-crosscheck | 动机：multi-agent-platform 仓 docs/sillyspec/thin-done-empty-fac |
| 2026-10-13 | 2026-10-13-batchtick-evidence-domain-hint | 动机：agent dogfood 反馈两条摩擦（同会话正面评价断点续跑/评审链路）。①单拍勾选硬门证据盲：活真干完、每  |
| 2026-10-13 | 2026-10-13-thin-sync-stage | 平台变更中心「进行中」列表的轻量变更不显示「轻量」徽章：CLI 对 thin 变更上行的 changes[0].curr |
| 2026-10-13 | 2026-10-13-cli-pit-fix-batch | 四例 CLI 摩擦坑修复（前会话已实证写好，倒推收尾）：①FR 域路由降级告警接专用命令 tests --redomai |
| 2026-10-13 | 2026-10-13-flow-diff-cmd | 动机：change 粒度的文件统计查询口缺失——数据两态俱在但无展示入口：归档变更有 change-patch.json |
| 2026-10-13 | 2026-10-13-declared-paren-strip | 动机：平台仓消费方冒烟实证（multi-agent-platform 仓 docs/sillyspec/flow-dif |
| 2026-10-13 | 2026-10-13-extract-head-guard | 动机：本会话自身实证——flow start --input 动机文本里出现未闭合全角左括号字面量时，续行合并的不平衡判 |
| 2026-10-13 | 2026-10-13-cross-repo-baseline-anchor | 动机：thin 手工交付的跨仓对账无基线锚——collectRepoActual 四级档位里 thin 落 B 档（HE |
| 2026-10-13 | 2026-10-13-sync-ledger-tombstone | 幽灵变更事故（2026-10-13-new-change-e5a27813，multi-agent-platform 仓 |
| 2026-10-13 | 2026-10-14-prestage-consent-gate | 选道双峰问题：659 个归档变更中「头脑风暴预段+轻量收编」中道仅 3 例（1.4%），其余全轻量或完整五阶段。诊断（本 |
| 2026-10-14 | 2026-10-14-thin-turbo-mode | 轻量变更 |
| 2026-10-14 | 2026-10-14-turbo-guide-tier-copy | 评审 P3 清偿：--turbo --thick 同给时 start 极速指引行只查 flag 不查 tier（flow |
| 2026-10-14 | 2026-10-14-guide-anchor-adopt-proto | sess_fb51d988 实证：CLI 已把含原型分级/真码五要素的完整步骤指引落盘 step-guides（5294 |
| 2026-10-14 | 2026-10-14-patch-refreeze-missing-artifact | flow done 重入幂等跳过只认子步状态不认产物存在性：patch 子步标记 done 后若 change.patc |
| 2026-10-14 | 2026-10-14-redomain-domain-arg-normalize | flow done 收口提示的 FR 域迁移命令照抄必败：提示语给 --from fr/auto-backend 形态（ |
| 2026-10-14 | 2026-10-14-timeline-ticktime-anchor-scope | watcher timeline 接线：loadChangeTasks 侧车 tickLog 透传 + resolveCommitAnchors 带变更名收敛锚——跨变更 task token 撞车误锚清偿，勾选时刻侧车精确值直显 |
| 2026-10-14 | 2026-10-14-supersedes-mislink-and-change-display | 轻量道防复潮注入行加变更名限定（flow.js 经 decisionChangeQualifier 渲染「变更 <名>」/「变更未记录」）——同号决策条目脱离上下文可定位 |
| 2026-10-14 | 2026-10-14-tick-burst-sidecar-gate | flow done 节奏门接线：事件流检测为空时回退读 task-ticks.jsonl 侧车判突发（detectTickBurst），检出走既有 resolveBatchTickAction（证据完备=advisory+batch_ticked，零证据维持硬拒）；拒收文案来源感知（侧车时戳 vs 事件流） |
| 2026-10-14 | 2026-10-14-decision-id-p2-hardening | 轻量道防复潮段头补跨变更引用形态指引（变更名#D-xxx@vN——同号不同变更互不相干） |
| 2026-10-15 | 2026-10-15-pitfall-batch-clearance | 消费仓 multi-agent-platform 变更 2026-10-14-admin-server-status 全 |
| 2026-10-15 | 2026-10-15-thin-inject-telemetry | 效果评估实证：轻量道 flow start 知识注入路径（src/flow.js renderThinKnowledge |
| 2026-10-15 | 2026-10-15-thin-query-slim | 效果评估实证两处：①thin 道 flow start 知识匹配查询用整段 --input（含成功标准段的文件路径/测试 |
| 2026-10-15 | 2026-10-15-harvest-title-clarify | 收割条目标题自解释：机制词（槽4/收割）退出 D-001 标题，出处归 frontmatter
| 2026-10-15 | 2026-10-15-title-label-skip | 标题/摘要提取对段头行免疫：标签行跳过取次行+复合词白名单+模块索引摘要同源+模板首行改概括句+存量… |
| 2026-10-15 | 2026-10-15-vector-switch-discoverability | 效果评估清偿批 B1 收尾缺口（用户问出）：向量开关 knowledge.vector_search… |
| 2026-10-15 | 2026-10-15-module-path-glob-match | 用户实测发现（平台仓）：FR 沉淀持续落 auto-* 伪域（7 个域 92 条全是近两天新变更）、… |
| 2026-10-15 | 2026-10-15-decision-redomain | 用户指令：平台仓存量决策迁真域。背景：模块路径 glob 匹配失效（2026-10-15-modul… |
| 2026-10-15 | 2026-10-15-ui-proto-form-config | 四例原型形态偏档（fire-equipment/deploy-release-notes/knowl… |
| 2026-10-15 | 2026-10-15-decision-anchor-backfill | 效果评估实证（用户问「新变更图谱为何不关联代码」）：决策↔代码的图谱边唯一来源是条目「锚点：」字段，… |
| 2026-10-15 | 2026-10-15-session-forensics | 会话取证命令 sillyspec diagnose——对照 Superpowers diagnosi… |
| 2026-10-16 | 2026-10-16-fix-downstream-tool-defects | 修复 2026-10-16 下游跑流程实证的三条工具缺陷（spec 树删除被拉取复活、verify … |
| 2026-10-16 | 2026-10-16-short-change-title | 变更标题提炼为 30 字内自然断点短句 |
| 2026-10-16 | 2026-10-16-title-range-gate | 变更标题强制 10 到 30 字命名 |
| 2026-10-16 | 2026-10-17-tick-timing-source | 勾选时点判定换源tick时戳流 |
| 2026-10-17 | 2026-10-17-archive-terminal-sync-strict | 归档终态同步强校验——文件树半态显性化 |
| 2026-10-18 | 2026-10-18-runtime-relayout | runtime 目录分层重排与归档回收 |
| 2026-10-19 | 2026-10-19-thin-order-canon | 轻量道顺序正典与文案面统一 |
