---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Knowledge Index

> 子代理任务开始前查询此文件，按关键词匹配，只读命中的知识文件。
> execute/quick 执行中发现的坑自动追加到 uncategorized.md，经用户确认后归类到对应文件。

<!-- 格式：关键词1|关键词2|关键词3 → 文件路径 -->

## Conventions
- ESM|module|import|export → [conventions.md#esm-only](conventions.md#esm-only)
- 命名|naming|kebab-case|camelCase → [conventions.md#naming](conventions.md#naming)
- 错误处理|error|process.exit → [conventions.md#error-handling](conventions.md#error-handling)
- 日志|log|console|chalk|ora → [conventions.md#logging](conventions.md#logging)
- CLI入口|index.js|main → [conventions.md#cli-entry](conventions.md#cli-entry)
- 零配置|init|detect → [conventions.md#zero-config-init](conventions.md#zero-config-init)
- 阶段定义|definition|stageRegistry|auxiliary → [conventions.md#stage-definition-shape](conventions.md#stage-definition-shape)
- 铁律|guardrail|子代理prompt → [conventions.md#铁律段格式](conventions.md#铁律段格式)
- 资产保护|保护真实资产|清理 → [conventions.md#资产保护注释](conventions.md#资产保护注释)
- crypto.randomUUID|randomUUID|uuid|Node 18 → [conventions.md#crypto.randomUUID 全局是 Node 19+，Node 18 需 import](conventions.md#crypto.randomUUID 全局是 Node 19+，Node 18 需 import)
- 判别器|写入方|文件 → [conventions.md#新增写入方不得无中生有建判别器依赖的文件](conventions.md#新增写入方不得无中生有建判别器依赖的文件)
- 漂移|维度|豁免|docs-check → [conventions.md#双维度报同一漂移信号时后加维度须豁免](conventions.md#双维度报同一漂移信号时后加维度须豁免)

- 判级|定价|门禁|词表|关键词匹配|risk_level|仪式档|blast|危险度|风险等级|证据门 → [conventions.md#判级定价门禁输入必须项目声明禁全宇宙词表](conventions.md#判级定价门禁输入必须项目声明禁全宇宙词表)
- env敏感|双模式|套件阀|环境变量剥离|快照overlay|gitignored配置|pass.flag|行为翻转 → [conventions.md#env 敏感测试必须双模式跑+行为翻转走被跟踪文件](conventions.md#env-敏感测试必须双模式跑行为翻转走被跟踪文件)
- Windows|控制台子进程调用必须带|windowsHide|detached|进程链闪窗根治 → [conventions.md#Windows 控制台子进程调用必须带 windowsHide（detached 进程链闪窗根治）](conventions.md#Windows 控制台子进程调用必须带 windowsHide（detached 进程链闪窗根治）)
- execution|mode|缺省|main|直写|verify → [conventions.md#execution_mode 缺省=main 直写 + verify 门禁绿结果指纹复用（R8 对撞后行为契约）](conventions.md#execution_mode 缺省=main 直写 + verify 门禁绿结果指纹复用（R8 对撞后行为契约）)
- detached|长驻子进程必须有独立于|spawn|环境的自杀条件|41|孤儿 → [conventions.md#detached 长驻子进程必须有独立于 spawn 环境的自杀条件（41 孤儿 watcher 泄漏实证）](conventions.md#detached 长驻子进程必须有独立于 spawn 环境的自杀条件（41 孤儿 watcher 泄漏实证）)
- 进度库引擎|node|sqlite|Node|内置原生|SQLite → [conventions.md#进度库引擎 = node:sqlite（Node 内置原生 SQLite——非 WASM、非 npm 原生模块）](conventions.md#进度库引擎 = node:sqlite（Node 内置原生 SQLite——非 WASM、非 npm 原生模块）)
- handoff|新会话|session fork|换瘦会话|平台|编排权|接力块|上下文分段 → [conventions.md#换会话的编排权在平台/用户——会话不能自建会话（CLI 只产信号与接力载荷）](conventions.md#换会话的编排权在平台/用户——会话不能自建会话（CLI 只产信号与接力载荷）)
## Patterns
- 阶段定义|stage|stages → [patterns.md#stage-step-pattern](patterns.md#stage-step-pattern)
- 数据库|SQLite|sql.js|DB → [patterns.md#database-first](patterns.md#database-first)
- 进度管理|ProgressManager|progress → [patterns.md#progress-management](patterns.md#progress-management)
- 模块注册|stageRegistry → [patterns.md#stage-registry](patterns.md#stage-registry)
- worktree|git-worktree|WorktreeManager → [patterns.md#worktree-isolation](patterns.md#worktree-isolation)
- 平台模式|specRoot|specDir → [patterns.md#platform-mode](patterns.md#platform-mode)
- postcheck|校验|check → [patterns.md#postcheck](patterns.md#postcheck)
- 知识库|knowledge|INDEX → [patterns.md#knowledge-lifecycle](patterns.md#knowledge-lifecycle)
- validateTaskReviews|task-review|函数签名 → [patterns.md#validateTaskReviews 真实签名是单 opts 解构，非 (changeDir, {gitDir})](patterns.md#validateTaskReviews 真实签名是单 opts 解构，非 (changeDir, {gitDir}))
- esm|循环依赖|plan-postcheck|worktree-apply → [patterns.md#plan-postcheck 与 worktree-apply 存在既有依赖边，反向复用 filterDeliverableFiles 会成环](patterns.md#plan-postcheck 与 worktree-apply 存在既有依赖边，反向复用 filterDeliverableFiles 会成环)
- 对撞实验度量口径|R8|定稿|同任务书|同基线|db → [patterns.md#对撞实验度量口径（R8 定稿：同任务书/同基线/db 同源取证）](patterns.md#对撞实验度量口径（R8 定稿：同任务书/同基线/db 同源取证）)
- openspec|规格库|fr|活规格|资产对比|上下文|人读|机读|Given When Then → [patterns.md#跨工具资产对比的评估纪律——fr/ 索引 vs OpenSpec 全文规格库实例（防再翻案）](patterns.md#跨工具资产对比的评估纪律——fr/ 索引 vs OpenSpec 全文规格库实例（防再翻案）)

## Known Issues
- WASM|sql.js|native|native binding → [known-issues.md#sqljs-wasm-only](known-issues.md#sqljs-wasm-only)
- 子包|packages|dashboard → [known-issues.md#sub-package-isolation](known-issues.md#sub-package-isolation)
- hook|worktree-guard|npm-test → [known-issues.md#hook-import-restriction](known-issues.md#hook-import-restriction)
- worktree|跨仓|隔离|锚点|cd ../|readonlyCommands|路径感知 → [known-issues.md#worktree-隔离期跨仓命令锚定错位guard-无路径感知待立项](known-issues.md#worktree-隔离期跨仓命令锚定错位guard-无路径感知待立项)
- QUICKLOG|多会话|剥离|条目交织|git add → [known-issues.md#QUICKLOG-多会话条目交织提交需手工剥离并行条目待立项](known-issues.md#QUICKLOG-多会话条目交织提交需手工剥离并行条目待立项)
- propose|死代码|deprecated → [known-issues.md#propose-死代码](known-issues.md#propose-死代码)
- 平台审核|approve|reject|SillyHub → [known-issues.md#平台审核占位](known-issues.md#平台审核占位)
- 无build|无lint|check-syntax → [known-issues.md#无-buildlint-框架](known-issues.md#无-buildlint-框架)
- hook依赖|依赖声明|worktree-guard → [known-issues.md#hook 依赖必须显式存在](known-issues.md#hook 依赖必须显式存在)
- parseSimpleYaml|缩进|trimmed → [known-issues.md#parseSimpleYaml 缩进判断必须用原始 line 而非 trimmed](known-issues.md#parseSimpleYaml 缩进判断必须用原始 line 而非 trimmed)
- process.exit|UV_HANDLE_CLOSING|退出码 → [known-issues.md#Windows 下 process.exit 触发 UV_HANDLE_CLOSING assertion 覆盖退出码](known-issues.md#Windows 下 process.exit 触发 UV_HANDLE_CLOSING assertion 覆盖退出码)
- quickGuard|零持久化|跨进程 → [known-issues.md#progress.quickGuard 在 db 零持久化，quick --done 跨进程收尾失效](known-issues.md#progress.quickGuard 在 db 零持久化，quick --done 跨进程收尾失效)
- linkedChanges|changeName|关联变更 → [known-issues.md#quick 的 --change 被复用为 linkedChanges，非 changeName](known-issues.md#quick 的 --change 被复用为 linkedChanges，非 changeName)
- _resolveMainRepoRoot|git-common-dir|相对路径 → [known-issues.md#_resolveMainRepoRoot 用 existsSync('git rev-parse --git-common-dir') 该命令返回相对 .git](known-issues.md#_resolveMainRepoRoot 用 existsSync('git rev-parse --git-common-dir') 该命令返回相对 .git)
- spec-dir.test|进程崩溃|flaky → [known-issues.md#spec-dir.test.mjs 全量套件 Windows 罕见进程级崩溃（flaky）](known-issues.md#spec-dir.test.mjs 全量套件 Windows 罕见进程级崩溃（flaky）)
- taskcard|frontmatter|yaml|冒号 → [known-issues.md#task 卡 frontmatter 列表项含半角「冒号+空格」会炸 jsYaml 静默吞掉契约字段](known-issues.md#task 卡 frontmatter 列表项含半角「冒号+空格」会炸 jsYaml 静默吞掉契约字段)
- regex|全角括号|v8 → [known-issues.md#JS 正则转义全角括号会静默失配（V8 行为）](known-issues.md#JS 正则转义全角括号会静默失配（V8 行为）)
- 平台|通道|缺口|兜底 → [known-issues.md#2026-09-10 平台通道活体发现的两个平台侧缺口（待平台仓修复，sillyspec 侧兜底已就绪）](known-issues.md#2026-09-10 平台通道活体发现的两个平台侧缺口（待平台仓修复，sillyspec 侧兜底已就绪）)
- 平台|artifacts|竞态 → [known-issues.md#2026-09-11 平台侧 artifacts 代报竞态（真变更场景实测暴露，短任务躲过）](known-issues.md#2026-09-11 平台侧 artifacts 代报竞态（真变更场景实测暴露，短任务躲过）)
- bash|heredoc|截断 → [known-issues.md#bash-heredoc-truncation（2026-09-12 双会话实证）](known-issues.md#bash-heredoc-truncation（2026-09-12 双会话实证）)
- wt-commit|dispatch|幽灵命令 → [known-issues.md#execute prompt 指引的 wt-commit 是幽灵命令（runWtCommit 未接线 dispatch）](known-issues.md#execute prompt 指引的 wt-commit 是幽灵命令（runWtCommit 未接线 dispatch）)

- verify-required-evidence|门脆断|quick gate|deps(auto)|test failed → [known-issues.md#quick-gate-required-evidence-flake（2026-09-19，未解）](known-issues.md#quick-gate-required-evidence-flake2026-09-19未解)
- blast|自举|悬空提交|bbe30ab|skip-apply → [known-issues.md#blast 自举声明表未落 main（2026-09-19-ceremony-pricing-five-cuts 归档 --skip-apply 遗留）](known-issues.md#blast-自举声明表未落-main2026-09-19-ceremony-pricing-five-cuts-归档---skip-apply-遗留)
- span|六域|QUICK_RISK_PATH_PATTERNS|span_risk|维度关闭 → [known-issues.md#span 六域通用路径表已退役为项目声明（无声明项目维度关闭）](known-issues.md#span-六域通用路径表已退役为项目声明无声明项目维度关闭)
- verify|报告探针预填段禁止摘要化改写|防篡改门按锚点对比 → [known-issues.md#verify 报告探针预填段禁止摘要化改写（防篡改门按锚点对比）](known-issues.md#verify 报告探针预填段禁止摘要化改写（防篡改门按锚点对比）)
- docs|prompt|镜像|verify|失配数随|变更时代 → [known-issues.md#docs/prompt 镜像 _verify 失配数随「变更时代」漂移（动态阶段示例值）](known-issues.md#docs/prompt 镜像 _verify 失配数随「变更时代」漂移（动态阶段示例值）)
- gate|snapshot|自身的变更在|verify|门遇|快照分叉假红 → [known-issues.md#修 gate-snapshot 自身的变更在 verify 门遇「快照分叉假红」鸡生蛋](known-issues.md#修 gate-snapshot 自身的变更在 verify 门遇「快照分叉假红」鸡生蛋)
- execute|worktree|内跑全量|npm|test|守卫假红族 → [known-issues.md#execute worktree 内跑全量 npm test 的 worktree 守卫假红族（12 文件级）](known-issues.md#execute worktree 内跑全量 npm test 的 worktree 守卫假红族（12 文件级）)
- 影子审查回收是拉模式|完成结论到平台面板|CLI|侧盲到下个阶段检查点|推送缺口 → [known-issues.md#影子审查回收是拉模式——完成结论到平台面板、CLI 侧盲到下个阶段检查点（推送缺口）](known-issues.md#影子审查回收是拉模式——完成结论到平台面板、CLI 侧盲到下个阶段检查点（推送缺口）)
- 快照|overlay|门禁假红|前序脏文件|QUICK_GATE_SNAPSHOT_OFF|边界审计|import → [known-issues.md#快照 overlay 排除「会话内修改的前序脏文件」→ 门禁假红（快照分叉家族第三 sibling）](known-issues.md#快照 overlay 排除「会话内修改的前序脏文件」→ 门禁假红（快照分叉家族第三 sibling）)
## Decisions
- change-management|quicklog|标签|切段|decision|决策 → [decisions/change-management.md](decisions/change-management.md)
- core-engine|SQLite|FTS5|db-engine|decision|决策 → [decisions/core-engine.md](decisions/core-engine.md)
- hooks|hook|导入限制|npm-test|decision|决策 → [decisions/hooks.md](decisions/hooks.md)
- setup|register-repo|CRLF|local.yaml|decision|决策 → [decisions/setup.md](decisions/setup.md)
- worktree|junction|幽灵目录|node_modules|decision|决策 → [decisions/worktree.md](decisions/worktree.md)
- unmapped|decision|决策 → [decisions/unmapped.md](decisions/unmapped.md)
- docs-consistency|decision|决策 → [decisions/docs-consistency.md](decisions/docs-consistency.md)
- stages|decision|决策 → [decisions/stages.md](decisions/stages.md)
- runtime|decision|决策 → [decisions/runtime.md](decisions/runtime.md)
- cli-entry|decision|决策 → [decisions/cli-entry.md](decisions/cli-entry.md)
- progress|decision|决策 → [decisions/progress.md](decisions/progress.md)

## FR 需求索引
- core-engine|FR|需求|承接 → [fr/core-engine.md](fr/core-engine.md)
- runtime|FR|需求|承接 → [fr/runtime.md](fr/runtime.md)
- bin|FR|需求|承接 → [fr/bin.md](fr/bin.md)
- redlines|FR|需求|承接 → [fr/redlines.md](fr/redlines.md)
- stages|FR|需求|承接 → [fr/stages.md](fr/stages.md)
- setup|FR|需求|承接 → [fr/setup.md](fr/setup.md)
- sync|FR|需求|承接 → [fr/sync.md](fr/sync.md)
- cli-entry|FR|需求|承接 → [fr/cli-entry.md](fr/cli-entry.md)
