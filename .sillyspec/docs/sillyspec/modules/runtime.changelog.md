# runtime 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出（手工批次：节标题带后缀/MANUAL_NOTES 区，工具正则不认）；新条目继续追加到本文件，勿写回模块卡。

- ql-20260604-001-7a4c | 补齐平台 sync 时间与审批状态的本地写入方法，并记录 quick/archive gate 清理行为。
- ql-20260803-001-9c4e | 修 reopen --done 步骤状态不同步：complete.js 阶段完成分支回填 stale→completed，completeStage SQL 扩到 IN('pending','stale')。
- ql-20260804-003-e439 | _getNextSuggestion 遍历跳过 scan 且 upstream 排除 scan（根因修 plan→scan 回头路，prompt-control-debt plan-c）+ quicklog flipEntryInContent 单行四字段归一为多行（quick-①）。
- ql-20260804-004-3a24 | quicklog 单行四字段归一改 splitSingleLineFields 双级扫描（字段边界严格扫描 + 顺序扫描兜底）：字段正文引用标签字样（「结果：」/正则内嵌四标签）不再被 split 任意位置误断行（quick-① 残留补丁）。
- ql-20260809-001-4846 | alignExecuteToPlan 去 async 残留彻底同步化（修复 doctor align 调用方 index.js:532 未 await 致 r.ok 恒 undefined、失败也误打印「已对齐」的逻辑 bug）+ 清 src/ 5 处 gate-status 活引用注释（fs-atomic/machine-interface×2/run/gates/index）。
- ql-20260812-005-51cc | _openWithFallback 主库分支并发首开重试（2026-08-12 db-concurrency flaky 根因实证）：多进程近乎同时 new DB().init() 打开同一新建库，tryOpen 的 prepare(SELECT count(*)) 撞他者 CHECKPOINT 改写瞬时失败返 null 误判损坏 fail-loud throw；主库分支补 MAX_BUSY_RETRIES 递增退避重试，真损坏重试不过仍回落退/fail-loud。
- ql-20260813-001-e83f | auditQuickCompletion 的 git status 调用启用 retryOnTimeout + timeout 15000（safeGit 新增 retryOnTimeout 选项，ETIMEDOUT 用 2× timeout 重试一次），治机器忙时审计 git 超时误拦 blocked。
- ql-20260814-005-9fdd | completeStep 新增 noAI 步骤 --done 硬门：--done 落到 planPostcheck/scanPreflight/scanPostcheck 等 noAI step 时执行 _cliAction CLI 确定性校验（对齐 stage.js 自动执行路径），堵 agent 直 --done 绕过 executePlanPostcheck 校验的漏洞。
- ql-20260814-007-b94b | wait 选项单选强制 + status 输出区分操作目标/活跃列表：complete.js 新增 enforceWaitChoice helper（requiresWait/--done --answer 解 waiting/--continue 三条路径校验 --answer 命中 waitOptions，开放型 waitFreeAnswer 豁免）；stage-machine.js show() 多变更汇总新增「当前操作目标」行 + 目录缺失空壳 change 标注 ⚠️（防残留 default/quick-xxx 误当操作目标）。**〔2026-08-16 移除 enforceWaitChoice〕**实证误伤人工选择（AskUserQuestion 转述标签/Other 自由填值全等必失配），且防不了故意代答（读报错抄选项即过）——单选校验整道移除，--answer 接受任意非空文本，requiresWait 门与 waitOptions 展示保留；status 操作目标部分不受影响。
- ql-20260815-021-9886 | 坑7 修复：getOrCreateMultiRepoContext 聚合 declaredRepos 兼扫 tasks/task-NN.md 独立卡片（collectTaskCardReposFallback，plan.md 只留 checkbox、卡片全在 tasks/ 时跨仓仓仍注册进 ctx，不再误报 review 疑似伪造）；task-review 跨仓未解析降级 warning 文案补真实排查方向（repo 声明源 + local.yaml 注册，非 review 伪造）。
- ql-20260816-008-c809 | engines 抬 `>=22.13.0`（package.json:16 + db-engine.js:5 注释 + README/architecture-4a 版本声明同步）：Node 官方 v22.13.0 才移除 `--experimental-sqlite` flag，原 `>=22.11.0` 虚低致 Node 22.11/22.12 全 CLI import 即崩（self-audit-2026-08-16 A1）。
- ql-20260816-018-4eae | B11 safeGit 未设 stdio stderr 裸刷（未纳入批次项，驾驭#6）：git-helper.js safeGit/git 的 execFileSync 加 stdio:['ignore','pipe','pipe']（对齐同仓其他调用点）——git 失败 stderr 不再裸刷终端，空仓跑 quick 不冒无上下文 fatal。
- ql-20260816-020-12e1 | C14b scan 建议劫持第三循环（未纳入批次项，驾驭#7）：_getNextSuggestion 第三循环（in-progress 找待办步）排除 scan（第四循环 plan-c 已排除，补同根因）——scan auxiliary 恒处 STAGE_ORDER 首位中途未完成会劫持下一步。
- ql-20260816-025-9111 | E22c quicklog scanExisting 有界化（未纳入批次项，性能#5）：归档文件名日期 < 今天则跳过读取（归档内条目必 ≤ 名内日期，当日 ID 分配零信息损失）——O(全历史归档) → O(当日文件)，consumer 10 归档 756KB 免全量扫描。
- ql-20260827-001-643a | MSYS 路径转换污染嗅探（坑 quick-req-msys-path-mangling）：command.js 新增 looksLikeMsysMangledPath 纯函数（盘符绝对路径开头+紧随空白与中文正文启发式）+ warnMsysMangledFlag 告警出口，接线 --output / quick 四字段参数 / --input（含位置参数描述）三处解析点——Git Bash 把 `/sessions 页…` 展开成 `<Git 安装目录>/sessions 页…` 后才传入 CLI、无感写入 QUICKLOG 标题并推送平台列表；命中 stderr 告警（点名 flag+修复指引）不阻断；test/quick-msys-path-sniff.test.mjs 纯函数 7 例 + CLI 冒烟 5 例。
- 2026-09-06-ir-stage-p3a | IR P3a verify 侧接线：gates.js verify 块既有五项检查后追加 reconcileTargetFiles 调用（:677-694，动态 import 同块先例）——missing_declared→rollback 阻断、undeclared/skipped/degraded→WARNING 放行；writeReconcileRunResult 落盘 <runtimeRoot>/verify-runs/<ts>/reconcile-result.json（五状态全落、fail-soft、snake_case 对齐 test-result 先例）；envelope code 四值（reconcile_missing_declared/undeclared_file/skipped/ok）。
- 2026-09-07-ir-stage-p3b | IR P3b gates 接线：verify 块 reconcile 之后追加 checkProbeConsistency 调用（:693-720）——mismatch+error→rollback 阻断、drift/skip 放行；信封 code 四值路由；独立落盘 verify-runs/<ts>/probe-consistency-result.json（snake_case，fail-soft，四状态全落）。
- 2026-09-07-ir-stage-p3c | IR P3c：complete.js 步骤级钩子链（warnMissingUiPrototype 同点位 :283-313）新增 brainstorm「生成规范文件」步模块域核验——errors→exit 1（步骤保持 pending）/warnings 放行/skipped info/fail-open；prompt.js :477-506 brainstorm Step2 _facts.md 注入（{SCAN_FACTS} 占位符+双重门，15KB 截断+fail-soft，plan/execute 零误染）。
- 2026-09-07-ir-stage-p3d | IR P3d：complete-handlers.js handleArchiveConfirmStep :435-459 归档移动前自动生成 delta.md（fail-soft 不阻断，提示手动补）；产物随归档目录保存。
- 2026-09-08-ir-verify-facts | gates verify 收尾次序接线：backfill 先行/verifyStartAt 注入/tests 二次回填/cannot_verify 硬门 rollback；getStageCompletedAt 基准
