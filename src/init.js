import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
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
  status: '',
  continue: '',
  state: '[可选备注]',
  resume: '',
  quick: '[任务描述]',
  workspace: '[可选：add/remove/status/info]',
  export: '<change-name> [--to <path>]',
};

const VALID_TOOLS = ['claude', 'claude_skills', 'cursor', 'codex', 'opencode', 'openclaw'];

const TOOL_LABELS = {
  claude: 'Claude Code',
  claude_skills: 'Claude Skills',
  cursor: 'Cursor',
  codex: 'Codex CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
};

// ── 适配器 ──

function generateClaude(projectDir, name, desc, body, argHint) {
  const outDir = join(projectDir, '.claude', 'commands', 'sillyspec');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.md`),
`---
description: ${desc}
argument-hint: "${argHint}"
---

${body}`
  );
}

function generateClaudeSkills(projectDir, name, desc, body, argHint) {
  const outDir = join(projectDir, '.claude', 'skills', `sillyspec-${name}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'SKILL.md'),
`---
name: sillyspec:${name}
description: ${desc}
---

${body}`
  );
}

function generateCursor(projectDir, name, desc, body, argHint) {
  const outDir = join(projectDir, '.cursor', 'commands');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `sillyspec-${name}.md`),
`---
name: /sillyspec-${name}
id: sillyspec-${name}
description: ${desc}
---

${body}`
  );
}

function generateCodex(projectDir, name, desc, body, argHint) {
  const outDir = join(homedir(), '.agents', 'skills', `sillyspec-${name}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'SKILL.md'),
`---
name: sillyspec:${name}
description: ${desc}
---

${body}`
  );
}

function generateOpencode(projectDir, name, desc, body, argHint) {
  const outDir = join(projectDir, '.opencode', 'skills', `sillyspec-${name}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'SKILL.md'),
`---
name: sillyspec:${name}
description: ${desc}
---

${body}`
  );
}

function generateOpenclaw(projectDir, name, desc, body, argHint) {
  const outDir = join(projectDir, '.openclaw', 'skills', `sillyspec-${name}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'SKILL.md'),
`---
name: sillyspec:${name}
description: ${desc}
---

${body}`
  );
}

const GENERATORS = {
  claude: generateClaude,
  claude_skills: generateClaudeSkills,
  cursor: generateCursor,
  codex: generateCodex,
  opencode: generateOpencode,
  openclaw: generateOpenclaw,
};

// ── 检测工具 ──

function detectTools(projectDir) {
  const found = [];
  if (existsSync(join(projectDir, '.claude'))) found.push('claude');
  if (existsSync(join(projectDir, '.claude', 'skills'))) found.push('claude_skills');
  if (existsSync(join(projectDir, '.cursor'))) found.push('cursor');
  if (existsSync(join(projectDir, '.opencode'))) found.push('opencode');
  if (existsSync(join(projectDir, '.openclaw'))) found.push('openclaw');
  if (existsSync(join(homedir(), '.agents', 'skills'))) found.push('codex');
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
  // 不预创建子目录，由各命令按需创建
  // .sillyspec/codebase/    → scan
  // .sillyspec/changes/     → brainstorm/propose
  // .sillyspec/changes/archive/ → archive
  // (plan 内容已合并到 tasks.md)
  // .sillyspec/specs/        → propose
  if (isWorkspace) {
    mkdirSync(join(projectDir, '.sillyspec', 'shared'), { recursive: true });
    mkdirSync(join(projectDir, '.sillyspec', 'workspace'), { recursive: true });
  }

  // .gitignore — 确保 STATE.md 被忽略
  const gitignorePath = join(projectDir, '.gitignore');
  const stateIgnoreRule = '.sillyspec/STATE.md';
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf8');
    if (!content.includes(stateIgnoreRule)) {
      writeFileSync(gitignorePath, content.trimEnd() + '\n' + stateIgnoreRule + '\n');
    }
  } else {
    writeFileSync(gitignorePath, stateIgnoreRule + '\n');
  }

  // 生成文件
  const templateFiles = readdirSync(TEMPLATE_DIR).filter(f => f.endsWith('.md'));
  let count = 0;

  for (let i = 0; i < tools.length; i++) {
    const toolName = tools[i];
    const label = TOOL_LABELS[toolName] || toolName;
    const spinner = ora(`安装 ${label}... (${i + 1}/${tools.length})`).start();
    try {
      const gen = GENERATORS[toolName];
      for (const file of templateFiles) {
        const name = file.replace('.md', '');
        const desc = DESCRIPTIONS[name] || `SillySpec ${name}`;
        const argHint = ARG_HINTS[name] || '';
        const body = readFileSync(join(TEMPLATE_DIR, file), 'utf8');
        gen(projectDir, name, desc, body, argHint);
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
          `  ${p.name}:\n    path: ${p.path}\n    role: ${p.role || p.name}`
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
}

// ── 读取版本号 ──

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
    return pkg.version;
  } catch {
    return '?.?.?';
  }
}

// ── 主命令 ──

export async function cmdInit(projectDir, options = {}) {
  const { tool, workspace } = options;
  const version = getVersion();

  // CLI 参数模式（非交互）
  if (tool) {
    if (!VALID_TOOLS.includes(tool)) {
      console.error(`❌ 未知工具: ${tool}`);
      console.error(`支持的工具: ${VALID_TOOLS.join(', ')}`);
      process.exit(1);
    }

    console.log(chalk.cyan(`🤪 SillySpec v${version}`));
    console.log(chalk.cyan(`📦 安装工具: ${tool}`));
    console.log('');

    const count = await doInstall(projectDir, [tool], workspace);
    showSummary(version, [tool], workspace, count);
    return;
  }

  // 非交互模式
  if (!isTTY()) {
    const tools = detectTools(projectDir);
    console.log(chalk.cyan(`🤪 SillySpec v${version} (非交互模式)`));
    console.log(chalk.cyan(`📦 自动检测工具: ${tools.join(', ')}`));
    console.log('');
    const count = await doInstall(projectDir, tools, workspace);
    showSummary(version, tools, workspace, count);
    return;
  }

  // ── 交互式引导 ──

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

  await confirm({ message: '按回车开始设置...', default: true });

  // 工具多选
  const detected = detectTools(projectDir);

  const toolChoices = VALID_TOOLS.map(v => ({
    name: `${TOOL_LABELS[v]}${v === 'claude' ? ' (slash commands)' : v === 'claude_skills' ? ' (skills 目录)' : ''}`,
    value: v,
    checked: detected.includes(v),
  }));

  const selectedTools = await checkbox({
    message: '选择要安装的 AI 工具',
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
  if (isWorkspace) {
    console.log('');
    console.log(chalk.yellow('📋 工作区模式 — 添加子项目'));
    console.log(chalk.dim('   子项目是工作区中的独立项目目录（如 frontend/、backend/）'));
    console.log('');

    const addMore = await confirm({ message: '现在添加子项目？', default: true });
    if (addMore) {
      // 读取当前目录下的子目录作为建议
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

      const subprojects = [];
      let adding = true;

      while (adding) {
        const name = await input({
          message: '子项目名称（如 frontend）',
          default: suggestions.find(s => !subprojects.find(p => p.name === s)) || '',
        });

        if (!name.trim()) {
          adding = false;
          break;
        }

        const pathHint = suggestions.includes(name.trim()) ? `./${name.trim()}` : '';
        const subPath = await input({
          message: `子项目目录路径`,
          default: pathHint,
        });

        const role = await input({
          message: '子项目描述（如 前端 - Vue3 + TypeScript）',
          default: '',
        });

        subprojects.push({
          name: name.trim(),
          path: subPath.trim() || `./${name.trim()}`,
          role: role.trim(),
        });

        // 从建议中移除已添加的
        const idx = suggestions.indexOf(name.trim());
        if (idx >= 0) suggestions.splice(idx, 1);

        const again = await confirm({ message: '继续添加子项目？', default: subprojects.length < suggestions.length });
        if (!again) adding = false;
      }

      // 保存子项目到临时变量，安装后写入 config.yaml
      // 存到全局变量让 doInstall 后使用
      global.__sillyspec_subprojects = subprojects;
    }
  }

  // 安装
  console.log('');
  const count = await doInstall(projectDir, selectedTools, isWorkspace, global.__sillyspec_subprojects || []);

  // 总结
  showSummary(version, selectedTools, isWorkspace, count);
}
