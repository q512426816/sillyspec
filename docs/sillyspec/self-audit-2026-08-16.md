---
author: qinyi
created_at: 2026-08-16 14:45:00
updated_at: 2026-08-16 14:45:00
---

# SillySpec 自身缺陷五角度审计（2026-08-16）

> 方法：5 个并行只读审计代理（agent 驾驭 / CLI 机器接口 / 新项目上手与人类体验 / 性能与架构 / prompt 工程合理性），全部对照 prompt-control-debt.md + doc-consistency-debt.md + troubleshooting.md 逐条去重后合并。主会话对每条头部发现亲验代码锚点。基线：npm test 全量 EXIT=0（dcee1e1 干净基线）。
> 各条目修法裁决与推进记录维护在 prompt-control-debt.md（2026-08-16 增补节）。

## 发现汇总（按严重度）

### A. 功能损坏级（P0）

1. **engines `>=22.11.0` 虚低 + db.js 静态闭包 → Node 22.11/22.12 全 CLI 崩溃（含 --version）**
   `package.json:16` engines 写 `>=22.11.0`，`src/db-engine.js:5` 注释断言「v22.11.0+ 无需 flag」错误——Node 官方 v22.13.0 才解除 `--experimental-sqlite` flag；且 db.js 在 index.js 静态 import 闭包内（性能发现 2），import 即崩。修法：engines 抬 `>=22.13.0` + 修注释。【性能#1，已亲验】
2. **Windows 下 `runPostCheck` 占位符替换炸 JSON → scan 质量门 fail-open + `workflow check` 崩**
   `src/workflow.js:258-260`：`JSON.stringify` 后用 `new RegExp('{SPEC_ROOT}')` 把含反斜杠的 Windows 路径裸替换进 JSON 再 parse；`complete-handlers.js:617-704` catch 吞错放行。实测 `workflow check` 报「Bad escaped character」，scan 深度扫描门静默失效。【上手#1，已亲验】
3. **dashboard 在 Windows 永不启动**：`packages/dashboard/server/index.js:567-580` listen 排在同步全盘扫描后（homedir/Temp/桌面，深度 2 readdirSync），每项目 3 次 execSync('git') stderr 裸刷。实测 150s+ 假死。【上手#2】
4. **gate/derive 的 specBase 只对一半路径生效——平台模式机器门控不可用**
   `src/machine-interface.js:114-136`：runGate 守卫与 pm.read 用 `resolveSpecDir(cwd)`，planContent/changeDir 用传入 specBase——同一 envelope 两套事实源混拼；daemon 平台模式调 gate 恒 exit 2「无法核验」。index.js gate/derive case 也不读平台指针（对比 runCommand :290-313）。与 JSDoc/platform-interface-map.md 宣称矛盾。【CLI#1，已亲验】
5. **`--done` 阶段产物 gate 失败只打 ❌ 但 exit 0**：`src/run/complete.js:328-329` gate 早退 return 不设 process.exitCode，实测三次 exit 0；与 quick 审计 blocked→exit 1 同仓惯例分裂。agent/CI/hook 按 exit code 消费即 fail-open。【上手#6，已亲验代码路径】

### B. 状态机与守卫 fail-open（P1）

6. **`--done` 完全绕过阶段转换守卫 + 辅助阶段污染 currentStage**：`command.js:897` --done 直接进 `completeStep` 不查 checkTransition（stage.js:27-44 `checkTransition` 只在 runStage 调）；status/doctor 等 auxiliary 跑一次即写 `progress.currentStage`（stage.js:204 写库）→ fromStage 变 status 后跳阶段静默放行（stage-contract.js:810-848 `AUXILIARY_STAGES` 一律放行）。代理实测：brainstorm 仓跑 `run verify --done` 输出「Step 2/7 完成」无拦截。【驾驭#1，已亲验】
7. **status/doctor 自称只读实则写库**：`command.js:799` auxiliary fallback `initChange` 建 default 行 + 落盘 currentStage；与 SKILL「status 只读」矛盾；多 agent 并发 lastActive 互相覆盖。【驾驭#2，已亲验】
8. **`run brainstorm` 无 --change 在多活跃变更仓静默建幽灵变更**：`command.js:717-731` 无条件 initChange。DB 实锤：08-15 一小时内 4 个 `*-new-change-*` 活跃行。审计代理自身触发一次（已精确清理 2026-08-16-new-change-6307433e）。【驾驭#3，已亲验】
8b. **新项目首跑 auxiliary 即产生幽灵 default 变更 + doctor 清理指引落空**：`_ensureChangeDir`（progress.js:227）建空 `changes/default/`；单变更视图（_showChange）无 dirMissing 警告，仅多变更视图有（stage-machine.js:182 的 `dirMissing` 检查）；doctor change_db_consistency 容差放行、「可用 doctor 清理」承诺不存在。【上手#3】
9. **docs gate 未知 flag 静默吞 + `--paths` 未接线**：`index.js:638-649` 只解析 --init-baseline；interface-contract.md §1.3b 宣称的「未知 flag exit 2」未实现，实测 `--nonexistent-flag` exit 0 放行；`--paths` 被 docs-gate.js:69 忽略。与 docs check 分支白名单治理口径不一致。【CLI#2，已亲验】
10. **`docs <未知子命令>` / `progress <未知子命令>/缺参` usage 后 exit 0**：`index.js:650-652`/`:367-369`/`:311+`——typo 静默成功，hook 拼错即 fail-open；worktree/modules/runtime 家族均 exit 1/2 + didYouMean，口径分裂。【CLI#4，已亲验】
11. **safeGit 未设 stdio，子进程 stderr 裸刷终端**：`git-helper.js:37` 无 stdio 配置，空仓跑 quick 冒出无上下文 `fatal:`；同仓其他调用点均显式 `stdio:['ignore','pipe','pipe']`。【驾驭#6】
11b. **`docs` 家族顶层 glob 边界**：`docs-check.js:191/211/226` 不支持 `**/*.md` 根级递归 glob（静默 0 命中全绿放行）、目录字面量 EISDIR 裸崩 exit 1（契约应 exit 2）。【CLI#3】

### C. 文档/契约漂移（P1-P2）

12. **CLAUDE.md 模板自带幽灵命令 `sillyspec resume`**：`templates/claude-instruction.md:15` 规则 9，index.js 零命中；每个 init 项目照跑必 exit 1；版本感知幂等注入不会自愈存量项目。【上手#4，已亲验】
13. **README 快速上手多处漂移**：`--workspace` 假 flag 静默忽略、validate-* 脚本幽灵、E2E/Playwright 幽灵特性、MCP 清单含 grep.app（实际无）、Node 版本自相矛盾（32 行 >=18 vs 64 行 >=22.11 vs 实际需 22.13）。【上手#5】
13b. **SKILL「通用参数」表与 run 行为不符**：7 个 SKILL 列 `--json`（run 实测拒绝）、`--skip-approval` 描述过宽（gates.js:270 明说不能跳产物校验）。【驾驭#7】
14. **usage 宣称顶层别名 `auto` 未路由**：index.js:32-33/60 列出但 switch 无 case，`sillyspec auto` 报未知命令且 did-you-mean 自指（topCommands 含 'auto' 距离 0）。【CLI#5，已亲验】
14b. **scan 中途劫持「下一步」建议——plan-c 修了第四循环漏了第三循环**：stage-machine.js:278 第三循环不排除 scan，:299 第四循环已排除（注释自证 plan-c 同根因）。【上手#7，已亲验】
14c. **init 引导不区分绿地/棕地**：init.js:606-611 固定「下一步 /sillyspec:brainstorm」，棕地零代码上下文进 brainstorm；README:73 说棕地应 scan。【上手#8】

### D. Prompt 工程层（P2，纯措辞/契约措辞工程）

15. **module-impact「更新结果」表格式无任何上游 prompt 定义**：gates.js:313-330 死信门控按严格正则收（`^#{2,3} 更新结果` + 末列精确 pending/待办/未同步/not-done/todo），但 plan step2 首版模板（plan.js:353-358）只有影响矩阵，唯一提及在 verify 之后执行的 archive step2——agent 只能从 gate 报错反推格式；实证一例无该节静默穿透归档。修法：plan step2 模板落空表骨架。【prompt#1，已亲验】
16. **verify step4 检查「验收标准 checkbox」与 TaskCard 协议矛盾**：verify.js:152-153 要求 checkbox，但 TaskCard 协议 acceptance 在 frontmatter YAML，正文无 checkbox（实测产物两例均无）。修法：改「对照 frontmatter acceptance 列表逐条核验」。【prompt#2，已亲验】
17. **consumer 专有词硬编码进通用 prompt**：verify.js:238-243 Runtime Evidence 模板整段 sillyhub 形状（daemon/session_control_no_manager/422），verify-probes.md:53 示例行含 consumer 仓路径——npm 分发给任意项目即错配，且自我拆台（step6 警告不得堆关键词，模板恰教堆关键词过字面 gate）。【prompt#3】
18. **`node -e "import('./src/...')"` 内部源码单行命令注入 prompt**：scan.js:141 / execute.js:326，相对 cwd 解析，consumer 项目必炸 ERR_MODULE_NOT_FOUND；同功能 CLI 子命令已存在（workflow check / worktree meta）。【prompt#4】
19. **三份字段自检清单并存互不一致**：plan.js:473 主 agent 清单 13 项（无 title_zh）vs taskcard-rules.md 硬校验 9 字段（含 title_zh）vs postcheck 硬拦——plan-b 翻车正是从这条缝漏的，B5 只对齐了两份。【prompt#5】
20. **指令强度通胀**：execute 18K 字符「必须」×30+「不要」×32，单 Wave prompt 9 必须+9 否定；「（必须严格遵守）」标题五处复用——强度信号退化为噪音。verify（8K 仅 6 必须）已示范收敛标准。【prompt#6】
21. **维护者内部注释泄入 prompt**：plan.js:349/353（generate_blueprints 代号/「改 archive step2 保持一致」）、verify.js:78（「旧 prompt」迁移史）、scan.js:168 + brainstorm.js:333-334（数字 step 引用，P6.4 name 引用裁决漏网）。【prompt#7】
21b. **plan_level 靠对话记忆跨步传递**：plan.js:131/:284「读取上一步输出的 plan_level」，无落盘锚点，context 压缩即失忆；quick sessionId/execute runId 均有 CLI 落盘，机制不一致。【prompt#8】
21c. **TaskCard 双标题字段语义未定义**：title vs title_zh 示例无区分度说明，实测全量归档产物两字段逐字节相同，纯仪式行。【prompt#9】
21d. **quick prompt 事实性错误**：quick.js:138 声称「QUICKLOG 在 .sillyspec/（gitignore）」，实际 git ls-files 跟踪——与 memory sillyspec-quicklog-is-tracked 记录的坑直接矛盾。【prompt#10，已亲验】

### E. 性能与模式债（P2）

22. **顶层静态 import 闭包 45 模块/20,555 行/982KB——最轻命令白付 ~80ms**：index.js 仅剩 5 条静态 import 拖出全量闭包（progress.js→db.js→node:sqlite 链、run/shared.js→stages 全家、progress.js:17→stage-contract、consistency-doctor→task-review→worktree 1437 行链）。实测 --version 133ms vs `node -e ""` 54ms。修法：4 条边改动态 import，行为零变化。【性能#2】
22b. **平台模式每 stage 命令前置串行 pull（上限 8s 无退避）**：index.js:801-802 所有 run/--done 前 `await triggerPullActiveChange`；与 bs-b push 侧 10s 是不同痛点（pull 侧、关键路径、串行前置）。【性能#4，待确认设计代价】
22c. **quicklog 三操作 O(全历史) 扫描无界增长**：quicklog.js:215-233 scanExisting 读全部轮转归档文件分配 ql-ID（只需当日），持锁逐文件读放大并发串行化；consumer 已 10 文件/756KB。按日过滤即可有界化。【性能#5】
22d. **`templates/skills/sillyspec-onboard` 孤儿模板随 npm 发布**：init 从 `.claude/skills/` 复制，不读 templates/skills/；全仓 grep 零消费者。【性能#6，已亲验】
22e. **测试编排每文件一裸 node 子进程，全量测试只活在本地与 pre-push**：test/run-tests.mjs:73-98，211 文件 × ~100ms 启动税 ≈ 20s+；无 CI workflows。【性能#8】
22e-b. **lint 名不副实**：check-syntax.mjs 仅 `node --check` + 禁 console.assert，无 unused/未引用导出检测——发现 22d 孤儿与 A6 propose.js 死码先例只能人肉 grep。【性能#7】

### F. 其余观察（不单列）

- task-review ↔ verify-postcheck ↔ worktree-apply 静态 import 环（全仓唯一环 + run/ 平层层级倒挂），阻塞未来拓扑清理。【性能#3】
- `_getNextSuggestion` 不认进行中 quick/explore 且建议命令不带 --change，中断恢复被引导去开新变更。【驾驭#4】
- `progress check/repair` 多活跃变更仓死循环指引（「无法读取进度数据」→ 建议 repair → 同错），缺「N 个活跃变更请 --change」指路。【驾驭#5】
- CLAUDE.md 项目状态段版本 3.25.6 vs package.json 3.26.8 落后 3 个 minor，无机制兜底。【CLI#7】
- TaskCard 近同构子代理模板 N-task 全量展开（13-task ≈ 600 行近重复）——B4 已裁决 include 机制不省 token 是固有，单模板+差异参数表是未来方向。【prompt 观察】

## 审计过程副作用（已处理）

- 审计代理在主仓误触发「幽灵变更」一次（run brainstorm 无 --change 静默新建 `2026-08-16-new-change-6307433e`）——本身即发现 8 的最新实弹。已精确清理（DB 行 id 2469 + 空目录），其余 4 个 08-15 幽灵行留作存量证据，建议 doctor 清理。
- 本会话重跑 `docs/prompt/_extract.mjs` 刷出并行 session 未提交的 execute.js 改动致镜像短暂漂移，已 checkout 还原；并行 session 已提交（ed5aa09），现为干净基线。
- 全量测试两轮：第一轮 196/13 失败全因并行未提交中间态；第二轮干净基线待报（后台运行中，已提交态上全绿）。
