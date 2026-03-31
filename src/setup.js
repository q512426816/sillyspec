import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
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
    id: 'chrome-devtools',
    name: 'Chrome DevTools MCP',
    description: '浏览器自动化，支持 E2E 测试（需 Chrome 已运行）',
    command: 'npx',
    args: ['chrome-devtools-mcp@latest'],
    url: 'https://github.com/ChromeDevTools/chrome-devtools-mcp',
  },
];

// ── 全局工具定义 ──

const GLOBAL_TOOLS = [
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'E2E 测试框架，支持浏览器自动化测试',
    checkCommand: 'npx playwright --version',
    installCommand: 'npm install -g @playwright/test && npx playwright install chromium',
    url: 'https://playwright.dev',
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
  mkdirSync(dirname(fullPath), { recursive: true });
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

  // --list 模式：只查看状态（不依赖 AI 工具配置）
  if (options.list) {
    const results = {};

    // MCP 状态
    for (const { tool, path } of availableTools) {
      const config = readMcpConfig(dir, path);
      const mcpStatus = {};
      for (const mcp of MCP_TOOLS) {
        mcpStatus[mcp.id] = hasMcpInstalled(config, mcp.id);
      }
      results[tool] = { configPath: path, mcp: mcpStatus };
    }

    // 全局工具状态
    results['全局工具'] = {};
    for (const g of GLOBAL_TOOLS) {
      try {
        execSync(g.checkCommand, { stdio: 'pipe', encoding: 'utf8' });
        results['全局工具'][g.id] = true;
      } catch {
        results['全局工具'][g.id] = false;
      }
    }

    if (json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log('');
      for (const [tool, data] of Object.entries(results)) {
        if (data.mcp) {
          console.log(chalk.bold(`📋 ${tool} (${data.configPath})`));
          for (const mcp of MCP_TOOLS) {
            const status = data.mcp[mcp.id] ? chalk.green('✅') : chalk.gray('⬜');
            console.log(`  ${status} ${mcp.name} — ${mcp.description}`);
          }
        } else {
          console.log(chalk.bold(`🛠️  ${tool}`));
          for (const g of GLOBAL_TOOLS) {
            const status = data[g.id] ? chalk.green('✅') : chalk.gray('⬜');
            console.log(`  ${status} ${g.name} — ${g.description}`);
          }
        }
        console.log('');
      }
    }
    return;
  }

  // 非交互模式（或没有 AI 工具但有全局工具要装）
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
  console.log(chalk.cyan('🔧 SillySpec Setup — 增强工具安装'));
  console.log('');

  if (availableTools.length === 0) {
    console.log(chalk.dim('  未检测到 AI 工具配置文件，MCP 工具将跳过。'));
    console.log(chalk.dim('  请先运行 sillyspec init 初始化项目。'));
    console.log('');
  }

  console.log('  选择要安装的工具（已安装的会跳过）：');
  console.log('');

  // ── MCP 工具选择 ──

  const installedSet = new Set();
  for (const { path } of availableTools) {
    const config = readMcpConfig(dir, path);
    for (const mcp of MCP_TOOLS) {
      if (hasMcpInstalled(config, mcp.id)) installedSet.add(mcp.id);
    }
  }

  const mcpChoices = MCP_TOOLS.filter(m => !installedSet.has(m.id)).map(m => ({
    name: `${m.name} — ${m.description}`,
    value: `mcp:${m.id}`,
    checked: false,
  }));

  // ── 全局工具选择 ──

  const globalInstalled = new Set();
  for (const tool of GLOBAL_TOOLS) {
    try {
      execSync(tool.checkCommand, { stdio: 'pipe', encoding: 'utf8' });
      globalInstalled.add(tool.id);
    } catch {}
  }

  const globalChoices = GLOBAL_TOOLS.filter(t => !globalInstalled.has(t.id)).map(t => ({
    name: `${t.name} — ${t.description}（全局安装）`,
    value: `global:${t.id}`,
    checked: false,
  }));

  const allChoices = [
    ...mcpChoices.length > 0 ? [{ name: chalk.bold('── MCP 工具（AI 工具配置）──'), value: '_mcp_header', disabled: true }] : [],
    ...mcpChoices,
    ...globalChoices.length > 0 ? [{ name: chalk.bold('── 全局工具 ──'), value: '_global_header', disabled: true }] : [],
    ...globalChoices,
  ];

  if (allChoices.length === 0) {
    console.log(chalk.green('  ✅ 所有推荐工具已安装！'));
    return;
  }

  const selected = await checkbox({
    message: '选择要安装的工具',
    choices: allChoices,
  });

  if (selected.length === 0) {
    console.log(chalk.dim('  未选择任何工具，退出。'));
    return;
  }

  const selectedMcp = MCP_TOOLS.filter(m => selected.includes(`mcp:${m.id}`));
  const selectedGlobal = GLOBAL_TOOLS.filter(t => selected.includes(`global:${t.id}`));

  // ── 安装 MCP 工具 ──

  if (selectedMcp.length > 0) {
    const toolChoices = availableTools.map(t => ({
      name: t.tool,
      value: t.key,
      checked: true,
    }));

    const targetTools = await checkbox({
      message: 'MCP 工具安装到哪些 AI 工具？',
      choices: toolChoices,
    });

    const targets = availableTools.filter(t => targetTools.includes(t.key));

    console.log('');
    for (const { tool, path } of targets) {
      const spinner = ora(`安装 MCP 到 ${tool}...`).start();
      let config = readMcpConfig(dir, path) || { mcpServers: {} };
      for (const mcp of selectedMcp) {
        config = installMcp(config, mcp);
      }
      writeMcpConfig(dir, path, config);
      spinner.succeed(`${tool} MCP 完成 (${selectedMcp.length} 个工具)`);
    }
  }

  // ── 安装全局工具 ──

  if (selectedGlobal.length > 0) {
    console.log('');
    for (const tool of selectedGlobal) {
      const spinner = ora(`安装 ${tool.name}...`).start();
      try {
        execSync(tool.installCommand, { stdio: 'pipe', encoding: 'utf8', timeout: 120000 });
        spinner.succeed(`${tool.name} 安装完成`);
      } catch (err) {
        spinner.fail(`${tool.name} 安装失败: ${err.message}`);
      }
    }
  }

  // ── 总结 ──

  console.log('');
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log(chalk.green('  ✅ 工具安装完成！'));
  console.log(chalk.green('  ═══════════════════════════════════════'));
  console.log('');
  for (const mcp of selectedMcp) {
    console.log(`  🔌 ${chalk.cyan(mcp.name)} — ${mcp.description}`);
    console.log(chalk.dim(`     ${mcp.url}`));
  }
  for (const g of selectedGlobal) {
    console.log(`  🛠️  ${chalk.cyan(g.name)} — ${g.description}`);
    console.log(chalk.dim(`     ${g.url}`));
  }
  console.log('');
  if (selectedMcp.length > 0) {
    console.log(chalk.dim('  重启你的 AI 工具以使 MCP 配置生效。'));
  }
  console.log('');
}
