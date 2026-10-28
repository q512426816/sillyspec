/**
 * config-schema.js — local.yaml 配置键的单一数据源。
 *
 * 定位：`.sillyspec/local.yaml` 是 gitignored 的机器+人混写配置，键散落在 ~10 个 reader
 * 里（detect / verify-postcheck / sync / dispatch / worktree-guard / classify-change …），
 * 外部项目的 agent 无从得知有哪些键、哪些生效。本模块把「全部已知键 + 生效状态 + 读取点」
 * 集中成一张表，供：
 *   - `sillyspec config schema`（人类可读树 / --json 机读）打印；
 *   - `sillyspec init` 调 renderExample() 落盘脱敏 local.yaml.example 给人/外部 agent 看。
 *
 * 单一真相 = LOCAL_YAML_SCHEMA。renderExample() 是策展模板（YAML 形态各异：嵌套 / inline
 * flow / 顶层标量，自动生成不如策展可读），由测试「每个 live 键路径必出现于 example 文本」
 * 耦合保证不漂移——加键忘 example 则测试红。
 *
 * reader 引用一律用符号名（readMcpConfig / extractModules），**不用行号**——行号随重构漂移，
 * 符号名稳定可 grep。
 *
 * status 语义：
 * - live        真有 reader 从 local.yaml 读并起效（配了即生效）。
 * - declared    代码/JSDoc/prompt 声明过，但无 reader 真读 local.yaml（或调用方未传），配了不生效。
 *               诚实标出，避免 agent 白配 + 暴露待接线债。
 */

/**
 * @typedef {Object} SchemaKey
 * @property {string} path          点分路径（mcp.url / worktree-hook.readonlyCommands）
 * @property {string} type          string|enum|integer|object|array|scalar
 * @property {string[]} [values]    enum 取值
 * @property {boolean} [required]   凭据类必填（两键齐全才视为有效源）
 * @property {boolean} [secret]     敏感凭据，example 用占位符
 * @property {boolean} [optional]   可选键
 * @property {string} status        live|declared
 * @property {string[]} readers     读取点符号名（稳定可 grep），declared 键留空数组
 * @property {string} desc          一句话说明
 * @property {string} example       脱敏示例值（secret 键用占位符）
 *
 * @typedef {Object} SchemaSection
 * @property {string} id
 * @property {string} title
 * @property {string} note          段说明（写入来源 / 注意事项）
 * @property {SchemaKey[]} keys
 */

/** @type {{ file: string, note: string, sections: SchemaSection[] }} */
export const LOCAL_YAML_SCHEMA = {
  file: '.sillyspec/local.yaml',
  note: 'gitignored（含敏感凭据勿提交）；脱敏示例 local.yaml.example 由 sillyspec init 生成（可提交）。',
  sections: [
    {
      id: 'project',
      title: '项目类型',
      note: '由 sillyspec local detect 纯 fs 嗅探写入，一般无需手填。',
      keys: [
        {
          path: 'project.type',
          type: 'enum',
          values: ['nodejs', 'maven', 'gradle', 'make', 'generic'],
          status: 'live',
          readers: ['detectLocalYaml (src/local-detect.js)', 'extractProjectType (src/worktree-deps.js)'],
          desc: '项目类型，决定默认 commands 嗅探与 worktree 依赖策略。',
          example: 'nodejs',
        },
      ],
    },
    {
      id: 'commands',
      title: '构建/测试/lint 命令',
      note: 'detect 核验 package.json(或对应构建文件) scripts 存在性后才写对应键；缺失则不写。agent 可改。',
      keys: [
        { path: 'commands.build', type: 'string', optional: true, status: 'live', readers: ['detectLocalYaml (src/local-detect.js)', 'validateCommands (src/scan-postcheck.js)'], desc: '构建命令。', example: 'npm run build' },
        { path: 'commands.test', type: 'string', optional: true, status: 'deprecated', readers: ['extractTestCommand (src/verify-postcheck.js)', 'validateCommands (src/scan-postcheck.js)'], desc: '【2026-09-26-dynamic-test-inference 退役为全量逃生阀】仅显式 test_strategy: full 时生效——测试面缺省按变更动态推断（本变更测试 ∪ FR 关联回归 ∪ import 依赖，runner 自项目结构推断），不再依赖此配置；未配置且显式 full 时按 package.json scripts.test / pyproject 结构推断全量命令。', example: 'npm test' },
        { path: 'commands.lint', type: 'string', optional: true, status: 'live', readers: ['detectLocalYaml (src/local-detect.js)', 'runQuickTestLintGate (src/run/quick-audit.js)', 'validateCommands (src/scan-postcheck.js)'], desc: 'lint 命令——quick --done 触及 src/test 时 CLI 亲自执行（P0-2 门禁，失败阻断完成）。', example: 'npm run lint' },
        { path: 'commands.test_timeout_sec', type: 'number', optional: true, status: 'live', readers: ['resolveTestTimeoutMs (src/verify-postcheck.js)'], desc: 'commands.test 超时秒数（R9 实证 2026-09-23：全量套件实测可达 27min，固定 600s 帽必杀）——优先级 local.yaml 本键 > env SILLYSPEC_TEST_TIMEOUT_MS > 缺省 600。慢仓在此提帽，防真慢套件被当超时失败。', example: '2400' },
        { path: 'commands.lint_timeout_sec', type: 'number', optional: true, status: 'live', readers: ['runVerifyLintCheck (src/verify-postcheck.js)'], desc: 'commands.lint 超时秒数——优先级 显式调用参 > 本键 > env SILLYSPEC_LINT_TIMEOUT_MS > 缺省 180（快照内 junction I/O 慢，快照路径调用侧显式传 300）。', example: '600' },
        { path: 'commands.metrics', type: 'string', optional: true, status: 'live', readers: ['runVerifyMetricsCheck (src/verify-postcheck.js)', 'runQuickTestLintGate (src/run/quick-audit.js)'], desc: '【2026-10-29-open-metrics-gate】可选指标门命令——收口实测在隔离快照内执行，非零退出=门红阻断收口；未配置或标 unavailable 跳过留痕（fail-open）。适合复杂度上限/重复率/死代码/覆盖率阈值类秒级检查：命令开放不绑定工具，生态/构建工具检查任务（npx 类零安装、mvn/gradle 检查目标等）或仓内自写脚本均可；执行时注入 SILLYSPEC_CHANGE_FILES（本变更文件清单，POSIX 相对路径换行分隔）供大仓增量门只扫变更面（历史存量债不拦新变更）；变异测试等慢工具建议提帽或放 pre-push/CI 层。', example: 'npx jscpd src' },
        { path: 'commands.metrics_timeout_sec', type: 'number', optional: true, status: 'live', readers: ['runVerifyMetricsCheck (src/verify-postcheck.js)'], desc: 'commands.metrics 超时秒数——优先级 显式调用参 > 本键 > env SILLYSPEC_METRICS_TIMEOUT_MS（毫秒） > 缺省 180（快照内 junction I/O 慢，快照路径调用侧显式传 300）。', example: '600' },
        { path: 'commands.smoke', type: 'string', optional: true, status: 'live', readers: ['executeVerifyQualityScan (src/run/verify-quality-scan.js)'], desc: '接口冒烟命令——verify 阶段 CLI 亲跑（脚本自理服务生命周期：后台起服+轮询就绪+finally 杀），300s 超时帽，失败/超时只记失败态不阻断本步、触发 PASS 封顶（D-002）；指纹含此键，未变不重跑。', example: 'node scripts/smoke.mjs' },
        { path: 'commands.install', type: 'string', optional: true, status: 'live', readers: ['extractInstallCommand (src/worktree-deps.js)'], desc: '依赖安装命令（worktree 依赖 provisioning 用）。', example: 'npm install' },
        { path: 'commands.knowledge-gate', type: 'boolean', optional: true, status: 'live', readers: ['completeStep (src/run/complete.js)'], desc: '【2026-09-28-unclear-req-to-brainstorm FR-03/D-004】brainstorm 方案步（提出 2-3 种方案）--done 知识检索命中回显开关——缺省 true=开（对 --output 与 decisions.md 条目跑既有检索匹配器，命中 warn 回显「须 evidence 回应或说明不复潮」不阻断）；false（或 off）关回显，无命中时输出与现状一致。', example: 'false' },
        { path: 'commands.scan:check', type: 'string', optional: true, status: 'live', readers: ['scan 漂移检查（scripts/scan-drift-check.py 经 scan 流程调用）'], desc: '【2026-10-23-schema-registration-debt 平台仓 dogfood 补登】scan 产物漂移自检命令。', example: 'python scripts/scan-drift-check.py' },
      ],
    },
    {
      id: 'metrics_routes',
      title: '指标门路由（多语言/monorepo）',
      note: '【2026-10-29-metrics-routes】与 commands.metrics 单命令门共存：按变更文件面 ∩ gate.paths 路径前缀路由，仅执行命中 gate（串行）；语言中立（路径集合，不枚举语言/框架）。段未配置=零变化。',
      keys: [
        { path: 'metrics_routes.<name>.paths', type: 'array', optional: true, status: 'live', readers: ['extractMetricsRoutes (src/verify-postcheck.js)'], desc: 'gate 的路径前缀集合（仓根相对）——段全等匹配：frontend/ 不命中 frontend-v2/；引号数组 `["a/", "b/"]` 或逗分裸串均可。', example: '["frontend/", "packages/web/"]' },
        { path: 'metrics_routes.<name>.command', type: 'string', optional: true, status: 'live', readers: ['runVerifyMetricsRoutesCheck (src/verify-postcheck.js)'], desc: 'gate 的指标门命令——gate 命中（变更文件面 ∩ paths 非空）才执行，非零退出=门红；gate 子进程注入 SILLYSPEC_CHANGE_FILES=该 gate 命中子集（gate 内工具可增量扫）。', example: 'npx --prefix frontend eslint . --max-warnings 0' },
        { path: 'metrics_routes.<name>.timeout_sec', type: 'number', optional: true, status: 'live', readers: ['runVerifyMetricsRoutesCheck (src/verify-postcheck.js)'], desc: 'gate 级超时秒数——优先级 本键 > 调用侧快照帽 > commands.metrics_timeout_sec > env SILLYSPEC_METRICS_TIMEOUT_MS（毫秒）> 缺省 180。', example: '300' },
      ],
    },
    {
      id: 'checkpoint',
      title: '影子存档（task tick 快照）',
      note: '机制先落代码缺省（fail-open，缺省零回归）——键只用于仓主显式调优（2026-10-28-shadow-checkpoint）。',
      keys: [
        { path: 'checkpoint.enabled', type: 'boolean', optional: true, status: 'live', readers: ['readCheckpointConfig (src/checkpoint.js)'], desc: '影子存档开关——task tick 成功翻格后落 git 影子提交到 refs/sillyspec/checkpoints/<change>（临时索引零触碰共享暂存区，断点恢复从进度级升到内容级）。缺省 true；false 关闭（tick 照常）。解析失败 fail-open 取缺省。', example: 'false' },
        { path: 'checkpoint.maxUntrackedMB', type: 'number', optional: true, status: 'live', readers: ['readCheckpointConfig (src/checkpoint.js)'], desc: '体积护栏——未忽略 untracked 总量超过该 MB 数时跳过本次存档并留痕（早停判定，不遍历全树；硬排除目录不计入）。缺省 200。', example: '50' },
      ],
    },
    {
      id: 'knowledge',
      title: '知识检索（平台向量语义召回）',
      note: '可选段——缺省（未写整段/auto）跟随平台能力自动探测：端点在场自动启用、未部署缓存 1h 内跳过（部署后自动启用，零配置；2026-10-15-platform-vector-search）。off=显式逃生阀强制关，on=强制开跳过探测。能力缓存落 .runtime/vector-capability.json（gitignored）；提示触点：knowledge search hint 键、flow 注入零命中行（auto 未就绪时信息性提示）。',
      keys: [
        { path: 'knowledge.vector_search', type: 'string', optional: true, status: 'live', readers: ['vectorSwitchFromLocalYaml (src/knowledge-vector.js)'], desc: '【2026-10-15-vector-capability-autodetect 终态】平台向量语义召回开关——缺省（未写键/auto）跟随平台能力自动探测：端点在场自动启用、未部署缓存 1h 内跳过（部署后自动启用，零配置）；off=显式逃生阀强制关、on=强制开跳过探测。env SILLYSPEC_KNOWLEDGE_VECTOR=on|auto/off 同语义强制。四层检索第二层：路由 tag 零命中后平台向量召回（语料=knowledge/decisions 条目，词面不相交条目可语义召回）。', example: 'off' },
      ],
    },
    {
      id: 'mcp',
      title: 'SillyHub MCP 客户端凭据（派发用）',
      note: 'agent 手填，或 sillyspec platform connect 在 mcp 段缺失时同源自动填（§7.4）。两键齐全才生效，否则回退 env SILLYHUB_MCP_URL/TOKEN。',
      keys: [
        { path: 'mcp.url', type: 'string', required: true, secret: true, status: 'live', readers: ['readMcpConfig (src/sillyhub-mcp/config.js)'], desc: 'SillyHub MCP 服务地址（尾斜杠自动归一）。', example: 'https://your-sillyhub.example.com' },
        { path: 'mcp.token', type: 'string', required: true, secret: true, status: 'live', readers: ['readMcpConfig (src/sillyhub-mcp/config.js)'], desc: 'SillyHub MCP 认证 token。', example: '<your-mcp-token>' },
      ],
    },
    {
      id: 'platform',
      title: 'SillyHub 平台同步',
      note: 'sillyspec platform connect 写入（含 ping 验活）；手填亦可。user/last_connected 可空或自动写。',
      keys: [
        { path: 'platform.url', type: 'string', required: true, secret: true, status: 'live', readers: ['SyncManager._getPlatform (src/sync.js)'], desc: 'SillyHub 平台地址。', example: 'https://your-sillyhub.example.com' },
        { path: 'platform.token', type: 'string', required: true, secret: true, status: 'live', readers: ['SyncManager._getPlatform (src/sync.js)'], desc: '平台认证 token（Bearer）。', example: '<your-platform-token>' },
        { path: 'platform.user', type: 'string', optional: true, status: 'live', readers: ['resolvePlatformUser / SyncManager.connect (src/sync.js)'], desc: '推送者身份；缺则回退 git user.name / env。推送时进 X-SillySpec-User header。', example: 'alice' },
        { path: 'platform.last_connected', type: 'string', optional: true, status: 'live', readers: ['SyncManager.connect (src/sync.js)'], desc: 'connect 成功时间戳（ISO），自动写，勿手填。', example: '2026-08-11T00:00:00.000Z' },
      ],
    },
    {
      id: 'dispatch',
      title: '派发调参',
      note: '仅在确知调优值时填，否则留默认。',
      keys: [
        { path: 'dispatch.probe_ttl_ms', type: 'integer', optional: true, status: 'live', readers: ['readProbeTtlFromLocalYaml (src/dispatch/probe.js)'], desc: '派发探测负面缓存 TTL（毫秒，默认 60000）。daemon 抖动期避免反复探测。', example: '60000' },
        { path: 'dispatch.poll_interval_ms', type: 'integer', optional: true, status: 'declared', readers: [], desc: '【路径A 预留·未落地】renderSillyHubInstruction 注入的轮询文本提及，但 isPathASupported()=false 该指令当前不注入；路径A 落地后接线，配了暂不生效。', example: '15000' },
        { path: 'dispatch.worker_timeout_ms', type: 'integer', optional: true, status: 'declared', readers: [], desc: '【路径A 预留·未落地】同 poll_interval_ms，路径A 落地后接线，配了暂不生效。', example: '60000' },
      ],
    },
    {
      id: 'modules',
      title: 'monorepo 子模块映射',
      note: 'test_strategy: module 时，按 git diff 命中的模块子集收窄测试。只支持 inline flow 形态（extractModules 不解析嵌套展开式）。',
      keys: [
        { path: 'modules.<name>.path', type: 'string', optional: true, status: 'live', readers: ['extractModules (src/verify-postcheck.js)', 'parseLocalYamlModules (src/plan-postcheck.js)', 'extractModulePaths (src/worktree-deps.js)'], desc: '子模块目录路径（相对仓库根）。', example: 'frontend/' },
        { path: 'modules.<name>.test', type: 'string', optional: true, status: 'deprecated', readers: ['extractModules (src/verify-postcheck.js，退役提示用）'], desc: '【2026-09-26-dynamic-test-inference 退役，不再消费】测试面按变更动态推断、runner 自项目结构（pyproject/uv.lock/package.json 就近祖先）推断。模块级 flaky 处置迁 known_failures。块在场时 CLI 打印退役指引。', example: 'cd frontend && pnpm test' },
        { path: 'module_paths', type: 'object', optional: true, status: 'live', readers: ['module_paths 旧字段（部分工具仍用——平台仓 dogfood 2026-10-23 核实在用）'], desc: '【旧字段】模块名 → 目录路径映射（如 backend: backend/）。部分工具仍消费；新配置勿再写（模块归属走 docs/<project>/modules/_module-map.yaml）。', example: '{ backend: backend/, frontend: frontend/ }' },
        { path: 'fr_unmapped_baseline', type: 'integer', optional: true, status: 'live', readers: ['unmapped 大池消音（src/fr-index.js）'], desc: 'unmapped 域 FR 条数消音基线（跨仓历史堆积已清算时设当前值；增量 >10 才警告，缺省 0=无基线恒警告行为）。', example: '720' },
      ],
    },
    {
      id: 'repos',
      title: '跨仓注册表',
      note: '仓键 → 本地工作目录。注册后参与跨仓冻结面/对账/未标注交付探测与跨仓 worktree 落位；条目两种形态：字符串路径或 {path, worktree} 对象（worktree=跨仓 worktree 落位根，优先级见 worktree.crossPlacement）。local.yaml 本就 gitignored，真实本地路径不入库。',
      keys: [
        { path: 'repos.<repo键>', type: 'string', optional: true, status: 'live', readers: ['跨仓冻结/对账（src/cross-repo-reconcile.js）、注册探测（src/local-register.js）、跨仓 worktree（src/worktree-cross.js）'], desc: '仓键 → 该仓本地工作目录绝对路径（或 {path, worktree} 对象形态）。', example: 'shared-lib: C:/path/to/shared-lib' },
      ],
    },
    {
      id: 'test_strategy',
      title: '测试策略',
      note: 'verify 阶段 CLI 对账的收窄策略（D-005@v2：skip 接线兑现 + evidence-auto 新增，full/module 语义不变）。',
      keys: [
        { path: 'verify.test_rerun', type: 'enum', values: ['incremental', 'full'], optional: true, status: 'live', readers: ['readTestRerunConfig (src/verify-postcheck.js — dynamic-subset 分支增量档)'], desc: '实测门失败后重跑档：incremental（缺省）= 前轮失败后，下轮只跑「失败批测试文件 ∪ 自失败基线以来变更文件」的三源推断面（未触碰绿面复用，返工轮分钟级）；full = 恒全子集重跑（2026-10-07 前现状，保守项目用）。env SILLYSPEC_TEST_RERUN 优先。仅作用 dynamic-subset 档（显式 test_strategy: full 不受影响）。', example: 'verify: { test_rerun: full }' },
        { path: 'test_strategy', type: 'enum', values: ['full', 'module', 'skip', 'evidence-auto'], optional: true, status: 'live', readers: ['extractTestStrategy (src/verify-postcheck.js)', 'resolveTestStrategy (src/verify-postcheck.js)'], desc: '【2026-09-26-dynamic-test-inference 起】full=全量（commands.test 在场生效，否则结构推断）；module=已退役折算动态子集（超集覆盖：变更文件面收窄 + FR 关联回归 + import 依赖）；skip=真跳过（R-07 不变）；evidence-auto=按 module-impact.md 推荐（行为→动态子集、文档/门禁→skip）。缺省=动态子集：三源并集非空实测、空则不硬跑全量（防超时/预存失败面）。', example: 'full' },
        { path: 'runner_flags', type: 'object', optional: true, status: 'live', readers: ['readRunnerFlags (src/verify-postcheck.js)'], desc: '【2026-10-23-runner-flags-generic，语言中立】推断批尾随 flags 映射：批类别（CLI 自有 runner 分类 py|js|jsx|…，未知类别前向兼容）→ flags 串。flags 置于文件参数前（node/go 类参数解析在首个位置参数处截断）；hits 路径自带 flags 不注入。缺省不写=现状。', example: 'py: "-q --no-cov -n auto" / jsx: "--pool=forks"' },
        { path: 'py_runner_flags', type: 'string', optional: true, status: 'deprecated', readers: ['readRunnerFlags 兼容别名 (src/verify-postcheck.js)'], desc: '【已泛化】runner_flags.py 的单键旧别名（2026-10-23-py-runner-flags 遗留）；新配置写 runner_flags 映射。', example: '-q --no-cov -n auto' },
        { path: 'deps_regress_cap', type: 'string', optional: true, status: 'live', readers: ['readDepsRegressCap (src/verify-postcheck.js)'], desc: '【2026-10-23-runner-flags-generic，语言中立】import 依赖面档位：N（1-2000）=变更自身测试优先、依赖只取前 N；off=只跑变更自身测试（关联回归归 pre-push/CI 门）；不写=全跑。own=变更触碰文件∩依赖面，纯路径集合运算不涉语言。', example: 'off' },
        { path: 'fr_regress_cap', type: 'string', optional: true, status: 'live', readers: ['readFrRegressCap (src/verify-postcheck.js)'], desc: '【2026-10-23-fr-regress-default-off 缺省翻转】FR 关联回归层本地实测开关：缺省（不写）=不跑（归 pre-push/CI 门，收口披露行留痕）；N（1-2000）=前 N 个绑定文件进实测面；all=全跑旧行为显式恢复；off=同缺省。', example: '40' },
      ],
    },
    {
      id: 'known_failures',
      title: '预存失败豁免清单',
      note: '变更前就失败的测试行，豁免后不计入 verify 阻断。支持块列表或 inline 数组。务必定期复核，避免误豁免本变更引入的真实失败。',
      keys: [
        { path: 'known_failures', type: 'array', optional: true, status: 'live', readers: ['extractKnownFailures (src/verify-postcheck.js)'], desc: '失败行模式列表（匹配测试输出失败行）。', example: 'tests/some-old-test' },
        { path: 'ui_visual_gate', type: 'string', optional: true, status: 'live', readers: ['runUiVisualProbe (src/ui-visual.js)'], desc: '【2026-09-27-ui-visual-guidance】UI 视觉证据分级门档位：warn（默认，缺 visual-evidence.md 仅警告）/ error（缺证据即阻断）/ off（探针整体关闭，含降级硬规则）。视觉降级无用户裁决留痕时无论档位恒阻断。', example: 'warn' },
        { path: 'hunk_gate', type: 'string', optional: true, status: 'live', readers: ['runHunkAttributionGate (src/hunk-attribution.js)'], desc: '【2026-09-27-hunk-attribution-gate】提交面行级归属门档位：warn（默认，未归因文件/跨变更竞争/在途残留仅警告）/ error（未归因与跨变更竞争任一在场阻断收口；在途残留恒仅警告——并发 WIP 弱信号不硬拦）/ off（关闭）。', example: 'warn' },
      ],
    },
    {
      id: 'verify_precedents',
      title: '等效验证先例库',
      note: '标准测试/构建命令在本仓不可用（框架硬编码 skip、依赖外部基础设施等）时，登记已验证的等效验证口径，verify prompt 自动注入提示复用（2026-09-15 EHS 实证：mvn test 被框架 parent pom 硬编码 surefire skip，等效口径第二次靠 agent 翻旧 verify-result 正文续命——先例只活在散文里换 agent 即断档）。',
      keys: [
        { path: 'verify_precedents', type: 'array', optional: true, status: 'live', readers: ['parseVerifyPrecedents (src/run/prompt.js)'], desc: '等效验证先例对象数组（id/standard_command/reason/equivalent/established_by/notes）。verify 阶段 prompt 与 test_strategy 预检提示同挂点注入；行动指引=把等效命令配进 commands.test 照常全量实测对账，而非只靠 test_strategy: skip 放行。', example: '- id: mvn-test-surefire-skip\n  standard_command: mvn test\n  reason: parent pom 硬编码 surefire skip=true\n  equivalent: dependency:build-classpath + javac + JUnitCore 直跑\n  established_by: 2026-08-26-building-area-ledger' },
      ],
    },
    {
      id: 'worktree-hook',
      title: 'worktree-guard 扩展',
      note: 'execute worktree 隔离期内放行的额外只读命令。键名用 camelCase（parseSimpleYaml 原样保留）。',
      keys: [
        { path: 'worktree-hook.readonlyCommands', type: 'array', optional: true, status: 'live', readers: ['loadLocalConfig (src/hooks/worktree-guard.js)'], desc: '额外放行的只读命令名列表（如 rg/fd），绕过 worktree-guard 写操作拦截。', example: 'rg' },
      ],
    },
    {
      id: 'worktree',
      title: 'worktree 生成物供给',
      note: 'gitignore 生成物（如构建期产出的 src/build-id.ts）不在 git 树也不进 untracked overlay（ls-files --others --exclude-standard 尊重 .gitignore），worktree 缺失致构建炸 Failed to load url——create 期按本清单从主仓复制供给（2026-09-15-worktree-dual-truth-gates 坑③，D-003@v1）。块列表或 inline flow 数组均可解析。',
      keys: [
        { path: 'worktree.supplyFiles', type: 'array', optional: true, status: 'live', readers: ['readSupplyFilesConfig + _supplyGeneratedFiles (src/worktree.js — create step 5.9 供给步)'], desc: '随 worktree create 从主仓复制的生成物清单：精确路径或 glob（* 单层 / ** 多层），相对仓根。展开上限 200 文件超出截断警告；实供清单记 meta.supplyFiles；缺省 [] = 供给步空转零行为变化。', example: 'src/build-id.ts' },
        { path: 'worktree.crossPlacement.<repoKey>', type: 'string', optional: true, status: 'live', readers: ['readCrossPlacementConfig + resolvePlacementRoot (src/cross-placement.js) → ensureCrossWorktrees 落位 (src/worktree-cross.js)'], desc: '跨仓 worktree 按仓落位根目录（坑 cross-wt-toolchain-split：主仓在 WSL /root、跨仓在 /mnt/<盘>/ Windows 盘时，默认落位与该仓构建工具链分居互不可访文件系统，隔离形同虚设——2026-10-10 fire-equipment D-007 实证）。worktree 落 <目录>/<change>--<repoKey>；相对路径相对主仓根解析；落位根在跨仓仓根内 = 配置错拒绝创建；落位注册表 cross-placements.json 保 meta/list/cleanup/verify 对账全链寻回。缺省 = 默认公式 <specBase>/.runtime/worktrees/（零回归）。【推荐迁移】repos 条目内联 worktree 子键（repos.<key>: {path: <仓根>, worktree: <落位根>}，2026-10-10 配置简化）——优先级 repos 内联 > 本键 > 默认；本键兼容保留不废。', example: '/mnt/e/sillyspec-worktrees' },
        { path: 'worktree.policy.adopt_branch', type: 'boolean', optional: true, status: 'live', readers: ['readWorktreePolicy (src/worktree-policy.js) → WorktreeManager.create 分支冲突守卫 (src/worktree.js)'], desc: '分支已存在冲突的选择记忆：true = 自动收编既有分支（等效常备 --adopt-branch，meta 记 adoptViaPolicy 留痕）。缺省 false = 既有三选一 fail-closed 菜单。显式 flag 优先于 policy。', example: 'true' },
        { path: 'worktree.policy.apply_overlap', type: 'enum', values: ['manual', 'force', 'skip'], optional: true, status: 'live', readers: ['readWorktreePolicy (src/worktree-policy.js) → applyWorktree guard 相交拦截 (src/worktree-apply.js)'], desc: 'apply 与活跃 quick 会话在途声明相交时的处置记忆：manual（缺省）= 既有 fail-closed 报错；force = 放行并留痕（overlapForced.via 记 policy 来源）；skip = 无人值守软跳过（同 autoApply 路径）。--force 显式 flag 优先。', example: 'manual' },
        { path: 'worktree.policy.stash_dirty', type: 'boolean', optional: true, status: 'live', readers: ['readWorktreePolicy (src/worktree-policy.js) → applyWorktree 4.4 stash 段 (src/worktree-apply.js)'], desc: '主仓在途改动自动 stash 的选择记忆：true = 等效常备 --stash-dirty（stash SHA 显著打印 + 失败绝不 drop）。缺省 false = 显式 flag opt-in。', example: 'false' },
      ],
    },
    {
      id: 'gate_snapshot',
      title: '门禁隔离快照 copy 面',
      note: '门禁快照（gate-snapshot）= HEAD worktree + 会话文件 overlay + 环境目录 junction——gitignored 生成物（类型生成/代码生成产物类）不进 HEAD 也不在会话集，快照内 lint/test 环境性假败（2026-09-16 驾驭小结④，friction5-hardening R4 / D-002@v1）。按本清单在快照构建期从主仓 junction 链接补齐（失败回退复制）；快照内 overlay 已覆盖的同名路径跳过（本变更最新态优先）。⚠️ junction 是活链接：快照内再跑生成命令会写穿到主仓该目录。',
      keys: [
        { path: 'gate_snapshot.copy', type: 'array', optional: true, status: 'live', readers: ['createGateSnapshot (src/run/gate-snapshot.js)'], desc: '门禁隔离快照的生成物/额外路径 copy 面（元素 string，相对仓根）：HEAD 快照缺 gitignored 生成物导致 lint/test 环境性假败；声明后快照构建期从主仓 junction 链接（失败回退复制）。⚠️ junction 是活链接，快照内再跑生成命令会写穿到主仓该目录。未配置/空清单 = 全段空转零行为变化。', example: 'gate_snapshot:\n  copy:\n    - src/generated' },
        { path: 'gate_snapshot.commands', type: 'array', optional: true, status: 'live', readers: ['parseGateSnapshotCommands + runGateSnapshotCommands (src/run/gate-snapshot.js — createGateSnapshot 环境预检后 copy 面前)'], desc: '门禁隔离快照的命令面（元素 string）：快照构建期在环境目录链接后、copy 面前于快照根逐条执行（cwd=快照根、300s/条超时帽、非零退出/超时只 warn 继续——fail-open 不作废快照），产出「本仓应然态」生成物，收口主仓生成物缺失/过期（fresh clone 未跑 postinstall / build-id 类产物）时快照内全量 lint/test 必挂的坑（D-002@v2，2026-09-17-feedback-hardening FR-01）。⚠️ 环境目录（node_modules/venv）是活链接，命令写它们会穿透主仓——只放生成物命令（npm run gen:build-id 类），不放 install/build 全家桶。未配置 = 全段空转零行为。', example: 'npm run gen:build-id' },
      ],
    },
    {
      id: 'flow',
      title: '2-调用轻量协议（R7 切片二）',
      note: 'flow start/done 协议形状开关与路由参数。design 措辞 flow: thin|legacy 落地为单键 flow.mode（YAML 单键形态，语义一致）。',
      keys: [
        { path: 'flow.mode', type: 'enum', values: ['thin', 'legacy'], optional: true, status: 'live', readers: ['readFlowConfig (src/flow.js)'], desc: '2-调用轻量协议开关：thin（缺省——2026-09-25-thin-default-flip 翻转，入口归一：常规变更默认轻量跑道，需求不清晰 CLI 拦下指路头脑风暴预段，实测失败自动升厚）= flow start/done 轻量跑道；legacy = 显式回旧道（run <stage> 全族行为逐字不动，flow start 拒跑并指路）。切回一行 yaml。', example: 'thin' },
        { path: 'flow.edit_ratio_threshold', type: 'number', optional: true, status: 'live', readers: ['readFlowConfig (src/flow.js)'], desc: '机器稿改写比例路由阈值（amend 通道计算的行级 editRatio 超阈 → 厚档提示 route_hint）。缺省 0.5。', example: '0.5' },
        { path: 'flow.edit_ratio_enforcement', type: 'enum', values: ['advisory', 'block'], optional: true, status: 'live', readers: ['readFlowConfig (src/flow.js)'], desc: 'editRatio 超阈的执行档：advisory（缺省——测绿可轻量档过，只提示+遥测）| block（超阈阻断 flow done）。用户裁定 advisory 定案，dogfood 后可按遥测翻 block。', example: 'advisory' },
        // 以下四键为根级标量（无点 path——2026-10-23-config-validate-skill 补登：此前散落
        // 各 reader 内联正则、schema 发现面缺失；校验器按注册面跟随）
        { path: 'turbo', type: 'enum', values: ['docs-auto'], optional: true, status: 'live', readers: ['readFlowConfig (src/flow.js)'], desc: '【2026-10-23-turbo-docs-auto】纯文档面常设极速授权档：docs-auto=CLI 按提交∪脏面自动判纯文档（代码分类器同源）降档 turbo（实测/评审/UI 探针跳过，授权源留痕）；不写=关（--turbo 旗标档不受影响，agent 仍不可自启）。', example: 'docs-auto' },
        { path: 'review_inline_wait', type: 'integer', optional: true, status: 'live', readers: ['readFlowConfig (src/flow.js)'], desc: '【2026-10-23-review-inline-dispatch】薄道评审平台单调用通道等待预算秒数（1-600，钳 300s 帽）：>0 时 flow done 评审缺席分支经 SillyHub 派发 readOnly worker 有界轮询回收、同调用登记（missing→PASS 往返消灭）；任何失败回退任务书面零损失；不写/坏值=关。', example: '180' },
        { path: 'dirty_gate_ignore', type: 'string', optional: true, status: 'live', readers: ['readDirtyGateIgnore (src/flow-parity.js)'], desc: '【2026-10-23-dirty-gate-ignore】dirty 冻结缺口门的已知残渣前缀忽略清单（单行逗号分隔、posix 前缀匹配，module_gate_ignore 同款）：命中面从缺口剔除并每轮 ℹ️ 留痕；三态 fail-soft 未配置=现状。', example: 'quicklog, test/.sillyspec' },
        { path: 'module_gate_ignore', type: 'string', optional: true, status: 'live', readers: ['readFlowConfig (src/flow.js)'], desc: '【2026-10-12-thin-module-gate-and-feed】模块图未登记目录软门的固定忽略清单（单行逗号、目录前缀、posix）——合法未登记面（根级脚本/配置等）免登记签收。', example: 'scripts, .github' },
      ],
    },
    {
      id: 'stage',
      title: '阶段说明书下发与会话墙',
      note: 'run <stage> 渲染与阶段边界行为开关。burst 管「一次下发多少说明书」；wall 管「阶段边界要不要强制换会话」（瘦会话模式强制力）。',
      keys: [
        { path: 'stage.burst', type: 'boolean', optional: true, status: 'live', readers: ['readStageBurst (src/run/shared.js)'], desc: 'burst 模式：一次渲染阶段内全部剩余步骤说明书、一次 --done 收口（CLI 内部循环逐步推进）。R13 对撞实测：CLI 往返锐减（×19→×4）但 token 反创系列新高（单次载荷变肥 + 逐轮全量回放）——只减往返不减 token，非默认推荐（体验项）。env SILLYSPEC_STAGE_BURST=0/1 强制。', example: 'false' },
        { path: 'stage.wall', type: 'enum', values: ['advisory', 'hard'], optional: true, status: 'live', readers: ['readStageWall (src/run/shared.js) + runStage 入口墙 (src/run/stage.js)'], desc: '阶段边界会话墙：advisory（缺省）= 阶段完成时提示可 handoff 换会话，不阻断；hard = 同一会话（SILLYSPEC_SESSION_ID 相同）刚收口前驱阶段后硬续墙后阶段（execute/verify）→ run <stage> 拒启动（exit 1），指引 sillyspec handoff 生成交接块换新会话续跑；--same-session 显式逃生口（应急/平台编排）。墙后阶段 = execute/verify（上下文最贵两段：R15 实测 execute 均轮 263K，断崖拆会话后回落 120-170K）。stage-session ledger 缺失/会话标识不可判定 → 放行（fail-open，与账本 best-effort 一致）。', example: 'hard' },
      ],
    },
    {
      id: 'plan',
      title: '计划阶段派发',
      note: 'plan 阶段 TaskCard 填充派发策略。默认主 agent 直填（2026-09-20 对撞实验：6 个填卡子代理 6.7M token 纯誊写，独立性价值为零）；task 总数超阈值且跨模块才 batch 派子代理——阈值按项目体系可调（厚流程实证 11 任务 3 子代理 430 万 token 模板化产出后引入）。',
      keys: [
        { path: 'plan.fill_batch_min_tasks', type: 'integer', optional: true, status: 'live', readers: ['buildCoordinatorStep (src/stages/plan.js — 协调器 prompt 阈值插值)'], desc: '填卡 batch 派发阈值：task 总数 ≤N（或单仓单模块）→ 主 agent 直填不派子代理；>N 且跨模块/跨仓才按 batch 分派。≥1 整数，缺省 8（内置）；非法值回退 8（fail-safe）。调大 = 更少派子代理省 token；调小 = 大变更更早并行省墙钟。', example: '12' },
        { path: 'plan.auto_adopt_waves', type: 'boolean', optional: true, status: 'live', readers: ['executePlanPostcheck 自动重排门 (src/stages/plan-postcheck.js — tryAutoAdoptWaves)'], desc: 'Wave 形态错误自动重排：plan postcheck 发现「同 Wave 冲突/伪并行串行链」且无其他类错误时，自动跑 plan-adopt-waves 按 depends_on 拓扑重排并整体复跑校验（预算 1 次防环）。缺省 true；置 false 关闭（报错指路手工跑，2026-10-07 前现状）。方向违规自动修复（既有）不受本键影响。', example: 'true' },
      ],
    },
    {
      id: 'auto_mode',
      title: '变更规模自动分类',
      note: 'sillyspec run auto 时，readAutoModeFromLocalYaml 读本段传 classifyChange 的 localConfig，force_*_patterns 匹配需求描述则强制对应模式。',
      keys: [
        { path: 'auto_mode.force_full_patterns', type: 'array', optional: true, status: 'live', readers: ['readAutoModeFromLocalYaml + classifyChange (src/classify-change.js)', 'runCommand (src/run/command.js)'], desc: '需求描述匹配任一正则（i 大小写无关）→ 强制 full 流程。非法正则跳过不崩。', example: '数据库|migration' },
        { path: 'auto_mode.force_quick_patterns', type: 'array', optional: true, status: 'live', readers: ['readAutoModeFromLocalYaml + classifyChange (src/classify-change.js)', 'runCommand (src/run/command.js)'], desc: '需求描述匹配任一正则 → 强制 quick。非法正则跳过不崩。', example: 'fix typo' },
      ],
    },
    {
      id: 'docs-check',
      title: '文档引用校验',
      note: 'sillyspec docs check 的扫描与断言配置（2026-08-15 docs-check-productize）。glob 相对源码仓根展开，仅支持 目录/**/*.扩展、目录/*.扩展、字面路径 三形态。',
      keys: [
        { path: 'docs-check.paths', type: 'array', optional: true, status: 'live', readers: ['docs check (src/index.js case docs) + runDocsCheck (src/docs-check.js)'], desc: '扫描的文档 glob 列表，缺省 docs/**/*.md 与 .sillyspec/docs/**/*.md（scan/modules 产物同纳入）。', example: 'docs/**/*.md' },
        { path: 'docs-check.skip', type: 'array', optional: true, status: 'live', readers: ['walkGlob (src/docs-check.js)'], desc: '排除的路径/glob 列表，缺省空。', example: 'docs/sillyspec/archive' },
        { path: 'docs-check.keywordAssert', type: 'boolean', optional: true, status: 'live', readers: ['runDocsCheck (src/docs-check.js)'], desc: '层2 关键词断言开关，缺省 true（关闭时 warning 提示仅做存在性校验）。', example: 'true' },
        { path: 'docs-check.living-docs', type: 'array', optional: true, status: 'live', readers: ['resolveLivingDocs (src/run/shared.js) — 经 readLocalYamlRaw 直读'], desc: '活文档监控点追加列表（docs check 之外，quick 审计的 livingDocDrift 真失效提示也监控——只报校验真失败的引用，全过零输出）。只追加不覆盖缺省集合（缺省：docs/sillyspec/platform-interface-map.md）。配了是加哨兵，不该把缺省监控点挤掉。', example: 'docs/sillyspec/architecture.md' },
        { path: 'docs-check.cross_repo_roots', type: 'object', optional: true, status: 'live', readers: ['readDocsCheckConfig (src/docs-check.js)'], desc: 'repo://<仓库名> 跨仓引用 → 本机仓库根目录映射。文档里 repo://name/src/x.js:12 形态的引用：未配映射默认跳过（不同设备仓库位置不同，防跨设备误报）；配了映射走与本地引用相同的行号+关键词校验。local.yaml 是 gitignored，绝对路径不入库，每台设备各自配。', example: 'sillyspec: /c/Users/you/IdeaProjects/sillyspec' },
      ],
    },
    {
      id: 'decisions',
      title: '决策库复核阈值',
      note: 'docs-check 决策规则（W1.1 behind 复核）的消费配置——决策锚定模块源码在「最近确认」后前进超阈值 → doctor 报「决策待复核」（advisory 不阻断）。读键按「存在则读、不存在用缺省」容错。',
      keys: [
        { path: 'decisions.behind_threshold', type: 'integer', optional: true, status: 'live', readers: ['readDecisionRulesConfig (src/docs-check.js)'], desc: '决策 behind 复核阈值（锚定模块源码在「最近确认」commit 后的前进数），缺省 10；超阈报「决策待复核」提示。', example: '10' },
      ],
    },
    {
      id: 'review_probes',
      title: '项目评审探针',
      note: '评审任务书的项目特有必查面注入（2026-10-12-review-probe-injection，dogfood 实证：检查单由主代理手写时，主代理没想到的面无人查——三个生产缺陷全靠用户报障发现）。CLI 只做装配与容量治理（条目≤16/每条行≤12/单行≤300 字符/命令超时 10s/输出≤2KB·20 行），内容完全开放：零内容枚举、零语言/框架绑定，清单行与命令由项目自定。未配置=两面任务书（轻量 thin / 厚档 thick）与历史形态逐字一致（零回归）。读键容错：坏条目跳过+告警、命令失败/超时跳过该行源，永不阻断任务书渲染。',
      keys: [
        { path: 'review_probes.id', type: 'string', optional: false, status: 'live', readers: ['parseReviewProbes (src/review-probes.js) → renderReviewerTaskbook (src/flow-review.js, thin) + buildReviewerTaskBook (src/review-dispatch.js, thick)'], desc: '探针标识（自由文本 ≤64 字符，非空）——注入行前缀「<id>｜」，供评审逐条对答。', example: 'startup-smoke' },
        { path: 'review_probes.scope', type: 'string', optional: true, status: 'live', readers: ['resolveProbeLines (src/review-probes.js)'], desc: '注入哪面任务书：thin（轻量评审任务书）/ thick（厚档 stage 评审）/ all（缺省）。这是 CLI 自有的两个任务书面集合，非内容枚举。', example: 'all' },
        { path: 'review_probes.lines', type: 'array', optional: true, status: 'live', readers: ['resolveProbeLines (src/review-probes.js)'], desc: '静态清单行（自由文本，内容完全开放——项目自定必查面，如「变更触及启动路径时核对新增注册项与既有注册互斥」）。与 command 至少一非空。', example: '["新增配置键须与既有键冲突扫描核对"]' },
        { path: 'review_probes.command', type: 'string', optional: true, status: 'live', readers: ['resolveProbeLines (src/review-probes.js) → defaultRunCommand (spawnSync, timeout 10s)'], desc: '可选命令串（任意 shell，stdout 非空行追加为清单行，带 <id>｜ 前缀）——动态行源（如生成当前项目的高危面清单）；输出帽 2KB/20 行，失败/超时 fail-soft 跳过。', example: 'node scripts/list-review-probes.js' },
      ],
    },
    {
      id: 'friction_hint',
      title: '摩擦提示开关',
      note: 'quick/verify 收尾的摩擦信号计数提示配置（friction-signal-hint）。读键按「存在则读、不存在用缺省」容错：读失败与未配置同兜底为默认开。',
      keys: [
        { path: 'friction_hint.enabled', type: 'boolean', optional: true, status: 'live', readers: ['readFrictionHintEnabled (src/friction-tally.js)'], desc: '摩擦提示开关，默认 true；设 false 关闭摩擦提示（gate 回滚/验证失败/审查打回的收尾 advisory 与计数落盘全停，.runtime 零写入）。', example: 'true' },
      ],
    },
    {
      id: 'semantic_guard',
      title: '语义守卫开关',
      note: 'quick 进场注入与 --done 断言 WARNING 的跨变更决策守卫配置（cross-change-decision-guard）。读键按「存在则读、不存在用缺省」容错：读失败与未配置同兜底为默认开（fail-open，advisory 误开无害）。',
      keys: [
        { path: 'semantic_guard.enabled', type: 'boolean', optional: true, status: 'live', readers: ['readSemanticGuardEnabled (src/semantic-guard.js)'], desc: '语义守卫总开关，默认 true；设 false 时 quick 进场注入与 --done 断言 WARNING 全停零开销。', example: 'true' },
      ],
    },
    {
      id: 'quick-gate',
      title: 'quick 出口门禁阈值',
      note: 'quick --done 分级门禁（L0/L1/L2 advisory）的四个数值阈值覆写（2026-09-14-quick-exit-tiered-gates，D-009）。缺省=src/quick-gate-profile.js 的 THRESHOLDS 代码内校准值，仅确知调参时配置；键非法（非 ≥1 整数）回退默认并 warn。',
      keys: [
        { path: 'quick-gate.l1_span', type: 'integer', optional: true, status: 'live', readers: ['resolveGateThresholds (src/quick-gate-profile.js)'], desc: 'L1 模块跨度阈值：非文档文件命中 ≥N 个模块 → L1（缺省 2）。', example: '2' },
        { path: 'quick-gate.l1_files', type: 'integer', optional: true, status: 'live', readers: ['resolveGateThresholds (src/quick-gate-profile.js)'], desc: 'L1 文件数阈值：变更文件 ≥N → L1（缺省 4）。', example: '4' },
        { path: 'quick-gate.l2_span', type: 'integer', optional: true, status: 'live', readers: ['resolveGateThresholds (src/quick-gate-profile.js)'], desc: 'L2 模块跨度阈值：命中 ≥N 个模块 → L2（缺省 4）。', example: '4' },
        { path: 'quick-gate.l2_files_degraded', type: 'integer', optional: true, status: 'live', readers: ['resolveGateThresholds (src/quick-gate-profile.js)'], desc: 'module-map 缺失降级档的 L2 文件数阈值：变更文件 ≥N → L2（缺省 8）。', example: '8' },
      ],
    },
    {
      id: 'change-ownership',
      title: '变更所有权守卫',
      note: '接管类操作（apply/cleanup/archive）对他人活跃 change 的所有权校验调参（2026-09-14-change-ownership-guards，D-001/D-005@v1）。缺省 15 分钟，仅确知调参时配置。',
      keys: [
        { path: 'change-ownership.heartbeat_minutes', type: 'integer', optional: true, status: 'live', readers: ['assertChangeOwnership (src/progress/change-registry.js — 本变更 task-02 接线消费)'], desc: '所有者活跃心跳窗口（分钟）：owner 非本会话且 last_active 距今在窗口内 → 拒绝接管类操作（--takeover 显式接管）；窗口外 → 放行并自动接管。缺省 15。', example: '15' },
      ],
    },
    {
      id: 'ui_prototype',
      title: 'UI 原型形态契约（每仓）',
      note: '【2026-10-15-ui-proto-form-config】frontend 触达的 UI 变更定稿原型形态：real-code=真码走仓内原型管线（推荐）；single-html=单 HTML 例外（须 ruling 三键留痕：by/at/reason）。缺省未配置=flow start 强提醒登记。',
      keys: [
        { path: 'ui_prototype.form', type: 'enum', values: ['real-code', 'single-html'], optional: true, status: 'live', readers: ['readUiPrototypeForm (src/ui-visual.js)'], desc: '本仓原型形态契约：real-code（真码管线）/ single-html（单 HTML 例外，须 ruling 裁决留痕）。', example: 'real-code' },
        { path: 'ui_prototype.<key>', type: 'string', optional: true, status: 'live', readers: ['readUiPrototypeForm (src/ui-visual.js)——豁免裁决 ruling{by,at,reason} 等扩展子键'], desc: '扩展子键占位（豁免裁决 ruling 族等）——子键名开放，校验不枚举。', example: 'ruling_by' },
      ],
    },
    {
      id: 'ceremony',
      title: '评审仪式档位（ceremony tier）',
      note: '仪式档位（S0~S3）由 CLI 按 blast/span/friction 三轴风险客观定价（blast 轴输入=项目声明危险面 _module-map.yaml 顶层 blast 段，2026-09-19-ceremony-pricing-five-cuts；span 轴路径模式输入=项目声明 _module-map.yaml 顶层 span_risk 段，2026-09-19-span-risk-pattern-migration，无声明项目该维关闭不回退内置表）；完成门声明追赶重定价——无摩擦迁移随声明面可升可降、有摩擦迁移地板不退，force_tier 仍只升不降；本段是逃生阀/影子期开关/逐机升档面 + 项目化定价阈值（2026-09-20：每个项目体系不一样，起点与阈值可配）。读键按「存在则读、不存在用缺省」容错（定价键读取走 readCeremonyPricingConfig，开关面走 readCeremonyLocalConfig）。',
      keys: [
        { path: 'ceremony.blast_surfaces', type: 'json', optional: true, status: 'live', readers: ['loadBlastDeclarations (src/blast-surface.js — local 逐机升档，与 map 声明逐文件取 max)'], desc: 'blast 危险面逐机覆盖：[{ prefixes: [...], tier: S0~S3 }]——主声明在 _module-map.yaml 顶层 blast 段（进 git、可挂 evidence 位）；本键只升不降（与 map 命中逐文件取 max，压低共享声明无效）、不承载 evidence（证据语义属共享 map，D-009）。非法条目静默跳过。', example: '[{ prefixes: [src/my-daemon/], tier: S3 }]' },
        { path: 'ceremony.default_tier', type: 'enum', values: ['S0', 'S1', 'S2', 'S3'], optional: true, status: 'live', readers: ['readCeremonyPricingConfig (src/ceremony-config.js → computeCeremonyTier blast 轴保守缺省——review-tier/verify-postcheck 双跑两侧同源注入)'], desc: '项目化定价·缺省档（default_tier）：blast 轴无 risk 输入时的保守起点（内置 S2）。小工具仓可降 S1、强合规仓可升 S3——每个项目按自己的体系定。只改起点，不影响「只升不降」纪律。', example: 'ceremony: { default_tier: S1 }' },
        { path: 'ceremony.span_files_threshold', type: 'integer', optional: true, status: 'live', readers: ['readCeremonyPricingConfig (src/ceremony-config.js → computeCeremonyTier span 轴文件数阈值)'], desc: '项目化定价·span 文件阈值（span_files_threshold）：声明文件数 ≥N → 至少 S2（内置 8）。小仓 3 个文件就算摊子大就配 3。≥1 整数。', example: 'ceremony: { span_files_threshold: 3 }' },
        { path: 'ceremony.span_modules_threshold', type: 'integer', optional: true, status: 'live', readers: ['readCeremonyPricingConfig (src/ceremony-config.js → computeCeremonyTier span 轴跨模块阈值)'], desc: '项目化定价·span 跨模块阈值（span_modules_threshold）：跨模块数 ≥N → 至少 S2（内置 3）。≥1 整数。', example: 'ceremony: { span_modules_threshold: 2 }' },
        { path: 'ceremony.friction_escalation_threshold', type: 'integer', optional: true, status: 'live', readers: ['readCeremonyPricingConfig (src/ceremony-config.js → computeCeremonyTier friction 轴起爆线)'], desc: '项目化定价·friction 起爆线（friction_escalation_threshold）：gate_rollback+review_rejected 合计 ≥N → 升一档封顶 S3（内置 2，两振出局）。强合规仓配 1 = 一次拦拒即升档。≥1 整数。', example: 'ceremony: { friction_escalation_threshold: 1 }' },
        { path: 'ceremony.risk_tier_map', type: 'json', optional: true, status: 'live', readers: ['readCeremonyPricingConfig (src/ceremony-config.js → computeCeremonyTier 五级词映射部分覆写)'], desc: '项目化定价·五级词→档位映射覆写（部分覆写：只覆写声明的词，未声明词保持内置 doc-only→S0 / unit-sufficient→S1 / contract-required→S2 / integration-critical→S3 / deployment-critical→S3）。例：{ unit-sufficient: S2 } = 该仓单测级变更也走独立评审。非法词/档位 warn 后忽略。', example: 'ceremony: { risk_tier_map: { unit-sufficient: S2 } }' },
        { path: 'ceremony.force_tier', type: 'enum', values: ['S0', 'S1', 'S2', 'S3'], optional: true, status: 'live', readers: ['readCeremonyLocalConfig (src/run/prompt.js — {REVIEW_TIER} 注入档位菜单/强制轻仪审计痕)', '影子派发前置校验 (src/review-dispatch.js — task-06 影子期框架接线)'], desc: '档位逃生阀：强制仪式档 S0~S3，绕过客观定价（过渡期「就是不信这套」用）。prompt 注入面只升不降——强制档低于客观定价档时不降档（防 prompt 面与 gate 侧判定分裂）；非法值 warn 后忽略。', example: 'S3' },
        { path: 'ceremony.shadow', type: 'boolean', optional: true, status: 'live', readers: ['readCeremonyLocalConfig (src/run/prompt.js — S0/S1 轻档注入影子期注记)', 'runReviewDispatch 影子前置校验 (src/review-dispatch.js — task-06 影子期框架接线)'], desc: '影子期开关，默认 true（on）：S0/S1 轻档明面轻仪、后台静默派发重仪式只记账不阻断（影子派发框架随 task-06 落地）；置 off = 轻仪转正（转正判据由 doctor 影子对照维度公示，CLI 只出判据不出手）。', example: 'true' },
      ],
    },
  ],
};

/** 全部键（拍平），便于 JSON 输出与 example 耦合测试。 */
export function flatKeys() {
  return LOCAL_YAML_SCHEMA.sections.flatMap((s) => s.keys.map((k) => ({ section: s.id, ...k })));
}

/** 人类可读树形 schema 文本。live 在前、declared 在后，段内逐键列 path/type/约束/读取点/说明。 */
export function renderSchemaHuman() {
  const L = [];
  L.push('SillySpec local.yaml 配置清单');
  L.push(`文件：${LOCAL_YAML_SCHEMA.file} — ${LOCAL_YAML_SCHEMA.note}`);
  L.push('数据源：src/config-schema.js（本表唯一真相；reader 见各键「读取点」，符号名可 grep）');
  L.push('');

  const all = flatKeys();
  const live = all.filter((k) => k.status === 'live');
  const declared = all.filter((k) => k.status === 'declared');

  L.push(`━━━ 生效（${live.length} 键，配了即生效） ━━━`);
  L.push('');
  for (const s of LOCAL_YAML_SCHEMA.sections) {
    const keys = s.keys.filter((k) => k.status === 'live');
    if (keys.length === 0) continue;
    L.push(`[${s.id}] ${s.title}`);
    L.push(`    ${s.note}`);
    for (const k of keys) {
      L.push(`  ${k.path}${formatConstraint(k)}    ${k.desc}`);
      if (k.readers.length) L.push(`      读取点：${k.readers.join('；')}`);
    }
    L.push('');
  }

  L.push(`━━━ 声明但未接线（${declared.length} 键，配了不生效 / 待接线债） ━━━`);
  L.push('');
  for (const s of LOCAL_YAML_SCHEMA.sections) {
    const keys = s.keys.filter((k) => k.status === 'declared');
    if (keys.length === 0) continue;
    L.push(`[${s.id}] ${s.title}`);
    L.push(`    ${s.note}`);
    for (const k of keys) {
      L.push(`  ${k.path}${formatConstraint(k)}    ${k.desc}`);
    }
    L.push('');
  }
  return L.join('\n');
}

function formatConstraint(k) {
  const tags = [];
  if (k.required) tags.push('必填');
  if (k.optional) tags.push('可选');
  if (k.secret) tags.push('凭据');
  if (k.type === 'enum' && k.values) tags.push(k.values.join('|'));
  else tags.push(k.type);
  return tags.length ? `  [${tags.join(' · ')}]` : '';
}

/** 机读 JSON（程序化消费）。结构 = LOCAL_YAML_SCHEMA 本体 + flatKeys 视图。 */
export function renderSchemaJson() {
  return JSON.stringify({
    file: LOCAL_YAML_SCHEMA.file,
    note: LOCAL_YAML_SCHEMA.note,
    sections: LOCAL_YAML_SCHEMA.sections,
    keys: flatKeys().map(({ section, path, type, values, required, optional, secret, status, readers, desc }) => ({
      section, path, type, values, required, optional, secret, status, readers, desc,
    })),
  }, null, 2);
}

/**
 * 脱敏 local.yaml 示例文本（sillyspec init 落盘用）。
 * 策展模板（非自动生成）：YAML 形态各异（嵌套/inline flow/顶层标量），策展可读性远胜自动拼。
 * 与 SCHEMA 的耦合由测试保证：每个 live 键路径必出现于本文本。
 */
export function renderExample() {
  return `# SillySpec local.yaml — 脱敏示例（由 sillyspec init 生成，可提交）
# 真实配置文件 .sillyspec/local.yaml 是 gitignored（含敏感凭据）。
# 用法：复制本文件为 .sillyspec/local.yaml，填真实值；或直接 sillyspec platform connect 自动写凭据段。
# 全部键与生效状态：sillyspec config schema

# ── 项目类型（sillyspec local detect 自动写入，一般无需手填）──
project:
  type: nodejs   # nodejs | maven | gradle | make | generic

# ── 构建/测试/lint 命令（detect 核验 scripts 存在性后才写；缺失键省略）──
commands:
  build: npm run build
  test: npm test
  lint: npm run lint
  # smoke: node scripts/smoke.mjs   # verify 冒烟命令（可选；脚本自理服务生命周期，失败只封顶 PASS 不阻断）
  # install: npm install   # worktree 依赖安装命令
  # test_timeout_sec: 2400   # commands.test 超时秒数（慢仓提帽；缺省 600，env SILLYSPEC_TEST_TIMEOUT_MS 同效）
  # lint_timeout_sec: 600    # commands.lint 超时秒数（缺省 180）
  # metrics: npx jscpd src   # 可选指标门：收口实测非零退出阻断（复杂度/重复/死代码/覆盖率阈值类秒级检查；执行注入 SILLYSPEC_CHANGE_FILES=本变更文件清单可只扫变更面；变异测试类慢工具建议 pre-push/CI）
  # metrics_timeout_sec: 600   # commands.metrics 超时秒数（缺省 180）
# metrics_routes:             # 多语言/monorepo 路由门（与上面 metrics 单命令可共存；仅跑变更命中的 gate）
#   web:
#     paths: ["frontend/", "packages/web/"]   # 路径前缀集合（段全等：frontend/ 不蹭 frontend-v2/）
#     command: npx --prefix frontend eslint . --max-warnings 0
#   jvm:
#     paths: ["backend/"]
#     command: mvn -B -f backend/pom.xml pmd:check
#     timeout_sec: 300         # gate 级超时（缺省 180）；gate 子进程注入 SILLYSPEC_CHANGE_FILES=命中子集
  # knowledge-gate: false    # 方案步 --done 知识检索命中回显开关（缺省 true 开；false 关回显）

# ── 影子存档（task tick 快照；缺省开启零配置，仅在显式调优时写）──
# checkpoint:
#   enabled: true             # 影子存档开关（false 关闭，tick 照常）
#   maxUntrackedMB: 200       # 体积护栏——未忽略 untracked 总量超此 MB 数跳过存档留痕

# ── 知识检索（平台向量语义召回）──
# 缺省（未写整段）跟随平台能力自动探测：端点在场自动启用、未部署自动跳过（部署后自动
# 启用，零配置）。仅显式逃生阀时才需要写：
# knowledge:
#   vector_search: off   # 强制关（on=强制开跳过探测）

# ── SillyHub MCP 客户端凭据（派发到 worker 用）──
# agent 手填，或 sillyspec platform connect 在 mcp 段缺失时同源自动填。
# 两键齐全才生效；缺则回退环境变量 SILLYHUB_MCP_URL / SILLYHUB_MCP_TOKEN。
mcp:
  url: https://your-sillyhub.example.com
  token: <your-mcp-token>

# ── SillyHub 平台同步（sillyspec platform connect 写入，含 ping 验活）──
platform:
  url: https://your-sillyhub.example.com
  token: <your-platform-token>
  user: alice                 # 推送者身份（可空，回退 git user.name / env）
  # last_connected: 2026-08-11T00:00:00.000Z   # connect 自动写，勿手填

# ── 派发调参（仅确知调优值时填，否则留默认）──
dispatch:
  probe_ttl_ms: 60000         # 派发探测负面缓存 TTL（默认 60000）
  # poll_interval_ms: 15000   # ⚠ 路径A 预留·未落地，配了暂不生效
  # worker_timeout_ms: 60000  # ⚠ 路径A 预留·未落地，配了暂不生效

# ── 2-调用轻量协议（R7 切片二；缺省 thin 即轻量跑道，无需配置）──
# flow:
#   mode: thin               # thin=flow start/done 轻量跑道（协议必需交互=2）| legacy=既有 run <stage> 全族（回滚一行）
#   edit_ratio_threshold: 0.5   # 机器稿改写比例路由阈值（超阈提示厚档；缺省 0.5）
#   edit_ratio_enforcement: advisory   # advisory=测绿可轻量过只提示（缺省）| block=超阈阻断
#
# ── 收口调优（根级键，缺省零配置即用——注释态=缺省已最优，确要调优再解注释）──
# turbo: docs-auto   # 纯文档面自动极速档（实测/评审/UI 探针跳过，授权源留痕）；不写=关
# review_inline_wait: 180   # 评审平台单调用等待秒（1-600，需 SillyHub）；不写=评审任务书面模式
# dirty_gate_ignore: quicklog, test/.sillyspec   # dirty 门已知残渣前缀（单行逗号、posix 前缀）
# module_gate_ignore: scripts   # 模块图软门固定忽略目录（单行逗号、前缀匹配）
# commands:
#   scan:check: python scripts/scan-drift-check.py   # scan 漂移自检命令
# module_paths: { backend: backend/, frontend: frontend/ }   # 旧字段（部分工具仍用；新配置勿写）
# ui_prototype:
#   form: real-code   # UI 原型形态契约（real-code / single-html+ruling 豁免）
# fr_regress_cap: 40   # FR 回归层本地开关：缺省不跑归 pre-push/CI 门；N=前 N 个；all=全跑旧行为
# fr_unmapped_baseline: 720   # unmapped 域 FR 消音基线（跨仓历史堆积已清算时设）
# runner_flags:            # 推断批尾随 flags（按批类别 py|js|jsx|…，未知类别前向兼容）
#   py: "-q --no-cov -n auto"
# deps_regress_cap: off    # import 依赖面：off=只跑变更自身测试；N=前 N 个依赖文件；不写=全跑
#
# ── 跨仓注册表（注册后参与跨仓冻结/对账；local.yaml gitignored 故真实路径不入库）──
# repos:
#   shared-lib: C:/path/to/shared-lib   # 或对象形态 {path: …, worktree: <跨仓落位根>}

# ── 阶段说明书下发与会话墙（R16 减负批次）──
# stage:
#   # burst: true   # 一次下发全阶段说明书（R13 实测：往返↓ token↑，体验项非默认）
#   # wall: hard    # 阶段边界会话墙（hard=同会话硬续 execute/verify 拒启动，指引 handoff；缺省 advisory 提示不阻断）

# ── worktree 守卫选择记忆（R16 减负批次；显式 flag > policy > fail-closed 缺省）──
# worktree:
#   policy:
#     # adopt_branch: true    # 分支已存在冲突自动收编（等效常备 --adopt-branch）
#     # apply_overlap: manual # manual=fail-closed（缺省）| force=放行留痕 | skip=软跳过
#     # stash_dirty: false    # true=主仓在途改动自动 stash（等效常备 --stash-dirty）
#   crossPlacement:          # 跨仓 worktree 按仓落位（坑 cross-wt-toolchain-split：主仓 WSL + 跨仓
#     # urgent: /mnt/e/wt    #   Windows 盘时工具链够不着默认落位——配到跨仓工具链可达的目录）
#                            #   ↑推荐改用 repos 条目内联（一处声明注册+落位）：
#                            #   repos:
#                            #     urgent:
#                            #       path: /mnt/e/Java/crrc/qmdp/urgent
#                            #       worktree: /mnt/e/sillyspec-worktrees

# ── 测试策略（2026-09-26-dynamic-test-inference 起）──
# 缺省=动态子集：本变更测试 ∪ FR 关联回归（active FR 覆盖面∩触碰文件→绑定 tests）∪ import 依赖，
#   runner 自项目结构推断（pyproject/uv.lock/package.json 就近祖先）——modules.*.test 与 commands.test
#   均不再需要（后者仅显式 full 时作全量逃生阀）。三源空（doc-only）不硬跑全量。
# full=全量（commands.test 在场生效，否则按 package.json scripts.test / pyproject 推断）
# skip=真跳过测试（不回退全量，verify 输出显式标注留审计痕迹）
# evidence-auto=按变更 module-impact.md 影响面推荐（行为→动态子集、文档→docs-check、门禁→gate）
# test_strategy: full   # 缺省注释态=动态子集（评审 P3-5 清偿：复制即全量道的自相矛盾陷阱——缺省注释才与上方「缺省=动态子集」一致）；确要全量再解注释
# verify:
#   test_rerun: incremental   # 实测门失败后重跑档：incremental（缺省，下轮只跑失败批∪修复面）| full（恒全子集重跑，保守项目用）

# ── 证据门档位（2026-09-27-ui-visual-guidance / 2026-09-27-hunk-attribution-gate；注释态=缺省档位生效）──
# ui_visual_gate: warn   # UI 视觉证据分级门：warn（缺省，缺 visual-evidence.md 仅警告）| error（缺证据即阻断）| off（探针整体关闭；视觉降级无用户裁决留痕时无论档位恒阻断）
# hunk_gate: warn        # 提交面行级归属门：warn（缺省）| error（未归因文件/跨变更竞争任一在场阻断收口；在途残留恒仅警告——并发 WIP 弱信号不硬拦）| off（关闭）

# ── monorepo 子模块路径映射（.path 仍被 plan/worktree-deps 消费；.test 已退役勿再配）──
modules:
  frontend: { path: "frontend/" }
  backend: { path: "backend/" }

# ── 决策库 behind 复核阈值（docs-check 决策规则：源码在「最近确认」后前进超阈值 → 待复核提示；缺省 10）──
decisions:
  behind_threshold: 10

# ── 项目评审探针（评审任务书的项目特有必查面注入——CLI 只装配不枚举，内容完全开放、语言/框架无关；
#    thin=轻量评审任务书 / thick=厚档 stage 评审 / all=两面；未配置零注入。命令行源超时 10s、输出帽 2KB/20 行）──
review_probes:
  - id: startup-smoke            # 探针标识（自由文本，注入行前缀「<id>｜」）
    scope: all                   # thin | thick | all（缺省 all）
    lines:                       # 静态清单行（自由文本——项目自定必查面）
      - 变更触及启动路径时，核对新增注册项与既有注册互斥
    # command: node scripts/list-review-probes.js   # 可选动态行源（任意 shell，stdout 非空行追加）

# ── 摩擦提示开关（quick/verify 收尾的摩擦信号一行 advisory：gate 回滚/验证失败/审查打回计数）──
# 默认 true 开启；false 一键全关（计数与提示双停，.runtime 零写入）
friction_hint:
  enabled: true

# ── 语义守卫开关（quick 进场注入 + --done 断言 WARNING 的跨变更决策守卫）──
# 默认 true 开启；false 一键全停（进场注入与断言 WARNING 双停，零开销）
semantic_guard:
  enabled: true

# ── 预存失败豁免清单（变更前就失败的测试行；务必定期复核，防误豁免真实失败）──
known_failures:
  - tests/some-old-stable-failure

# ── 等效验证先例库（标准测试/构建命令在本仓不可用时的既有替代口径；verify prompt 自动注入）──
verify_precedents:
  - id: standard-test-command-blocked
    standard_command: mvn test
    reason: 框架 parent pom 硬编码 surefire skip=true，-D 覆盖无效
    equivalent: mvn dependency:build-classpath + javac + JUnitCore 直跑
    established_by: <确立该等效口径的变更名>

# ── worktree-guard 只读命令扩展（execute worktree 隔离期内放行额外只读命令）──
worktree-hook:
  readonlyCommands:
    - rg
    - fd

# ── worktree 生成物供给（gitignore 生成物不随 git 树/untracked overlay 进 worktree，create 期从主仓复制）──
# 精确路径或 glob（* 单层 / ** 多层），相对仓根；展开上限 200 文件超出截断警告；缺省不供给零行为变化。
# worktree:
#   supplyFiles:
#     - src/build-id.ts

# ── 门禁隔离快照 copy 面（HEAD 快照缺 gitignored 生成物 → 快照内 lint/test 环境性假败；构建期从主仓 junction 补齐）──
# 相对仓根路径列表；失败回退复制；快照内 overlay 已覆盖的同名路径跳过。
# ⚠️ junction 是活链接：快照内再跑生成命令会写穿到主仓该目录。
# commands 面（D-002@v2）：快照构建期在快照根逐条执行的生成物命令（postinstall/build-id 类，
# 产出本仓应然态；300s/条超时帽，失败 warn 继续）。⚠️ 命令不得改写 node_modules/venv 等
# 环境目录（活链接，写穿透主仓）——只放生成物命令。
# gate_snapshot:
#   copy:
#     - src/generated
#   commands:
#     - npm run gen:build-id

# ── 变更规模自动分类（sillyspec run auto 时按需求描述强制 quick/full；正则数组，i 大小写无关）──
auto_mode:
  force_full_patterns:
    - 数据库|migration
  force_quick_patterns:
    - fix typo

# ── 文档引用校验（sillyspec docs check；glob 相对源码仓根，三形态：递归/单层/字面路径）──
# 缺省已扫 docs/**/*.md 与 .sillyspec/docs/**/*.md；本段仅在需要收窄/排除时配置
docs-check:
  paths:
    - docs/**/*.md
    - .sillyspec/docs/**/*.md
  # skip:
  #   - docs/sillyspec/archive
  keywordAssert: true
  # living-docs:   # 活文档监控点追加（缺省已含 docs/sillyspec/platform-interface-map.md，只加哨兵不覆盖）
  #   - docs/sillyspec/architecture.md
  # cross_repo_roots:   # repo://<仓库名> 跨仓引用 → 本机仓库根（每台设备各自配，绝对路径勿提交）
  #   sillyspec: /c/Users/you/IdeaProjects/sillyspec

# ── quick 出口门禁阈值（quick --done 分级门禁 L0/L1/L2 的 advisory 阈值覆写；缺省=代码内校准值）──
# 仅确知调参时配置；键非法（非 ≥1 整数）回退默认并 warn。
# quick-gate:
#   l1_span: 2              # 跨 ≥2 模块 → L1
#   l1_files: 4             # 或 ≥4 文件 → L1
#   l2_span: 4              # 跨 ≥4 模块 → L2
#   l2_files_degraded: 8    # module-map 缺失降级档：≥8 文件 → L2

# ── 变更所有权守卫（接管类操作 apply/cleanup/archive 对他人活跃 change 校验；缺省 15 分钟）──
# owner 非本会话且 last_active 在窗口内 → 拒绝（--takeover 显式接管）；窗口外 → 自动接管。
# change-ownership:
#   heartbeat_minutes: 15   # 所有者活跃心跳窗口（分钟）

# ── 计划阶段派发（plan：TaskCard 填充派发策略）──
# 默认主 agent 直填（对撞实验：6 个填卡子代理 6.7M token 纯誊写，独立性价值为零）；
# 仅 task 总数超阈值且跨模块/跨仓才按 batch 派子代理（并行省墙钟有真实收益）。
# plan:
#   fill_batch_min_tasks: 12             # 填卡 batch 派发阈值（内置 8；调大=更少派子代理省 token，调小=大变更更早并行）
#   auto_adopt_waves: true               # Wave 形态错误自动拓扑重排（内置 true；false=报错指路手工跑）

# ── 评审仪式档位（ceremony tier：S0~S3 由 CLI 按 blast/span/friction 三轴风险客观定价）──
# blast 轴输入=项目声明危险面（_module-map.yaml 顶层 blast 段）；完成门声明追赶重定价（无摩擦随声明、有摩擦地板不退）。
# 项目化定价（每个项目体系不一样，起点与阈值可配——只升不降纪律不开放配置）：
#   default_tier 缺省档 / span_files_threshold 文件阈值(内置8) / span_modules_threshold 跨模块阈值(内置3)
#   / friction_escalation_threshold 起爆线(内置2) / risk_tier_map 五级词映射部分覆写。
# force_tier 强制档位绕过客观定价（过渡逃生阀，prompt 注入面只升不降）；shadow 影子期默认 on——
# S0/S1 轻档明面轻仪、后台静默派发重仪式对照只记账不阻断；置 off = 轻仪转正（转正判据见 doctor 影子对照）。
# ceremony:
#   default_tier: S1                     # 缺省档（内置 S2；小仓 S1 / 强合规 S3）
#   span_files_threshold: 3              # 文件数阈值（内置 8）
#   span_modules_threshold: 2            # 跨模块阈值（内置 3）
#   friction_escalation_threshold: 1     # 起爆线（内置 2，两振出局；强合规 1）
#   risk_tier_map: { unit-sufficient: S2 }  # 五级词部分覆写（未声明词保持内置）
#   force_tier: S3            # 强制全重仪式（逃生阀；S0 | S1 | S2 | S3）
#   shadow: true              # 影子期开关（默认 true）
#   blast_surfaces:           # blast 逐机升档（只升不降、不承载 evidence；主声明在 _module-map.yaml blast 段）
#     - prefixes: [src/my-daemon/]
#       tier: S3
`;
}
