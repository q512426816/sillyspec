---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Conventions

## ESM Only

项目 `"type": "module"`，**顶层**统一使用 ES Module（`import`/`export`）。

**CJS 例外**：函数体内允许 `require()` 懒加载（推迟启动开销 / 打破循环依赖 / `doctor.js` 内嵌 bash 诊断需独立 node 进程无 ESM 上下文）。命中位置：`run.js`、`worktree-apply.js`、`stages/execute.js`、`stages/doctor.js`。顶层仍必须用 `import`。

`.cjs` 文件（如 git hooks）可用 CJS。

最低 Node.js 18，可安全使用 `fs/promises`、`structuredClone`、`fetch` 等原生 API。

## Naming

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `change-list.js` |
| 函数名 | camelCase | `parseFileChangeList` |
| 导出类 | PascalCase | `DB`、`ProgressManager` |
| 常量/配置 | UPPER_SNAKE_CASE 或小写字符串 | `SCAN_STATUS` |

## Error Handling

- CLI 层：`process.exit(1)` 终止并打印错误信息
- 业务逻辑层：抛出具体错误消息字符串，由调用方捕获
- 数据库操作：`DB` 类封装错误处理
- 无自定义 Error 类，使用原生 `Error` 或字符串消息

## Logging

- `console.log` / `console.error` / `console.warn` 直接输出
- 用户友好提示用 `chalk` 着色
- 进度展示用 `ora`（spinner）
- 交互式提示用 `@inquirer/prompts`

## CLI Entry

`bin/sillyspec.js` → `src/index.js`，所有命令通过 `main()` 函数分发。单入口，不使用 bin 多文件。

## Zero Config Init

`sillyspec init` 自动检测开发工具（Claude Code、Cursor 等），非交互式默认。`sillyspec init --interactive` 保留完整引导。

## Stage Definition Shape

`src/stages/*.js` 统一导出 `definition = { name, title, description, auxiliary?, _globalGuardrails?, steps }`：
- `name` 必须等于文件名（如 `scan.js` → `name: 'scan'`）
- 辅助阶段（scan/quick/explore/archive/status/doctor）必带 `auxiliary: true`
- 只读校验类阶段（verify）必带下划线前缀的 `_globalGuardrails`
- 新增阶段需在 `src/stages/index.js` 的 `stageRegistry` 注册

## 铁律段格式

派发给子代理的 step prompt 结尾必须含 `### 铁律`（或 `### ⚠️ 铁律`）固定段，用 `❌/✅/⚠️` emoji + 中文短句声明禁止动作（如「不要编造 CLI 子命令」「完成后立即执行 --done」「不要回头修改已完成步骤」）。新增/修改步骤 prompt 时须保留此段。

## 资产保护注释

触碰 `.sillyspec/changes/`、`projects/`、`sillyspec.db` 的清理/写入代码必须带中文注释 `// ⚠️ 必须保护真实资产`，防止误删真实数据。修改这类代码时不可删除该注释。

## crypto.randomUUID 全局是 Node 19+，Node 18 需 import

`crypto.randomUUID()` 作为全局是 Node 19+ 才有；Node 18 需 `import { randomUUID } from 'crypto'`。本项目 `engines: node>=18`，故 Bug2 task-01 从 `node:crypto` import（而非用全局）。仍零新增依赖（node 内置模块）。建议归类到 conventions.md（Node 版本兼容）。

## 新增写入方不得无中生有建判别器依赖的文件

gates 侧 backfill（verify-facts 回填）曾对无 facts 的存量变更凭空创建 verify-facts.json，而 checkProbeConsistency 存在「有 facts 无探针子节 → error」判别——凭空建文件把相邻判别器对存量变更的 skip 误升 error（e2e run-complete-step-verify 抓出）。规则：给既有判别器生态新增写入方时，必须枚举所有「以文件存在性为输入」的判别器并核对创建语义；底稿类文件的创建应收敛到单一入口（如 verify-probes --init），回填只固化既有文件。（2026-09-08-ir-verify-facts）

## 双维度报同一漂移信号时后加维度须豁免

checkProbeConsistency 增 facts 基线对比维度后，probe6 在 HEAD 前移场景与既有 md 锚点维度重复报同一漂移（一条信号两条告警）。规则：给既有检测新增第二维度时，识别「同一根因产生多路信号」的场景并在后加维度里豁免（HEAD-advance 时 facts 侧 probe6 不报，漂移由 md 锚点维度单报）。（2026-09-08-ir-verify-facts）

## 判级/定价/门禁输入必须项目声明，禁全宇宙词表

危险度信号（判级 / 仪式定价 / 证据门）必须来自项目自己的声明面（路径前缀 / 结构件，如 `_module-map.yaml` blast 段），禁止工具自带的全宇宙关键词表当危险度——通用词表换个仓库全是噪声（HTTP session / lifecycle 回调 / 变量名 entryPoint 均为良性词），且判级引擎自身的源码与教学文案写满关键词，按「文档措辞 / 文件内容」判级必然打伤改引擎自身的变更（自指陷阱：扫变更面〔路径 / 行级 diff〕，不扫全文件不扫措辞）。显式人工通道（risk_level 类 frontmatter）是逃生补丁不是定价规则——出现「门禁逼 agent 虚标才放行」的信号时追输入源设计，不给机械字符串匹配加精度（否定抑制 / 枚举继承那类精修是给错误的仪器上油）；首次判级/定价早于显式声明落盘时声明会被粘住，此类机制必须给后补声明留重算通道。（2026-09-19-ceremony-pricing-five-cuts，api-matrix 变更因 design 措辞撞词被定 S3 顶档实证）

  实测成本对照（2026-09-19 材料包口径首日，同日同仓同规模变更）：Design Grill 154万→34.7万 token、
  plan 审 81万→18.5万、execute QA 228万→43.8万、填卡 229万双批→80万单批——**单价约 1/4，发现质量不降**
  （每轮零阻断、gap 全有锚、QA 抓到真 bug specBase 推导错层）。省的是「每轮评审从零重建仓库认知」（~200x
  信息放大），不是审的东西。评审轮次结构不动（少审这条路不通——两轮 QA 拦下错层与假设反转的价值
  大于全部评审成本）。后续命中注入的会话：这是已验证的数字不是估计。

## env 敏感测试必须双模式跑+行为翻转走被跟踪文件

两类实测坑（2026-09-22 R7 dogfood 复盘，2026-09-22-r7-protocol-surgery 双实证）：
①**套件阀自噬**：测试对 env 门控行为（如 SILLYSPEC_WATCHER=0 的 disabled 语义）做断言时，测试
runner 注入的全局阀会继承进测试内 spawn 的 env——裸跑绿、套件内红。规则：凡断言 env 门控
分支的测试，构造 spawn env 时**显式剥净全部相关变量**（delete NODE_TEST_CONTEXT /
SILLYSPEC_WATCHER 等），且收口前双模式各跑一遍（裸 + 套件阀生效形态）才算绿。
②**gitignored 配置翻转不可见**：门禁快照 overlay=HEAD+会话**被跟踪**文件，测试中途改
local.yaml（gitignored）对快照内实测不可见→「修好了还红」假象。规则：测试内翻转被测行为
一律走**被跟踪文件**（check.js+pass.flag 模式），不走 gitignored 配置。（来源：
test/watcher.test.mjs env 剥离双清 / test/flow-protocol.test.mjs ③ pass.flag）

## Windows 控制台子进程调用必须带 windowsHide（detached 进程链闪窗根治）

detached/无控制台进程（watcher、bg-sync）派生的控制台子程序（git.exe 等）若 spawn 选项缺 `windowsHide: true`，Windows 会为每个子进程创建可见 cmd 窗、跑完即灭——用户侧表现为周期性闪窗（watcher 每轮轮询 3-4 条 git，几秒一闪闪一天，易被当病毒排查）。修复口径：全仓统一 git 入口（git-helper.js execFileSync 双点）+ 其余 git 调用点（commit-guard/docs-check/gate-snapshot/green-cache）一律补 `windowsHide: true`（跨平台安全，非 Windows 忽略）。与「detached 长驻子进程自杀三闸」（2026-09-22 孤儿 watcher 条目）互补：三闸治不该活的，windowsHide 治该活但别闪的。新增外部命令调用点时此选项为必带项。（来源：2026-09-23 用户实证「弹窗出来又立马消失」，quick ql-20260923-011-d859）

## execution_mode 缺省=main 直写 + verify 门禁绿结果指纹复用（R8 对撞后行为契约）

两契约变更：①plan.md frontmatter `execution_mode` 缺省/非法值回退 **main**（主代理直写），显式 `dispatch` 才派发——判据=任务真可并行×单任务规模大（>30min）×上下文需分片三者齐备；对撞双实证派发税（R7 直写进码 7′ vs 派发 70′；R8 execute 80′ vs 单上下文同规模 14′=3.6×，子代理冷启动上下文重建 887 万 token+伪并行+小任务全额开销）。②gate verify/--done 的 verify-test/verify-lint 接绿结果指纹缓存（src/run/green-cache.js）：指纹=HEAD+代码脏面（剔 .sillyspec/docs/*.md——verify 收敛循环修订 verify-result.md 不击穿缓存）+local.yaml 哈希（换命令即失效）；TTL 30min；SILLYSPEC_GREEN_CACHE_OFF=1 全关/TTL_MIN 覆盖；命中合成等价 passed 并强制披露 cached=本次未重跑（真实性口径：结果必须真跑出来过，但不必重复产生）。治基线实证同一套测试收敛循环内重复真跑 ~13min（gate×3+--done 收口）。（来源：R8 对撞实验，quick ql-20260923-010-32f9）
