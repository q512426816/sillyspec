import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { checkbox, confirm } from '@inquirer/prompts';

// ── MCP 工具定义 ──

const MCP_TOOLS = [
  {
    id: 'context7',
    name: 'Context7',
    description: '查询最新库文档和 API 参考',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@latest'],
    url: 'https://github.com/upstash/context7-mcp',
  },
  {
    id: 'grep-app',
    name: 'grep.app',
    description: '搜索开源代码实现和参考',
    command: 'npx',
    args: ['-y', '@nicobailon/grep-app-mcp'],
    url: 'https://grep.app',
  },
  {
    id: 'chrome-devtools',
    name: 'Chrome DevTools MCP',
    description: '浏览器自动化，支持 E2E 测试（需 Chrome 已运行）',
    command: 'npx',
    args: ['-y', '@nicholasxjy/chrome-devtools-mcp'],
    url: 'https://github.com/ChromeDevTools/chrome-devtools-mcp',
  },
];

// ── MCP 配置文件路径 ──

const MCP_CONFIG_PATHS = [
  { tool: 'Claude Code', path: '.claude/mcp.json', key: 'claude' },
  { tool: 'Cursor', path: '.cursor/mcp.json', key: 'cursor' },
];

// ── 工具函数 ──

function readMcpConfig(dir, configPath) {
  const fullPath = join(dir, configPath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeMcpConfig(dir, configPath, config) {
  const fullPath = join(dir, configPath);
  mkdirSync(join(dir, configPath).replace(/[^/]+$/, ''), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(config, null, 2) + '\n');
}

function installMcp(config, mcpTool) {
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers[mcpTool.id] = {
    command: mcpTool.command,
    args: mcpTool.args,
  };
  return config;
}

function hasMcpInstalled(config, mcpId) {
  return config?.mcpServers?.[mcpId] != null;
}

// ── 命令实现 ──

export async function cmdSetup(dir, options = {}) {
  const { json } = options;

  // 检查哪些 AI 工具有配置文件
  const availableTools = MCP_CONFIG_PATHS.filter(({ path }) => {
    return existsSync(join(dir, path));
  });

  if (availableTools.length === 0) {
    if (json) {
      console.log(JSON.stringify({ installed: [], message: '未检测到 AI 工具配置文件，请先运行 sillyspec init' }));
    } else {
      console.log(chalk.yellow('⚠️  未检测到 AI 工具配置文件（.claude/mcp.json 或 .cursor/mcp.json）'));
      console.log(chalk.dim('   请先运行 sillyspec init 初始化项目'));
    }
    return;
  }

  // --list 模式：只查看状态
  if (options.list) {
    const results = {};
    for (const { tool, path } of availableTools) {
      const config = readMcpConfig(dir, path);
      const installed = {};
      for (const mcp of MCP_TOOLS) {
        installed[mcp.id] = hasMcpInstalled(config, mcp.id);
      }
      results[tool] = { configPath: path, mcp: installed };
    }

    if (json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log('');
      for (const [tool, data] of Object.entries(results)) {
        console.log(chalk.bold(`📋 ${tool} (${data.configPath})`));
        for (const mcp of MCP_TOOLS) {
          const status = data.mcp[mcp.id] ? chalk.green('✅') : chalk.gray('⬜');
          console.log(`  ${status} ${mcp.name} — ${mcp.description}`);
        }
        console.log('');
      }
    }
    return;
  }

  // 非交互模式
  if (!process.stdin.isTTY) {
    if (json) {
      console.log(JSON.stringify({ message: '交互模式需要 TTY，请运行 sillyspec setup' }));
    } else {
      console.log(chalk.yellow('⚠️  请在交互式终端运行 sillyspec setup'));
    }
    return;
  }

  // ── 交互式安装 ──

  console.log('');
  console.log(chalk.cyan('🔧 SillySpec Setup — 安装推荐 MCP 工具'));
  console.log('');
  console.log('  MCP 工具让 AI 能力增强：查文档、搜代码、控制浏览器。');
  console.log('  选择要安装的工具（已安装的会跳过）：');
  console.log('');

  // 检测已安装状态（从所有配置文件合并）
  const installedSet = new Set();
  for (const { path } of availableTools) {
    const config = readMcpConfig(dir, path);
    for (const mcp of MCP_TOOLS) {
      if (hasMcpInstalled(config, mcp.id)) installedSet.add(mcp.id);
    }
  }

  const choices = MCP_TOOLS.filter(m => !installedSet.has(m.id)).map(m => ({
    name: `${m.name} — ${m.description}`,
    value: m.id,
    checked: false,
  }));

  if (choices.length === 0) {
    console.log(chalk.green('  ✅ 所有推荐的 MCP 工具已安装！'));
    return;
  }

  const selected = await checkbox({
    message: '选择要安装的 MCP 工具',
    choices,
  });

  if (selected.length === 0) {
    console.log(chalk.dim('  未选择任何工具，退出。'));
    return;
  }

  const selectedTools = MCP_TOOLS.filter(m => selected.includes(m.id));

  // 选择安装到哪些 AI 工具
  const toolChoices = availableTools.map(t => ({
    name: t.tool,
    value: t.key,
    checked: true,
  }));

  const targetTools = await checkbox({
    message: '安装到哪些 AI 工具？',
    choices: toolChoices,
  });

  const targets = availableTools.filter(t => targetTools.includes(t.key));

  // 安装
  console.log('');
  for (const { tool, path } of targets) {
    const spinner = ora(`安装到 ${tool}...`).start();
    let config = readMcpConfig(dir, path) || { mcpServers: {} };

    for (const mcp of selectedTools) {
      config = installMcp(config, mcp);
    }

    writeMcpConfig(dir, path, config);
    spinner.succeed(`${tool} 完成 (${selected.length} 个工具)`);
  }

  // 总结
  console.log('');
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log(chalk.green('  ✅ MCP 工具安装完成！'));
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log('');
  for (const mcp of selectedTools) {
    console.log(`  🔌 ${chalk.cyan(mcp.name)} — ${mcp.description}`);
    console.log(chalk.dim(`     ${mcp.url}`));
  }
  console.log('');
  console.log(chalk.dim('  重启你的 AI 工具以使 MCP 配置生效。'));
  console.log('');
}
