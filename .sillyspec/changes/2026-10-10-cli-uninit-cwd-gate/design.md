---
author: flow-machine-draft
created_at: 2026-10-10T01:27:30.829Z
---
# 设计记录（Design Record）— 2026-10-10-cli-uninit-cwd-gate

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

CLI 入口（src/index.js main()）在 worktree cwd 硬拦之后、命令分发（switch）之前插入统一判定门：`resolveUninitCwdGate(command, { dir, specDir, platformFlags })`（新增于 src/run/shared.js，紧邻姊妹守卫 detectCwdInsideWorktree）。判定复用 `resolveSpecDir` 全套守卫（home 拒绝 / tmp 边界 / `.runtime` 回环防护）做祖先链查找——不重写遍历，已修复坑不回归；平台 pointer（.sillyspec-platform.json）与接管声明（.sillyspec-platform-managed）在目标目录存在、或显式 --spec-dir / --workspace-id / --runtime-root / --spec-root 给出时判 skip（显式意图与平台模式的 spec 解析及专门 fail-closed 错误面归命令自身，本门不遮蔽；--spec-root 是平台首扫形态——spec 恒在仓外、目录尚无 pointer）。16 个按设计可在未初始化目录运行的命令（init/scan/doctor/status/progress/next/workspace/setup/knowledge/local/config/mcp/dashboard/platform/wt-commit/agent-log，每项豁免依据注释在清单处）判 exempt。其余命令全链未命中 → exit 2 硬拦，文案含目标目录、git root（safeGit rev-parse；未初始化目录无 ground truth，只给锚点+三条出路，不断言唯一 cwd）。命中祖先链且 cwd 非 spec 根时把入口 `dir` 重锚定到 spec 根父目录并打一行提示——修裸 `join(dir,'.sillyspec')` 调用点（review status rsSpecBase 等）的子目录漂移；resolveEffectiveDir 系本就上溯，退化为无操作。linked worktree 兜底：祖先链 miss 后按 resolveEffectiveDir P1-1 同款判据（--git-dir ≠ --git-common-dir 且非 submodule）探主仓——主仓有 .sillyspec 则放行且 anchor=null（主仓 spec 不在 cwd 祖先链上，重锚定会打断 endpoints baseline 等命令层自有的主仓锚定逻辑）。

选入口统一门而非逐命令补检查：散点 fail-soft 是根因（实测 status 提示可开变更、flow start 到 local.yaml 才报错、knowledge 只报参数错），入口一次判定把错误尽早、统一、带指引地暴露；仓库已有同款模板（worktree cwd 硬拦：入口拦截 + 逃生门 + 一键整行指引 + exit 2），本门即其姊妹件。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增导出：`src/run/shared.js` → `UNINIT_CWD_GATE_EXEMPT: Set<string>`（16 命令豁免清单）、`resolveUninitCwdGate(command, { dir?, specDir?, platformFlags? })` → `{ verdict: 'exempt' } | { verdict: 'skip' } | { verdict: 'pass', anchor } | { verdict: 'block', gitRoot }`（纯判定、无副作用，测试直测）。
- `src/index.js`：`dir` 由 const 改 let（重锚定）；新增入口门消费四态——block → exit 2（stderr 四行：判定说明/性质/三条修复指引/豁免面说明）；pass 且 anchor≠dir → 打印锚定提示并重锚定。
- CLI 参数面/文件格式：无变化。
- 对外可见行为变化：非豁免命令在未初始化目录由「各命令散点 fail-soft」变为「入口统一 exit 2 + 指引」；子目录运行非豁免命令时 stdout 多一行锚定提示、spec 读取统一落项目根。豁免命令、平台模式、显式 flag 路径行为零变化。

文件变更清单（本变更自声明交付面）：

- 实现：src/run/shared.js（判定函数+豁免清单）、src/index.js（入口门+重锚定+--spec-root skip）
- 新增测试：test/uninit-cwd-gate.test.mjs
- fixture 同步（保用例意图补 .sillyspec 预置或显式 flag）：test/auto-driver-meta、test/backlog-batch-d、test/change-name-date-gate、test/cli-top-level-aliases、test/docs-check-cli、test/docs-check-fix、test/flow-draft、test/flow-status-json、test/fourpiece-init、test/quick-four-flags、test/quick-linked-change-existence-guard、test/quick-msys-path-sniff、test/quick-prompt-path-rule、test/quick-retired（含 R5 版本锚 3.32.4 补同步——af6fd5ac 版本面遗漏）、test/review-status-command、test/task-progress-marker、test/watcher-alerts、test/platform-managed-declaration、test/doc-ref-check（经文档锚平移修复）
- 文档锚同步：docs/sillyspec/platform-interface-map.md（shared.js +75 / index.js +29 行号平移）
- 流程工件：.sillyspec/changes/2026-10-10-cli-uninit-cwd-gate/ 全部

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。本门是每次 CLI 调用入口的同步判定，无跨调用状态、无事件顺序依赖；多 agent 并行时各自调用各自判定，结果只取决于当时磁盘上 .sillyspec/pointer 的存在性（与既有 resolveSpecDir 语义同源），无乱序面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   判定只读（existsSync ×3 + 一次 safeGit rev-parse）。与并行会话的 init/scan 写 .sillyspec 竞争时，最坏形态是窗口期内 exempt/block 一念之差的抖动——与既有 resolveEffectiveDir/resolveSpecDir 的同类窗口一致，不引入新写点。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。判定无落盘、无半态，中途 kill 不留状态；重锚定只改本次进程内 `dir` 变量，不写环境/不改 shell cwd（提示行正是为暴露这一差异）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会新增串台。monorepo 多实例时 anchor 取「最近」实例（与 resolveSpecDir 既有语义一致），runCommand 内既有的多实例硬拦（ancestorSpecDirs≥2 且非 git 根实例）不因重锚定哑火；worktree 场景由更具体的 worktree cwd 硬拦先行（本门在其后），wt-commit 豁免不受重锚定影响；平台模式整类 skip，不存在「dir 里没 .sillyspec 而误拦平台项目」的串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：豁免清单漏项/多项——漏项误拦合法命令（agent 被 exit 2 打断），多项放走本该拦的命令（回到静默错答）。缓解：清单每项注释豁免依据，测试抽样锁定两侧（豁免面与非豁免面各一组断言），后续增删走清单单一真相源。次风险：重锚定改变个别命令对 cwd 的隐式依赖（相对路径参数按 cwd 解析的命令）——全量套件回归无此类失败，锚定提示行让差异可见。已试并放弃：① 判据用「cwd 本身含 .sillyspec」——拦掉设计支持的子目录运行（ancestorSpecDirs 注释明证），误伤面大；② 拦 init（已初始化目录禁 init）——重跑 init 是模板/skills 升级路径（AGENTS.md「重跑 init 同版本不更新」），拦截打断升级；③ 逐命令补「未初始化」检查——散点维护、报错时机晚且文案不一，正是要治的根因；④ 门内重写祖先遍历——丢 home/tmp/.runtime 守卫会复辟 2026-09-27-spec-sync-413 等已修复坑，改为复用 resolveSpecDir。
