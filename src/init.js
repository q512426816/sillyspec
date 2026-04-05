import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { checkbox, select, confirm, input } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_DIR = resolve(__dirname, '..', 'templates');

// ── 元数据映射 ──

const DESCRIPTIONS = {
  init: '绿地项目初始化 — 深度提问、调研、需求文档、路线图',
  scan: '代码库扫描 — 支持快速扫描和深度扫描两阶段',
  explore: '自由思考模式 — 讨论、画图、调研，不写代码',
  brainstorm: '需求探索 — 结构化头脑风暴，生成设计文档（创建性工作前必用）',
  propose: '生成结构化规范 — proposal + design + tasks',
  plan: '编写实现计划 — 2-5 分钟粒度，精确到文件路径和代码',
  execute: '波次执行 — 子代理并行 + 强制 TDD + 两阶段审查',
  verify: '验证实现 — 对照规范检查 + 测试套件',
  archive: '归档变更 — 规范沉淀，可追溯',
  commit: '智能提交 — 自动收集变更信息，生成 commit message',
  status: '查看项目进度和状态',
  continue: '自动判断并执行下一步',
  state: '查看当前工作状态 — 显示 STATE.md 内容',
  resume: '恢复工作 — 从中断处继续',
  quick: '快速任务 — 跳过完整流程，直接做',
  workspace: '工作区管理 — 初始化、管理多项目工作区，查看子项目状态',
  export: '导出成功方案为可复用模板',
};

const ARG_HINTS = {
  init: '[项目名]',
  scan: '[可选：指定区域，如 \'api\' 或 \'auth\'] [--deep 深度扫描]',
  explore: '[探索主题]',
  brainstorm: '[需求或想法描述]',
  propose: '[变更名]',
  plan: '[计划名]',
  execute: '[任务编号或 \'all\']',
  verify: '[可选：指定验证范围]',
  archive: '[变更名]',
  commit: '[可选：自定义 commit message]',
  status: '',
  continue: '',
  state: '[可选备注]',
  resume: '',
  quick: '[任务描述]',
  workspace: '[可选：add/remove/status/info]',
  export: '<change-name> [--to <path>]',
};

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

// Slash commands 工具：安装 markdown 模板命令
const SLASH_COMMAND_TOOLS = ['claude', 'claude_skills', 'cursor', 'openclaw'];

// 指令文件工具：注入规范引用到指令文件
const INSTRUCTION_TOOLS = ['codex', 'gemini', 'opencode'];

const INSTRUCTION_FILE_MAP = {
  codex: 'AGENTS.md',
  gemini: 'GEMINI.md',
  opencode: 'INSTRUCTIONS.md',
};

const INJECTION_CONTENT = `## SillySpec — 规范驱动开发

在执行开发任务时，遵循以下规范：

### 代码规范
- 写代码前先读取 \`.sillyspec/codebase/CONVENTIONS.md\`（代码风格）和 \`.sillyspec/codebase/ARCHITECTURE.md\`（架构）
- 调用已有方法前，用 grep 确认方法存在，不许编造
- 遵循 \`.sillyspec/codebase/CONVENTIONS.md\` 中的代码风格

### 工作流程
- 读取 \`.sillyspec/STATE.md\` 确认当前阶段
- 各阶段产出文件位于 \`.sillyspec/changes/<变更名>/\` 下
- 详细流程参考模板文件：\`.sillyspec/.templates/\`（brainstorm.md, plan.md, execute.md 等）
`;

// ── 适配器 ──

function generateClaude(projectDir, name, desc, body, argHint, version) {
  const outDir = join(projectDir, '.claude', 'commands', 'sillyspec');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.md`),
`---
description: ${desc}
argument-hint: "${argHint}"
version: "${version}"
---

${body}`
  );
}

function generateClaudeSkills(projectDir, name, desc, body, argHint, version) {
  const outDir = join(projectDir, '.claude', 'skills', `sillyspec-${name}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'SKILL.md'),
`---
name: sillyspec:${name}
description: ${desc}
version: "${version}"
---

${body}`
  );
}

function generateCursor(projectDir, name, desc, body, argHint, version) {
  const outDir = join(projectDir, '.cursor', 'commands');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `sillyspec-${name}.md`),
`---
name: /sillyspec-${name}
id: sillyspec-${name}
description: ${desc}
version: "${version}"
---

${body}`
  );
}

function generateOpenclaw(projectDir, name, desc, body, argHint, version) {
  const outDir = join(projectDir, '.openclaw', 'skills', `sillyspec-${name}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'SKILL.md'),
`---
name: sillyspec:${name}
description: ${desc}
version: "${version}"
---

${body}`
  );
}

const GENERATORS = {
  claude: generateClaude,
  claude_skills: generateClaudeSkills,
  cursor: generateCursor,
  openclaw: generateOpenclaw,
};

// ── 指令文件注入 ──

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
  const projectName = projectDir.split('/').pop() || projectDir.split('\\').pop() || 'project';
  const projectsDir = join(projectDir, '.sillyspec', 'projects');
  mkdirSync(projectsDir, { recursive: true });
  const projectYamlPath = join(projectsDir, `${projectName}.yaml`);
  if (!existsSync(projectYamlPath)) {
    writeFileSync(projectYamlPath, `name: ${projectName}\npath: .\nstatus: active\n`);
  }

  // 创建 docs/<projectName>/ 子目录结构
  const docsBase = join(projectDir, '.sillyspec', 'docs', projectName);
  for (const sub of ['scan', 'brainstorm', 'plan', 'changes', 'archive', 'quicklog']) {
    mkdirSync(join(docsBase, sub), { recursive: true });
  }

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

  // 复制 resume-dialog.md 到 .runtime/templates/
  const resumeDialogSrc = join(TEMPLATE_DIR, 'resume-dialog.md');
  if (existsSync(resumeDialogSrc)) {
    const dest = join(runtimeDir, 'templates', 'resume-dialog.md');
    if (!existsSync(dest)) {
      copyFileSync(resumeDialogSrc, dest);
    }
  }

  // 创建初始 user-inputs.md
  const inputsPath = join(runtimeDir, 'user-inputs.md');
  if (!existsSync(inputsPath)) {
    writeFileSync(inputsPath, '# 用户输入记录\n\n> 每步完成时由 AI 自动追加，记录用户所有原话。\n\n');
  }

  const gitignorePath = join(projectDir, '.gitignore');
  const ignoreRules = ['.sillyspec/STATE.md', '.sillyspec/codebase/SCAN-RAW.md', '.sillyspec/local.yaml', '.sillyspec/.runtime/'];
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

  // 生成 slash command 文件
  const templateFiles = readdirSync(TEMPLATE_DIR).filter(f => f.endsWith('.md'));
  let count = 0;

  for (let i = 0; i < tools.length; i++) {
    const toolName = tools[i];
    const label = TOOL_LABELS[toolName] || toolName;

    if (INSTRUCTION_TOOLS.includes(toolName)) {
      const spinner = ora(`安装 ${label}... (${i + 1}/${tools.length})`).start();
      try {
        injectInstructions(toolName, projectDir);
        // 复制模板文件到 .sillyspec/.templates/
        const templatesSourceDir = join(TEMPLATE_DIR);
        const templatesDir = join(projectDir, '.sillyspec', '.templates');
        if (!existsSync(templatesDir)) {
          mkdirSync(templatesDir, { recursive: true });
          for (const file of readdirSync(templatesSourceDir)) {
            if (file.endsWith('.md')) {
              copyFileSync(join(templatesSourceDir, file), join(templatesDir, file));
            }
          }
        }
        spinner.succeed(`${label} 完成`);
        count++;
      } catch (err) {
        spinner.fail(`${label} 失败: ${err.message}`);
        throw err;
      }
      continue;
    }

    const spinner = ora(`安装 ${label}... (${i + 1}/${tools.length})`).start();
    try {
      const gen = GENERATORS[toolName];
      const ver = getVersion();
      for (const file of templateFiles) {
        const name = file.replace('.md', '');
        const desc = DESCRIPTIONS[name] || `SillySpec ${name}`;
        const argHint = ARG_HINTS[name] || '';
        const body = readFileSync(join(TEMPLATE_DIR, file), 'utf8');
        gen(projectDir, name, desc, body, argHint, ver);
        count++;
      }
      spinner.succeed(`${label} 完成`);
    } catch (err) {
      spinner.fail(`${label} 失败: ${err.message}`);
      throw err;
    }
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

  return count;
}

// ── 安装完成总结 ──

function showSummary(version, tools, isWorkspace, count) {
  const toolLabels = tools.map(t => TOOL_LABELS[t] || t);
  const mode = isWorkspace ? '多项目工作区' : '单项目';

  console.log('');
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log(chalk.green(`  ✅  SillySpec v${version} 安装完成！`));
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log('');
  console.log(`  已安装工具: ${chalk.cyan(toolLabels.join(', '))}`);
  console.log(`  模式: ${chalk.yellow(mode)}`);
  console.log('');
  console.log(`  📄 ${count} 个命令已就绪`);
  console.log('  📁 .sillyspec/ — 项目规范目录');
  console.log('');
  console.log('  入口选择：');
  console.log('    全新项目：' + chalk.bold('/sillyspec:init'));
  console.log('    已有代码：' + chalk.bold('/sillyspec:scan'));
  console.log('    自由思考：' + chalk.bold('/sillyspec:explore "你的想法"'));
  console.log('');
  console.log(chalk.gray('  重启你的 AI 工具以使 slash commands 生效。'));
  console.log('');
  console.log(chalk.dim('  💡 推荐安装 MCP 工具增强 AI 能力：sillyspec setup'));
  console.log(chalk.dim('     Context7 — 查最新文档 | grep.app — 搜开源实现 | Chrome DevTools — 浏览器自动化'));
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
    showSummary(version, selectedTools, isWorkspace, count);
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

  const count = await doInstall(projectDir, tools, !!workspace);

  console.log('');
  console.log(chalk.green(`  ✅ SillySpec v${version} 安装完成！`));
  console.log('');
  console.log(`  📄 ${count} 个命令已就绪`);
  console.log('  📁 .sillyspec/ — 项目规范目录');
  console.log('');
  console.log('  下一步：');
  console.log(`    全新项目 → ${chalk.bold('/sillyspec:init')}`);
  console.log(`    已有代码 → ${chalk.bold('/sillyspec:scan')}`);
  console.log(`    自由探索 → ${chalk.bold('/sillyspec:explore "你的想法"')}`);
  if (workspace) {
    console.log(`    管理子项目 → ${chalk.bold('/sillyspec:workspace add')}`);
  }
  console.log('');
  console.log(chalk.dim('  💡 增强能力：sillyspec setup（安装 MCP 工具）'));
  console.log(chalk.dim('  💡 完整配置：sillyspec init --interactive'));
  console.log('');
}
