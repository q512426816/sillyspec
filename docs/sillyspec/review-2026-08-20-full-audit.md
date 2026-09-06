# 全量体检问题清单（2026-08-20）

> 排查维度：缺陷 / 性能 / 安全 / 代码质量 / 垃圾代码 / SillyHub 契合度。
> 排查方式：5 路并行代码审查（逐行读源码 + 交叉验证），基线：3.26.12，238 测试全绿。
> 标注说明：`✅已验证` = 主会话人工复核代码属实；`待复核` = 排查 agent 报告有代码证据但未逐条二次复核。
> 严重度：P1 = 数据破坏/功能失效/崩溃；P2 = 真实缺陷但影响面受限；P3 = 加固/清理/文档。
>
> **修复进度（同日第一批）**：BUG-01/HUB-01、BUG-02、BUG-03、BUG-04、BUG-05、BUG-06、BUG-07、BUG-08、
> BUG-09、BUG-10、BUG-11、BUG-12、BUG-13、BUG-14、BUG-15、HUB-02、SEC-05、SEC-08（随 BUG-11 一并消除）、
> CLEAN-01/02/03、DOC-01~05、DOC-07（TODO 输出随 HUB-02 移除）已修复并验证（239 测试 0 失败 + lint 通过）。
>
> **修复进度（同日第二批：安全收紧 + 性能 + 平台契合）**：SEC-01（install 三道门：worktree 源分流 +
> 包管理器白名单 + 元字符拒绝 + 数组执行；附 worktree-deps-install-guard.test.mjs 行为锁定）、
> SEC-02（核实 yaml 来源均为主仓/跨仓仓根后补信任边界注释，无行为变更）、SEC-03（dashboard Origin
> 端口匹配收紧 isSameDashboardOrigin）、SEC-04（sync connect https 警告 + local.yaml chmod 0600）、
> SEC-06（docs/content、detail、overview 三 API 限定已发现项目内 + 项目发现 10s TTL 缓存）、
> SEC-07（modules path 拒绝绝对路径与 .. 段）、PERF-01（verifyReviewGitEvidence 批内缓存：gitDir
> 探测/status/commit 校验/diff 四类去重）、PERF-02（自动 pull 10s 跨进程节流 marker，手动 pull 不受
> 影响；stamp 移至连接确认后防未连接项目凭空建目录——platform-managed-declaration 回归拦截）、
> PERF-06（dump() steps 批量 IN 查询）、HUB-05（writePlatformPointer 合并保留 status/completedAt/
> scanStatus + platform-pointer-status-preserve.test.mjs 回归）、HUB-06（docs-debt/shared 三处直调点
> 补传 crossRepoRoots）已修复并验证（241 测试 0 失败 + lint 通过）。
> **PERF-03 缓行**：import 下沉与 QUAL-02（index.js 拆分）强耦合，单独重构会话处理更稳。
>
> **修复进度（同日第三批：质量收口 + 协议对齐 + 竞态收尾）**：QUAL-01（git 调用全面收口
> git-helper：task-review runGit / stage-contract gitTry / verify-postcheck 两 diff 封装改薄适配层；
> worktree.js 三处裸调、worktree-apply/modules/init/taskcard/setup/index 六文件裸调全部收口，
> index.js:250 与 taskcard.js:133 两处 execSync 字符串拼接（经 shell）改为数组形式；git-helper
> 新增 encoding:'buffer' 支持二进制 diff 场景）；HUB-03/HUB-04（protocol 文档重写 postcheck-result.json
> 结构/落点/check 表与代码一致 + 消费优先级改回 scan_post_check.status；新增
> platform-scan-protocol-contract.test.mjs 13 断言锁字段名——结构层用真实函数断言、源与文档层
> 用文本断言防漂移）；BUG-19（gates.js task id 过 normalizeTaskId）；SEC-09/PERF-10（ProgressManager
> 模块级 Map<dbPath> 连接池，同进程多实例共享单连接）；BUG-17（tasks.md 读-改-写改按目标文件
> 派生锁，跨用户勾选/追加不再丢更新）；BUG-16（worktree create 降级 in-place 前重查并发赢家，
> 消灭一 worktree + 一 in-place 分裂态）已修复并验证（242 测试 0 失败 + lint 通过）。
>
> **修复进度（同日第四批：HUB-07/08/09 平台语义闭环，测试先行）**：HUB-07（审批 unknown
> 统一 warnApprovalUnknown：醒目多行警告 + .runtime/approval-unknown.log 留痕，接线
> stage.js execute 启动与 command.js runAutoMode 三处 unknown 分支——此前静默 fail-open
> 无迹可查；hub07-approval-unknown.test.mjs）；HUB-08（spec 树冲突闭环：syncSpecTree 冲突
> 落 .runtime/spec-sync-conflict-<change>.json + platform status 经 listConflictFiles 列出
> type:spec-tree + resolve 三态——keep-local 重定基线重推成功清文件 / take-platform
> fail-closed 明示无下载端点 / abort 清标记；hub08-spec-sync-conflict.test.mjs 6 场景）；
> HUB-09（熔断确定性取消：triggerSync/triggerPull/triggerPullActiveChange 改 raceWithAbort，
> AbortSignal.any 合并单请求超时与外部熔断 signal 一路传到 fetch——熔断时在飞请求被真实
> 中断，不再「客户端放弃、平台已接受」；triggerSync 支持 opts.timeoutMs 供测试；
> hub09-sync-circuit-abort.test.mjs 双层断言含服务器侧连接中断观测）已修复并验证
> （246 测试 0 失败 + lint + docs gate 基线 0）。
>
> **修复进度（同日第五批：HUB-10/11/12 MCP client 侧收尾，测试先行）**：HUB-10（删除
> sync.js 内嵌 syncModule() 死代码 85 行——零调用且命令面与 index.js 分叉，留注释防回归）；
> HUB-11（session 过期识别补第二种形态：HTTP 200 + JSON-RPC error -32600「Missing session」
> 同样落哨兵触发重连；-32602 等普通错误不误触发；hub11-mcp-session-rpc-error.test.mjs）；
> HUB-12 六子项（a. probe 总超时 25s 截断 + tools/list 一次复用喂路径A预热与 root_path 校验
> ——hub12-probe-timeout.test.mjs；b. client.close() 发 DELETE 收尾 session、close 后自动
> 重建；c. cwd 纠正守卫补 checkPlatformManaged 防双入口 fail-closed 被绕过；d. 冲突横幅输出
> 真实落点路径（conflictPath）而非硬编码 .sillyspec/.runtime；e. disconnect 不清 cleaned
> marker 的意图已注释（防重连误清本地数据）；f. killLease killed:false 为跨仓开放项维持文档
> 记载——hub10-12-platform-misc.test.mjs 源契约锁定 a/c/d 之外的 HUB-10/12c/12d）已修复
> 并验证（250 测试 0 失败 + lint + docs gate 基线 0）。
> 未修：PERF-03~05/07~11、QUAL-02~09、HUB-13 中除已修项、CLEAN-04~08——
> 见「八、修复批次建议」，按批次推进。

---

## 一、缺陷（BUG）

### BUG-01【P1✅已验证】sync.js 平台模式下 spec 树同步可清空服务器全部文件
- 位置：`src/sync.js:18`（`syncSpecTree(safePlatformSpecDir(...))`，修复后锚点）、`src/spec-sync.js:422`（syncSpecTree diff 逻辑内 computeSpecOps delete 分支）
- 问题：`sync()` 的进度读写锚点用 `safePlatformSpecDir(this.cwd)`（平台模式 → specRoot），但成功后链式推送 spec 树时本地树根硬编码 `cwd/.sillyspec`。平台模式下该目录只有 local.yaml（walkSpecTree 按文件名排除），localMap 为空 → 服务器清单中每个 exists=true 的文件都生成 delete op → **服务器侧 spec 树被整体清空**，且失败被 catch 吞成 debugLog。
- 可达路径：平台模式仓库手动 `platform sync --change x`；push 409 冲突横幅指导用户跑 sync；`resolve --keep-local` 自动重推（sync.js:955-968）。
- 修复方向：spec 树根与进度锚点统一用 `safePlatformSpecDir`；并在 computeSpecOps 加护栏——本地树为空且服务器清单非空时拒绝生成 delete（fail-closed）。

### BUG-02【P1✅已验证】quicklog withFileLock 偷 stale 锁存在 TOCTOU，互斥可被打破
- 位置：`src/quicklog.js:36-55`
- 问题：两个进程同时观察到同一把 stale 锁 → A unlink 后重建新锁进入临界区 → B 随后 unlink（不复查 mtime，删掉的是 A 的新锁）→ B 也成功建锁 → 双进程同时在临界区内，ql-ID 重复分配 / QUICKLOG 读-改-写互相覆盖。该模块的文件头注释明确说明它就是为消除多 quick 会话并发丢更新而写的。
- 修复方向：偷锁改为 `rename(lockPath, 唯一临时名)` 原子抢占（rename 失败 = 已被他人抢走，回重试循环），再删除临时名。

### BUG-03【P2✅已验证】run/gates.js execute marker 读取无 try/catch，并发删除时 --done 崩溃
- 位置：`src/run/gates.js:179-181`
- 问题：`existsSync(runIdFile)` 与 `readFileSync(runIdFile)` 之间无保护，另一 agent 并发 archive cleanup 删 marker 时抛 ENOENT，冒到顶层以 stack 形式失败而非结构化报错。同文件 :426-435 同类读取有 try/catch，口径不一。
- 修复方向：包 try/catch，读失败按"marker 缺失"走 `resolveLatestExecuteRunIdWithTasks` 兜底（与 :192-198 同路径）。

### BUG-04【P2✅已验证】run/shared.js porcelain 删除判定含恒假条件，'DD'/'AD' 删除漏检
- 位置：`src/run/shared.js:788-790`
- 问题：`entry.slice(0, 2).trim()` 后 `status === ' D'` 恒假（trim 已吃掉空格）；'DD'（双删）、'AD'（暂存新增后工作区删除）trim 后不等于 'D'，不进 deletedFiles → `--allow-delete` fail-closed 门对此类删除静默放行。
- 修复方向：用未 trim 的两字符状态码判定 `X==='D' || Y==='D'`。

### BUG-05【P2✅已验证】run/command.js runAutoMode 中 pm.read 返回 null 直接解引用崩溃
- 位置：`src/run/command.js:1290-1292`（另 :1359 同型）
- 问题：`progress = pm.read(cwd, changeName)` 可返回 null（change 行缺失），下一行 `progress.stages` 抛 TypeError。对照 runCommand :731 有空值处理，auto 模式漏了。
- 修复方向：判空后报错引导，与 :731 对齐。

### BUG-06【P2✅已验证】task-review.js 主仓 task base 缺失时 null.slice 崩溃
- 位置：`src/task-review.js:963-981、:1064`
- 问题：注释说"主仓 task 后续跳过"，实现没跳过：主仓 base/head 变量为 null 时拼接 reviewerNotes 调 slice 抛 TypeError。complete.js:301（generateTaskReviewDrafts 调用点）有 catch 降级（草稿兜底失效）；`index.js backfill-reviews` 无 catch 直接顶层报错退出。
- 修复方向：主仓 task 在 base/head 为 null 时显式 skipped++ continue，与注释语义对齐。

### BUG-07【P2✅已验证】worktree.js cleanup 残留检测 Windows 下恒不命中
- 位置：`src/worktree.js:931`
- 问题：`git worktree list` 在 Windows 输出正斜杠路径，worktreePath 是反斜杠，`includes()` 恒 false → "git 仍注册但目录已删"的残留场景漏报，cleanup 结果误报为 cleaned。同文件 `_pathToChangeName`（:1326-1340）已用 path.relative 规避此坑，此处漏改。
- 修复方向：两侧统一 toPosix 后比较。

### BUG-08【P2✅已验证】local-detect.js 嗅探的 `./gradlew` 在 Windows 不可执行
- 位置：`src/local-detect.js:93`
- 问题：生成的 build/test 命令 `${gradlePrefix} build` 由 verify-postcheck 经 execSync（Windows 走 cmd.exe）执行，`./gradlew` 在 cmd 下必然失败，自动嗅探的验证命令 Windows 全灭。
- 修复方向：`process.platform==='win32'` 时用 `gradlew.bat`。

### BUG-09【P2✅已验证】hooks/worktree-guard.js isPathInside 大小写敏感，Windows 路径大小写不一致时误拦
- 位置：`src/hooks/worktree-guard.js:122-127`
- 问题：Windows 文件系统大小写不敏感，但 git worktree list / 编辑器给出的路径大小写可能与注册的 meta.worktreePath 不一致 → 合法的 worktree 内写入被 hook 当主仓越权拦截（fail-closed 方向阻塞 agent）。
- 修复方向：win32 下比较前 toLowerCase。

### BUG-10【P2✅已验证】dashboard shutdown 不关 WebSocketServer，Ctrl+C 进程无法退出
- 位置：`packages/dashboard/server/index.js:588-593`（对照 :456 `wss = new WebSocketServer({ server })`）
- 问题：`server.close()` 只停止接受新连接，不终止已升级的 WS 连接，事件循环被客户端持有，与入口承诺"按 Ctrl+C 停止服务器"矛盾。
- 修复方向：shutdown 补 `wss.clients.forEach(c=>c.terminate())` + `wss.close()`。

### BUG-11【P1✅已验证】dashboard executor spawn('npx') 在 Windows 整体失效
- 位置：`packages/dashboard/server/executor.js:13`
- 问题：Windows 上 npx 是 npx.cmd，spawn 不带 shell 无法解析（Node 对 .cmd 的 EINVAL/ENOENT 限制），dashboard 的"执行 CLI"功能 Windows 100% 失败。
- 修复方向：`spawn(process.execPath, [sillyspec 入口绝对路径, ...args])` 直接指定解释器，彻底排除 shell 依赖（同时消除未来加 shell:true 变 RCE 的诱惑）。

### BUG-12【P2✅已验证】平台模式仅传 --runtime-root（specRoot=null）时 mkdirSync(null) 抛错，postcheck 全部静默跳过
- 位置：`src/run/complete-handlers.js:1297-1301`
- 问题：`mkdirSync(platformOpts.specRoot)` 收到 null 抛 TypeError，被外层 catch 吞成一句 warn 后，scan postcheck / 指针状态升级 / failed_post_check 阻断全部不再执行——scan 失败也会"干净成功"，违背 fail-closed。
- 修复方向：分支内对 !specRoot 显式报错或由 runtimeRoot 派生落点，不依赖 catch 兜底控制流。

### BUG-13【P2✅已验证】scan 回退注册的路径越界校验用无分隔符前缀比较，兄弟目录绕过
- 位置：`src/run/complete-handlers.js:504`
- 问题：`absPath.startsWith(resolve(cwd))` 在 `C:\repo` vs `C:\repository2` 时误判未越界。同文件 :84-88 validateParsedProjects 已用 relative()+startsWith('..') 的正确写法。
- 修复方向：复用 relative 口径。

### BUG-14【P2✅已验证】quicklog writeAtomic 临时文件名只含 pid 无随机段
- 位置：`src/quicklog.js:342`
- 问题：fs-atomic.js:61-63 已修过同款坑（Windows PID 重用撞名，rename 互相覆盖），quicklog 内的副本实现漏加。
- 修复方向：对齐 fs-atomic：`.tmp-${pid}-${random}`。

### BUG-15【P2✅已验证】index.js dashboard --port 无 NaN 校验
- 位置：`src/index.js:1002-1008`
- 问题：`--port abc` → listen(NaN) 抛 RangeError 打 stack，而非一句用法错误。
- 修复方向：Number.isInteger 校验，非法 exit 2。

### BUG-16【P2|待复核】worktree create() 并发竞态：双 agent 同时首建同名 change，其一被误判失败降级 in-place
- 位置：`src/worktree.js:404-475`
- 问题：目录存在性检查与 git worktree add 之间无锁；并发时其一 catch 后被误判"沙箱权限限制"降级 in-place-fallback，得到一个 worktree + 一个 in-place 的分裂状态。
- 修复方向：worktree 目录级复用 withFileLock 串行化 create；降级前重查分支/目录是否已被并发者建成。

### BUG-17【P2|待复核】quicklog 锁按用户粒度，但临界区内写共享的 tasks.md，跨用户丢更新
- 位置：`src/quicklog.js:579、638`（锁路径）、`:431-438`（checkTaskCheckbox 读-改-写）
- 问题：用户 A（勾选）与用户 B（追加）持不同用户锁同时写同一 tasks.md，B 的整文件覆盖丢掉 A 的勾选。
- 修复方向：tasks.md 的读-改-写改用按目标文件路径派生的锁。

### BUG-18【P2|待复核】progress 快照/恢复对"活"库直接 copyFileSync，WAL 未 checkpoint 导致备份失真 + Windows EPERM
- 位置：`src/progress.js:549`、`src/db.js:148`
- 问题：复制正在被写的库主文件可能缺尾部提交（静默回退进度）；Windows 覆盖他进程打开的文件易 EPERM（仅 rename 有重试，copy 没有）。
- 修复方向：备份前 `PRAGMA wal_checkpoint(TRUNCATE)`；copy 失败纳入退避重试。

### BUG-19【P3✅已验证】gates.js task id 未做 normalizeTaskId 归一（防御性缺口，非常态 bug）
- 位置：`src/run/gates.js:105-117`
- 说明：正则提取 plan.md 原文 id 拼 `${id}.md`。实测 plan 模板与产物均为补零格式（task-01），常态能命中卡片；但 AI 若写出 `task-3` 则卡片 `task-03.md` 恒不命中，wave 级 no_deps_verify 豁免静默失效（保守方向）。
- 修复方向：提取后过 `normalizeTaskId`（taskcard.js 已有）。

---

## 二、性能（PERF）

### PERF-01【高✅已验证路径】task-review N+1：每个 task 起 5 个 git 子进程，其中 2 个结果恒同
- 位置：`src/task-review.js:393-490`（循环）、`:561-633`（verifyReviewGitEvidence）
- 问题：每 task 执行 `rev-parse --git-dir`（同 gitDir 恒同）、`status --porcelain`（恒同）、base/head 校验 ×2、diff ×1。实测 git spawn ≈16ms/次，20 task 的 plan ≈100 次 spawn ≈1.6s 纯开销。热路径：`gate execute`、`execute --done` 收尾——AI agent 高频调用。
- 优化：gitDir 探测与 status 提到循环外缓存；diff 按 (base,head) 去重缓存；base/head 批量 rev-parse。

### PERF-02【高】每条 stage 命令启动先做一次平台网络 pull，且 GET 在本地脏度判定之前
- 位置：`src/index.js:818-820、987-989`（triggerPullActiveChange）、`src/sync.js:815-895`
- 问题：连接平台的仓每条命令发 HTTP GET；pull 内网络 GET 在 skipIfLocalDirty 判定之前——即使随后跳过 import，网络往返已付。daemon 挂/慢时单命令最多阻塞 8s，agent 循环调用成倍放大。
- 优化：先读本地 last_local_modified_ts 判脏度，干净才发网络；或对自动注入点加节流（N 秒内已 pull 跳过）。

### PERF-03【高】启动 import 税：除 --version/help 外所有命令白付 progress.js→node:sqlite ≈72ms
- 位置：`src/index.js:172-173`
- 问题：main() 在早退后无条件 import progress.js 与 run/shared.js（拖 stages/execute、plan 等重链）。config / local detect / docs check / taskcard 等命令完全不用它们。代码注释自认该税但只优化了两个早退分支。实测 --version ≈92ms vs config ≈123ms。
- 优化：import 下沉到真正使用的 case 分支；didYouMean/assertSafeChangeName 拆轻模块。

### PERF-04【中】每条 run 命令额外 2 次 git spawn 做"祖先 .sillyspec 计数"提醒
- 位置：`src/run/command.js:350-356` → `src/run/shared.js:136-163`
- 问题：仅为一个多实例 warn，每次跑 2 个 git 子进程 + 逐级 existsSync 上溯；叠加 resolveEffectiveDir，子目录跑命令累计 4+ 次 git spawn。
- 优化：git root 结果按 cwd 进程内缓存；提醒首次后写 marker 跳过。

### PERF-05【中】docs-check 同文件反复读、行号计算 O(n²)、裸文件名引用全树遍历无缓存
- 位置：`src/docs-check.js:366、405-414、427-446、:82、135-167`
- 问题：每条引用 × 每个候选 readLines；失效引用再被 suggestLines 与 classifyFix 重读——同一文件单轮 3 次读；`md.slice(0,m.index).split(/\r?\n/)` 每命中拷贝前缀；findInTree 每条引用独立全树扫。热路径：docs check、quick --done 审计。
- 优化：Map<absPath,lines> 缓存；换行偏移数组二分；findInTree 按 baseName memo。

### PERF-06【中】progress dump() N+1 SQL：每 stage 单独查 steps
- 位置：`src/progress.js:1187-1190`
- 问题：循环内逐 stage `SELECT ... WHERE stage_id=?`；同类 read()（:283-287）已用 IN(...) 批量。dump 是 daemon 轮询消费接口。
- 优化：照抄 read() 的批量查询。

### PERF-07【中】docs-debt N+1：每模块 2-3 次 git spawn，execute 每步 prompt 渲染都跑
- 位置：`src/docs-debt.js:184-187 → 97-138`、`src/run/prompt.js:446-490`
- 问题：execute 阶段每次取下一步 prompt 都 computeDocsDebt：M 模块 × 2-3 git 子进程（5s 超时上限），再加每欠账模块跑一次 runDocsCheck。模块多时单次渲染秒级。
- 优化：按 (path-set) 进程内缓存；欠账事实按 change+HEAD 短期缓存。

### PERF-08【中】worktree create 内嵌阻塞 `git fetch origin`（60s 超时）
- 位置：`src/worktree.js:100`（computeBaseSync）、调用点 :505-506
- 问题：execute 标准前置每次 create 同步 fetch 远端（弱网最长 60s），只为落后/分叉提示。
- 优化：--no-tags + 降超时 5-10s；或基于 remote-tracking 判断后再 fetch。

### PERF-09【中】dashboard watcher：启动同步扫 HOME 级目录、事件无 debounce、未知路径触发全量重扫
- 位置：`packages/dashboard/server/watcher.js:47-90、:253-278`
- 优化：callback 加 200-500ms trailing debounce；rescanProjects 节流；扫描根收敛为白名单。

### PERF-10【中】同一进程重复打开同一个 sillyspec.db（多次 new ProgressManager）
- 位置：`src/sync.js:836、856、900`、`src/run/shared.js:519`、`src/machine-interface.js:118`
- 问题：连接平台的一条 stage 命令 open 3-4 次同一 db，每次跑 PRAGMA + schema 探测；多连接 + WAL 提升 SQLITE_BUSY 概率。
- 优化：DB 连接模块级 Map<dbPath, DB> 单例；或 pull 流程复用一个 pm 实例。

### PERF-11【低】sync.js _getPlatform 每次重读解析 local.yaml；auditQuickCompletion 重复读活文档；modules.js rebuildModuleMap O(n²)；quick 启动链固定 3 次 git spawn
- 位置：`src/sync.js:54-63`、`src/run/shared.js:916→921`、`src/modules.js:136`、`src/run/stage.js:257-298`
- 优化：按 cwd memoize；runDocsCheck 支持传入已读内容；先建 Map；共享 guard.json 已存值。

---

## 三、安全（SEC）

### SEC-01【高】local.yaml commands.install 经 shell 执行，来源含 agent 可写的 worktree 副本，绕过 worktree-guard
- 位置：`src/worktree-deps.js:136`（execSync(cmd)）、`:48-66`（提取+回退读 worktree 副本）
- 问题：agent 只需把 `install: "rm -rf ~ #"` 写进 worktree 内 local.yaml，run execute / doctor --fix 触发 provisionDeps 时由 CLI 本体经 shell 执行——项目自己的 hook 花大力气拦危险命令，此路径直接绕过。
- 修复：只信任主仓 specBase 的 local.yaml；数组形式执行或包管理器白名单前缀校验。

### SEC-02【中】verify-postcheck 三处 execSync 执行 local.yaml 的 test 命令（含跨仓副本）
- 位置：`src/verify-postcheck.js:341、707、808`
- 问题：跑测试本质是任意代码执行（npm test 亦然）故降为中危，但 shell 字符串使 yaml 中 `$(...)`/反引号/`;` 必然被解释，且来源含跨仓与 worktree 副本。
- 修复：同 SEC-01 口径收紧。

### SEC-03【中】dashboard 无鉴权，Origin 检查放行所有 localhost 端口，本机任意 web 页面可完整驱动 WS/HTTP API（含 cli:execute）
- 位置：`packages/dashboard/server/index.js:117-125、:289-298、:462-465`
- 问题：`isLocalOrigin` 对 localhost 任意端口放行且无 Origin 也放行；本机其他端口的页面（被攻陷的 dev server / 恶意 npm 包起的页面）可驱动 `sillyspec run --done`、读全部项目接口（ACAO 反射 origin）。
- 修复：启动生成一次性随机 token 写入 URL hash，WS/HTTP 校验；Origin 收紧为启动时登记的精确 origin+port。

### SEC-04【中】SyncManager 对 platform.url 无 https 校验，Bearer token 可明文上线；token 明文落 local.yaml 未收紧权限
- 位置：`src/sync.js:270-302、:417-419、:135-139`（对照 sillyhub-mcp/client.js:49-51 有警告）
- 问题：MCP 侧有非 https warn，sync 侧完全没有；`platform connect http://...` 后所有请求 Bearer 明文。token 写 local.yaml 默认权限。
- 修复：connect/_getPlatform 复用 https 检查（非 https 非 localhost 显式警告或 --allow-insecure）；写后 chmod 0600。

### SEC-05【低】platform sync/pull/resolve 的 changeName 未走 assertSafeChangeName，冲突文件名可路径穿越
- 位置：`src/index.js:1576-1577、1611-1613、1653-1657`、`src/sync.js:719/729/740/756`
- 问题：`join(runtimeDir, 'sync-conflict-' + changeName + '.json')`，`--change "..\\..\\x"` 可在 .runtime 外写/删 json。本地自伤型，危害低，但与 run 命令族守卫口径不一致。
- 修复：platform 子命令族入口统一 assertSafeChangeName 或文件名消毒。

### SEC-06【低】dashboard /api/docs/content 可读磁盘上任意 .sillyspec 树的文本文件；detail API 以任意路径为 cwd 跑 git
- 位置：`packages/dashboard/server/index.js:377-407、:319-321`、`packages/dashboard/server/parser.js:148-158`
- 问题：不限定在已发现项目列表内；`.runtime/platform-scan.json`、`sync-conflict-*.json` 等可读。叠加 SEC-03 无鉴权放大。
- 修复：path 必须位于 discoverProjects() 某项目内（isInside 校验）。

### SEC-07【低】local.yaml modules 块 path 无 ../ 校验，worktree 依赖供给可在 worktree 外创建 junction
- 位置：`src/worktree-deps.js:158-175、:259-264、:120-123`
- 修复：mp 拒绝绝对路径与 .. 段，resolve 后 isInside(worktreePath)；mklink 路径含 % 时拒绝。

### SEC-08【低】dashboard CLI 允许清单对值参数不校验且按空白拆词
- 位置：`packages/dashboard/server/index.js:19-41`、`packages/dashboard/server/executor.js:21`（process.execPath spawn 点）
- 问题：当前无 shell + assertSafeChangeName 兜底未构成注入，但双层侥幸：一旦有人给 executor 加 shell:true（Windows 下为让 npx.cmd 能跑这诱惑很大，见 BUG-11）即变 RCE。
- 修复：随 BUG-11 一并改为 process.execPath 数组形式 + 结构化 argv。

### SEC-09【低】ProgressManager 每次新建都打开 sqlite 连接且全链路不 close（兼资源泄漏）
- 位置：`src/sync.js` 11 处、`src/index.js:279/1025/1808`、`src/run/command.js:628`
- 问题：单次 platform sync 可开 2-5 个连接不关；Windows 残留句柄影响文件替换/清理；多连接提升 BUSY 概率。
- 修复：ProgressManager 加 close()，CLI 入口 finally 统一调；sync 内部复用单实例（与 PERF-10 同修）。

---

## 四、代码质量（QUAL）

### QUAL-01【P2】git 调用封装分裂为 4+ 套 + 10 处裸调用绕过收口
- 位置：`src/git-helper.js`（自称"收口为单一实现"）vs `src/stage-contract.js:567 gitTry()`（timeout 15s 无 safe.directory）、`src/task-review.js:521 runGit()`、`src/verify-postcheck.js:386/410`；裸调用：`src/worktree.js:1172/1360/1383`（讽刺：已 import git-helper 仍有 3 处裸调）、`worktree-apply.js:1204`、`modules.js:118`、`taskcard.js:133`、`init.js:642`、`setup.js:363/368`、`index.js:250`（execSync 字符串拼接，违反自家注入规约）。
- 修复：全部收口 git-helper，超时档位集中 constants.js。

### QUAL-02【P2】index.js main() 1991 行 god 函数（67 个 case）
- 位置：`src/index.js:158-2148`
- 问题：init/setup/progress/gate/docs/run/worktree/dispatch/platform/knowledge/dashboard 全部塞一个函数，每 case 内嵌二级 case + try/catch + 渲染。progress.js/run.js 都已做过 facade 拆分，index.js 是下一个明显目标。
- 修复：按子命令族拆分模块（对照 run/ 的拆法）。另：13 个 >1000 行文件、20+ 个 >150 行函数（worktree-apply applyWorktree 383 行、execute buildWavePrompt 349 行等），详见附表。

### QUAL-03【P2】porcelain 解析双实现 + normalizePath 双实现
- 位置：`src/run/shared.js:564 parsePorcelainPath()`（有单测）vs `src/task-review.js:532 parsePorcelainFiles()`（注释自认"对齐 shared.js"却内联重写）；`src/change-list.js:10` vs `src/endpoint-extractor.js:307` 同名 normalizePath。
- 修复：task-review 改调 shared 实现；normalizePath 收敛 constants 或 fs-atomic。

### QUAL-04【P3】postcheck 系列三份手写"severity 聚合 + 状态判定 + print 渲染"同构
- 位置：`src/scan-postcheck.js:360`、`src/verify-postcheck.js:924`、`src/stage-review.js:416`
- 问题：占位符检测已收敛 check-primitives.js，但聚合/渲染仍三份手写；scan-postcheck.js:48/266/273/313/367 直接用字符串字面量 'warning'/'failed' 绕过自己 import 的 CHECK_SEVERITY 枚举。
- 修复：渲染/聚合收敛公共 helper；字面量换枚举。

### QUAL-05【P3】阶段清单多处定义
- 位置：`src/constants.js:83 AUXILIARY_STAGES`、`src/progress/shared.js:7 VALID_STAGES/:22 STAGE_ORDER/:27 MAIN_FLOW_ORDER`、`src/stage-contract.js:670 mainFlowStages`
- 修复：单一来源 + 派生。

### QUAL-06【P3】魔法数字散落：git 超时三档 23 处硬编码；`.sillyspec` 字面量 30+ 处（SPEC_DIR_NAME 常量已存在）
- 位置：`src/constants.js` 缺 GIT_TIMEOUT_*；`src/init.js`（6 处）、`doctor-diagnostics.js`（8+ 处）等硬编码 join(cwd, '.sillyspec')。
- 修复：常量化收口。

### QUAL-07【P3】chalk 与裸 console 混用：全仓仅 3 文件用 chalk（init/migrate/setup），60+ 模块裸 console + emoji 手拼，chalk 还是硬依赖
- 修复：要么全面用 chalk 要么移除依赖统一风格。

### QUAL-08【P3】check-syntax.mjs 死导出检测两个盲区：不解析 `export { x as y }` 别名块；src/stages/ 与 scan-diff 整目录豁免
- 位置：`test/check-syntax.mjs:61、:70`
- 后果：`worktree-guard.js:284 _isSingleCommandReadonlyForTest`（零引用死导出）、`plan.js:6-12` 向后兼容 re-export（topoSortWaves 等）整块无消费者、`plan.js:539 buildPostcheckStep` 多余 export、`knowledge.js:477 cmdKnowledge` 内 5 个 cmd* 处理器多余 export 全部漏网。
- 修复：补别名块解析 + 收窄豁免；删除死导出。

### QUAL-09【P3】no_worktree 预留基础设施无写入入口（文档化死路）
- 位置：`src/db.js:237`、`src/progress.js:364-365/689-692`、`worktree-guard.js:296`、`stages/execute.js noWorktree 参数`
- 说明：known-implementation-gaps.md 明文记载"保留但无 CLI 写入入口"。
- 修复：集中 @reserved 登记或删除。

---

## 五、垃圾代码清理（CLEAN）

### CLEAN-01【确定该删】docs/sss.md（157 行）+ docs/sss1.md（145 行）
- AI 会话汇报原始 dump（首行即汇报格式开头语），个人笔记非文档；有价值结论已被 prompt-control-debt.md 收录。

### CLEAN-02【确定该删】scripts/ 空目录
- git ls-files 无任何文件，README 目录结构未提及。

### CLEAN-03【确定该删】仓库根 .sillyspec-platform-cleaned
- 本地 dogfood 运行残留（内容仅时间戳），已被 gitignore，仅本地垃圾。

### CLEAN-04【建议移走】.npm-publish-token 明文放仓库根
- git/npm 双 ignore 未泄漏，但建议移出仓库目录或轮换。

### CLEAN-05【需确认】packages/dashboard/dist/ 带内容哈希的 Vite 构建产物已入 git
- npm 包需要 dist（运行时依赖），但 git 里每次重建产生无意义 diff；建议 CI 构建产出、git 移除。

### CLEAN-06【需确认】docs/prompt/_analyze.mjs 一次性分析脚本
- 同目录 _extract/_verify/_build-site 是再生成工具链，_analyze 是 throwaway。

### CLEAN-07【需确认】docs/sillyspec/ 下 8+ 份带日期历史审查快照（review-2026-08-08/09、self-audit-2026-08-07/16 等）
- file:line 必然过时，建议移 archive/ 子目录或加"历史快照"声明。

### CLEAN-08【需确认】.sillyspec/ dogfood 目录 736 文件入库
- 有意 dogfood 存档 vs 仓库膨胀取舍，非错误。

---

## 六、SillyHub 契合度（HUB）

### HUB-01【P1】（即 BUG-01）平台模式 spec 树同步锚点不统一，可清空服务器文件。见上文。

### HUB-02【P1✅已验证】platform connect 缺 --token 时仍落盘 `token: "undefined"` 并报"连接成功"
- 位置：`src/index.js:1548-1560`、`src/sync.js:270-328`
- 问题：index.js 只打一行"TODO: task-11 交互式输入"警告后照常 connect；health ping（无鉴权）成功即打印连接成功；yamlStr 把 undefined 序列化成字符串 "undefined" 写入 local.yaml，后续所有同步带 `Bearer undefined` 持续 401。
- 修复：缺 token 直接报错退出；connect 对 falsy token 防御。

### HUB-03【高】协议文档字段名与代码相反：文档让 Hub 读 scan_post_check.overall_status，代码写的是 status
- 位置：`docs/platform-scan-protocol.md:280` vs `src/run/complete-handlers.js:1376-1379`
- 问题：同文档 :86 又写 status（自相矛盾）。按 :280 实现的 SillyHub 读到 undefined。另 postcheck-result.json 结构漂移：文档写顶层 status/source_root_leak/docs_missing/profile 与 severity failed|warning，代码实际输出 overall_status/summary/schema_version 且把 failed 重映射成 critical（scan-postcheck.js:240-266）——两端枚举对调错位。
- 修复：以代码为准重写协议文档该节；加契约测试锁字段名。

### HUB-04【高】postcheck-result.json 平台模式落盘位置与协议文档不符
- 位置：`docs/platform-scan-protocol.md:51、:194` vs `src/scan-postcheck.js:333-341`
- 问题：文档说平台模式写 `<spec_root>/.runtime/postcheck-result.json`，代码实际写 `<runtime_root>/scan-runs/<scan_run_id>/postcheck-result.json`。
- 修复：更新文档目录结构节。

### HUB-05【高】指针 scan_completed 状态在下一次 run 即被抹掉，STALE 清理路径不可达
- 位置：`src/run/complete-handlers.js:1383-1393` vs `src/run/command.js:337-339`、`src/run/shared.js:337-361`
- 问题：任何平台模式 runCommand（含只读 --status）都先 writePlatformPointer，恢复链不回填 status/completedAt/scanScanStatus → 指针永远回 active；isPointerStale 恒 false → `platform pointer --cleanup` STALE 分支死路。与协议文档生命周期表及 file-lifecycle.md:93 直接矛盾。测试只断言 specRoot/workspaceId 保持，未覆盖 status。
- 修复：writePlatformPointer 合并保留既有 status 字段；补回归测试。

### HUB-06【高】runDocsCheck 三处直调点仍未传 crossRepoRoots（e347394 只补了 CLI docs check 一处）
- 位置：`src/docs-debt.js:215`、`src/run/shared.js:889、:921`
- 问题：模块卡内联失效引用检查、quick 完成审计 docsCheckHint、活文档漂移审计（DEFAULT_LIVING_DOC=platform-interface-map.md，正是最可能写 repo:// 的文档）三条链路 repo:// 引用恒跳过。当前 docs/ 尚无 repo:// 引用所以是潜伏缺口。
- 修复：三处统一 readDocsCheckConfig 后传 crossRepoRoots；或收成 helper 消灭直调点。

### HUB-07【中】审批门控 fail-open：断网/非 JSON 时 unknown 状态放行 execute
- 位置：`src/sync.js:662-665`、`src/run/stage.js:47-58`
- 问题：checkApproval 失败返回 unknown；stage.js 只拦 rejected/pending，unknown 落空放行。团队审批语义下网络故障即绕过审批，与"降级只收紧不放松"铁律相反（显式 --skip-approval 逃生口存在）。
- 修复：unknown 至少醒目 warn + 记 QUICKLOG；或提供 fail-closed 配置。

### HUB-08【中】spec 树同步 conflict 无闭环
- 位置：`src/spec-sync.js:303-307`
- 问题：body.conflict 只 warn 返回，无 conflict 文件/resolve 命令，下次 sync 同 base_version 继续冲突循环。
- 修复：接入 sync-conflict 文件 + platform resolve。

### HUB-09【中】8s 总熔断短于单请求超时（progress POST 10s / spec-sync POST 30s）
- 位置：`src/run/shared.js:414` vs `src/sync.js:30`、`src/spec-sync.js:260/296`
- 问题：--done 路径上请求可能在熔断后被放弃而平台实际已接受（进度有 base_ts 自愈兜底，spec 树推送无兜底）。
- 修复：熔断 ≥ 最大单请求超时，或熔断时传 signal 中断请求。

### HUB-10【中】sync.js 内嵌 syncModule() CLI 分发是死代码且帮助文案与 index.js 分叉
- 位置：`src/sync.js:1240-1308`
- 问题：全仓无调用；其参数形态（位置参数 token）、子命令面（缺 pull/resolve/pointer/approve）与 index.js 实际不一致，误导维护者改错地方。
- 修复：删除（与 CLEAN 精神一致）。

### HUB-11【中】MCP session 过期识别只覆盖 HTTP 400 形态，不覆盖 JSON-RPC error.code -32600
- 位置：`src/sillyhub-mcp/client.js:172-178` vs `docs/sillyspec/sillyhub-api-reference.md:173`
- 修复：rpc.error.code === -32600 且 message 含 Missing session 时同样返回哨兵触发重连。

### HUB-12【低】其余：probe 链路重复 RPC 无总超时（probe.js:113-189，最坏 ~50s）；MCP client 无 close()/DELETE 收尾；killLease 恒 killed:false（跨仓开放项）；disconnect 三清不含 .sillyspec-platform-cleaned；双入口 fail-closed 可被 cwd 纠正绕过（嵌套项目）；冲突横幅硬编码 .sillyspec/.runtime 路径（平台模式找不到文件）；spec-sync 两端点（GET/POST spec-manifest、spec-sync）未入 API 文档；POST progress 响应 last_pushed_at 未记载；connect --token 解析用全局 args indexOf；platform sync 无 --change 时只 warn 计错与帮助"可选"表述矛盾。

### HUB-13【中】平台文档漂移汇总
- `docs/sillyspec/platform-interface-map.md:132`："run 流程不自动推文档"与现状相反（f976466 起自动链推）；`sync.js:33-35` 头注释同样过时。
- `platform-interface-map.md:68/:72`：documents/approval 端点"未实现（404/405）"与同日 api-verification"已实测 ✅"直接打架（map 留的是修复前旧结论）。
- `file-lifecycle/platform-workflows-sync.md`：manifest 位置、runtime 路径、命令清单、自动 sync 接线签名多处 drift。
- `sillyhub-path-a-contract.md:41/:72/:82`：client.js 行号漂移（3e6a78c 重构后）。

---

## 七、文档漂移（DOC，独立于上面）

### DOC-01【确定】README.md:141 "SQLite（sql.js WASM）" vs README.md:60 "node:sqlite" 自相矛盾；:61 "纯 JS" 不精确（node:sqlite 是原生绑定，免编译但非纯 JS）。
### DOC-02【确定】README.md:136 "gate-status + progress.db 双轨记录状态"——gate-status.json 已废除（worktree-guard.js:8、architecture-4a.md:145 明确记载唯一来源是 sillyspec.db）。CLAUDE.md:96 示例同样过时。
### DOC-03【确定】README.md:178 目录结构 "src/run.js 阶段状态机引擎"——run.js 已退化为 23 行 barrel，实际逻辑在 src/run/；未提 src/dispatch/、src/sillyhub-mcp/。
### DOC-04【确定】SKILL.md：提 grep.app（setup.js 无此工具，实有 context7/chrome-devtools/pinchtab）；缺 /sillyspec:knowledge、/sillyspec:state；兼容工具列表缺 Gemini（VALID_TOOLS 含 gemini）。
### DOC-05【确定】CLAUDE.md:33 "已发布 npm（当前 3.26.9）"——实际 3.26.12，版本号手写必腐。
### DOC-06【确定】docs 内 file:line 引用局部漂移：prompt-control-debt.md:267/270（index.js:464→569、:426→520；task-review.js:512-562→561）；architecture-4a.md:183（worktree-apply.js:427→40）。注意：src/docs-check.js 已实现 file:line 校验但 docs/ 自身源码引用不在校验范围（自扫盲区）。
### DOC-07【确定】index.js:1558 功能未实现的 TODO 借 console.error 常驻用户可见输出（`TODO: task-11`，与 HUB-02 相关）。

---

## 八、修复批次建议

| 批次 | 内容 | 风险 |
|---|---|---|
| 批次1（数据安全+崩溃） | BUG-01/HUB-01（全删护栏）、BUG-02（偷锁原子化）、BUG-05/06/12/15（崩溃类）、HUB-02（token undefined） | 小改动高收益 |
| 批次2（Windows+泄漏） | BUG-07/08/09/10/11、BUG-13/14、SEC-05 | 平台相关，需 Windows 实测 |
| 批次3（安全收紧） | SEC-01/02（shell 执行收口）、SEC-03（dashboard 鉴权）、SEC-04（https 校验）、SEC-06/07/08 | 涉及行为变化，需过测试 |
| 批次4（性能） | PERF-01/02/03（热路径）、PERF-05/06/10 | 重构类，逐项带基准 |
| 批次5（质量+清理+文档） | QUAL-01 收口、CLEAN-01/02/03、DOC-01~05、HUB-03/04/13 文档同步 | 低风险机械活 |

## 附表：>1000 行文件（13 个）

index.js 2162 · worktree.js 1481 · run/complete-handlers.js 1438 · run/command.js 1385 · stages/plan-postcheck.js 1310 · sync.js 1309 · run/shared.js 1268 · progress.js 1243 · worktree-apply.js 1238 · verify-postcheck.js 1186 · task-review.js 1159 · run/complete.js 1155 · stages/execute.js 1003

>1000 行之外的主要超长函数：main() 1991（index.js）、runCommand() 854、outputStep() 610、runStage() 387、applyWorktree() 383、buildWavePrompt() 349 等 20+ 个。
