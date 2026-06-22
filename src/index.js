#!/usr/bin/env node

/**
 * SillySpec CLI — 安装工具
 *
 * 只负责两件事：init（安装命令模板）和 setup（安装 MCP 工具）。
 * 状态管理通过 sillyspec.db（SQLite）完成，使用 `sillyspec progress` 命令。
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
    [--interactive]            交互式引导
    [--dir <path>]             指定目录
    [--spec-dir <path>]        指定规范目录（默认 <项目>/.sillyspec）

  sillyspec setup [--list]     安装推荐 MCP 工具
    [--list]                   查看已安装状态

  sillyspec run <stage>        执行阶段步骤（核心命令）
    --done --output "..."      完成当前步骤
    --skip                     跳过可选步骤
    --status                   查看阶段进度
    --reset                    重置阶段（从头开始）
    --reopen                   重新打开已完成阶段进入修订模式
    --from-step <index|name>   配合 --reopen：从指定步骤开始修订
    --change <name>            设置当前变更名
    --spec-dir <path>          指定规范目录（默认 <项目>/.sillyspec）
    --runtime-root <path>       平台模式：运行时产物根路径
    --workspace-id <id>         平台模式：workspace ID
    --scan-run-id <id>          平台模式：scan run ID
    auto                       连续推进 brainstorm→plan→execute→verify

  可选阶段:
    scan, brainstorm, plan, execute, verify, archive
    quick, explore, status, doctor

  Revision mode:
    已完成阶段不能直接重跑。使用 --reopen --from-step 进入受控修订。
    重开会使下游阶段自动标记为 stale，但不修改已有产物文件。

  sillyspec progress <cmd>     进度记录（轻量，不强制顺序）
    init                       初始化项目数据库
    show                       查看当前进度
    set-stage <stage>          设置当前阶段
    add-step <stage> <name>    添加步骤
    update-step <s> <n> --status <st> [--output <t>]
    complete-stage <stage>     标记阶段完成
    check                      状态一致性检查（只报告，不修复）
    repair [--apply]           修复状态元数据（默认 dry-run，--apply 才修改）
    validate                   校验并修复
    reset [--stage X]          重置进度

  sillyspec docs migrate       迁移旧文档到统一结构

  sillyspec platform <cmd>      SillyHub 平台同步
    connect <url> [--token <t>]  连接平台
    disconnect                    断开连接
    sync [--change <name>]        同步变更状态
    sync-docs [--change <name>]   同步四件套文档
    status                        查看同步状态
    approve <change-name>         审批变更
    reject <change-name> [--reason <r>]  拒绝变更

  sillyspec dashboard          启动 Dashboard Web UI
    [--port <number>]          指定端口（默认 3456）
    [--no-open]                不自动打开浏览器

选项:
  --json                       输出 JSON（给 AI 程序化读取）
  --dir <path>                 指定项目目录（默认当前目录）
  --spec-dir <path>            指定规范目录（默认 <项目目录>/.sillyspec）

示例:
  sillyspec init
  sillyspec init --spec-dir /data/specs/my-project
  sillyspec run scan
  sillyspec run brainstorm
  sillyspec run quick
  sillyspec run explore
  sillyspec run brainstorm --done --output "需求已澄清"
  sillyspec setup --list
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
  let saveWorkflowRunFlag = false;
  let targetDir = process.cwd();
  let specDir = null;
  let tool = null;
  let interactive = false;
  const filteredArgs = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      json = true;
    } else if (args[i] === '--save') {
      saveWorkflowRunFlag = true;
    } else if (args[i] === '--dir' && args[i + 1]) {
      targetDir = resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--spec-dir' && args[i + 1]) {
      specDir = resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--tool' && args[i + 1]) {
      tool = args[i + 1];
      i++;
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
  // ── 自动纠正 cwd ──
  // 当 agent 在 worktree 内跑 pnpm 等工具后 shell cwd 可能被改变，
  // 导致 sillyspec 命令找不到 .sillyspec。此函数尝试从 git root 解析。
  function resolveEffectiveDir(baseDir) {
    if (existsSync(join(baseDir, '.sillyspec'))) return baseDir
    try {
      const { execSync } = require('child_process')
      const gitRoot = execSync('git rev-parse --show-toplevel', {
        cwd: baseDir, encoding: 'utf8', timeout: 5000
      }).trim()
      if (gitRoot && existsSync(join(gitRoot, '.sillyspec'))) return gitRoot
    } catch {}
    return baseDir
  }

  const dir = targetDir;

  if (command === 'init' && !existsSync(dir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(dir)) {
    console.error(`❌ 目录不存在: ${dir}`);
    process.exit(1);
  }

  switch (command) {
    case 'init':
      await cmdInit(dir, { tool, interactive, specDir });
      break;
    case 'setup':
      const setupList = filteredArgs.includes('--list') || filteredArgs.includes('-l');
      await (await import('./setup.js')).cmdSetup(dir, { json, list: setupList });
      break;
    case 'progress': {
      const pm = new ProgressManager();
      const progDir = resolveEffectiveDir(dir);
      const subCommand = filteredArgs[1];
      const stageIdx = filteredArgs.indexOf('--stage');
      const stage = stageIdx >= 0 && filteredArgs[stageIdx + 1] ? filteredArgs[stageIdx + 1] : null;
      // 解析 --change 参数
      const progChangeIdx = args.indexOf('--change');
      const progChangeName = progChangeIdx >= 0 && args[progChangeIdx + 1] ? args[progChangeIdx + 1] : null;

      switch (subCommand) {
        case 'init':
          pm.init(progDir);
          break;
        case 'status':
        case 'show':
          pm.show(progDir, progChangeName);
          break;
        case 'check':
          await pm.checkConsistency(progDir, progChangeName);
          break;
        case 'repair': {
          const repairApply = filteredArgs.includes('--apply');
          await pm.repairConsistency(progDir, { apply: repairApply, changeName: progChangeName });
          break;
        }
        case 'validate':
          await pm.validate(dir, progChangeName);
          break;
        case 'reset':
          pm.reset(dir, stage, progChangeName);
          break;
        case 'set-stage': {
          const setStageName = filteredArgs[2];
          if (!setStageName) { console.log('❌ 用法: sillyspec progress set-stage <stage> [--change <name>]'); break; }
          pm.setStage(dir, setStageName, progChangeName);
          break;
        }
        case 'add-step': {
          const addStepStage = filteredArgs[2];
          const addStepName = filteredArgs[3];
          if (!addStepStage || !addStepName) { console.log('❌ 用法: sillyspec progress add-step <stage> <step-name> [--change <name>]'); break; }
          pm.addStep(dir, addStepStage, addStepName, progChangeName);
          break;
        }
        case 'update-step': {
          const updStepStage = filteredArgs[2];
          const updStepName = filteredArgs[3];
          if (!updStepStage || !updStepName) { console.log('❌ 用法: sillyspec progress update-step <stage> <step-name> --status <status> [--output <text>] [--change <name>]'); break; }
          let updStatus = null, updOutput = undefined;
          for (let ai = 0; ai < args.length; ai++) {
            if (args[ai] === '--status' && args[ai + 1]) { updStatus = args[ai + 1]; ai++; }
            if (args[ai] === '--output' && args[ai + 1]) { updOutput = args[ai + 1]; ai++; }
          }
          pm.updateStep(dir, updStepStage, updStepName, { status: updStatus, output: updOutput }, progChangeName);
          break;
        }
        case 'complete-stage': {
          const compStageName = filteredArgs[2];
          if (!compStageName) { console.log('❌ 用法: sillyspec progress complete-stage <stage>'); break; }
          pm.completeStage(dir, compStageName, progChangeName);
          break;
        }
        case 'batch': {
          if (filteredArgs.includes('--status')) {
            const bp = pm.readBatchProgress(dir, progChangeName);
            if (!bp) { console.log('📭 无批量进度数据'); break; }
            const line = pm._renderBatchProgress(bp);
            console.log(line || '📭 无批量进度数据');
            console.log(JSON.stringify(bp, null, 2));
          } else {
            let batchData = {};
            const a = args;
            for (let i = 0; i < a.length; i++) {
              if (a[i] === '--total' && a[i + 1]) { batchData.total = parseInt(a[i + 1]); i++; }
              if (a[i] === '--completed' && a[i + 1]) { batchData.completed = parseInt(a[i + 1]); i++; }
              if (a[i] === '--failed' && a[i + 1]) { batchData.failed = parseInt(a[i + 1]); i++; }
              if (a[i] === '--skipped' && a[i + 1]) { batchData.skipped = parseInt(a[i + 1]); i++; }
            }
            if (Object.keys(batchData).length === 0) {
              console.log('用法: sillyspec progress batch --total 100 --completed 73');
              console.log('     sillyspec progress batch --status');
              break;
            }
            pm.updateBatchProgress(dir, batchData, progChangeName);
            console.log('✅ 批量进度已更新');
          }
          break;
        }
        default:
          console.log('用法: sillyspec progress <init|show|validate|reset|set-stage|add-step|update-step|complete-stage>');
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
      await runCommand(filteredArgs.slice(1), resolveEffectiveDir(dir), specDir)
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
    case 'worktree': {
      const { WorktreeManager } = await import('./worktree.js');
      const { ProgressManager } = await import('./progress.js');
      const wtSubCmd = filteredArgs[1];
      const wtName = filteredArgs.slice(2).find(a => !a.startsWith('-'));
      const wm = new WorktreeManager({ cwd: dir });
      const pm = new ProgressManager({ specDir });

      // isolation 写入 DB 的辅助函数
      async function _writeIsolationToDB(cwd, changeName, info) {
        if (info.blocked) {
          await pm.updateChangeIsolation(cwd, changeName, {
            status: 'blocked',
            mode: null,
            reason: info.reason,
          });
        } else {
          const mode = info.mode || 'worktree';
          const statusMap = { 'worktree': 'verified', 'native-worktree': 'verified', 'in-place-fallback': 'degraded' };
          await pm.updateChangeIsolation(cwd, changeName, {
            status: statusMap[mode] || 'verified',
            mode,
          });
        }
      }

      if (!wtSubCmd || wtSubCmd === 'help' || wtSubCmd === '--help' || wtSubCmd === '-h') {
        console.log(`
SillySpec worktree — git worktree 隔离管理

用法:
  sillyspec worktree create <change-name> [--base <branch>]   创建隔离 worktree
  sillyspec worktree apply <change-name> [--check-only]        校验并应用变更到主工作区
  sillyspec worktree list                                      列出所有活跃 worktree
  sillyspec worktree cleanup <change-name> [--force]           强制清理 worktree
  sillyspec worktree doctor [--fix] [--stale-hours N]          健康检查 + 修复

选项:
  --base <branch>       create: 指定基础分支（默认当前 HEAD）
  --check-only          apply: 只输出检查结果，不实际 apply
`);
        break;
      }

      switch (wtSubCmd) {
        case 'create': {
          if (!wtName) {
            console.error('❌ 用法: sillyspec worktree create <change-name> [--base <branch>]');
            process.exit(1);
          }
          const baseIdx = args.indexOf('--base');
          const base = baseIdx >= 0 && args[baseIdx + 1] ? args[baseIdx + 1] : undefined;
          try {
            const info = wm.create(wtName, { base });
            console.log(`✅ worktree 已创建`);
            console.log(`   分支: ${info.branch}`);
            console.log(`   路径: ${info.worktreePath}`);
            console.log(`   基准: ${info.baseHash.slice(0, 8)}`);
            if (info.mode) {
              console.log(`   模式: ${info.mode}`);
            }
            // 写入 isolation 信息到 gate-status.json
            await _writeIsolationToDB(dir, wtName, info);
          } catch (e) {
            console.error(`❌ ${e.message}`);
            // 写入 blocked 状态到 gate-status.json
            await _writeIsolationToDB(dir, wtName, { blocked: true, reason: e.message });
            process.exit(1);
          }
          break;
        }
        case 'apply': {
          if (!wtName) {
            console.error('❌ 用法: sillyspec worktree apply <change-name> [--check-only]');
            process.exit(1);
          }
          const checkOnly = args.includes('--check-only');
          const { applyWorktree } = await import('./worktree-apply.js');
          const result = applyWorktree(wtName, { cwd: dir, checkOnly });

          if (result.errors.length > 0) {
            console.error(`❌ 校验失败:`);
            for (const err of result.errors) {
              console.error(`   ${err}`);
            }
            process.exit(1);
          }

          if (result.changedFiles.length === 0) {
            console.log('📭 无变更需要应用');
            break;
          }

          if (checkOnly) {
            console.log(`✅ 检查通过 (${result.changedFiles.length} 个文件):`);
            for (const f of result.changedFiles) {
              console.log(`   ${f}`);
            }
          } else {
            console.log(`✅ 已应用 ${result.changedFiles.length} 个文件变更`);
          }
          if (result.warnings && result.warnings.length > 0) {
            for (const w of result.warnings) {
              console.log(`⚠️  ${w}`);
            }
          }
          break;
        }
        case 'list': {
          const items = wm.list();
          if (items.length === 0) {
            console.log('📭 无活跃 worktree');
            break;
          }
          // 计算列宽
          const maxName = Math.max('Change Name'.length, ...items.map(i => i.changeName.length));
          const maxBranch = Math.max('Branch'.length, ...items.map(i => i.branch.length));
          const header = `  ${'Change Name'.padEnd(maxName)}  ${'Branch'.padEnd(maxBranch)}  Created`;
          const sep = `  ${'─'.repeat(maxName)}  ${'─'.repeat(maxBranch)}  ${'─'.repeat(19)}`;
          console.log(header);
          console.log(sep);
          for (const item of items) {
            const created = item.createdAt ? item.createdAt.replace('T', ' ').replace('Z', '').slice(0, 19) : '-';
            console.log(`  ${item.changeName.padEnd(maxName)}  ${item.branch.padEnd(maxBranch)}  ${created}`);
          }
          break;
        }
        case 'cleanup': {
          if (!wtName) {
            console.error('❌ 用法: sillyspec worktree cleanup <change-name>');
            process.exit(1);
          }
          const forceFlag = args.includes('--force');
          try {
            const result = wm.cleanup(wtName, { force: forceFlag });
            if (result.result === 'cleaned' || result.result === 'force-cleaned') {
              console.log(`✅ worktree 已清理: ${wtName} (mode: ${result.mode})`);
              if (result.details?.length > 0) {
                for (const d of result.details) {
                  if (d.startsWith('⚠️')) console.log(`   ${d}`);
                }
              }
            } else if (result.result === 'skipped') {
              console.log(`⏭️  worktree 跳过清理: ${wtName} (mode: ${result.mode})`);
              console.log(`   原因: in-place 模式没有隔离目录需要清理`);
            } else {
              console.log(`ℹ️  worktree 未找到: ${wtName}`);
            }
          } catch (e) {
            console.error(`❌ ${e.message}`);
            process.exit(1);
          }
          break;
        }
        case 'doctor': {
          const fixFlag = args.includes('--fix');
          const staleIdx = args.indexOf('--stale-hours');
          const staleHours = staleIdx !== -1 && args[staleIdx + 1] ? parseInt(args[staleIdx + 1], 10) : 24;
          const diag = wm.doctor({ fix: fixFlag, staleHours });
          if (diag.issues.length === 0) {
            console.log('✅ worktree 健康检查通过，无异常');
          } else {
            console.log(`🔍 发现 ${diag.issues.length} 个问题：\n`);
            for (const issue of diag.issues) {
              const icon = issue.fixable ? '⚠️' : '❌';
              console.log(`  ${icon} [${issue.type}] ${issue.name}: ${issue.detail}`);
            }
            if (fixFlag) {
              console.log(`\n🔧 修复完成：`);
              for (const f of diag.fixed) console.log(`  ✅ ${f}`);
              if (diag.unfixable.length > 0) {
                for (const u of diag.unfixable) console.log(`  ❌ ${u}`);
              }
              if (diag.fixed.length === 0 && diag.unfixable.length === 0) {
                console.log('  无需修复');
              }
            } else {
              console.log(`\n💡 运行 sillyspec worktree doctor --fix 自动修复`);
            }
          }
          break;
        }
        default:
          console.error(`❌ 未知子命令: worktree ${wtSubCmd}`);
          console.log('   运行 sillyspec worktree --help 查看帮助');
          process.exit(1);
      }
      break;
    }
    case 'platform': {
      const platformSub = filteredArgs[1];
      const platformArgs = filteredArgs.slice(2);

      if (!platformSub || platformSub === 'help' || platformSub === '--help' || platformSub === '-h') {
        console.log(`
SillySpec platform — SillyHub 平台同步

用法:
  sillyspec platform connect <url> [--token <token>]
  sillyspec platform disconnect
  sillyspec platform sync [--change <name>]
  sillyspec platform sync-docs [--change <name>]
  sillyspec platform status
  sillyspec platform pointer [--cleanup]
  sillyspec platform approve <change-name>
  sillyspec platform reject <change-name> [--reason <reason>]
`);
        break;
      }

      let syncModule;
      try {
        syncModule = await import('./sync.js');
      } catch {
        console.error('❌ 平台同步功能不可用（sync.js 未实现）');
        process.exit(1);
      }

      switch (platformSub) {
        case 'pointer': {
          // 指针状态检查（不依赖 sync 模块）
          const { readFileSync, existsSync } = await import('fs')
          const { join } = await import('path')
          const { POINTER_STATUS, isPointerStale, isPointerCorrupted } = await import('./constants.js')
          const pointerPath = join(dir, '.sillyspec-platform.json')

          if (!existsSync(pointerPath)) {
            console.log('ℹ️  无平台指针文件。当前不在平台模式或未进行过平台 scan。')
            break
          }

          try {
            const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'))
            console.log(`📄 指针文件: ${pointerPath}`)
            console.log(`   specRoot: ${pointer.specRoot || '(缺失 ❌)'}`)
            console.log(`   runtimeRoot: ${pointer.runtimeRoot || '(未设置)'}`)
            console.log(`   workspaceId: ${pointer.workspaceId || '(未设置)'}`)
            console.log(`   scanRunId: ${pointer.scanRunId || '(未设置)'}`)
            console.log(`   savedAt: ${pointer.savedAt || '(未知)'}`)

            if (isPointerCorrupted(pointer)) {
              console.log(`   状态: ${POINTER_STATUS.CORRUPTED} ❌`) 
              console.log(`   ⚠️ 指针损坏（缺少 specRoot），建议删除后重新运行平台 scan。`)
              if (platformArgs.includes('--cleanup')) {
                const { unlinkSync } = await import('fs')
                unlinkSync(pointerPath)
                console.log(`   🗑️ 已清理损坏指针。`)
              }
            } else if (pointer.status === POINTER_STATUS.SCAN_COMPLETED) {
              if (isPointerStale(pointer)) {
                console.log(`   状态: ${POINTER_STATUS.STALE} ⚠️`)
                console.log(`   completedAt: ${pointer.completedAt}`)
                console.log(`   scanStatus: ${pointer.scanStatus || '(未知)'}`)
                console.log(`   ⚠️ 指针已过时（完成超过 24h），可以安全删除。`)
                if (platformArgs.includes('--cleanup')) {
                  const { unlinkSync } = await import('fs')
                  unlinkSync(pointerPath)
                  console.log(`   🗑️ 已清理过时指针。`)
                }
              } else {
                console.log(`   状态: ${pointer.status} ✅`)
                console.log(`   completedAt: ${pointer.completedAt}`)
                console.log(`   scanStatus: ${pointer.scanStatus || '(未知)'}`)
              }
            } else {
              console.log(`   状态: ${POINTER_STATUS.ACTIVE} 🔄`)
            }
          } catch (e) {
            console.log(`   状态: ${POINTER_STATUS.CORRUPTED} ❌`)
            console.log(`   ⚠️ 指针文件损坏: ${e.message}`)
          }
          break;
        }
        case 'connect': {
          const url = platformArgs[0];
          if (!url) {
            console.error('❌ 用法: sillyspec platform connect <url> [--token <token>]');
            process.exit(1);
          }
          const tokenIdx = args.indexOf('--token');
          const token = tokenIdx >= 0 && args[tokenIdx + 1] ? args[tokenIdx + 1] : undefined;
          if (!token) {
            console.error('⚠️ 未提供 --token，将使用交互式输入（TODO: task-11）');
          }
          await syncModule.connect(url, token, dir);
          break;
        }
        case 'disconnect':
          await syncModule.disconnect(dir);
          break;
        case 'sync': {
          const syncChangeIdx = args.indexOf('--change');
          const syncChangeName = syncChangeIdx >= 0 && args[syncChangeIdx + 1] ? args[syncChangeIdx + 1] : null;
          await syncModule.sync(syncChangeName, dir);
          break;
        }
        case 'sync-docs': {
          const syncDocsChangeIdx = args.indexOf('--change');
          const syncDocsChangeName = syncDocsChangeIdx >= 0 && args[syncDocsChangeIdx + 1] ? args[syncDocsChangeIdx + 1] : null;
          await syncModule.syncDocuments(syncDocsChangeName, dir);
          break;
        }
        case 'status':
          await syncModule.status(dir);
          break;
        case 'approve': {
          const approveName = platformArgs[0];
          if (!approveName) {
            console.error('❌ 用法: sillyspec platform approve <change-name>');
            process.exit(1);
          }
          await syncModule.approve(approveName, dir);
          break;
        }
        case 'reject': {
          const rejectName = platformArgs[0];
          if (!rejectName) {
            console.error('❌ 用法: sillyspec platform reject <change-name> [--reason <reason>]');
            process.exit(1);
          }
          const reasonIdx = args.indexOf('--reason');
          const reason = reasonIdx >= 0 && args[reasonIdx + 1] ? args[reasonIdx + 1] : undefined;
          await syncModule.reject(rejectName, reason, dir);
          break;
        }
        default:
          console.error(`❌ 未知子命令: platform ${platformSub}`);
          console.log('   运行 sillyspec platform --help 查看帮助');
          process.exit(1);
      }
      break;
    }
    case 'change-rename': {
      const oldName = filteredArgs[1];
      const newName = filteredArgs[2];
      if (!oldName || !newName) {
        console.error('❌ 用法: sillyspec change-rename <旧变更名> <新变更名>');
        process.exit(1);
      }
      const pm = new ProgressManager({ specDir });
      await pm.renameChange(dir, oldName, newName);
      break;
    }
    case 'workflow': {
      const wfSub = filteredArgs[1];
      if (!wfSub || wfSub === 'help' || wfSub === '--help') {
        console.log(`
SillySpec workflow — 工作流管理

用法:
  sillyspec workflow check <name> [--project <project>] [--json]
  sillyspec workflow list
`);
        break;
      }
      if (wfSub === 'list') {
        const { listWorkflows } = await import('./workflow.js');
        const names = listWorkflows(dir);
        if (names.length === 0) {
          console.log('未找到 workflow 定义（.sillyspec/workflows/*.yaml）');
        } else {
          console.log(`可用 workflow：`);
          for (const name of names) {
            const { loadWorkflow } = await import('./workflow.js');
            const wf = loadWorkflow(dir, name);
            const specVer = wf?.spec_version || wf?.version || '?';
            const mode = wf?.orchestration?.mode || '?';
            const roles = wf?.roles?.length || 0;
            console.log(`  ${name} (spec v${specVer}, ${mode}, ${roles} roles)`);
          }
        }
        break;
      }
      if (wfSub === 'check') {
        const { loadWorkflow, runPostCheck, listWorkflows, saveWorkflowRun } = await import('./workflow.js');
        const wfName = filteredArgs[2];
        if (!wfName) {
          console.error('❌ 请指定 workflow 名称，例如：sillyspec workflow check scan-docs --project sillyspec');
          process.exit(2);
        }
        const wf = loadWorkflow(dir, wfName);
        if (!wf) {
          console.error(`❌ 未找到 workflow: ${wfName}`);
          console.error(`可用 workflow：${listWorkflows(dir).join(', ') || '无'}`);
          process.exit(2);
        }
        // depends_on 校验
        if (wf._validationErrors && wf._validationErrors.length > 0) {
          console.error('❌ workflow YAML 校验失败：');
          for (const err of wf._validationErrors) {
            console.error(`   ${err}`);
          }
          process.exit(2);
        }
        // spec_version 校验
        const specVer = wf.spec_version || wf.version;
        if (!specVer) {
          console.error('❌ workflow YAML 缺少 spec_version 字段');
          process.exit(2);
        }
        const SUPPORTED_SPECS = [1];
        if (!SUPPORTED_SPECS.includes(specVer)) {
          console.error(`❌ 不支持的 spec_version: ${specVer}（支持: ${SUPPORTED_SPECS.join(', ')}）`);
          process.exit(2);
        }
        // 解析 --project
        const projectIdx = filteredArgs.indexOf('--project');
        const project = projectIdx !== -1 && filteredArgs[projectIdx + 1] ? filteredArgs[projectIdx + 1] : null;
        // 解析 --json（已在顶层解析）
        const isJson = json;
        // 解析 --change
        const changeIdx = filteredArgs.indexOf('--change');
        const changeName = changeIdx !== -1 && filteredArgs[changeIdx + 1] ? filteredArgs[changeIdx + 1] : null;

        if (!project && wfName !== 'archive-impact') {
          console.error('❌ 请指定 --project，例如：--project sillyspec');
          process.exit(2);
        }

        // 执行检查
        let resolvedWf = wf;
        const placeholders = {};
        if (changeName) placeholders['change-name'] = changeName;
        // 替换占位符
        let jsonStr = JSON.stringify(resolvedWf);
        if (changeName) jsonStr = jsonStr.replace(/<change-name>/g, changeName);
        resolvedWf = JSON.parse(jsonStr);

        const projectName = project || 'sillyspec';
        const result = runPostCheck(resolvedWf, dir, projectName, placeholders);

        if (isJson) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          // 带项目维度前缀的输出（从统一结果对象格式化）
          const lines = [`\n📋 Workflow Post-Check: ${result.workflow} (project: ${result.project})\n`];
          for (const r of (result.roles || [])) {
            const icon = r.status === 'pass' ? '✅' : '❌';
            lines.push(`${icon} [${result.project}] ${r.name} (${r.id})`);
            const roleFailures = (result.failures || []).filter(f => f.role_id === r.id);
            for (const f of roleFailures) {
              lines.push(`   └─ ${f.message}`);
            }
          }
          const wfFailures = (result.workflow_checks || []).filter(c => c.status === 'fail');
          if (wfFailures.length > 0) {
            lines.push('');
            for (const f of wfFailures) {
              lines.push(`❌ [${result.project}] 全局: ${f.detail}`);
            }
          }
          lines.push('');
          if (result.status === 'pass') {
            lines.push('✅ 全部检查通过');
          } else {
            lines.push('❌ 存在失败项');
          }
          console.log(lines.join('\n'));
        }

        // exit code: 0=通过, 1=检查失败, 2=参数/YAML错误
        if (saveWorkflowRunFlag) {
          const saved = saveWorkflowRun(result, { cwd: dir, source: 'cli' });
          if (saved) {
            if (!isJson) console.log(`\n📁 结果已归档：${saved}`);
          }
        }
        process.exit(result.status === 'pass' ? 0 : 1);
      } else {
        console.error(`❌ 未知子命令: workflow ${wfSub}`);
        process.exit(1);
      }
      break;
    }
    case 'modules': {
      const modulesSub = filteredArgs[1];
      if (!modulesSub || modulesSub === 'help' || modulesSub === '--help') {
        console.log(`
SillySpec modules — 模块文档管理

用法:
  sillyspec modules rebuild        从模块卡片 + 源码重建 _module-map.yaml
  sillyspec modules status         显示模块索引状态
  sillyspec modules migrate        旧格式模块文档迁移到新格式
`);
        break;
      }
      if (modulesSub === 'rebuild') {
        const { rebuildModuleMap } = await import('./modules.js');
        await rebuildModuleMap(dir);
      } else if (modulesSub === 'status') {
        const { showModuleStatus } = await import('./modules.js');
        await showModuleStatus(dir);
      } else if (modulesSub === 'migrate') {
        const { migrateModuleDocs } = await import('./modules.js');
        await migrateModuleDocs(dir);
      } else {
        console.error(`❌ 未知子命令: modules ${modulesSub}`);
        process.exit(1);
      }
      break;
    }
    default:
      console.error(`❌ 未知命令: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
