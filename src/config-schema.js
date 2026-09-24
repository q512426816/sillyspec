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
        { path: 'commands.test', type: 'string', optional: true, status: 'live', readers: ['extractTestCommand (src/verify-postcheck.js)', 'runQuickTestLintGate (src/run/quick-audit.js)', 'validateCommands (src/scan-postcheck.js)'], desc: '测试命令——verify 阶段 CLI 亲自执行此命令与 verify-result.md 对账，实测失败即阻断；quick --done 触及 src/test 时同款实测（P0-2 门禁）。', example: 'npm test' },
        { path: 'commands.lint', type: 'string', optional: true, status: 'live', readers: ['detectLocalYaml (src/local-detect.js)', 'runQuickTestLintGate (src/run/quick-audit.js)', 'validateCommands (src/scan-postcheck.js)'], desc: 'lint 命令——quick --done 触及 src/test 时 CLI 亲自执行（P0-2 门禁，失败阻断完成）。', example: 'npm run lint' },
        { path: 'commands.test_timeout_sec', type: 'number', optional: true, status: 'live', readers: ['resolveTestTimeoutMs (src/verify-postcheck.js)'], desc: 'commands.test 超时秒数（R9 实证 2026-09-23：全量套件实测可达 27min，固定 600s 帽必杀）——优先级 local.yaml 本键 > env SILLYSPEC_TEST_TIMEOUT_MS > 缺省 600。慢仓在此提帽，防真慢套件被当超时失败。', example: '2400' },
        { path: 'commands.lint_timeout_sec', type: 'number', optional: true, status: 'live', readers: ['runVerifyLintCheck (src/verify-postcheck.js)'], desc: 'commands.lint 超时秒数——优先级 显式调用参 > 本键 > env SILLYSPEC_LINT_TIMEOUT_MS > 缺省 180（快照内 junction I/O 慢，快照路径调用侧显式传 300）。', example: '600' },
        { path: 'commands.smoke', type: 'string', optional: true, status: 'live', readers: ['executeVerifyQualityScan (src/run/verify-quality-scan.js)'], desc: '接口冒烟命令——verify 阶段 CLI 亲跑（脚本自理服务生命周期：后台起服+轮询就绪+finally 杀），300s 超时帽，失败/超时只记失败态不阻断本步、触发 PASS 封顶（D-002）；指纹含此键，未变不重跑。', example: 'node scripts/smoke.mjs' },
        { path: 'commands.install', type: 'string', optional: true, status: 'live', readers: ['extractInstallCommand (src/worktree-deps.js)'], desc: '依赖安装命令（worktree 依赖 provisioning 用）。', example: 'npm install' },
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
        { path: 'modules.<name>.test', type: 'string', optional: true, status: 'live', readers: ['extractModules (src/verify-postcheck.js)'], desc: '该子模块的测试命令。', example: 'cd frontend && pnpm test' },
      ],
    },
    {
      id: 'test_strategy',
      title: '测试策略',
      note: 'verify 阶段 CLI 对账的收窄策略（D-005@v2：skip 接线兑现 + evidence-auto 新增，full/module 语义不变）。',
      keys: [
        { path: 'test_strategy', type: 'enum', values: ['full', 'module', 'skip', 'evidence-auto'], optional: true, status: 'live', readers: ['extractTestStrategy (src/verify-postcheck.js)', 'resolveTestStrategy (src/verify-postcheck.js)'], desc: 'full=全量 commands.test；module=按 git diff 命中 modules 子集收窄（需配 modules）；skip=真跳过测试（不回退全量，verify 输出显式标注留审计痕迹，R-07）；evidence-auto=按变更目录 module-impact.md 影响类型推荐检查组合（行为→module 聚焦测试、文档/prompt→docs-check、门禁契约→gate；缺失/不可解析降级 module 并注记）。缺省：配了 modules: 块 → module（v3.29.3 起缺省收窄，ql-20260920-010）；未配 modules → 全量。', example: 'full' },
      ],
    },
    {
      id: 'known_failures',
      title: '预存失败豁免清单',
      note: '变更前就失败的测试行，豁免后不计入 verify 阻断。支持块列表或 inline 数组。务必定期复核，避免误豁免本变更引入的真实失败。',
      keys: [
        { path: 'known_failures', type: 'array', optional: true, status: 'live', readers: ['extractKnownFailures (src/verify-postcheck.js)'], desc: '失败行模式列表（匹配测试输出失败行）。', example: 'tests/some-old-test' },
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

# ── monorepo 子模块映射（test_strategy: module 时按 git diff 命中模块收窄测试）──
# 只支持 inline flow 形态（嵌套展开式解析不出）：
modules:
  frontend: { path: "frontend/", test: "cd frontend && pnpm test" }
  backend: { path: "backend/", test: "cd backend && npm test" }

# ── 测试策略（verify 实测收窄；full/module 语义不变，skip/evidence-auto 为 2026-08-23 新增）──
# full=全量 commands.test | module=按命中模块收窄（需配 modules）
# skip=真跳过测试（不回退全量，verify 输出显式标注留审计痕迹）
# evidence-auto=按变更 module-impact.md 影响面推荐检查组合（行为→module 聚焦测试、文档→docs-check、门禁→gate；缺失降级 module）
test_strategy: full

# ── 决策库 behind 复核阈值（docs-check 决策规则：源码在「最近确认」后前进超阈值 → 待复核提示；缺省 10）──
decisions:
  behind_threshold: 10

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
