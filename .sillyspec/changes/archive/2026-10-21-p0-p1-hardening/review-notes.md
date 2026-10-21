# Review 补充材料 — 2026-10-21-p0-p1-hardening（review.json 的展开作答）

评审者：subagent（agent-tool 通道）；基准 HEAD 2cbe778e；range 7324768c9b..2cbe778e 中带本变更标记的提交（并行会话 d61be3b2/6365590b/4c301365 未审）。

## 一、检查单逐条作答

### 1. FR↔实现↔测试三方一致

- **FR-01（回归锚）**：两锚文件在场且真覆盖五项能力——getWorkerResult answer 透传（sillyhub-mcp-platform-fixes.test.mjs:142）、三通道提取（review-dispatch.test.mjs:270 answer 平衡 JSON 扫描 + :84 artifacts 双通道）、worker-answer.md 终态原文（:330 --salvage 落盘）、salvage/--from 两步出口文案（:313）、任务书 ```json 块兜底（:283）。本变更未重复实现，与 requirements FR-01 的「禁止重复实现」核码事实一致。**一致**。
- **FR-02**：restoreMainStash 三分支（栈顶非本条目→`{conflictFiles:[]}`、恢复失败→failConflicts 补报且条目保留、恢复成功→扫描命中不 drop 返回清单）；applyWorktree finally 把 conflictMarkerFiles 推入 result.errors（src/worktree-apply.js:2262-2274），result.errors 恒初始化为 []（:1347）且函数体内全部 return 走同一 result 引用，CLI 消费面 `result.errors.length>0 → process.exit(1)`（src/index.js:3827）。干净恢复零新增输出零行为变化。测试 U1/I1/I2/I3 用真 git 仓验证四场景。**一致**。
- **FR-03**：withDoneHeartbeat（completeStep/completeStepBurst 外层薄 wrapper，内层改名 _Inner，签名不变）；stderr（console.error）、60s 缺省 interval、unref+finally clearInterval、options.heartbeat?.intervalMs 测试注入。run/command.js 四处调用点零改动即获心跳。测试 H1/H2/H3 覆盖快路径零输出/慢路径≥2 行含旁路核对建议/异常透传+清理。requirements 已显式把「同步后台化」收窄为回归保持（既有 triggerSync→bg-sync 不动，FR-08 的 spawn-settle 反而加固该链）。**一致**。
- **FR-04**：machine-interface.js 两处条件（--full 档 :458、默认档 :531）均从 execute 单值改三值集合；文案 `${stage} --done` 参数化。gates.js:1550 Stage Review Gate 实拦 `['brainstorm','plan','execute']` ——逐字一致，verify 双侧排除。renderStageReviewerTaskbook（stage-review.js:793,884）经 printStageReviewResult 在门输出在场（gates.js:1604 消费）——回归锚部分属实。测试 H1c/H2b（新增）+H1b（verify 排除回归）。**一致**。
- **FR-05**：change-registry.js:325-329 新分支三条件（owner anon@ 前缀 / selfSession 显式非 anon / owner===`anon@${hostname()}` 逐字）→ action=takeover-anon-upgrade；跨机匿名与他人显式持有落入既有新鲜度判定照旧拦。消费侧全部 `check.action !== 'self'` 判定（index.js:3685、command.js:1521、complete-handlers.js:1221/2620/3396）零改动消费新 action 重写 owner——无 action 字符串精确匹配分支可漏。handoff.js:167-170 预告行在「交接块结束」标记前。测试⑧五场景 + T1/T2。**一致**。
- **FR-06**：checkWorktreeDirIgnored 三态（git-helper git() 抛错带数字 status=判定 exit 1→false；无 status=spawn 故障→throw→重试一次→仍败 `{ignored:null,probeError,retried}`）；调用方 `ignored===false` 照旧阻断、`ignored===null` 仅 console.warn 放行（worktree.js:753-770）。测试 G1-G4（含 G4 判定结果不重试）。**一致**。
- **FR-07**：doctor local_yaml_integrity 维度（无文件合法零 finding/不可读 finding/BOM finding/坏 YAML finding+safe_action）入 dimensions 数组（doctor-diagnostics.js:1663-1666）；config-known-failures 纯逻辑核（块式/流式/无段三形态解析、行级手术段外逐字节保留、jsYaml 全文可解析门拒改、writeAtomicSync 原子写 utf8 无 BOM）；index.js:5437-5451 子命令接线（filteredArgs 对位正确、json 全局 flag 在作用域、didYouMean 建议表扩）。测试 D1-D4 + P1-P5。**一致**。
- **FR-08**：awaitSpawnSettled（spawn/error 事件即 resolve、timeoutMs=150 兜底 unref、已退出 exitCode/signalCode 立即返回、非法入参不抛、监听器清理）；watcher.js:907-910 与 bg-sync.js:185-188 spawn 后消费。测试 S1-S5。**一致**。
- **FR-09**：绑定登记的 9 个测试文件全部在场且抽验复跑全绿（见下）。

### 2. 盲维四问真实性（对照 diff 核验）

- **乱序：ok 属实**。扫描随 restoreMainStash 尾部单点执行且 applyWorktree finally 全覆盖（所有 return 均同一 result 引用，中途 return 恢复照跑）；gitignore 重试以最后一次为准（G3）；心跳任意 return/throw 均 finally clearInterval（H3）；awaitSpawnSettled 已退出 child 立即返回（S4）。设计假设成立。
- **并发：ok 属实**。known-failures 走 writeAtomicSync（tmp+renameSyncRetry，Windows EPERM 重试；fs-atomic.js:74-93）；anon 升级维持判定/写分离（消费在锁内，worktree apply 走 withMainRepoLock）；扫描只读；探测失败不落状态。后写覆盖先写为 local.yaml 既有共同语义（platform connect 同）。
- **切换：ok 属实**。命中标记 stash 条目必保留（I2/I3 断言 rev-parse 仍在）；interval unref+finally clear；tmp+rename 失败原文件不动（P4 坏文件拒改后逐字节不变断言）；check-ignore 只读无副作用。
- **作用域：ok 属实**（一处措辞精度见 findings P3-3）。扫描限定 `git stash show --name-only stash@{0}` 面不扫全仓；行首三形态锚定（`<{7} `/`={7}$`/`>{7} `）缩进/行中不触发（U1）；known-failures 走 resolveLocalYaml 既有链含 home 拒绝守卫；anon 升级 hostname 逐字比对；心跳走 stderr。

### 3. 披露边界显式裁决（逐条）

| # | 声明边界 | 裁决 | 理由 |
|---|---|---|---|
| 1 | 心跳走 stderr 非 stdout（design 风险①） | 可接受 | stdout envelope 纯净保 --json 消费方；pwsh stderr 包装噪声为既有环境问题且仅 >60s 慢路径出现 |
| 2 | 冲突扫描限定 stash 面文件+行首三形态（盲维4/风险②） | 可接受 | 误报面收敛到恢复刚触碰文件；`={7}$` 对文档 setext 下划线有理论误报，但 fail-closed（stash 保留+指引+可人工解除），方向安全 |
| 3 | anon 升级仅同主机（盲维4/风险③） | 可接受 | 匿名占位本就机器级只拦他机；同机显式身份严格更具体，不弱于既有隔离（跨机/他人显式仍拦，测试⑧场景 2/4 断言） |
| 4 | verify 维持不产 hint（FR-04） | 可接受 | register 枚举无 verify、门不存在——提示命令不可执行+指称不存在的门双重误导（2026-10-11 既有裁决回归保持） |
| 5 | handoff 弃原子转移、改粘贴块 --takeover 预告（FR-05①/风险③） | 可接受 | requirement 本身以「或显式预告」OR 形式给出；与「SESSION_ID 是所有权标识」既有契约一致；--takeover 在 run 侧（command.js:761,1534）与 worktree 侧均真实可用 |
| 6 | FR-03 不重构同步链（既有后台化回归保持） | 可接受 | requirement 显式收窄；背景化既有（triggerSync→detached bg-sync），可观测性缺口由心跳补 |
| 7 | FR-08 best-effort 150ms 缓解不强求根除（Node 运行时缺陷） | 可接受 | 永不 reject、unref、已退出零等待，对命令功能零影响（S1-S5） |
| 8 | known_failures 块式段内注释手术时重写丢弃（代码注释声明） | 可接受 | requirement 场景文字即「除 known_failures 段外逐字节保持」；段内注释罕见，与承诺一致 |
| 9 | FR-01/FR-04 模板部分/FR-05③ --session 为回归锚不重复交付 | 可接受 | 逐项核实在场：五项能力锚测试存在且绿；renderStageReviewerTaskbook 在门输出消费链；--session 三级解析接线在场（command.js:890,914） |
| 10 | 未跟踪文件不在冲突扫描面（stash show 只列 tracked；代码注释声明） | 可接受 | 未跟踪恢复冲突走 already exists 报错路径非标记形态，恢复失败分支仍兜底扫描+指引 |

无「未裁决」残留。

### 4. 防护声明核验

- 「调用方既有 setChangeOwner 重写留痕零改动消费」——核实四消费点全为 `!== 'self'` 判定，无精确字符串分支漏新 action。
- 「SHA 兜底既有语义保持」——命中/失败分支均不 drop，I2/I3 断言 stash@{0} 仍可 rev-parse。
- 「干净恢复照常 drop 零扰动」——I1 断言 drop 发生+conflictFiles 空。
- 「检测门 fail-open 不阻断主流程」——doctor 维度只读 findings/safe_actions 不修文件；known-failures 拒改时文件逐字节不变（P4）。

### 5. 生成物同步

_module-map.yaml 已补录 src/config-known-failures.js（:57）与 src/spawn-settle.js（:226）；docs 5 文件重锚 diff 仅为行号漂移修正（e0f21fae/2cbe778e 拆单行自声明）。接口契约声明的导出（restoreMainStash/scanConflictMarkers/withDoneHeartbeat/awaitSpawnSettled/config-known-failures 三函数/checkWorktreeDirIgnored 新返回形态）逐一对上。

## 二、项目评审探针作答

- **cli-copy-selfsufficient（文案自足）**：逐面核过——①restoreMainStash 处置指引：git stash list/apply/drop/add/checkout 均真实命令，result.errors 内嵌完整文件清单+处置路径（状态/原因/修复一次给全，「处置明细见上方恢复输出」且上方确有清单）；②checkWorktreeDirIgnored 警告：`git check-ignore -q .sillyspec/.runtime/worktrees`（真实路径常量 WORKTREES_REL）+ .gitignore 补写指引；③doctor finding：node -e BOM 剥离一行命令语法正确（模板串转义后输出 `\uFEFF` 正则字面量）、known-failures 管理指引命令真实；④config known-failures 用法行与实现动词/参数面一致（list/add/remove、--json、退出码 1/2 语义有 P5 断言）；⑤心跳行 `sillyspec flow status / progress show` 两命令均存在（index.js:5053/525）；⑥handoff 预告行 --takeover 在 run 侧（command.js:761 注册透传、:1534 forced 消费）与 worktree apply/cleanup 侧（index.js:3721/3726）真实可用。未发现拼写错位或依赖二跑定位的报错。**过**。
- **cli-copy-selfsufficient（文案与门判定一致）**：machine-interface hint 文案称「Stage Review Gate 会拦」的三阶段集合（默认档 :531 与 --full 档 :458 两处条件）= execute||brainstorm||plan，与 gates.js:1550 `['brainstorm','plan','execute'].includes(stageName)` 逐字一致；gitignore 警告「按已忽略继续」真对应 `ignored===null` 分支只 console.warn 不 throw（worktree.js:764-770），创建继续；「真未忽略照旧拦」对应 `ignored===false` 分支 throw 不变。**过**。
- **config-absent-zero-regression**：doctor 维度无文件（D1）/坏 YAML（D3）/BOM（D4）三态有断言，坏文件不炸 doctor 主流程（维度独立 findings 通道）；config known-failures 缺文件（P5 exit 1）/坏 YAML 拒改（P3 纯函数+P4 文件级）有断言。第三态「读取失败」（权限/占用）fail-soft 分支已实现但无断言——按探针字母口径为覆盖缺口，记 P3（见 findings）。**过（带 P3）**。
- **crossrepo-path-compat**：checkWorktreeDirIgnored 传相对正斜杠常量给 git 参数（git 内部归一，跨平台安全）；scanConflictMarkers 的 `join(projectRoot, f)`（f 来自 git stash show 正斜杠输出）在 Windows 下 readFileSync 接受混合分隔符——且本机即 Windows，G1/I2/I3 走真 git 仓实跑全绿是直接实证。**过**。

## 三、复跑口径对账

ledger 回执称变更测试面 115 文件全绿 211s（2026-10-21T14:26:47Z）。本次抽验 11 关键文件一次合并跑（9 新增/扩展 + 2 回归锚）：**75 用例 0 失败，16.1s**，日志 `.sillyspec/.runtime/logs/review-p0p1-spotcheck.log`。与回执不矛盾（未全量重跑，按口径抽样）。

## 四、范围备注

冻结 change-patch.json 含 src/runtime-paths.js、src/spec-sync.js、test/runtime-relayout.test.mjs、test/spec-sync-manifest-cache.test.mjs 等文件——系冻结工具按「baseline..HEAD 提交面」政策吸入并行会话（protocol-tax/cli-manifest-since-cache）交付面，patch note 已自声明该政策，非本变更缺陷；本次按指令只审带本变更标记的提交。
