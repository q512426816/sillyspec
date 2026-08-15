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
        { path: 'commands.test', type: 'string', optional: true, status: 'live', readers: ['extractTestCommand (src/verify-postcheck.js)', 'validateCommands (src/scan-postcheck.js)'], desc: '测试命令——verify 阶段 CLI 亲自执行此命令与 verify-result.md 对账，实测失败即阻断。', example: 'npm test' },
        { path: 'commands.lint', type: 'string', optional: true, status: 'live', readers: ['detectLocalYaml (src/local-detect.js)', 'validateCommands (src/scan-postcheck.js)'], desc: 'lint 命令。', example: 'npm run lint' },
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
      note: 'verify 阶段 CLI 对账的收窄策略。',
      keys: [
        { path: 'test_strategy', type: 'enum', values: ['full', 'module'], optional: true, status: 'live', readers: ['extractTestStrategy (src/verify-postcheck.js)'], desc: 'full=全量 commands.test；module=按 git diff 命中 modules 子集收窄（需配 modules）。缺省=全量。', example: 'full' },
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
      id: 'worktree-hook',
      title: 'worktree-guard 扩展',
      note: 'execute worktree 隔离期内放行的额外只读命令。键名用 camelCase（parseSimpleYaml 原样保留）。',
      keys: [
        { path: 'worktree-hook.readonlyCommands', type: 'array', optional: true, status: 'live', readers: ['loadLocalConfig (src/hooks/worktree-guard.js)'], desc: '额外放行的只读命令名列表（如 rg/fd），绕过 worktree-guard 写操作拦截。', example: 'rg' },
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
        { path: 'docs-check.paths', type: 'array', optional: true, status: 'live', readers: ['docs check (src/index.js case docs) + runDocsCheck (src/docs-check.js)'], desc: '扫描的文档 glob 列表，缺省 docs/**/*.md。', example: 'docs/**/*.md' },
        { path: 'docs-check.skip', type: 'array', optional: true, status: 'live', readers: ['walkGlob (src/docs-check.js)'], desc: '排除的路径/glob 列表，缺省空。', example: 'docs/sillyspec/archive' },
        { path: 'docs-check.keywordAssert', type: 'boolean', optional: true, status: 'live', readers: ['runDocsCheck (src/docs-check.js)'], desc: '层2 关键词断言开关，缺省 true（关闭时 warning 提示仅做存在性校验）。', example: 'true' },
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
  # install: npm install   # worktree 依赖安装命令

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

# ── monorepo 子模块映射（test_strategy: module 时按 git diff 命中模块收窄测试）──
# 只支持 inline flow 形态（嵌套展开式解析不出）：
modules:
  frontend: { path: "frontend/", test: "cd frontend && pnpm test" }
  backend: { path: "backend/", test: "cd backend && npm test" }

# ── 测试策略：full=全量 commands.test | module=按命中模块收窄（需配 modules）──
test_strategy: full

# ── 预存失败豁免清单（变更前就失败的测试行；务必定期复核，防误豁免真实失败）──
known_failures:
  - tests/some-old-stable-failure

# ── worktree-guard 只读命令扩展（execute worktree 隔离期内放行额外只读命令）──
worktree-hook:
  readonlyCommands:
    - rg
    - fd

# ── 变更规模自动分类（sillyspec run auto 时按需求描述强制 quick/full；正则数组，i 大小写无关）──
auto_mode:
  force_full_patterns:
    - 数据库|migration
  force_quick_patterns:
    - fix typo

# ── 文档引用校验（sillyspec docs check；glob 相对源码仓根，三形态：递归/单层/字面路径）──
docs-check:
  paths:
    - docs/**/*.md
  # skip:
  #   - docs/sillyspec/archive
  keywordAssert: true
`;
}
