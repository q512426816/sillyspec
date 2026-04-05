#!/usr/bin/env node

/**
 * SillySpec CLI — 安装工具
 *
 * 只负责两件事：init（安装命令模板）和 setup（安装 MCP 工具）。
 * 状态管理通过 progress.json 完成，使用 `sillyspec progress` 命令。
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
  sillyspec progress <cmd>    进度管理
    init                      初始化 progress.json
    show                      查看当前进度
    set-stage <stage>         设置当前阶段
    add-step <stage> <name>   添加步骤
    update-step <s> <n> --status <st> [--output <t>]
    complete-stage <stage>    完成阶段并推进
    validate                  校验并修复
    reset [--stage X]         重置进度
    complete --stage X        归档已完成阶段
  sillyspec docs migrate       迁移旧文档到统一结构
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
  // 支持 sillyspec init /path/to/project 语法：如果第二个参数看起来像路径，当作 targetDir
  if (command === 'init' && filteredArgs[1] && !filteredArgs[1].startsWith('-')) {
    targetDir = resolve(filteredArgs[1]);
    filteredArgs.splice(1, 1);
  }
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
      const stageIdx = filteredArgs.indexOf('--stage');
      const stage = stageIdx >= 0 && filteredArgs[stageIdx + 1] ? filteredArgs[stageIdx + 1] : null;

      switch (subCommand) {
        case 'init':
          pm.init(dir);
          break;
        case 'status':
        case 'show':
          pm.show(dir);
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
        case 'set-stage': {
          const setStageName = filteredArgs[2];
          if (!setStageName) { console.log('❌ 用法: sillyspec progress set-stage <stage>'); break; }
          pm.setStage(dir, setStageName);
          break;
        }
        case 'add-step': {
          const addStepStage = filteredArgs[2];
          const addStepName = filteredArgs[3];
          if (!addStepStage || !addStepName) { console.log('❌ 用法: sillyspec progress add-step <stage> <step-name>'); break; }
          pm.addStep(dir, addStepStage, addStepName);
          break;
        }
        case 'update-step': {
          const updStepStage = filteredArgs[2];
          const updStepName = filteredArgs[3];
          if (!updStepStage || !updStepName) { console.log('❌ 用法: sillyspec progress update-step <stage> <step-name> --status <status> [--output <text>]'); break; }
          // Parse --status and --output from args
          let updStatus = null, updOutput = undefined;
          for (let ai = 0; ai < args.length; ai++) {
            if (args[ai] === '--status' && args[ai + 1]) { updStatus = args[ai + 1]; ai++; }
            if (args[ai] === '--output' && args[ai + 1]) { updOutput = args[ai + 1]; ai++; }
          }
          pm.updateStep(dir, updStepStage, updStepName, { status: updStatus, output: updOutput });
          break;
        }
        case 'complete-stage': {
          const compStageName = filteredArgs[2];
          if (!compStageName) { console.log('❌ 用法: sillyspec progress complete-stage <stage>'); break; }
          pm.completeStage(dir, compStageName);
          break;
        }
        default:
          console.log('用法: sillyspec progress <init|show|validate|reset|complete|set-stage|add-step|update-step|complete-stage>');
      }
      break;
    }
    case 'docs': {
      const docsSubCmd = filteredArgs[1];
      if (docsSubCmd === 'migrate') {
        const { migrateDocs } = await import('./migrate.js');
        migrateDocs(dir);
      } else {
        console.log('用法: sillyspec docs migrate');
      }
      break;
    }
    case 'run': {
      const { runCommand } = await import('./run.js')
      runCommand(filteredArgs.slice(1), dir)
      break
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
