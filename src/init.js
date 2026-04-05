import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { checkbox, select, confirm, input } from '@inquirer/prompts';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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



const VALID_TOOLS = ['claude', 'claude_skills', 'cursor', 'openclaw', 'codex', 'gemini', 'opencode'];

const TOOL_LABELS = {
  claude: 'Claude Code',
  claude_skills: 'Claude Skills',
  cursor: 'Cursor',
  openclaw: 'OpenClaw',
  codex: 'OpenAI Codex (通过 AGENTS.md)',
  gemini: 'Gemini CLI (通过 GEMINI.md)',
  opencode: 'OpenCode (通过 INSTRUCTIONS.md)',
};

const INSTRUCTION_TOOLS = ['codex', 'gemini', 'opencode'];

const INSTRUCTION_FILE_MAP = {
  codex: 'AGENTS.md',
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
- 读取 \`.sillyspec/.runtime/progress.json\` 确认当前阶段（使用 \`sillyspec progress show\`）
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

// ── 检测工具 ──

function detectTools(projectDir) {
  const found = [];
  if (existsSync(join(projectDir, '.claude'))) found.push('claude');
  if (existsSync(join(projectDir, '.claude', 'skills'))) found.push('claude_skills');
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

async function doInstall(projectDir, tools, isWorkspace, subprojects = []) {
  // 创建基础目录
  // .sillyspec/projects/    → 项目注册表
  // .sillyspec/docs/<name>/ → 统一文档中心
  // .sillyspec/knowledge/   → 跨项目共享知识库
  // .sillyspec/.runtime/    → progress (gitignored)

  // 注册当前项目到 projects/
  const projectName = basename(projectDir) || 'project';
  const projectsDir = join(projectDir, '.sillyspec', 'projects');
  mkdirSync(projectsDir, { recursive: true });
  const projectYamlPath = join(projectsDir, `${projectName}.yaml`);
  if (!existsSync(projectYamlPath)) {
    writeFileSync(projectYamlPath, `name: ${projectName}\npath: .\nstatus: active\n`);
  }

  // 创建 docs/<projectName>/scan/ 子目录（代码扫描结果）
  const scanDir = join(projectDir, '.sillyspec', 'docs', projectName, 'scan');
  mkdirSync(scanDir, { recursive: true });
  const gitkeepPath = join(scanDir, '.gitkeep');
  if (!existsSync(gitkeepPath)) writeFileSync(gitkeepPath, '');

  // 兼容：保留旧的 codebase/ changes/ quicklog/ 目录（如果已存在不删除）
  if (isWorkspace) {
    mkdirSync(join(projectDir, '.sillyspec', 'shared'), { recursive: true });
    mkdirSync(join(projectDir, '.sillyspec', 'workspace'), { recursive: true });
  }

  // 创建知识库骨架（所有模式）
  const knowledgeDir = join(projectDir, '.sillyspec', 'knowledge');
  mkdirSync(knowledgeDir, { recursive: true });
  const indexPath = join(knowledgeDir, 'INDEX.md');
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, `# Knowledge Index\n\n> 子代理任务开始前查询此文件，按关键词匹配，只读命中的知识文件。\n> execute/quick 执行中发现的坑自动追加到 uncategorized.md，经用户确认后归类到对应文件。\n\n<!-- 格式：关键词1|关键词2|关键词3 → 文件路径 -->\n<!-- 示例：mybatis-plus|分页|Page → pagination.md -->\n<!-- 示例：跨域|CORS|preflight → cors.md -->\n`);
  }
  const uncatPath = join(knowledgeDir, 'uncategorized.md');
  if (!existsSync(uncatPath)) {
    writeFileSync(uncatPath, `# 未分类知识\n\n> execute/quick 执行中发现的坑暂存于此，用户审阅后归类到对应文件并更新 INDEX.md。\n`);
  }

  // 创建 .sillyspec/.runtime/ 目录结构
  const runtimeDir = join(projectDir, '.sillyspec', '.runtime');
  for (const sub of ['artifacts', 'history', 'logs', 'templates']) {
    mkdirSync(join(runtimeDir, sub), { recursive: true });
  }

  // 创建初始 progress.json
  const progressPath = join(runtimeDir, 'progress.json');
  if (!existsSync(progressPath)) {
    const initialProgress = {
      project: projectName,
      currentStage: '',
      stages: {
        brainstorm: { status: 'pending', steps: [], startedAt: null, completedAt: null },
        propose: { status: 'pending', steps: [], startedAt: null, completedAt: null },
        plan: { status: 'pending', steps: [], startedAt: null, completedAt: null },
        execute: { status: 'pending', steps: [], startedAt: null, completedAt: null },
        verify: { status: 'pending', steps: [], startedAt: null, completedAt: null }
      },
      lastActive: null
    };
    writeFileSync(progressPath, JSON.stringify(initialProgress, null, 2) + '\n');
  }

  // 创建初始 user-inputs.md
  const inputsPath = join(runtimeDir, 'user-inputs.md');
  if (!existsSync(inputsPath)) {
    writeFileSync(inputsPath, '# 用户输入记录\n\n> 每步完成时由 AI 自动追加，记录用户所有原话。\n\n');
  }

  const gitignorePath = join(projectDir, '.gitignore');
  const ignoreRules = ['.sillyspec/codebase/SCAN-RAW.md', '.sillyspec/local.yaml', '.sillyspec/.runtime/'];
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

  // 注入指令文件（codex/gemini/opencode）
  for (let i = 0; i < tools.length; i++) {
    const toolName = tools[i];
    if (INSTRUCTION_TOOLS.includes(toolName)) {
      injectInstructions(toolName, projectDir);
    }
  }

  // 复制 skills 到 .claude/skills/（给 Claude Code 使用）
  const skillsSource = join(homedir(), '.agents', 'skills');
  const claudeSkillsDir = join(projectDir, '.claude', 'skills');
  if (existsSync(skillsSource)) {
    const sillyspecSkills = readdirSync(skillsSource).filter(f => f.startsWith('sillyspec-') && statSync(join(skillsSource, f)).isDirectory());
    if (sillyspecSkills.length > 0) {
      mkdirSync(claudeSkillsDir, { recursive: true });
      for (const skill of sillyspecSkills) {
        copyDirSync(join(skillsSource, skill), join(claudeSkillsDir, skill));
      }
      console.log(chalk.green('    ✓ Claude Code skills 已同步 (' + sillyspecSkills.length + ' 个)'));
    }
  } else {
    console.log(chalk.yellow('    ⚠ 未找到 ~/.agents/skills/，跳过 Claude Code skills 同步'));
  }


  // 工作区配置
  if (isWorkspace) {
    const configPath = join(projectDir, '.sillyspec', 'config.yaml');
    if (!existsSync(configPath)) {
      let projectsYaml = '';
      if (subprojects.length > 0) {
        projectsYaml = subprojects.map(p =>
          `  ${p.name}:\n    path: ${p.path}\n    role: ${p.role || p.name}${p.repo ? `\n    repo: ${p.repo}` : ''}`
        ).join('\n');
      }

      writeFileSync(configPath,
`# SillySpec 工作区配置
# 修改此文件后运行 /sillyspec:workspace 更新

projects:
${projectsYaml || '  # 运行 /sillyspec:workspace add 添加子项目'}

shared: []
`
      );
    }
  }
}

// ── 安装完成总结 ──

function showSummary(version, tools, isWorkspace) {
  const toolLabels = tools.map(t => TOOL_LABELS[t] || t);
  const mode = isWorkspace ? '多项目工作区' : '单项目';

  console.log('');
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log(chalk.green(`  ✅  SillySpec v${version} 安装完成！`));
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log('');
  console.log(`  已安装工具: ${chalk.cyan(toolLabels.join(', '))}`);
  console.log(`  模式: ${chalk.yellow(mode)}`);
  console.log('  📁 .sillyspec/ — 项目规范目录');
  console.log('');
  console.log('  下一步：使用 AI 技能开始工作');
  console.log('    OpenClaw:    ' + chalk.bold('/sillyspec:brainstorm'));
  console.log('    Claude Code: ' + chalk.bold('/sillyspec:brainstorm'));
  console.log('');
  console.log(chalk.dim('  💡 推荐安装 MCP 工具增强 AI 能力：sillyspec setup'));
  console.log('');
}

// ── 读取版本号 ──

export function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
    return pkg.version;
  } catch {
    return '?.?.?';
  }
}

// ── 主命令 ──

export async function cmdInit(projectDir, options = {}) {
  const { tool, workspace, interactive } = options;
  const version = getVersion();

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

    // 工作区模式
    const isWorkspace = await select({
      message: '选择项目模式',
      choices: [
        { name: '单项目模式', value: 'false' },
        { name: '多项目工作区', value: 'true' },
      ],
    }) === 'true';

    // 工作区子项目引导
    let subprojects = [];
    if (isWorkspace) {
      console.log('');
      console.log(chalk.yellow('📋 工作区模式 — 添加子项目'));
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
            const { execSync } = await import('child_process');
            const absPath = resolve(projectDir, subPath.trim() || `./${name.trim()}`);
            repo = execSync('git remote get-url origin', { cwd: absPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
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
    const count = await doInstall(projectDir, selectedTools, isWorkspace, subprojects);
    showSummary(version, selectedTools, isWorkspace);
    return;
  }

  // ── 默认快速模式：检测 → 安装 → 结束 ──

  let tools = [];
  if (tool) {
    if (!VALID_TOOLS.includes(tool)) {
      console.error(`❌ 未知工具: ${tool}`);
      console.error(`支持的工具: ${VALID_TOOLS.join(', ')}`);
      process.exit(1);
    }
    tools = [tool];
  } else {
    tools = detectTools(projectDir);
  }

  await doInstall(projectDir, tools, !!workspace);

  console.log('');
  console.log(chalk.green(`  ✅ SillySpec v${version} 安装完成！`));
  console.log('');
  console.log('  📁 .sillyspec/ — 项目规范目录');
  console.log('');
  console.log('  下一步：使用 AI 技能开始工作');
  console.log(`    OpenClaw:    ${chalk.bold('/sillyspec:brainstorm')}`);
  console.log(`    Claude Code: ${chalk.bold('/sillyspec:brainstorm')}`);
  console.log('');
  console.log(chalk.dim('  💡 增强能力：sillyspec setup（安装 MCP 工具）'));
  console.log('');
}
