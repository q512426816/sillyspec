#!/usr/bin/env node

/**
 * SillySpec CLI — 安装工具
 *
 * 只负责两件事：init（安装命令模板）和 setup（安装 MCP 工具）。
 * 状态管理由 AI 直接读文件（STATE.md）完成，不需要 CLI。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { cmdInit, getVersion } from './init.js';
import { ProgressManager } from './progress.js';

// ── CLI 入口 ──

function printUsage() {
  console.log(`
SillySpec CLI — 规范驱动开发工具包

用法:
  sillyspec init               初始化（零交互，自动检测工具）
    [--tool <name>]            只安装指定工具
    [--workspace]              工作区模式
    [--interactive]            交互式引导
    [--dir <path>]             指定目录
  sillyspec setup [--list]     安装推荐 MCP 工具
    [--list]                   查看已安装状态
  sillyspec progress <cmd>    进度恢复管理
    init                      初始化进度文件
    status                    查看当前进度
    validate                  校验并修复进度文件
    reset [--stage X]         重置进度（全部或指定阶段）
    complete --stage X        归档已完成阶段
  sillyspec dashboard          启动 Dashboard Web UI
    [--port <number>]          指定端口（默认 3456）
    [--no-open]                不自动打开浏览器

选项:
  --json                       输出 JSON（给 AI 程序化读取）
  --dir <path>                 指定项目目录（默认当前目录）

示例:
  sillyspec init
  sillyspec init --tool claude
  sillyspec init --workspace
  sillyspec setup
  sillyspec setup --list
  sillyspec dashboard
  sillyspec dashboard --port 8080 --no-open
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(getVersion());
    process.exit(0);
  }

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  // 解析全局选项
  let json = false;
  let targetDir = process.cwd();
  let tool = null;
  let workspace = false;
  let interactive = false;
  const filteredArgs = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      json = true;
    } else if (args[i] === '--dir' && args[i + 1]) {
      targetDir = resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--tool' && args[i + 1]) {
      tool = args[i + 1];
      i++;
    } else if (args[i] === '--workspace' || args[i] === '-w') {
      workspace = true;
    } else if (args[i] === '--interactive' || args[i] === '-i') {
      interactive = true;
    } else if (args[i] === '--list' || args[i] === '-l') {
      filteredArgs.push('--list');
    } else {
      filteredArgs.push(args[i]);
    }
  }

  const command = filteredArgs[0];
  const dir = targetDir;

  if (!existsSync(dir)) {
    console.error(`❌ 目录不存在: ${dir}`);
    process.exit(1);
  }

  switch (command) {
    case 'init':
      await cmdInit(dir, { tool, workspace, interactive });
      break;
    case 'setup':
      const setupList = filteredArgs.includes('--list') || filteredArgs.includes('-l');
      await (await import('./setup.js')).cmdSetup(dir, { json, list: setupList });
      break;
    case 'progress': {
      const pm = new ProgressManager();
      const subCommand = filteredArgs[1];
      const stageIdx = args.indexOf('--stage');
      const stage = stageIdx >= 0 && args[stageIdx + 1] ? args[stageIdx + 1] : null;

      switch (subCommand) {
        case 'init':
          pm.init(dir);
          break;
        case 'status':
          pm.status(dir);
          break;
        case 'validate':
          pm.validate(dir);
          break;
        case 'reset':
          pm.reset(dir, stage);
          break;
        case 'complete':
          pm.complete(dir, stage);
          break;
        default:
          console.log('用法: sillyspec progress <init|status|validate|reset|complete> [--stage <stage>]');
      }
      break;
    }
    case 'dashboard': {
      // Parse dashboard options
      let port = 3456;
      let openBrowser = true;

      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--port' && args[i + 1]) {
          port = parseInt(args[i + 1], 10);
          i++;
        } else if (args[i] === '--no-open') {
          openBrowser = false;
        }
      }

      // Import and start dashboard server
      const { startServer } = await import('../packages/dashboard/server/index.js');
      startServer({ port, open: openBrowser });

      // Keep process alive
      console.log('按 Ctrl+C 停止服务器');
      break;
    }
    default:
      console.error(`❌ 未知命令: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
