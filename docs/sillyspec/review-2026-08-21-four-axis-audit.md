# 四轴审查：安全 / 缺陷 / 性能 / CLI 替代 agent 手工操作（2026-08-21）

- 审查对象：src/（93 文件 ≈ 43k 行）+ packages/dashboard + test/ + .claude/skills + docs/prompt
- 方法：4 个并行只读审查（安全 / 缺陷 / 性能 / CLI 化），关键发现逐条人工复核后再修；本文件是修复的**执行清单**，状态随修随更。
- 威胁模型：本地 CLI + 半可信 agent（agent 会偷懒/瞎干），输入面 = change 名 / 路径 / local.yaml / 仓库内容 / hook stdin。
- 总体结论：**无 P0/P1 安全漏洞**。命令注入面已收口（git 全数组参数、SQL 全参数化、change 名白名单校验）；.npm-publish-token 未被 git 跟踪且 .gitignore/.npmignore 双排除。真正的 P1 在缺陷与性能侧，以及 6 条高杠杆 CLI 化项。
- **修复记录（2026-08-21 当批）**：下表 1-24 项已全部修复，`npm test`（276 文件全过）+ `npm run lint`（0 未引用导出）回归通过。同步产物：docs/prompt/_extracted.json 重提取、verify.md/scan.md fence 同步、execute.md endpoints 段手改、sillyspec-verify SKILL.md 补 lint 对账行、file-lifecycle.md 补 .corrupt- 救援副本说明。plan_level 新契约同步进 4 个测试文件的 fixture（plan-execute-contract / plan-diagnose-wave / tool-defect-audit-fixes / noai-completion-gate）。

## 修复顺序总表

状态：✅已修 / ⏳待修 / 📋遗留（本轮不修，方案已写明）。

| # | ID | 级别 | 一句话 | 状态 |
|---|----|------|--------|------|
| 1 | SEC-1 | P2 | worktree-guard 手写 YAML 解析器 `__proto__` 原型污染 | ✅ |
| 2 | BUG-2 | P1 | worktree-apply 二进制补丁被 utf8 解码损坏 | ✅ |
| 3 | BUG-6 | P2 | git-helper 无 maxBuffer，>1MB 输出静默变空 | ✅ |
| 4 | BUG-3 | P2 | porcelain 中文路径八进制转义拼坏（quotepath） | ✅ |
| 5 | BUG-4 | P2 | scan-guard.json 裸写非原子，hook 读半截 fail-open | ✅ |
| 6 | PERF-1 | P1 | @inquirer/prompts 静态拉进每条 run 命令（~100-200ms/次） | ✅ |
| 7 | SEC-4 | P3 | dashboard 2 个入口漏 isKnownProjectPath 校验 | ✅ |
| 8 | SEC-6 | P3 | fs-atomic 临时名 Math.random 可预测 | ✅ |
| 9 | SEC-2 | P3 | claude-pre-tool-use 包装层静默 fail-open 无日志 | ✅ |
| 10 | SEC-3 | P3 | readonlyCommands 可被 agent 写 local.yaml 自扩权（至少提示） | ✅ |
| 11 | BUG-5 | P2 | deps/review/symbol-impact 门 blocked 状态从不落库 | ✅ |
| 12 | PERF-3 | P2 | ancestorSpecDirs 每命令 2 次 rev-parse，可合并+缓存 | ✅ |
| 13 | PERF-7 | P2 | execute --done 自动勾选每 task 一次 git diff | ✅ |
| 14 | PERF-5 | P2 | docs-check 裸名引用每条全树重扫 + 文件重读 | ✅ |
| 15 | PERF-4 | P2 | auto-pull 阻塞分发最长 8s | ✅ |
| 16 | BUG-7 | P2 | db 探测在 busy_timeout 之前 + .bak 回退覆盖新库 | ✅ |
| 17 | BUG-8 | P3 | addStep 查重在事务外可双插 | ✅ |
| 18 | BUG-9 | P3 | _ensureGitignore LF 追进 CRLF 文件 + 非原子写 | ✅ |
| 19 | BUG-10 | P3 | advisory 输出 cwd+'/' 裁前缀 Windows 永不命中 | ✅ |
| 20 | CLI-2 | P1 | execute Wave prompt 仍让 agent 手写 endpoints.json（CLI 命令已有） | ✅ |
| 21 | CLI-3 | P1 | module-impact 骨架缺「更新结果」表，verify 门却硬校验它 | ✅ |
| 22 | CLI-5 | P1 | plan_level frontmatter 漏写 → review tier 静默降级自审 | ✅ |
| 23 | CLI-1 | P1 | verify 只对账 test 不对账 lint（"我跑过 lint 了"纯口头） | ✅ |
| 24 | BUG-12 | P3 | 在飞测试改动三处残留（rmSync 无重试 / HOME 未隔离） | ✅ |
| 25 | BUG-1 | P1 | _write 全量快照 UPSERT 丢失更新（多 agent 同 change） | 📋 |
| 26 | CLI-6 | P1 | prompt 要求 git add 而 hook 拦 git add（指令-拦截打架） | 📋 |
| 27 | CLI-4 | P1 | module-impact 覆盖度机械核对探针（diff ⊆ 矩阵） | 📋 |
| 28 | PERF-2 | P2 | docs-debt 链每模块 2-3 次 git log 可批量化 | 📋 |
| 29 | PERF-6 | P2 | scan-diff 6 次 git spawn 可压 2-3 次 | 📋 |
| 30 | BUG-11 | P3 | reopenStage 两段式落库非原子 | 📋 |
| 31 | SEC-5 | P3 | .npm-publish-token 明文躺仓库根（处置见下） | 📋 |
| 32 | CLI-7~12 | P2/P3 | 矩阵预填 / quick result 对账 / worktree doctor 预检 / 模块卡变更索引 / scan 探测 / 杂项减法 | 📋 |

另：PERF-10（docLine 逐引用 O(文档长度) split）已顺手修复（collectDocRefs 改单遍行号游标）。

---

## 一、安全

### SEC-1（P2）worktree-guard 手写 YAML 解析器原型污染 ✅复核成立
`src/hooks/worktree-guard.js 第413行-443`。`.sillyspec/local.yaml`（agent 可写，:344 白名单无条件放行）写：
```yaml
__proto__: x
  forceRescan: true
```
顶层 `__proto__: x` 走字符串赋值被 setter 忽略但 `topKey='__proto__'`；子键行 `typeof result['__proto__']` 读到 Object.prototype 跳过重建，直接 `Object.prototype['forceRescan']=true`——全局污染。当前进程内暂无直接变现 sink（forceRescan 消费点在另一进程），属防御深度损伤 + 未来回归面（如 `readAllQuickGuards` 的 `Array.isArray(guard.baselineFiles)` 会被继承数组骗过）。
**修法**：两级 key 统一拒绝 `__proto__/constructor/prototype`。

### SEC-2（P3）hook 包装层静默 fail-open ✅复核成立
`src/hooks/claude-pre-tool-use.cjs:35-47,87-95,125`：stdin 读失败 / JSON 解析失败 / 模块加载失败一律 `process.exit(0)` 且无日志。stdin 由 Claude Code 生成，非注入面；但这是阶段门禁唯一执行点，任何故障静默解除全部防护。对照组 DB 路径已明确 fail-closed（worktree-guard.js 第249行-279）。
**修法**：解析/加载失败 stderr 留一行诊断再退出（保持放行语义，先不动 fail-closed，避免误伤正常流）。

### SEC-3（P3）readonlyCommands 自扩权 ✅复核成立
`worktree-guard.js 第372行-389,790-792`：只读白名单可经 agent 可写的 local.yaml 扩展（`worktreeHook.readonlyCommands: [curl, ...]`），plan/brainstorm 等只读阶段先 Write 配置再执行任意命令。属文档化配置面 vs 拦截目标的自我削弱矛盾。另有 `git worktree` 任意子命令、`sillyspec` 任意子命令放行（:504,513,518）。
**修法（本轮）**：命中"local.yaml 扩展白名单"而非内置白名单时 stderr 输出一行提示（诚实标注边界）；彻底修法（trustedConfig 确认位）遗留。

### SEC-4（P3）dashboard 两入口漏 SEC-06 校验 ✅复核成立
`packages/dashboard/server/index.js 第463行-475,594`：`/api/docs` 与 `docs:get` 未过 `isKnownProjectPath` 即 `parseSillyspecDocsTree(任意路径)`。仅 127.0.0.1 + 同源双检，实际风险低，属一致性缺陷。
**修法**：补 `isKnownProjectPath(projectPath)` 校验，与 :128-133/:355-358/:424-430 对齐。

### SEC-5（P3）.npm-publish-token 明文残留 ✅复核：当前处置正确
未跟踪、.gitignore:4 + .npmignore 双排除、无 files 字段 → 不会提交不会进包。残留风险 = 误操作即泄露 npm 发布凭证，且本仓库场景就是 agent 在根目录跑命令。
**建议（不动文件，由用户决策）**：迁 `~/.npmrc` 或 `NODE_AUTH_TOKEN`；可在 doctor 加"仓库根存在 .npm-publish-token"告警。

### SEC-6（P3）fs-atomic 临时名可预测 ✅复核成立
`src/fs-atomic.js 第59行-71`：`Math.random()` 生成 tmp 后缀。本地单用户 CLI 下 symlink 预放置不可利用（攻击者已有同权限）；顺手收紧。
**修法**：`randomBytes(6).toString('hex')`。

### 已核实无问题的面（不复查）
git 全数组参数（git-helper.js 第37行,64；worktree-apply.js 第621行-636；verify-postcheck.js 第395行-412 refspec 白名单）；`assertSafeChangeName`（run/shared.js 第59行-70）覆盖 --change/--linked-changes；quick/taskcard/workspace 名字白名单；worktree 清理目标由校验后 changeName 派生；SQL 全参数化、无递归 merge 配置、js-yaml 4.3.1 防污染；sillyhub url+token 严格同源成对（config.js 第40行-58）、非 https 非回环显式 warn、无 rejectUnauthorized:false、上传排除 local.yaml、connect 写 token 引号转义+chmod 600；setup.js execSync 全部硬编码常量；worktree-deps tryInstall 三道门；dashboard executor 白名单+无 shell。

---

## 二、缺陷

### BUG-1（P1，遗留）_write 全量快照 UPSERT 丢失更新 ✅复核成立
`src/progress.js 第706行-794`。命令入口 `pm.read()` 快照贯穿全程（run/command.js 第765行/978 → completeStep → complete.js 第755行/499 落库），verify gate 同步跑测试 2-10min（gates.js 第481行 自证）——整个命令生命周期是读-改-写窗口。并发写者被后写者整体覆盖：步骤回滚、新步骤被 `NOT IN` DELETE 删掉、current_stage 回拨。
**遗留方案（下轮实现）**：read() 时深拷贝 S0 挂在 ProgressManager；_write() 前重读 DB 当前态 D，计算 delta(S0→内存) 应用到 D 再写——只覆盖本命令实际改过的 (stage,step)，并发新增步骤保留。steps 表加 `UNIQUE(stage_id,name)` 配合 INSERT OR IGNORE。涉及所有 _write 调用点回归，需独立 change 走 quick。

### BUG-2（P1）二进制补丁 utf8 损坏 ✅复核成立
`src/worktree-apply.js 第620行-650`：`git diff --binary` 结果按 utf8 string 拼接落盘；git-helper.js 第57行-59 注释自己写明正确做法（encoding:'buffer'，worktree.js 第1445行/1470 已是正确写法）。二进制/GBK 文件 → U+FFFD 替换 → corrupt patch → apply 失败。
**修法**：两处 `encoding:'buffer'`，Buffer.concat 拼接，`writeFileSync(patchPath, buffer)`，空判 `buffer.length===0`。

### BUG-3（P2）中文路径 porcelain 解析 ✅复核成立
`src/run/shared.js 第638行-647`：`\\(.)` 把 `\346` 拆成 `346`；git 默认 `core.quotepath=true` 非 ASCII 路径输出 `"\346\226\207.md"`。中文文件名脏文件跑 quick → baseline 归属/危险文件门全基于拼坏路径。
**修法**：git-helper fullArgs 统一追加 `-c core.quotepath=false`；parsePorcelainPath 补 `\NNN` 八进制解码兜底。

### BUG-4（P2）scan-guard 裸写 + hook fail-open ✅复核成立
写方 `src/run/stage.js 第210行` 裸 writeFileSync（fs-atomic.js 头注释明确把 guard.json 列为 writeAtomicSync 适用对象）；读方 worktree-guard.js 第176行-183 半截 JSON → null → :191-192 覆盖保护静默放行。同类：gates.js 第584行 stage-review marker 裸写（危害小）。
**修法**：两处改 writeAtomicSync；readScanGuard 解析失败 stderr 提示。

### BUG-5（P2）硬门 blocked 不落库 ✅复核成立
`src/run/gates.js 第331行+327、393+402`：置内存 blocked 后 `process.exit(1)`，最后一次 _write 在 command.js 第1034行 入口——`progress show`/doctor 看到的仍是 pending，与 docstring 不符。
**修法**：exit 前 pm._write 落盘 blocked（能拿到 pm 的路径），拿不到的删死代码修注释。

### BUG-6（P2）git-helper 无 maxBuffer ✅复核成立
`src/git-helper.js 第37行,64` 默认 1MB（对比 verify-postcheck.js 第368行 已设 32MB）。untracked 清单超限 → ERR_CHILD_PROCESS_STDIO_MAXBUFFER → gitQuiet 吞成 null → `|| ''` → **untracked 静默变空**，补丁漏新文件无任何报错。
**修法**：git() 统一 `maxBuffer: 32MB`；gitQuiet 对 ENOBUFS warn。

### BUG-7（P2）DB 探测先于 busy_timeout ✅复核成立
`src/db.js 第61行-64`：探测 SELECT 跑在 busy_timeout=0 下，仅 3 次重试（350ms 总窗口）；他者 CHECKPOINT >350ms → 健康库误判"损坏"硬抛错；遗留 .bak 场景 :154 用陈旧备份覆盖可能更新的主库（静默回退进度）。
**修法**：openDatabase 成功即先 exec `PRAGMA busy_timeout` 再探测；.bak 回退前比对主库/.bak mtime。

### BUG-8（P3）addStep 查重在事务外 ✅复核成立
`src/progress/step-store.js 第92行-104`：dupRow 查询在 transaction 外，steps 无 UNIQUE 约束，并发 add-step 同名双插。
**修法**：查重移入事务。

### BUG-9（P3）_ensureGitignore EOL/原子性 ✅复核成立
`src/progress.js 第1010行-1022`：LF 行追进 CRLF .gitignore + 裸覆盖写。
**修法**：按既有 EOL 追加 + writeAtomicSync。

### BUG-10（P3）advisory 前缀裁剪 Windows 不命中 ✅复核成立
`src/run/gates.js 第756行,797,802-803`：`f.replace(cwd + '/', '')` 反斜杠路径永不匹配（仅展示层）。
**修法**：`path.relative(cwd, f)`。

### BUG-11（P3，遗留）reopenStage 两段式写
`src/progress/stage-machine.js 第487行-502`：先写 revising 再级联 stale，中间态窗口靠 doctor 自愈。合并为单次 _write 需重构级联计算，遗留。

### BUG-12（P3）在飞测试改动三处残留 ✅复核成立
run-tests.mjs TEMP 隔离主体正确，残留：①execute-batch-zero-diff.test.mjs 第145行 rmSync 无 maxRetries（Windows AV 扫描 EPERM 误判 fixture 失败）；②run-tests.mjs 第30行-35 cleanHomePointer rmSync 无重试且静默；③childEnv 未隔离 HOME（双套并发仍可经 ~/.sillyspec-platform.json 互扰）。

---

## 三、性能

### PERF-1（P1）@inquirer/prompts 静态加载 ✅复核成立
`src/run/quick-audit.js 第12行` ← command.js 第27行 静态 import；checkbox 仅在"≥2 活跃变更 + 交互 TTY"分支用。实测冷加载 102-149ms，run 全静态图 162-296ms——**每条 run 命令白付 ~100-200ms**（agent 每步一次的固定税）。index.js 第280行/284 对 init/setup 已是动态 import 先例。
**修法**：交互分支内 `await import('@inquirer/prompts')`。

### PERF-2（P2，遗留）docs-debt 链 3+(2~3)×M 个串行 git spawn
prompt.js 第463行-511（status+diff）→ docs-debt.js 第177行（rev-parse）→ 每模块 log -1 ×2-3 → 每欠账模块重读 local.yaml + runDocsCheck。M=10 时 23-33 个串行 spawn（0.7-3.3s）。批量化（log 一次拿多文件 + rev-parse 前移 + 配置缓存）改动面大，遗留。

### PERF-3（P2）ancestorSpecDirs 固定 2 spawn 无缓存 ✅复核成立
run/shared.js 第142行,144 两条 rev-parse 每条 stage 命令必跑（command.js 第374行），quick 漂移守卫路径再跑一遍。
**修法**：合并为一次 `git rev-parse --show-toplevel --git-common-dir` + 进程级按 cwd 缓存（对照 worktree.js `_mainRepoRootByCwd` 先例）。

### PERF-4（P2）auto-pull 阻塞分发最长 8s ✅复核成立
index.js 第1248行/1434 分发前 await triggerPullActiveChange（raceWithAbort 上限 8000ms）——平台 daemon 慢时每 10s 窗口第一条命令打印任何输出前硬等 ≤8s。
**修法**：自动 pull 熔断降为 2s（手动 `platform pull` 保留 8s）。

### PERF-5（P2）docs-check 无缓存 ✅复核成立
docs-check.js 第135行-146 裸名引用每条触发 src/ 全树递归；:365-375 每引用×候选重读文件。100 文档×10 裸名引用 ≈ 1000 次全树 walk。
**修法**：runDocsCheck 内 per-call Map 两枚（basename→findInTree 结果、absPath→lines）。

### PERF-6（P2，遗留）scan-diff 单命令 6 次串行 spawn（180-600ms），可合并 rev-parse/条件化 is-ancestor。同修法适用 scan-staleness（4 spawn）。遗留。

### PERF-7（P2）auto-check 每 task 一次 git diff ✅复核成立
complete.js 第634行 shouldAutoCheckTask 内 git diff（同一对 base..head 查 N 次），:789 批量收尾再一轮。8 task ≈ 8-16 次 spawn。
**修法**：一次 `git diff --name-only base..head` 拿全集内存归属。

### PERF-8/9/10（P3，遗留）dashboard watcher 启动扫 HOME+无防抖；_write 每语句现场 prepare（个位数 ms）；docLine 前缀 slice+split O(引用×文档长度)。dashboard 侧与 _write 侧遗留；docLine 顺手修（见修复记录）。

---

## 四、CLI 替代 agent 手工操作（防偷懒/防瞎干）

### CLI-1（P1）lint 全程零对账 ✅复核成立
verify.js 第175行 prompt 让 agent 自跑 lint 自报；gates.js 第481行-488 完成门只跑 `runVerifyTestCheck`；verify-postcheck.js 全文无 lint 执行逻辑。execute.js 第335行 同样自跑。测试侧已有"自报 PASS 实测失败→阻断"，lint 侧同一不诚实只有口头。
**修法**：verify --done 门级联加 `runVerifyLintCheck`（执行 local.yaml commands.lint，失败 advisory 起步），prompt 相应句子降级。

### CLI-2（P1）endpoints.json prompt 未接线 ✅复核成立
execute.js 第1045行-1050 Wave prompt 仍指派"扫描 @router.get/post… 手写 endpoints.json"，而 `sillyspec endpoints extract`（index.js 第830行-907）已存在且注释自认"此前靠 agent 手扫（易漏）"；skill 文档已接（sillyspec-execute/SKILL.md:95）但 agent 实际跟的是 step prompt。
**修法**：execute.js Wave prompt 改为指派 `sillyspec endpoints extract --change <name> --task task-NN`，删手扫指引；同步 docs/prompt（_extract.mjs）与 skill。

### CLI-3（P1）module-impact 骨架缺「更新结果」表 ✅复核成立
module-impact.js 第111行-145 骨架只有矩阵/未匹配/说明三节；gates.js 第505行-521 verify --done 硬阻断 pending 行；plan.js 第361行 prompt 自认"漏写此表则 agent 只能从 gate 报错反推格式"——symbol-impact 骨架（gates.js 第80行-103）已消灭的同款坑。
**修法**：generateModuleImpactSkeleton 按 matrix 命中模块机械追加「## 更新结果」行。

### CLI-4（P1，遗留）module-impact 覆盖度机械核对
archive.js 第33行-35"三重核对"全靠 agent 肉眼，archive 完成校验只查文件存在。机械基础已就位（resolveVerifyChangedFiles + classifyFile）。方案：`git diff 文件集 ⊆ (矩阵 ∪ 未匹配清单)` 探针，verify advisory、archive 升阻断。遗留（与 CLI-3 同文件，先落骨架）。

### CLI-5（P1）plan_level 漏写静默降级自审 ✅复核成立
plan.js 第116行-119 靠 agent 手写 frontmatter；review-tier.js 第53行-75 无 plan_level → 文件数启发式 → full 级变更静默 self 自审，无人报错。validatePlanForExecute / plan --done 门 / plan-postcheck 均不查。
**修法**：Plan→Execute Contract 校验加 error：plan.md frontmatter 缺 `plan_level` 即阻断。

### CLI-6（P1，遗留）git add 指令-拦截打架
quick.js 第120行-122 / brainstorm 生成规范文件步 / archive.js 第146行-147 让 agent `git add`；worktree-guard.js 第36行-39 DANGER_GIT_SUBS 含 add/commit，:800-804 quick 先走危险黑名单——装了 hook 的环境 agent 照 prompt 干被拦死（卡住/绕 SILLYSPEC_DISABLE_HOOKS/干脆不暂存三选一）。archive 已有 FR-04 CLI 下沉先例（complete-handlers.js 第342行-348）。
**遗留方案**：quick --done 按 QUICKLOG「文件：」行自动 `git add --`；brainstorm 末步 CLI 暂存变更目录；删三处 prompt 指令。行为变更需独立 change 走流程。

### CLI-7~12（P2/P3，遗留）
7 决策追踪/覆盖矩阵由 TaskCard frontmatter 预填骨架；8 quick --result"验证情况"对账（命中测试/lint 字样且含源码 → CLI 实测落审计行）；9 worktree doctor 探测 commands.* 首 token PATH 存在性；10 模块卡变更索引 CLI 自动追加 ql-ID 行；11 `projects suggest` + modules rebuild 产 _module-map 骨架；12 杂项减法（verify.js 第176行 grep TODO 与探针 1 重复 / prompt.js 第649行 merge-base 失败自动降级 / scan knowledge propose 接线）。

---

## 已裁决不推翻
docs/sillyspec/prompt-control-debt.md 中已 defer 的项（P6.1b docHash 全 CLI 化、P4.3 Grill 复审边界等）不重复提出。
