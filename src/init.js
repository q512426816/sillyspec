import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { checkbox, confirm, input } from '@inquirer/prompts';
import { ProgressManager } from './progress.js';
import chalk from 'chalk';
import { getVersion } from './version.js';
import { gitQuiet } from './git-helper.js';
import { renderExample } from './config-schema.js';
// 向后兼容：getVersion 已抽到轻量 version.js（避免 index.js 为 --version 静态加载 init.js 的 inquirer 税），
// 此处 re-export 保持 init.js 既有导出 API 不破坏（如 test/init-agents-injection.test.mjs）。
export { getVersion };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── .runtime/ 残留清理（平台模式防源码污染） ──
// 平台模式（specRoot 指向外部）下，源码目录的 .sillyspec/.runtime/ 是旧残留，
// 应让 specRoot 成为唯一运行时根。但若源码目录的 .sillyspec/ 本身就是该项目
// 的 specDir（含真实资产），其 .runtime/ 里的 worktrees/、sillyspec.db、
// global.json 是真实工作状态，整删会摧毁 worktree meta、
// 导致 depsStatus 恒为 unknown、branch already exists 死循环。
// 详见 docs/sillyspec/runtime-cleanup-destroys-worktree-meta.md
//
// 策略：白名单保留权威状态，逐项删除可重建的缓存子项；未知子项默认保留（安全侧倾斜）。
// local.yaml 同样保留：gitignored 凭据文件（平台 init lease 第 5 步下发 / local detect /
// platform connect 写入，含用户手调 mcp 段），删除即永久丢失无法从 git 找回。本函数曾把它
// 当非权威残留整删，与 platformMode 跳过清理的保护语义自相矛盾，2026-08-23 起不再删。
const RUNTIME_KEEP = new Set([
  'worktrees',          // worktree 目录 + meta.json（worktree.js:17）
  'sillyspec.db',       // SQLite 进度库（权威状态源，progress.js:7）
  'global.json',        // 项目名/活跃变更缓存（progress.js:8）
  'contract-artifacts', // execute endpoint 契约（verify 阶段读取）
  'execute-runs',       // task review 结果（task-review.js）
]);

/**
 * 清理 .sillyspec/ 下的运行时残留，保留权威状态。
 * 同时清理 codebase/（非权威，整删安全）。local.yaml 受保护不删——
 * 平台 init 下发的凭据配置，见上方策略注释。
 * @param {string} legacyDir - 源码目录的 .sillyspec/ 路径
 */
export function cleanupRuntimeResidue(legacyDir) {
  // codebase/ 非权威，整删；local.yaml 是凭据配置，保留
  const codebasePath = join(legacyDir, 'codebase');
  if (existsSync(codebasePath)) { try { rmSync(codebasePath, { recursive: true, force: true }) } catch {} }
  // .runtime/ 逐项清理，白名单保留
  const runtimeDir = join(legacyDir, '.runtime');
  if (existsSync(runtimeDir)) {
    let entries = [];
    try { entries = readdirSync(runtimeDir, { withFileTypes: true }); } catch {}
    for (const entry of entries) {
      if (RUNTIME_KEEP.has(entry.name)) continue;
      const p = join(runtimeDir, entry.name);
      try { rmSync(p, { recursive: true, force: true }) } catch {}
    }
  }
}

// ── 递归复制目录 ──
function copyDirSync(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath);
    } else if (entry.name.endsWith('.md')) {
      writeFileSync(dstPath, readFileSync(srcPath));
    }
  }
}

// ── 元数据映射 ──



const VALID_TOOLS = ['claude', 'cursor', 'openclaw', 'codex', 'gemini', 'opencode'];

const TOOL_LABELS = {
  claude: 'Claude Code',
  cursor: 'Cursor',
  openclaw: 'OpenClaw',
  codex: 'OpenAI Codex (通过 AGENTS.md)',
  gemini: 'Gemini CLI (通过 GEMINI.md)',
  opencode: 'OpenCode (通过 INSTRUCTIONS.md)',
};

// 小段追加工具（gemini/opencode）。codex 不在此列——AGENTS.md 是跨工具通用的标准内容源，
// codex 与 claude 共用完整模板注入（injectAgentsInstructions）；gemini/opencode 改 @AGENTS.md
// 指针需先验证两家对 @ 导入语法的支持，留待后续变更。
const INSTRUCTION_TOOLS = ['gemini', 'opencode'];

const INSTRUCTION_FILE_MAP = {
  gemini: 'GEMINI.md',
  opencode: 'INSTRUCTIONS.md',
};

const INJECTION_CONTENT = `## SillySpec — 规范驱动开发

在执行开发任务时，遵循以下规范：

### 代码规范
- 写代码前先读取 \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\`（代码风格）和 \`.sillyspec/docs/<project>/scan/ARCHITECTURE.md\`（架构）
- 调用已有方法前，用 grep 确认方法存在，不许编造
- 遵循 \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\` 中的代码风格

### 工作流程
- 读取 sillyspec.db 确认当前阶段（使用 \`sillyspec progress show\`）
- 各阶段产出文件位于 \`.sillyspec/changes/<变更名>/\` 下
`;

// ── 注入指令文件 ──

function injectInstructions(tool, projectDir) {
  const fileName = INSTRUCTION_FILE_MAP[tool];
  if (!fileName) return;
  const filePath = join(projectDir, fileName);

  // 文件不存在则创建
  if (!existsSync(filePath)) {
    writeFileSync(filePath, INJECTION_CONTENT);
    return;
  }

  // 已存在 SillySpec 标记则跳过
  const content = readFileSync(filePath, 'utf8');
  if (content.includes('## SillySpec')) return;

  // 追加到末尾
  writeFileSync(filePath, content.trimEnd() + '\n\n' + INJECTION_CONTENT);
}

// ── 注入 AGENTS.md / CLAUDE.md（claude + codex，版本感知幂等）──
// AGENTS.md 是唯一承载完整指引的内容源（跨工具通用标准）；CLAUDE.md 仅为 @AGENTS.md
// 导入指针（Claude Code 记忆导入语法）。取代 design: 2026-08-02-init-claude-md 的
// CLAUDE.md 单文件方案——其 D-004 预留的「marker 方案迁移」即本次变更。
const AGENTS_TEMPLATE_PATH = join(__dirname, '..', 'templates', 'agents-instruction.md');

/**
 * 移除 codex 老安装的旧版小段（injectInstructions 方案：`## SillySpec` 段，追加在 EOF）。
 * 优先精确匹配旧文本；用户编辑过 / CRLF 漂移导致匹配失败时回退按标题截到 EOF。
 * @param {string} content - AGENTS.md 原文
 * @returns {string} 截除旧段后的内容（已 trimEnd）
 */
function stripLegacyAgentsBlock(content) {
  const exact = INJECTION_CONTENT.trimEnd();
  const idx = content.indexOf(exact);
  if (idx >= 0) return content.slice(0, idx).trimEnd();
  const headingIdx = content.indexOf('## SillySpec');
  if (headingIdx >= 0) return content.slice(0, headingIdx).trimEnd();
  return content;
}

/**
 * 为 AGENTS.md 注入完整指引（版本感知幂等，三态四分支 + 旧标记迁移）。
 * - 不存在：写完整模板（templates/agents-instruction.md）+ 顶部版本注释
 * - 存在无标记：追加受管段（INJECTION_CONTENT）+ 版本块标记；
 *   含旧 `## SillySpec` 段（codex 老安装）先截除再追加（marker 迁移，防双段）
 * - 存在同版本标记：跳过（不写文件）
 * - 存在异版本标记：追加态刷新块 / 完整态仅 stderr 提示（保留用户改动）
 * @param {string} projectDir - 源码项目根
 */
export function injectAgentsInstructions(projectDir) {
  const filePath = join(projectDir, 'AGENTS.md');
  const version = getVersion();
  // 完整态顶部注释（新文件首行，轻量、不限制后续编辑）
  const fullHeader = `<!-- SillySpec v${version} — 由 sillyspec init 生成，可自由编辑；重跑 init 同版本不更新 -->`;
  // 追加态受管段（包版本块标记，明确"勿手动编辑此段"）
  const appendBlock =
    `<!-- SillySpec v${version} START — 由 sillyspec init 注入，勿手动编辑此段 -->\n` +
    INJECTION_CONTENT.trimEnd() +
    `\n<!-- SillySpec END -->`;

  // 状态 1：文件不存在 → 写完整模板 + 顶部版本注释
  if (!existsSync(filePath)) {
    let template = '';
    try {
      template = readFileSync(AGENTS_TEMPLATE_PATH, 'utf8');
    } catch {
      console.error(`❌ [sillyspec] 未找到 Agent 指引模板：${AGENTS_TEMPLATE_PATH}`);
      return;
    }
    writeFileSync(filePath, fullHeader + '\n' + template);
    console.log(chalk.green(`    ✓ AGENTS.md 已生成（SillySpec v${version}，完整指引）`));
    return;
  }

  let content = readFileSync(filePath, 'utf8');

  // 无任何 `<!-- SillySpec v` 标记 → 状态 2：追加受管段（原文字节保留）
  const markMatch = content.match(/<!-- SillySpec v(\S+)/);
  if (!markMatch) {
    if (content.includes('## SillySpec')) {
      content = stripLegacyAgentsBlock(content);
      console.log(chalk.green('    ✓ AGENTS.md 旧版 SillySpec 小段已迁移为新受管段'));
    }
    writeFileSync(filePath, content + '\n\n' + appendBlock + '\n');
    console.log(chalk.green(`    ✓ AGENTS.md 已追加 SillySpec 受管段（v${version}）`));
    return;
  }

  const existingVersion = markMatch[1];
  // 状态 3：同版本 → 跳过（幂等，不写）
  if (existingVersion === version) return;

  // 状态 4：异版本（升级）。区分追加态（有 START...END 块）/ 完整态（仅顶部注释）。
  const startBlockRe = /<!-- SillySpec v\S+\s+START[\s\S]*?<!-- SillySpec END -->/;
  if (startBlockRe.test(content)) {
    // 4a：追加态 → 用当前版本受管段替换该块（块外用户内容字节保留）
    writeFileSync(filePath, content.replace(startBlockRe, appendBlock));
    console.log(chalk.green(`    ✓ AGENTS.md 受管段已升级（v${existingVersion} → v${version}）`));
  } else {
    // 4b：完整态 → 不覆盖（保留用户改动），仅 stderr 打印升级提示
    console.error(`⚠️ [sillyspec] SillySpec 升级 v${existingVersion}→v${version}，AGENTS.md 未自动更新（保留你的改动）。如需采用新模板：备份后删除 AGENTS.md 再跑 sillyspec init。`);
  }
}

/**
 * 为 Claude Code 写 CLAUDE.md 指针（@AGENTS.md 导入，薄文件）。
 * - 不存在：写指针文件（版本头注释 + @AGENTS.md）
 * - 存在无标记（用户自有文件）：文末追加受管指针块（原文字节保留）
 * - 指针态：同版本跳过；异版本仅刷新标记行中的版本号
 * - 旧完整态（2026-08-02 方案：标记在但无 @AGENTS.md）：不动，仅 stderr 提示迁移路径
 * @param {string} projectDir - 源码项目根
 */
export function injectClaudePointer(projectDir) {
  const filePath = join(projectDir, 'CLAUDE.md');
  const version = getVersion();
  const fullPointer = `<!-- SillySpec v${version} — CLAUDE.md 指针：内容统一维护在 AGENTS.md（@ 导入），可自由编辑 -->\n\n@AGENTS.md\n`;
  const appendBlock =
    `<!-- SillySpec v${version} START — 由 sillyspec init 注入，勿手动编辑此段 -->\n` +
    `@AGENTS.md\n` +
    `<!-- SillySpec END -->`;

  // 状态 1：文件不存在 → 写指针文件
  if (!existsSync(filePath)) {
    writeFileSync(filePath, fullPointer);
    console.log(chalk.green(`    ✓ Claude Code CLAUDE.md 指针已生成（@AGENTS.md，SillySpec v${version}）`));
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  const markMatch = content.match(/<!-- SillySpec v(\S+)/);

  // 状态 2：无标记（用户自有文件）→ 追加受管指针块
  if (!markMatch) {
    writeFileSync(filePath, content.trimEnd() + '\n\n' + appendBlock + '\n');
    console.log(chalk.green(`    ✓ Claude Code CLAUDE.md 已追加 @AGENTS.md 受管指针块（v${version}）`));
    return;
  }

  const existingVersion = markMatch[1];
  // 状态 3：同版本 → 跳过（幂等，不写）
  if (existingVersion === version) return;

  // 状态 4：异版本。区分指针态（含 @AGENTS.md）/ 旧完整态（无导入行）。
  if (!content.includes('@AGENTS.md')) {
    // 4b：旧完整态 → 不覆盖，提示迁移到 AGENTS.md 单源
    console.error(`⚠️ [sillyspec] 检测到旧版完整 CLAUDE.md（v${existingVersion}）。当前方案以 AGENTS.md 为内容源、CLAUDE.md 仅作 @AGENTS.md 指针；为保留你的改动未自动迁移。如需迁移：备份后删除 CLAUDE.md 再跑 sillyspec init。`);
    return;
  }
  // 4a：指针态 → 仅刷新标记行中的版本号（指针无用户语义内容，不动其余字节）
  writeFileSync(filePath, content.replace(`<!-- SillySpec v${existingVersion}`, `<!-- SillySpec v${version}`));
  console.log(chalk.green(`    ✓ Claude Code CLAUDE.md 指针标记已升级（v${existingVersion} → v${version}）`));
}

// ── 检测工具 ──

function detectTools(projectDir) {
  const found = [];
  if (existsSync(join(projectDir, '.claude'))) found.push('claude');
  if (existsSync(join(projectDir, '.cursor'))) found.push('cursor');
  if (existsSync(join(projectDir, '.openclaw'))) found.push('openclaw');
  if (existsSync(join(projectDir, 'AGENTS.md'))) found.push('codex');
  if (existsSync(join(projectDir, 'GEMINI.md'))) found.push('gemini');
  if (existsSync(join(projectDir, 'INSTRUCTIONS.md'))) found.push('opencode');
  if (found.length === 0) found.push('claude');
  return found;
}

// ── TTY 工具函数 ──

function isTTY() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

// ── 核心安装逻辑 ──

function doInstall(projectDir, tools, subprojects = [], specDir = null, options = {}) {
  // specDir: 规范目录（默认 projectDir/.sillyspec）
  // projectDir: 源码项目根目录（用于工具检测、指令注入、.gitignore）
  // options.noSkills: 跳过 skills 复制段（--no-skills；指令注入不受影响）
  // options.platformMode: 平台模式（cmdInit 收到 platformOpts 非空）——项目内 .sillyspec/
  //   通常只有 local.yaml（平台 init lease 写、含用户手调 mcp 段），任何清理都会丢失，整体跳过
  const { noSkills = false, platformMode = false } = options;
  const spec = specDir || join(projectDir, '.sillyspec');

  // 外部 specDir 时清理旧版本残留的 cwd/.sillyspec/（防止源码污染）。
  // ⚠️ 必须保护真实资产：若本地 .sillyspec 含 changes/（非空）、projects/（非空）
  // 或 sillyspec.db（进度库），说明该项目本身就用 SillySpec 管理，整体删除会丢资产。
  // 此时只清运行时残留，拒绝整删；确无资产时才视为旧残留清理。
  // 平台模式（platformMode）整体绕过清理段：项目内 .sillyspec/ 常只有 local.yaml
  // （平台 init lease 第 5 步写，含用户手调 mcp 段），整删/残留清理都会丢配置。
  const legacyDir = join(projectDir, '.sillyspec');
  if (platformMode) {
    if (specDir && existsSync(legacyDir)) {
      console.log('⏭️ 平台模式：跳过项目内 .sillyspec/ 清理（保留 local.yaml 等本地配置）');
    }
  } else if (specDir && existsSync(legacyDir)) {
    let hasChanges = false;
    try {
      const changesDir = join(legacyDir, 'changes');
      if (existsSync(changesDir)) hasChanges = readdirSync(changesDir).length > 0;
    } catch {}
    let hasProjects = false;
    try {
      const projectsDir = join(legacyDir, 'projects');
      if (existsSync(projectsDir)) hasProjects = readdirSync(projectsDir).length > 0;
    } catch {}
    const hasDb = existsSync(join(legacyDir, 'sillyspec.db'));

    if (hasChanges || hasProjects || hasDb) {
      // 真实资产存在：拒绝整体删除，仅清理运行时残留
      console.error('❌ [sillyspec] 拒绝删除源码目录的 .sillyspec/：检测到真实资产（changes/、projects/ 或 sillyspec.db）。');
      console.error('   该项目似乎本身就用 SillySpec 管理。如需改用外部 spec 目录，请先手动迁移/备份。');
      console.error('   本次仅清理运行时残留（.runtime/ 缓存、codebase/），保留 local.yaml、worktrees 与进度状态。');
      cleanupRuntimeResidue(legacyDir);
    } else {
      // 无真实资产：确属旧版本残留，安全删除
      try { rmSync(legacyDir, { recursive: true, force: true }) } catch {}
      if (!existsSync(legacyDir)) console.log('🧹 已清理旧版本残留的源码 .sillyspec/ 目录');
      else console.error('⚠️ 清理残留 .sillyspec/ 失败');
    }
  }

  // 创建基础目录
  // spec/projects/    → 项目注册表
  // spec/docs/<name>/ → 统一文档中心
  // spec/knowledge/   → 跨项目共享知识库
  // spec/.runtime/    → progress (gitignored)

  // 注册当前项目到 projects/
  const projectName = basename(projectDir) || 'project';
  const projectsDir = join(spec, 'projects');
  mkdirSync(projectsDir, { recursive: true });
  const projectYamlPath = join(projectsDir, `${projectName}.yaml`);
  if (!existsSync(projectYamlPath)) {
    // path 相对于 specDir，跨平台可寻址
    writeFileSync(projectYamlPath, `name: ${projectName}\npath: ${projectDir}\nstatus: active\n`);
  }

  // 创建 docs/<projectName>/scan/ 子目录（代码扫描结果）
  const scanDir = join(spec, 'docs', projectName, 'scan');
  mkdirSync(scanDir, { recursive: true });
  const gitkeepPath = join(scanDir, '.gitkeep');
  if (!existsSync(gitkeepPath)) writeFileSync(gitkeepPath, '');

  // 复制 workflow 模板到 workflows/
  const workflowsDir = join(spec, 'workflows');
  const templatesDir = join(__dirname, '..', 'templates', 'workflows');
  if (existsSync(templatesDir)) {
    mkdirSync(workflowsDir, { recursive: true });
    for (const file of readdirSync(templatesDir)) {
      if (file.endsWith('.yaml')) {
        const srcPath = join(templatesDir, file);
        const dstPath = join(workflowsDir, file);
        if (!existsSync(dstPath)) {
          writeFileSync(dstPath, readFileSync(srcPath));
        }
      }
    }
  }

  // 创建 shared/workspace 目录
  mkdirSync(join(spec, 'shared'), { recursive: true });
  mkdirSync(join(spec, 'workspace'), { recursive: true });

  // 创建知识库骨架
  const knowledgeDir = join(spec, 'knowledge');
  mkdirSync(knowledgeDir, { recursive: true });
  const indexPath = join(knowledgeDir, 'INDEX.md');
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, `# Knowledge Index\n\n> 子代理任务开始前查询此文件，按关键词匹配，只读命中的知识文件。\n> 只有遇到真正的项目特有坑（跨变更可复用、未来 agent 可能再次踩到）时才追加到 uncategorized.md；不要为了完成任务硬凑条目。经用户确认后归类到对应文件并更新本索引。\n\n<!-- 格式：关键词1|关键词2|关键词3 → 文件路径 -->\n<!-- 示例：mybatis-plus|分页|Page → pagination.md -->\n<!-- 示例：跨域|CORS|preflight → cors.md -->\n`);
  }
  const uncatPath = join(knowledgeDir, 'uncategorized.md');
  if (!existsSync(uncatPath)) {
    writeFileSync(uncatPath, `# 未分类知识\n\n> execute/quick 执行中发现的坑暂存于此，用户审阅后归类到对应文件并更新 INDEX.md。\n`);
  }

  // 创建 .runtime/ 目录结构（全局状态）
  const runtimeDir = join(spec, '.runtime');
  for (const sub of ['artifacts', 'history', 'logs', 'templates']) {
    mkdirSync(join(runtimeDir, sub), { recursive: true });
  }

  // 初始化 SQLite 数据库
  const pm = new ProgressManager({ specDir: spec });
  pm.init(projectDir);

  // 落盘脱敏 local.yaml.example（config-schema.js 单一数据源；不存在才写，仿 local detect skip-if-exists）
  // 真实 local.yaml 是 gitignored 含凭据；example 可提交，是给人/外部 agent 看的配置发现物。
  const examplePath = join(spec, 'local.yaml.example');
  if (!existsSync(examplePath)) {
    try {
      writeFileSync(examplePath, renderExample());
      console.log(chalk.green('    ✓ local.yaml.example 已生成（脱敏配置示例，可提交；真实 local.yaml 由 sillyspec local detect / platform connect 写入）'));
    } catch (e) {
      console.warn(chalk.yellow(`    ⚠ 生成 local.yaml.example 失败: ${e.message}`));
    }
  }

  // .gitignore 只在 specDir 在项目内时才修改
  const isExternalSpec = specDir && resolve(spec) !== resolve(projectDir, '.sillyspec');
 if (!isExternalSpec) {
    const gitignorePath = join(projectDir, '.gitignore');
    // 平台模式项目根落盘物（指针/声明/cleaned 标记）为本地运行时状态，不入库。
    // 注意平台模式（外部 specDir）不进此分支——那两个文件照样不提交，由用户项目自己 ignore。
    const ignoreRules = [
      '.sillyspec/codebase/SCAN-RAW.md', '.sillyspec/local.yaml', '.sillyspec/.runtime/',
      '.sillyspec-platform.json', '.sillyspec-platform-managed', '.sillyspec-platform-cleaned',
    ];
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf8');
      let updated = content.trimEnd();
      for (const rule of ignoreRules) {
        if (!updated.includes(rule)) {
          updated += '\n' + rule;
        }
      }
      writeFileSync(gitignorePath, updated + '\n');
    } else {
      writeFileSync(gitignorePath, ignoreRules.join('\n') + '\n');
    }
  }

  // 注入指令文件（gemini/opencode 小段追加，不进 AGENTS.md 注入器）
  for (let i = 0; i < tools.length; i++) {
    const toolName = tools[i];
    if (INSTRUCTION_TOOLS.includes(toolName)) {
      injectInstructions(toolName, projectDir);
    }
  }

  // 注入 AGENTS.md 完整指引（claude/codex 共用：版本感知幂等三态四分支 + 旧 ## SillySpec 段迁移）
  if (tools.includes('claude') || tools.includes('codex')) {
    injectAgentsInstructions(projectDir);
  }

  // 注入 CLAUDE.md 指针（claude 专属：@AGENTS.md 导入薄文件，须在 AGENTS.md 之后）
  if (tools.includes('claude')) {
    injectClaudePointer(projectDir);
  }

  // 复制 skills 到各工具目录（--no-skills 可跳过：platform init 等场景勿污染项目内工具目录）
  if (noSkills) {
    console.log(chalk.dim('    ⏭️ 已跳过 skills 复制（--no-skills）'));
    return;
  }
  const skillToolDirs = {
    claude: '.claude/skills',
    codex: '.codex/skills',
    openclaw: '.openclaw/skills',
    opencode: '.opencode/skills',
  }
  const skillsSource = join(__dirname, '..', '.claude', 'skills');
  if (existsSync(skillsSource)) {
    const sillyspecSkills = readdirSync(skillsSource).filter(f => f.startsWith('sillyspec-') && statSync(join(skillsSource, f)).isDirectory());
    if (sillyspecSkills.length > 0) {
      for (const [tool, dir] of Object.entries(skillToolDirs)) {
        if (!tools.includes(tool)) continue
        const targetDir = join(projectDir, dir)
        mkdirSync(targetDir, { recursive: true })
        for (const skill of sillyspecSkills) {
          copyDirSync(join(skillsSource, skill), join(targetDir, skill))
        }
        console.log(chalk.green(`    ✓ ${TOOL_LABELS[tool]} skills 已同步 (${sillyspecSkills.length} 个)`))
      }
    }
  } else {
    console.log(chalk.yellow('    ⚠ 未找到 skills 目录（npm 包内无 .claude/skills/），跳过同步'));
  }
}

// ── 安装完成总结 ──

/**
 * 平台模式 init 落盘指针（消除 init→scan 窗口期断点）。
 *
 * 触发条件：带平台专属信号（--workspace-id / --runtime-root，由 index.js 解析为 platformOpts）
 * 且 --spec-dir 指向外部规范目录。仅 --spec-dir（本地外部目录用法）不触发——与 runCommand 侧
 * 「带平台 flag 才算平台调用」判定一致，防本地用户误触发平台指针。
 *
 * 复用 scan 的指针生成逻辑（writePlatformPointer，单一数据源），status: active
 * （POINTER_STATUS.ACTIVE，未 scan；24h STALE 清理只作用于 scan_completed，不会误删）。
 */
function writeInitPlatformPointer(projectDir, resolvedSpecDir, platformOpts) {
  if (!platformOpts || !resolvedSpecDir) return;
  const isExternalSpec = resolve(resolvedSpecDir) !== resolve(projectDir, '.sillyspec');
  if (!isExternalSpec) return;
  const { writePlatformPointer } = require_or_import_shared();
  const ok = writePlatformPointer(projectDir, {
    specRoot: resolve(resolvedSpecDir),
    runtimeRoot: platformOpts.runtimeRoot || null,
    workspaceId: platformOpts.workspaceId || null,
    scanRunId: null,
  }, { status: 'active' });
  if (ok) {
    console.log(chalk.green(`    ✓ 平台指针已落盘（.sillyspec-platform.json，status: active）`));
    console.log(chalk.green(`      init→scan 窗口期裸调 run 命令将自动恢复平台 specRoot: ${resolvedSpecDir}`));
  }
}

// ESM 下惰性加载 run/shared.js 的 writePlatformPointer。
// 用 createRequire 而非顶层静态 import：init.js 被 index.js 按 case 动态加载已隔离，
// 但 shared.js → git-helper 链在 CJS require 下无需解析 ESM 依赖图，路径最短。
// （node:module 为内置模块，顶层 import 零依赖税。）
import { createRequire } from 'node:module';
function require_or_import_shared() {
  const req = createRequire(import.meta.url);
  return req('./run/shared.js');
}


function showSummary(version, tools, specDir) {
  const toolLabels = tools.map(t => TOOL_LABELS[t] || t);

  console.log('');
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log(chalk.green(`  ✅  SillySpec v${version} 安装完成！`));
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log('');
  console.log(`  已安装工具: ${chalk.cyan(toolLabels.join(', '))}`);
  console.log(`  📁 规范目录: ${chalk.cyan(specDir || '.sillyspec')}`);
  console.log('');
  console.log('  下一步：使用 AI 技能开始工作');
  console.log('    OpenClaw:    ' + chalk.bold('/sillyspec:brainstorm'));
  console.log('    Claude Code: ' + chalk.bold('/sillyspec:brainstorm'));
  console.log('');
  console.log(chalk.dim('  💡 推荐安装 MCP 工具增强 AI 能力：sillyspec setup'));
  console.log('');
}


// ── 主命令 ──

export async function cmdInit(projectDir, options = {}) {
  const { tool, tools: toolsOpt, interactive, specDir, noSkills = false, platformOpts = null } = options;
  const version = getVersion();
  const resolvedSpecDir = specDir ? resolve(specDir) : null;

  // C14c：绿地/棕地引导——必须在 doInstall 之前捕获目录状态（init 会创建 .sillyspec/AGENTS.md/
  // CLAUDE.md/.gitignore 等，事后检测会误判）；棕地（已有非隐藏源码）建议 scan，绿地（空目录）建议 brainstorm。
  let brownfield = false;
  try {
    const entries = readdirSync(projectDir, { withFileTypes: true });
    brownfield = entries.some(e => !e.name.startsWith('.'));
  } catch { brownfield = false; }

  // ── 交互式模式（--interactive 或 -i）──
  if (interactive && isTTY()) {
    // 欢迎画面
    console.log('');
    console.log(chalk.cyan('🤪 SillySpec v' + version + ' — 规范驱动开发'));
    console.log(chalk.cyan('  ===================================='));
    console.log('');
    console.log('  让 AI 像高级工程师一样工作：');
    console.log('  先思考、先规划、先验证，再写代码。');
    console.log('');
    console.log(chalk.gray('  支持的 AI 工具：'));
    console.log(chalk.gray('    Claude Code · Claude Skills · Cursor · Codex CLI · OpenCode · OpenClaw'));
    console.log('');

    // 工具多选
    const detected = detectTools(projectDir);

    const toolChoices = VALID_TOOLS.map(v => ({
      name: `${TOOL_LABELS[v]}${v === 'claude' ? ' (推荐)' : ''}`,
      value: v,
      checked: detected.includes(v),
    }));

    const selectedTools = await checkbox({
      message: '选择要安装的 AI 工具（空格选择，回车确认）',
      choices: toolChoices,
      validate: (answer) => answer.length > 0 || '至少选择一个工具',
    });

    // 子项目引导（仅交互模式）
    let subprojects = [];
    {
      console.log('');
      console.log(chalk.yellow('📋 添加子项目'));
      console.log(chalk.dim('   子项目是工作区中的独立项目目录（如 frontend/、backend/）'));
      console.log('');

      const addMore = await confirm({ message: '现在添加子项目？', default: true });
      if (addMore) {
        let suggestions = [];
        try {
          const entries = readdirSync(projectDir, { withFileTypes: true });
          suggestions = entries
            .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
            .map(e => e.name)
            .sort();
        } catch {}

        if (suggestions.length > 0) {
          console.log('');
          console.log(chalk.dim(`   检测到以下目录：${suggestions.join(', ')}`));
          console.log('');
        }

        let adding = true;
        while (adding) {
          const name = await input({
            message: '子项目名称（如 frontend，留空结束）',
            default: suggestions.find(s => !subprojects.find(p => p.name === s)) || '',
          });

          if (!name.trim()) {
            adding = false;
            break;
          }

          const pathHint = suggestions.includes(name.trim()) ? `./${name.trim()}` : '';
          const subPath = await input({
            message: '子项目目录路径',
            default: pathHint,
          });

          const role = await input({
            message: '子项目描述（如 前端 - Vue3 + TypeScript）',
            default: '',
          });

          let repo = '';
          try {
            // QUAL-01 收口：裸 execFileSync → git-helper（safe.directory + 数组形式）
            const absPath = resolve(projectDir, subPath.trim() || `./${name.trim()}`);
            repo = gitQuiet(absPath, ['remote', 'get-url', 'origin']) || '';
          } catch {}

          subprojects.push({ name: name.trim(), path: subPath.trim() || `./${name.trim()}`, role: role.trim(), repo });

          const idx = suggestions.indexOf(name.trim());
          if (idx >= 0) suggestions.splice(idx, 1);

          const again = await confirm({ message: '继续添加子项目？', default: subprojects.length < suggestions.length });
          if (!again) adding = false;
        }
      }
    }

    console.log('');
    await doInstall(projectDir, selectedTools, subprojects, resolvedSpecDir, { noSkills, platformMode: platformOpts != null });
    writeInitPlatformPointer(projectDir, resolvedSpecDir, platformOpts);
    showSummary(version, selectedTools, resolvedSpecDir);
    return;
  }

  // ── 默认快速模式：检测 → 安装 → 结束 ──

  let tools = [];
  // --tool 多值（tools 数组，index.js 解析逗号分隔/重复 flag 收集）优先；
  // 兼容旧 tool 单值（程序化调用）。两者都校验 VALID_TOOLS 并合并去重（保序）。
  const requested = [
    ...(Array.isArray(toolsOpt) && toolsOpt.length > 0 ? toolsOpt : []),
    ...(tool ? [tool] : []),
  ];
  if (requested.length > 0) {
    for (const t of requested) {
      if (!VALID_TOOLS.includes(t)) {
        console.error(`❌ 未知工具: ${t}`);
        console.error(`支持的工具: ${VALID_TOOLS.join(', ')}`);
        process.exit(1);
      }
    }
    tools = [...new Set(requested)];
  } else {
    tools = detectTools(projectDir);
  }

  await doInstall(projectDir, tools, [], resolvedSpecDir, { noSkills, platformMode: platformOpts != null });
  writeInitPlatformPointer(projectDir, resolvedSpecDir, platformOpts);

  console.log('');
  console.log(chalk.green(`  ✅ SillySpec v${version} 安装完成！`));
  console.log('');
  const specDisplay = resolvedSpecDir || '.sillyspec';
  console.log(`  📁 规范目录: ${chalk.cyan(specDisplay)}`);
  console.log('');
  // C14c：绿地/棕地引导区分（README:73 棕地应 scan）——early 捕获的目录状态（init 前），
  // 棕地有代码零上下文进 brainstorm 会迷失，建议先 scan 生成架构文档。
  const nextCmd = brownfield ? '/sillyspec:scan' : '/sillyspec:brainstorm';
  console.log('  下一步：使用 AI 技能开始工作' + (brownfield ? '（检测到现有代码，建议先扫描生成架构文档）' : ''));
  console.log(`    OpenClaw:    ${chalk.bold(nextCmd)}`);
  console.log(`    Claude Code: ${chalk.bold(nextCmd)}`);
  console.log('');
  console.log(chalk.dim('  💡 增强能力：sillyspec setup（安装 MCP 工具）'));
  console.log('');
}
