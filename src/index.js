#!/usr/bin/env node

/**
 * SillySpec CLI — 安装工具
 *
 * 只负责两件事：init（安装命令模板）和 setup（安装 MCP 工具）。
 * 状态管理通过 sillyspec.db（SQLite）完成，使用 `sillyspec progress` 命令。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import { writeAtomicSync } from './fs-atomic.js';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { git } from './git-helper.js';
import { getVersion } from './version.js';
import { ProgressManager, resolvePlatformSpecDir } from './progress.js';

// ── CLI 入口 ──

// did-you-mean 从 ./run/shared.js 复用（命令级 + flag 级 typo 建议）。
import { didYouMean, assertSafeChangeName, resolveSpecDir, detectWorktreeSpecDrift } from './run/shared.js'
function printUsage() {
  console.log(`
SillySpec CLI — 规范驱动开发工具包

用法:
  sillyspec init [--tool <name>] [--interactive] [--dir <path>] [--spec-dir <path>]
                                      初始化（零交互，自动检测工具并安装命令模板）
  sillyspec setup [--list]            安装推荐 MCP 工具（--list 查看已安装状态）

  sillyspec run <stage> [options]     执行阶段步骤（核心命令）
  sillyspec <stage> [options]         顶层别名，等同 run <stage>
    stage: scan | brainstorm | plan | execute | verify | archive |
           quick | explore | status | doctor | auto

  run 通用参数（所有 stage 适用）:
    --done --output "摘要" [--input "用户原话"]   完成当前步骤
    --status                           查看阶段进度
    --skip                             跳过可选步骤
    --reset                            重置阶段（从头开始）
    --reopen --from-step <序号|名称>   重新打开已完成阶段进入修订
    --wait --reason "..." --options "A,B"          暂停等用户决策
    --continue --answer "..."                      恢复等待中的步骤
    --done --answer "..." --output "..."           一步完成 wait+done
    --change <名>                      指定变更名（多活跃变更必填，单变更可省）
    --spec-dir <path>                  指定规范目录（默认 <项目>/.sillyspec）
    --non-interactive                  CI/脚本：禁用交互式 prompt
    --interactive                      强制交互（即便 stdin 非 TTY）
    --skip-approval                    跳过审批/校验门控（需明确意图）
    --json                             输出 JSON（程序化读取）

  阶段特有参数:
    quick:   --linked-changes none|a,b   显式关联变更（取代 --change，推荐）
             --files a.js,b.js           显式声明允许修改的文件
             --allow-new                 允许新增文件（默认禁止）
             --force-baseline            允许覆盖 baseline 受保护文件
             --confirm                   完成时确认接受变更审计
    scan:    --quick | --standard | --deep   显式选择 profile（优先于规模自动判定；三档互斥）
             --force-rescan              覆盖已有 scan 文档保护
    archive: --confirm                   归档确认（必须）
    auto:    --mode <模式>               显式指定流程模式
    平台:    --runtime-root <path> / --workspace-id <id> / --scan-run-id <id>

  sillyspec progress <cmd>     进度记录（轻量，不强制顺序）
    init | show | set-stage <stage> | add-step <stage> <name> |
    update-step <stage> <name> --status <st> [--output <t>] [--force] | complete-stage <stage> [--force] |
    check | repair [--apply] | validate | reset [--stage X] |
    batch --total N --completed M [--failed F] [--skipped K] | batch --status

  sillyspec worktree <cmd>     git worktree 隔离管理（execute 阶段相关）
    create <change> [--base <branch>]   创建隔离 worktree
    apply <change> [--check-only]       校验并应用变更到主工作区
    assess <change>                     风险审计 + 自动 apply
    list | meta <change>                列出 / 读取 meta.json
    cleanup <change> [--force]          清理 worktree
    doctor [--fix] [--stale-hours N]    健康检查 + 修复

  sillyspec local detect [--dir <path>]   生成本地配置 local.yaml（纯 fs 嗅探，零 token、不跑 scan）
  sillyspec config [schema] [--json]      打印 local.yaml 全部已知键 + 生效状态 + 读取点（堵外部 agent 配置发现缺口）
  sillyspec runtime list [--json]         枚举 .sillyspec/.runtime/ 运行时产物（只读，看手上有哪些证据/状态文件）
  sillyspec dispatch <probe | hint>       SillyHub 派发能力探测 + 策略生成（agent 调用桥，仅渲染不执行 tool）

  sillyspec workflow check <name> [--project <p>] [--change <c>] [--json] [--save]
                                      全局 workflow 校验（--save 归档到 .sillyspec/.runtime/workflow-runs/）
  sillyspec workflow list
  sillyspec gate <stage> --change <name> [--json]      机器门控：阶段能否标记完成（只读）
  sillyspec derive <facet> --change <name> [--json]    单项事实核验（facet: execute-evidence|verify-test|task-reviews|artifacts）
  sillyspec backfill-reviews --change <name> [--json]  为手动补的 task 生成 review.json 草稿（cannot_verify，解 archive 客观完成度阻断）
  sillyspec register-stage-review --change <name> --stage <brainstorm|plan|execute> [--from <review.json>] [--json]
                                      生成/adopt stage 级 review.json（docHash 自动算 + 写 marker，治 tier=independent marker 死锁）

  sillyspec doctor [子命令]            进度库健康检查 + 修复（顶层命令，非 worktree doctor）
    （无子命令）                       跑诊断，列出问题
    --align-execute-progress [--change <名>] [--confirm]   基于 plan.md 对齐 execute 派生戳（默认 dry-run）
    --cleanup-remnant [--confirm]      删除 0 字节空占位 db（默认 dry-run，仅 --confirm 落盘）
    --dump-db --path <db 路径>         dump 指定 db 内容到文件（取证用）
    --json                             结构化诊断 + 落盘 .sillyspec/.runtime/doctor-diagnosis.json
  sillyspec modules <rebuild | status | migrate>
  sillyspec change-rename <旧变更名> <新变更名>
  sillyspec knowledge <search --query "..." --limit N
                        | inspect --id "..."
                        | validate | refresh
                        | propose --title "..." --category <name>>
  sillyspec platform <connect <url> [--token <t>]
                      | disconnect
                      | sync [--change <name>] | sync-docs [--change <name>]
                      | status | pointer [--cleanup]
                      | approve <change> | reject <change> [--reason <r>]>
  sillyspec docs migrate
  sillyspec dashboard [--port <N>] [--no-open]

全局选项:
  --json              输出 JSON
  --dir <path>        指定项目目录（默认当前目录）
  --spec-dir <path>   指定规范目录（默认 <项目目录>/.sillyspec）
  --tool <name>       指定工具（init 用）
  --interactive, -i   交互式引导
  --version, -v       查看版本

示例:
  sillyspec init
  sillyspec run brainstorm --change 2026-07-03-add-login
  sillyspec run quick --linked-changes none --done --output "修复手机号校验"
  sillyspec run verify --done --output "验证通过，测试全绿"
  sillyspec run archive --done --confirm --output "归档完成"
  sillyspec run plan --reopen --from-step 2          # 修订 plan，从第 2 步重做
  sillyspec run quick --non-interactive --done --output "CI 内的快修"  # 脚本/CI
  sillyspec progress show
  sillyspec worktree apply 2026-07-03-add-login
`);
}

// --json 模式输出纪律（design §8 风险表）：machine-interface 的 runGate/runDerive 执行期间，
// 被调模块（validators/task-review/verify-postcheck）的人类可读 console.log 会污染 stdout 破坏 JSON。
// 在整个调用期间把 console.log/info 重定向到 stderr，stdout 留给最终 JSON envelope（D-005@v1）。
async function withJsonOutput(json, fn) {
  if (!json) return fn();
  const origLog = console.log;
  const origInfo = console.info;
  console.log = (...a) => process.stderr.write(a.map(String).join(' ') + '\n');
  console.info = (...a) => process.stderr.write(a.map(String).join(' ') + '\n');
  try {
    return await fn();
  } finally {
    console.log = origLog;
    console.info = origInfo;
  }
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
  // --tool 多值收集（逗号分隔 + 重复 flag）；空数组 = 未提供，cmdInit 侧自动检测
  const toolValues = [];
  let interactive = false;
  // init 专属：--no-skills 跳过 skills 复制段（platform init 勿污染项目内工具目录）
  let noSkills = false;
  // 平台模式 flag（init 落平台指针用；非 init 命令时忽略——runCommand 自行解析 filteredArgs）
  let platformWorkspaceId = null;
  let platformRuntimeRoot = null;
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
      // 多值支持：逗号分隔（--tool claude,codex）与重复 flag（--tool a --tool b）都收集进数组
      for (const v of args[i + 1].split(',')) {
        const t = v.trim();
        if (t) toolValues.push(t);
      }
      i++;
    } else if (args[i] === '--no-skills') {
      // init 专属：跳过 skills 复制段（吞进变量，不透传 filteredArgs）
      noSkills = true;
    } else if (args[i] === '--workspace-id' && args[i + 1]) {
      // 平台模式专属 flag（init 落平台指针用；--runtime-root/--scan-run-id 保持在
      // filteredArgs 由 runCommand 解析，init 侧只需要 workspaceId 作为平台信号 + runtimeRoot）
      platformWorkspaceId = args[i + 1];
      filteredArgs.push(args[i], args[i + 1]);
      i++;
    } else if (args[i] === '--runtime-root' && args[i + 1]) {
      platformRuntimeRoot = resolve(args[i + 1]);
      filteredArgs.push(args[i], args[i + 1]);
      i++;
    } else if (args[i] === '--interactive' || args[i] === '-i') {
      interactive = true;
    } else if (args[i] === '--list' || args[i] === '-l') {
      filteredArgs.push('--list');
    } else {
      filteredArgs.push(args[i]);
    }
  }

  // F3：--interactive（全局 flag，被上面吞进 interactive 变量）与 --non-interactive（透传到 filteredArgs）
  // 语义相反，同时给是矛盾。在此层检测（command.js 看不到 --interactive）。
  if (interactive && filteredArgs.includes('--non-interactive')) {
    console.error('❌ --non-interactive 与 --interactive 互斥（一个禁用交互、一个强制交互），请只保留一个。');
    process.exit(2);
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
      await (await import('./init.js')).cmdInit(dir, { tool, tools: toolValues.length > 0 ? toolValues : null, interactive, specDir, noSkills, platformOpts: (platformWorkspaceId || platformRuntimeRoot) ? { workspaceId: platformWorkspaceId, runtimeRoot: platformRuntimeRoot } : null });
      break;
    case 'setup':
      const setupList = filteredArgs.includes('--list') || filteredArgs.includes('-l');
      await (await import('./setup.js')).cmdSetup(dir, { json, list: setupList });
      break;
    case 'progress': {
      const pm = new ProgressManager({ specDir: resolvePlatformSpecDir(dir, specDir) });
      const progDir = specDir ? dir : resolveEffectiveDir(dir);
      const subCommand = filteredArgs[1];
      const stageIdx = filteredArgs.indexOf('--stage');
      const stage = stageIdx >= 0 && filteredArgs[stageIdx + 1] ? filteredArgs[stageIdx + 1] : null;
      // 解析 --change 参数
      const progChangeIdx = args.indexOf('--change');
      const progChangeName = progChangeIdx >= 0 && args[progChangeIdx + 1] ? args[progChangeIdx + 1] : null;
      // 与 run 入口同源消毒（防路径穿越；progress 下游 completeStage 写 history 文件名拼 change 名）
      if (progChangeName) assertSafeChangeName(progChangeName, '--change 变更名');

      switch (subCommand) {
        case 'init':
          pm.init(progDir);
          break;
        case 'status':
        case 'show':
          pm.show(progDir, progChangeName);
          break;
        case 'check': {
          const result = pm.checkConsistency(progDir, progChangeName);
          // checkConsistency 只返回 {ok, issues, warnings}，不打印——必须在此输出，
          // 否则 agent 跑只读健康检查得到一片寂静，无法分辨「正常」还是「已损坏」。
          if (!result || result.ok) {
            console.log(`✅ 状态一致性检查通过${progChangeName ? `（变更 ${progChangeName}）` : '（所有变更）'}`);
          } else {
            console.error(`❌ 状态一致性检查发现问题（${result.issues?.length || 0} 项）：`);
            for (const issue of (result.issues || [])) console.error(`   - ${issue}`);
            console.error(`   修复：sillyspec progress repair${progChangeName ? ` --change ${progChangeName}` : ''}（先 dry-run 看可修项，加 --apply 执行）`);
          }
          break;
        }
        case 'repair': {
          const repairApply = filteredArgs.includes('--apply');
          pm.repairConsistency(progDir, { apply: repairApply, changeName: progChangeName });
          break;
        }
        case 'validate':
          pm.validate(dir, progChangeName);
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
          const updForce = args.includes('--force');
          pm.updateStep(dir, updStepStage, updStepName, { status: updStatus, output: updOutput, force: updForce }, progChangeName);
          break;
        }
        case 'complete-stage': {
          const compStageName = filteredArgs[2];
          if (!compStageName) { console.log('❌ 用法: sillyspec progress complete-stage <stage> [--force]'); break; }
          pm.completeStage(dir, compStageName, progChangeName, { force: args.includes('--force') });
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
    case 'gate': {
      // 机器门控（machine-interface v1）：聚合「变更的 <stage> 阶段此刻能否标记完成」的综合结论。
      // 只读查询，不依赖 worktree、不写状态（D-002@v1）。
      const gateStage = filteredArgs[1];
      const gateChangeIdx = args.indexOf('--change');
      const gateChange = gateChangeIdx >= 0 && args[gateChangeIdx + 1] ? args[gateChangeIdx + 1] : null;
      if (!gateStage || gateStage.startsWith('-') || !gateChange) {
        console.error('用法: sillyspec gate <stage> --change <name> [--json]\n  stage: brainstorm | plan | execute | verify | archive | ...');
        process.exit(2);
      }
      // 与 run 入口同源消毒（防路径穿越；gate 下游拼 marker/changes 路径）
      assertSafeChangeName(gateChange, '--change 变更名');
      const { runGate } = await import('./machine-interface.js');
      // --spec-dir 透传 runGate.specBase（gate CLI 接线修复，P3 坑 3 sillyspec 侧）。
      // runGate 已分离 cwd(跑测试) + specBase(读 local.yaml/spec)，但 gate case 之前
      // 只传 cwd 致 --spec-dir 对 gate verify 无效。不传 --spec-dir 时 specBase 走默认
      // resolveSpecDir(cwd)，向后兼容。
      const gateOpts = { cwd: dir };
      if (specDir) gateOpts.specBase = specDir;
      // drift 锚定（坑 execute-runs-isolation，对齐 command.js execute drift 守卫 + machine-interface
      // runGate 已扩展的 specDriftAnchor 入参）：gate 是顶层命令不走 runCommand/drift 守卫，worktree cwd
      // 下 execute 段 marker 读取会落副本 .runtime。仅在未显式 --spec-dir 时算（对齐守卫条件 !specDir），
      // 命中则 specDriftAnchor 锚主仓——runGate execute 段的 resolveRuntimeRoot 读主仓
      // current-execute-run-id marker，不读 worktree 副本（副本随 cleanup 整目录删消失）。
      if (!specDir) {
        const wt = detectWorktreeSpecDrift(resolveSpecDir(dir));
        if (wt) gateOpts.specDriftAnchor = wt.mainSpecBase;
      }
      // W3 task-09：gate 是只读查询命令，best-effort 构造 ctx（D-013）。失败降级 null（不阻断只读命令）——
      // ctx 让 validateTaskReviews/runVerifyTestCheck 正确切跨仓 gitDir；配置错时单仓降级会让两函数
      // 自然报「跨仓 commit 找不到」等错误进入 check.errors，gate 结论仍如实反映问题（D-002@v1 只读契约不破）。
      try {
        const { getOrCreateMultiRepoContext } = await import('./run/shared.js');
        const _ctx = await getOrCreateMultiRepoContext({ cwd: dir, changeName: gateChange, platformOpts: specDir ? { specRoot: specDir } : {} });
        if (_ctx) gateOpts.ctx = _ctx;
      } catch (e) {
        console.warn(`⚠️ gate ctx 构造失败，降级单仓核验（${e.message}）`);
      }
      const { envelope, exitCode } = await withJsonOutput(json, () => runGate(gateStage, gateChange, gateOpts));
      if (json) {
        process.stdout.write(JSON.stringify(envelope));
      } else {
        const icon = envelope.ok ? '✅' : '❌';
        console.log(`${icon} gate ${gateStage} [${gateChange}]: ${envelope.ok ? '通过' : '未通过'} (exit ${exitCode})`);
        for (const c of (envelope.checks || [])) {
          const ci = c.ok ? '✅' : '❌';
          const tag = c.informational ? ' (informational)' : '';
          console.log(`  ${ci} ${c.id}${tag}`);
          for (const e of (c.errors || [])) console.log(`     ✗ ${e}`);
          for (const w of (c.warnings || [])) console.log(`     ⚠ ${w}`);
        }
        // 顶层 errors/warnings 是各 check 的聚合，已在上面按 check 分组显示；不再重复打印——
        // 非 json 是 agent 默认消费路径，重复文本纯耗 context（W1-J）。
      }
      process.exitCode = exitCode;
      break;
    }
    case 'derive': {
      // 单项事实核验（machine-interface v1）：查询变更某一 facet 的真实状态，返回结构化 data。
      const facet = filteredArgs[1];
      const deriveChangeIdx = args.indexOf('--change');
      const deriveChange = deriveChangeIdx >= 0 && args[deriveChangeIdx + 1] ? args[deriveChangeIdx + 1] : null;
      if (!facet || facet.startsWith('-') || !deriveChange) {
        console.error('用法: sillyspec derive <facet> --change <name> [--json]\n  facet: execute-evidence | verify-test | task-reviews | artifacts');
        process.exit(2);
      }
      // 与 run 入口同源消毒（防路径穿越；derive 下游拼 marker/changes 路径）
      assertSafeChangeName(deriveChange, '--change 变更名');
      const { runDerive } = await import('./machine-interface.js');
      // --spec-dir 透传 runDerive.specBase（与 gate case 对称，P3 坑 3 sillyspec 侧）。
      // derive verify-test facet 内部同样调 runVerifyTestCheck 依赖 specBase，平台模式
      // 下需透传；不传 --spec-dir 时走默认 resolveSpecDir(cwd)，向后兼容。
      const deriveOpts = { cwd: dir };
      if (specDir) deriveOpts.specBase = specDir;
      // drift 锚定（同 gate case，对齐 command.js drift 守卫 + machine-interface runDerive 的 specDriftAnchor
      // 入参）：derive 顶层命令不走 drift 守卫，worktree cwd 下 task-reviews facet 的 execute-run-id marker
      // 读取会落副本。未显式 --spec-dir 时算 anchor，runDerive task-reviews 的 resolveRuntimeRoot 读主仓 marker。
      if (!specDir) {
        const wt = detectWorktreeSpecDrift(resolveSpecDir(dir));
        if (wt) deriveOpts.specDriftAnchor = wt.mainSpecBase;
      }
      // W3 task-09：derive 同 gate，best-effort 构造 ctx 透传给 verify-test/task-reviews facet（D-013）。
      try {
        const { getOrCreateMultiRepoContext } = await import('./run/shared.js');
        const _ctx = await getOrCreateMultiRepoContext({ cwd: dir, changeName: deriveChange, platformOpts: specDir ? { specRoot: specDir } : {} });
        if (_ctx) deriveOpts.ctx = _ctx;
      } catch (e) {
        console.warn(`⚠️ derive ctx 构造失败，降级单仓核验（${e.message}）`);
      }
      const { envelope, exitCode } = await withJsonOutput(json, () => runDerive(facet, deriveChange, deriveOpts));
      if (json) {
        process.stdout.write(JSON.stringify(envelope));
      } else {
        const icon = envelope.ok ? '✅' : '❌';
        console.log(`${icon} derive ${facet} [${deriveChange}]: ${envelope.ok ? '通过' : '未通过'} (exit ${exitCode})`);
        if (envelope.data) console.log(`  data: ${JSON.stringify(envelope.data, null, 2)}`);
        for (const e of (envelope.errors || [])) console.log(`  ✗ ${e}`);
        for (const w of (envelope.warnings || [])) console.log(`  ⚠ ${w}`);
      }
      process.exitCode = exitCode;
      break;
    }
    case 'backfill-reviews': {
      // 手动补 task（reopen execute / 直接实现）缺 review.json 的官方入口（坑 verify-archive-flow-pitfalls 坑2）。
      // 复用 generateTaskReviewDrafts（execute --done 同源兜底，幂等、fail-open）：据 git diff base..head + working-tree
      // 按 task allowed_paths 归属生成 cannot_verify 草稿，agent 复核后升级 pass/fail。execute 完成后手动补的 task
      // 无子代理 review 落盘 → archive step1 客观完成度（真相源=review.json verdict）判缺 → 阻断归档；本命令补齐
      // 缺失草稿，独立可随时跑（不必再 execute --done）。缺数据（无 tasks/ 目录 / 改动未 commit / 无 worktree meta）
      // 时 generateTaskReviewDrafts 提前返回 reason，如实打印不报错。
      const brChangeIdx = args.indexOf('--change');
      const brChange = brChangeIdx >= 0 && args[brChangeIdx + 1] ? args[brChangeIdx + 1] : null;
      if (!brChange) {
        console.error('用法: sillyspec backfill-reviews --change <name> [--json] [--spec-dir <path>]\n  为手动补的 task 生成 review.json 草稿（cannot_verify），解 archive 客观完成度阻断');
        process.exit(2);
      }
      // 与 run 入口同源消毒（防路径穿越；backfill 下游拼 marker/changes/review 路径）
      assertSafeChangeName(brChange, '--change 变更名');
      const { generateTaskReviewDrafts } = await import('./task-review.js');
      // --spec-dir 透传 platformOpts.specRoot（与 gate/derive 对称）；不传走默认 join(cwd,'.sillyspec')。
      const brPlatformOpts = {};
      if (specDir) brPlatformOpts.specRoot = specDir;
      // W3 task-09：best-effort 构造 ctx 透传（D-013），让 task-04 generateTaskReviewDrafts 跨仓 task
      // 用跨仓 gitDir 取 base..head diff。失败降级 null（与 gate/derive 同语义，辅助修复命令不阻断）。
      let _brCtx = null;
      try {
        const { getOrCreateMultiRepoContext } = await import('./run/shared.js');
        _brCtx = await getOrCreateMultiRepoContext({ cwd: dir, changeName: brChange, platformOpts: brPlatformOpts });
      } catch (e) {
        console.warn(`⚠️ backfill-reviews ctx 构造失败，降级单仓草稿（${e.message}）`);
      }
      const result = await generateTaskReviewDrafts({ changeName: brChange, cwd: dir, platformOpts: brPlatformOpts, ctx: _brCtx });
      if (json) {
        process.stdout.write(JSON.stringify({ ok: true, command: 'backfill-reviews', change: brChange, ...result }));
      } else {
        if (result.generated > 0) {
          console.log('📄 已补写 ' + result.generated + ' 个 per-task review.json 草稿（cannot_verify，需 agent 复核后升级 pass/fail） [' + brChange + ']');
        } else {
          console.log('ℹ️ 无草稿可补 [' + brChange + ']' + (result.reason ? '：' + result.reason : ''));
        }
        if (result.skipped > 0) {
          console.log('   跳过 ' + result.skipped + ' 个 task（review.json 已存在 / 空 diff 无从归属）');
        }
        if (result.unattributed && result.unattributed.length > 0) {
          console.warn('   ⚠️ ' + result.unattributed.length + ' 个变更文件未归属任何 task（顺带修复/非源码），草稿未覆盖：' + result.unattributed.join(', '));
        }
        if (result.executeRunId) {
          console.log('   execute run id: ' + result.executeRunId);
        }
      }
      break;
    }
    case 'register-stage-review': {
      // 手动注册 stage 级 review（brainstorm/plan/execute-acceptance）的确定性 writer ——
      // 生成 run 目录 + review.json 骨架（cannot_verify，待独立审查子代理填 verdict）或 adopt
      // agent 草稿（--from，保留 verdict/checklist 重算 docHash）+ 写 marker。治 tier=independent 时
      // 调度者手动派独立子代理不写 marker 的死锁。docHash 由 CLI computeDocHash 算（部分实现 P6.1b defer）。
      // 纯新增，不改 gate 语义。与 task 级 backfill-reviews 对称（stage 级等价物）。
      const rsrChangeIdx = args.indexOf('--change');
      const rsrChange = rsrChangeIdx >= 0 && args[rsrChangeIdx + 1] ? args[rsrChangeIdx + 1] : null;
      const rsrStageIdx = args.indexOf('--stage');
      const rsrStage = rsrStageIdx >= 0 && args[rsrStageIdx + 1] ? args[rsrStageIdx + 1] : null;
      const rsrFromIdx = args.indexOf('--from');
      const rsrFrom = rsrFromIdx >= 0 && args[rsrFromIdx + 1] ? args[rsrFromIdx + 1] : null;
      if (!rsrChange || !rsrStage) {
        console.error('用法: sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute> [--from <review.json>] [--spec-dir <path>] [--json]\n  生成/adopt stage 级 review.json（docHash 自动算 + 写 marker），治 tier=independent marker 死锁');
        process.exit(2);
      }
      // 与 run 入口同源消毒（防路径穿越；register 下游写 marker、拼 changes/review 路径）
      assertSafeChangeName(rsrChange, '--change 变更名');
      const { registerStageReview } = await import('./stage-review.js');
      const rsrPlatformOpts = {};
      if (specDir) rsrPlatformOpts.specRoot = specDir;
      try {
        const result = registerStageReview({ changeName: rsrChange, stage: rsrStage, fromFile: rsrFrom, cwd: dir, platformOpts: rsrPlatformOpts });
        if (json) {
          process.stdout.write(JSON.stringify({ ok: true, command: 'register-stage-review', change: rsrChange, stage: rsrStage, ...result }));
        } else {
          console.log(`✅ 已注册 ${rsrStage} stage review [${result.reviewRunId}] → ${result.reviewPath}（mode: ${result.mode}）`);
          console.log(`   marker → ${result.markerPath}`);
          console.log(`   下一步：独立审查子代理对照 ${result.mainDoc} 填 verdict/checklist 后重跑 --done`);
        }
      } catch (e) {
        if (json) process.stdout.write(JSON.stringify({ ok: false, command: 'register-stage-review', error: e.message }));
        else console.error('❌ ' + e.message);
        process.exitCode = 1;
      }
      break;
    }
    case 'docs': {
      const docsSubCmd = filteredArgs[1];
      if (docsSubCmd === 'migrate') {
        const { migrateDocs } = await import('./migrate.js');
        migrateDocs(dir);
      } else if (docsSubCmd === 'check') {
        // docs check（2026-08-15 docs-check-productize D-6）：文档 file:line 引用校验。
        // exit code 三档（D-003）：0 全绿 / 1 存在无效引用 / 2 配置/IO 错误（DocsCheckConfigError）。
        // ⚠ flag 解析（execute 审查修复）：--json 由全局解析器吞进 json 变量（filteredArgs 不含），
        // 必须用全局 json 判定；--paths 全局解析器不认识（flag+值都掉进 filteredArgs），须在分支内
        // 成对识别并剔除，值才不会污染 docsCheckFlags 位置参数。
        const rawDocsArgs = filteredArgs.slice(2);
        const docsCheckFlags = [];
        let cliPaths = null;
        for (let i = 0; i < rawDocsArgs.length; i++) {
          if (rawDocsArgs[i] === '--paths' && rawDocsArgs[i + 1] !== undefined) {
            cliPaths = rawDocsArgs[i + 1].split(',').map(s => s.trim()).filter(Boolean);
            i++; // 跳过值
          } else if (rawDocsArgs[i] === '--paths') {
            console.error('❌ docs check: --paths 缺值（逗号分隔 glob，如 --paths "docs/**/*.md"）');
            process.exit(2);
          } else {
            docsCheckFlags.push(rawDocsArgs[i]);
          }
        }
        const { runDocsCheck, readDocsCheckConfig, DocsCheckConfigError } = await import('./docs-check.js');
        try {
          // 配置优先级：--paths > local.yaml docs-check.paths > 缺省 docs/**/*.md
          const cfg = readDocsCheckConfig(dir);
          const result = runDocsCheck({
            projectRoot: dir,
            docs: docsCheckFlags.length > 0 ? docsCheckFlags : null,
            paths: cliPaths || cfg.paths,
            skip: cfg.skip,
            keywordAssert: cfg.keywordAssert,
          });
          if (json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            for (const w of result.warnings) console.warn(`⚠️  ${w}`);
            if (result.ok) {
              console.log(`✅ docs check: ${result.total} 处引用全通过（其中 ${result.kwChecked} 处带关键词断言）`);
            } else {
              console.error(`\n❌ docs check: ${result.invalid.length}/${result.total} 处引用失效：`);
              for (const inv of result.invalid) {
                console.error(`  ❌ [${inv.doc}:L${inv.docLine}] ${inv.ref} → ${inv.reason}`);
                if (inv.suggest && inv.suggest.length > 0) {
                  console.error(`     💡 候选行号: ${inv.suggest.join(', ')}（token 命中行，人工确认后更新文档锚）`);
                }
              }
              console.error(`\n修复指引：行号漂移 → 更新文档行号到当前源码；文件删改名 → 更新引用路径；`);
              console.error(`关键词缺失但行号正确 → 确认符号是否改名，改文档 token 或行号。`);
            }
          }
          process.exit(result.ok ? 0 : 1);
        } catch (e) {
          if (e instanceof DocsCheckConfigError) {
            console.error(`❌ docs check 配置错误：${e.message}`);
            process.exit(2);
          }
          throw e;
        }
      } else if (docsSubCmd === 'gate') {
        // docs gate（2026-08-15 doc-consistency-debt 第七节）：docs check 的 ratchet 门。
        // 失效数 ≤ 基线放行、超基线拦（exit 1）；无基线/配置错 exit 2。--init-baseline
        // 以当前实测数立基线（幂等，重跑覆盖）。基线文件 .sillyspec/docs-check-baseline。
        // ⚠ flag 解析同 docs check 的教训：--json 全局解析器吞掉、--init-baseline 掉进
        // filteredArgs，分支内识别后剔除，余下位置参数按 --paths 值处理前须成对校验。
        const rawGateArgs = filteredArgs.slice(2);
        let gateInitBaseline = false;
        let gateCliPaths = null;
        for (let i = 0; i < rawGateArgs.length; i++) {
          if (rawGateArgs[i] === '--init-baseline') {
            gateInitBaseline = true;
          } else if (rawGateArgs[i] === '--paths' && rawGateArgs[i + 1] !== undefined) {
            gateCliPaths = rawGateArgs[i + 1].split(',').map(s => s.trim()).filter(Boolean);
            i++;
          } else if (rawGateArgs[i] === '--paths') {
            console.error('❌ docs gate: --paths 缺值（逗号分隔 glob，如 --paths "docs/**/*.md"）');
            process.exit(2);
          } else {
            console.error(`❌ docs gate: 未知参数「${rawGateArgs[i]}」（支持 --init-baseline / --paths <glob,...>）`);
            process.exit(2);
          }
        }
        const { runDocsGate } = await import('./docs-gate.js');
        // specBase：--spec-dir 优先，缺省 resolveSpecDir(cwd)（与其他 case 同口径）
        const gateSpecBase = specDir || resolveSpecDir(dir);
        const gateResult = await runDocsGate(
          { projectRoot: dir, specBase: gateSpecBase, initBaseline: gateInitBaseline },
          gateCliPaths ? { paths: gateCliPaths } : {},
        );
        if (json) {
          console.log(JSON.stringify(gateResult, null, 2));
        } else {
          console.log(gateResult.message);
        }
        process.exit(gateResult.exitCode);
      } else {
        console.log('用法: sillyspec docs migrate | sillyspec docs check [--paths <glob,...>] [--json] | sillyspec docs gate [--init-baseline] [--paths <glob,...>] [--json]');
      }
      break;
    }
    case 'run': {
      // doctor --json 等价 doctor 顶层 --json（结构化诊断），与 case 'doctor' 行为一致——
      // 否则 sillyspec doctor --json 走 runDoctorDiagnostics，sillyspec run doctor --json 走 runCommand
      // prompt 自检，两者输出不等价（违反"顶层别名 == run <stage>"契约）。
      if (filteredArgs[1] === 'doctor' && json) {
        const doctorEffectiveDir = specDir ? dir : resolveEffectiveDir(dir)
        const { runDoctorDiagnostics, formatDoctorJson, writeDoctorDiagnosis } = await import('./doctor-diagnostics.js')
        const result = await runDoctorDiagnostics({ cwd: doctorEffectiveDir })
        const output = formatDoctorJson(result, { source_root: dir })
        const written = writeDoctorDiagnosis(output, result.authoritySpecDir)
        if (written) console.error(`📁 诊断结果已写入: ${written}`)
        console.log(JSON.stringify(output, null, 2))
        process.exitCode = output.overall_status === 'pass' ? 0 : 1
        break
      }
      const { runCommand } = await import('./run.js')
      // 平台模式（--spec-dir 已指定）时，--dir 是明确的 source_root，不应被 resolveEffectiveDir 纠正
      const effectiveDir = specDir ? dir : resolveEffectiveDir(dir)
      await runCommand(filteredArgs.slice(1), effectiveDir, specDir, { json })
      break
    }
    // 顶层命令别名：转发 runCommand，与 case 'run': 路径行为一致。
    // printUsage 宣称所有 stage 都可直接使用，这里补齐全部路由避免落 default 分支。
    // 注意：filteredArgs[0] === command，直接透传 filteredArgs 即可让 runCommand
    // 从 args[0] 取到 stage 名。与 case 'run': 的 filteredArgs.slice(1) 区别只在于
    // slice(1) 去掉的是 'run' 字面量，这里 command 本身就是 stage 名不能丢。
    case 'doctor': {
      const doctorEffectiveDir = specDir ? dir : resolveEffectiveDir(dir);
      // 执行流：--cleanup-remnant / --dump-db（结构化诊断之外的修复/取证动作）
      const cleanupRemnant = filteredArgs.includes('--cleanup-remnant');
      const dumpDbFlag = filteredArgs.includes('--dump-db');
      const doctorConfirm = filteredArgs.includes('--confirm');
      const pathIdx = filteredArgs.indexOf('--path');
      const dbPath = pathIdx >= 0 && filteredArgs[pathIdx + 1] ? filteredArgs[pathIdx + 1] : null;

      // --align-execute-progress：基于 plan.md 声明对齐 execute 派生戳（仿 --cleanup-remnant 范式）
      // 默认 dry-run（只报告将补哪些 step），加 --confirm 才写。命中即 break，绝不 fall-through。
      const alignFlag = filteredArgs.includes('--align-execute-progress');
      if (alignFlag) {
        // --change 解析：显式优先，缺省用单活跃变更自动兜底（与 run.js resolveChangeNameAuto 同逻辑）
        const alignChangeIdx = filteredArgs.indexOf('--change');
        let alignChange = alignChangeIdx >= 0 && filteredArgs[alignChangeIdx + 1] ? filteredArgs[alignChangeIdx + 1] : null;
        if (!alignChange) {
          const changesDir = join(resolvePlatformSpecDir(doctorEffectiveDir, specDir) || join(doctorEffectiveDir, '.sillyspec'), 'changes');
          if (existsSync(changesDir)) {
            const activeChanges = readdirSync(changesDir, { withFileTypes: true })
              .filter(e => e.isDirectory() && e.name !== 'archive')
              .map(e => e.name);
            if (activeChanges.length === 1) alignChange = activeChanges[0];
          }
        }
        if (!alignChange) {
          console.error('❌ 无法确定变更名：请用 --change <name>，或确保仅有一个活跃变更');
          process.exitCode = 2;
          break;
        }

        // 复用顶层静态 import（line 12），不动态 await import
        const pm = new ProgressManager({ specDir: resolvePlatformSpecDir(doctorEffectiveDir, specDir) });
        const specBase = resolvePlatformSpecDir(doctorEffectiveDir, specDir) || join(doctorEffectiveDir, '.sillyspec');
        let r;
        try {
          r = pm.alignExecuteToPlan(doctorEffectiveDir, alignChange, specBase, { confirm: doctorConfirm });
        } catch (e) {
          console.error(`❌ 对齐失败：${e.message}`);
          process.exitCode = 1;
          break;
        }

        if (json) {
          console.log(JSON.stringify(r, null, 2));
        } else if (r.ok === false) {
          console.error(`❌ ${r.reason || '对齐未执行'}`);
        } else {
          console.log(`✅ 已基于 plan.md 声明对齐 ${r.aligned} 个 step（plan: ${r.planChecked}/${r.planTotal}）。`);
          if (!doctorConfirm) {
            console.log(`   （dry-run：未写盘。加 --confirm 实际落盘，并置 execute 阶段 status=completed。）`);
          } else {
            console.log(`   已落盘，execute 阶段 status=completed。请确认 verify 通过。`);
          }
        }
        // ok=false 或 reason 非空 → 1；否则 0（与 --cleanup-remnant 的 r.errors 逻辑同构）
        process.exitCode = (r.ok === false || r.reason) ? 1 : 0;
        break;
      }

      if (cleanupRemnant) {
        const { cleanupRemnantDbs } = await import('./doctor-diagnostics.js');
        const r = await cleanupRemnantDbs({ cwd: doctorEffectiveDir, confirm: doctorConfirm });
        if (json) {
          console.log(JSON.stringify(r, null, 2));
        } else {
          const list = doctorConfirm ? r.deleted : r.would_delete.map((x) => x.path);
          console.log(`🗑️  空占位 db ${doctorConfirm ? '已删除' : '待清理（dry-run）'}：${r.count} 个`);
          for (const p of list) console.log(`   ${doctorConfirm ? '✅' : '-'} ${p}`);
          for (const e of r.errors) console.log(`   ❌ ${e.path}: ${e.error}`);
          if (!doctorConfirm && r.count > 0) console.log(`\n加 --confirm 执行删除（仅删 0 字节占位，不动有内容的 db）。`);
        }
        process.exitCode = r.errors.length > 0 ? 1 : 0;
        break;
      }
      if (dumpDbFlag) {
        if (!dbPath) { console.error('❌ --dump-db 需要 --path <db 路径>'); process.exitCode = 2; break; }
        const { dumpDb } = await import('./doctor-diagnostics.js');
        const r = await dumpDb({ dbPath, cwd: doctorEffectiveDir });
        if (json) {
          console.log(JSON.stringify(r, null, 2));
        } else if (r.ok === false && r.error) {
          console.error(`❌ ${r.error}`);
        } else {
          console.log(`📦 dump ${dbPath} (${r.meta?.size}B)：${r.changes?.length || 0} changes, ${r.stages?.length || 0} stages`);
          if (r.written_to) console.log(`   写入：${r.written_to}`);
        }
        process.exitCode = r.ok === false ? 1 : 0;
        break;
      }
      // --json：走结构化诊断（doctor-diagnostics.js），输出 JSON + 落盘 doctor-diagnosis.json
      if (json) {
        const { runDoctorDiagnostics, formatDoctorJson, writeDoctorDiagnosis } = await import('./doctor-diagnostics.js');
        const result = await runDoctorDiagnostics({ cwd: doctorEffectiveDir });
        const output = formatDoctorJson(result, { source_root: dir });
        const written = writeDoctorDiagnosis(output, result.authoritySpecDir);
        if (written) console.error(`📁 诊断结果已写入: ${written}`);
        console.log(JSON.stringify(output, null, 2));
        process.exitCode = output.overall_status === 'pass' ? 0 : 1;
        break;
      }
      // 否则：保持原有 prompt 驱动的 bash 自检流程
      const { runCommand } = await import('./run.js');
      await runCommand([command, ...filteredArgs.slice(1)], doctorEffectiveDir, specDir, { json });
      break;
    }
    case 'scan':
    case 'status':
    case 'quick':
    case 'explore':
    case 'brainstorm':
    case 'plan':
    case 'execute':
    case 'verify':
    case 'archive': {
      const { runCommand } = await import('./run.js')
      const stageArgs = [command, ...filteredArgs.slice(1)]
      const effectiveDir = specDir ? dir : resolveEffectiveDir(dir)
      // 下行 pull：stage 命令（run/--done，含 archive）启动时拉一次（task-10 / D-009 / FR-04）
      // 不在每步 pull，仅低频边界点；未连接平台静默跳过
      const { triggerPullActiveChange } = await import('./run/shared.js')
      await triggerPullActiveChange(effectiveDir)
      await runCommand(stageArgs, effectiveDir, specDir, { json })
      break
    }
    case 'knowledge': {
      const { cmdKnowledge } = await import('./stages/knowledge.js')
      await cmdKnowledge(filteredArgs.slice(1), specDir ? dir : resolveEffectiveDir(dir), { specDir })
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
      const pm = new ProgressManager({ specDir: resolvePlatformSpecDir(dir, specDir) });

      // isolation 写入 DB 的辅助函数
      function _writeIsolationToDB(cwd, changeName, info) {
        if (info.blocked) {
          pm.updateChangeIsolation(cwd, changeName, {
            status: 'blocked',
            mode: null,
            reason: info.reason,
          });
        } else {
          const mode = info.mode || 'worktree';
          const statusMap = { 'worktree': 'verified', 'native-worktree': 'verified', 'in-place-fallback': 'degraded' };
          pm.updateChangeIsolation(cwd, changeName, {
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
  sillyspec worktree assess <change-name>                     风险审计 + 自动 apply
  sillyspec worktree diff <change-name> [--base <commit>]      查看 worktree 相对 base 的变更
  sillyspec worktree list                                      列出所有活跃 worktree
  sillyspec worktree meta <change-name>                        读取 worktree meta.json
  sillyspec worktree cleanup <change-name> [--force]           强制清理 worktree
  sillyspec worktree doctor [--fix] [--stale-hours N] [--change <name>]   健康检查 + 修复（--change 仅扫指定 change）

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
          // F6 路径穿越消毒：worktree 名用于分支名 + worktree 目录，含 ../ 会逃出 .sillyspec/worktrees/。
          try { assertSafeChangeName(wtName, 'worktree 变更名'); }
          catch (e) { console.error(`❌ ${e.message}`); process.exit(2); }
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
            // 写入 isolation 信息到 sillyspec.db（_writeIsolationToDB）
            await _writeIsolationToDB(dir, wtName, info);
          } catch (e) {
            console.error(`❌ ${e.message}`);
            // 写入 blocked 状态到 sillyspec.db（_writeIsolationToDB）
            await _writeIsolationToDB(dir, wtName, { blocked: true, reason: e.message });
            process.exit(1);
          }
          break;
        }
        case 'apply': {
          if (!wtName) {
            console.error('❌ 用法: sillyspec worktree apply <change-name> [--check-only] [--merge]');
            process.exit(1);
          }
          const checkOnly = args.includes('--check-only');
          const merge = args.includes('--merge');
          const { applyWorktree } = await import('./worktree-apply.js');
          // W3 task-09：apply 链路构造 ctx（D-013），让 task-05 applyWorktree 按 ctx 区分主仓 A5 / 跨仓 no-op。
          // 跨仓 apply=no-op（G1 D-009）：校验 review.head 是跨仓真实 commit + 跳过 wm.cleanup。
          // ctx 构造 fail-closed（约束②）——跨仓配置错时 apply 必须阻断（走错仓=数据所有权事故），不降级。
          let _applyCtx = null;
          try {
            const { getOrCreateMultiRepoContext } = await import('./run/shared.js');
            _applyCtx = await getOrCreateMultiRepoContext({ cwd: dir, changeName: wtName, platformOpts: specDir ? { specRoot: specDir } : {} });
          } catch (e) {
            console.error(`❌ apply 失败：跨仓 MultiRepoContext 构造失败（${e.message}）`);
            process.exit(1);
          }
          const result = applyWorktree(wtName, { cwd: dir, checkOnly, merge, ctx: _applyCtx });

          if (result.errors.length > 0) {
            console.error(`❌ 校验失败:`);
            for (const err of result.errors) {
              console.error(`   ${err}`);
            }
            if (result.rescueCommands) {
              console.error('');
              console.error(`🆘 Rescue commands (${result.rescueCommands.cpFileCount} safe / ${result.rescueCommands.excludedCount} excluded，旁路 git apply，cp 后需手动 sillyspec worktree cleanup ${wtName}):`);
              for (const c of result.rescueCommands.commands) console.error(`   ${c}`);
              for (const w of result.rescueCommands.warnings) console.error(`   ⚠️  ${w}`);
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
          } else if (result.merged) {
            console.log(`✅ 已通过 git merge 应用变更（baseline 漂移降级，引入合并提交）${result.mergeSummary ? '：' + result.mergeSummary : ''}`);
          } else {
            console.log(`✅ 已应用 ${result.changedFiles.length} 个文件变更：`);
            for (const f of result.changedFiles) {
              console.log(`   ${f}`);
            }
            // filterDeliverableFiles 精细化排除（保留 .sillyspec/docs/，排 changes/+.runtime/+quicklog/ + meta.json）：
            // 模块文档（.sillyspec/docs/）= 交付物，会 auto-apply 到主工作区；变更文档/运行时/quicklog 不 apply。
            // 须告知 agent 哪些未落地，否则它期望这些文件落地却找不到（memory: worktree-apply-excludes-module-docs）。
            console.log(`   ℹ️  注：.sillyspec/changes、.sillyspec/.runtime、.sillyspec/quicklog 下的文件按规则不自动 apply（模块文档 .sillyspec/docs/ 会自动 apply），如需请手动从 worktree 分支或 dangling commit 取（git show sillyspec/${wtName}:<path>）。`);
          }
          if (result.warnings && result.warnings.length > 0) {
            for (const w of result.warnings) {
              console.log(`⚠️  ${w}`);
            }
          }
          break;
        }
        case 'assess': {
          if (!wtName) {
            console.error('❌ 用法: sillyspec worktree assess <change-name>');
            process.exit(1);
          }
          const { assessApplyRisk } = await import('./worktree-apply.js');
          const assessment = assessApplyRisk(wtName, { cwd: dir });

          // W3 task-09：assess 自动 apply 路径构造 ctx（D-013），SAFE/WARNING 时透传给 applyWorktree。
          // 构造 fail-closed（跨仓配置错阻断，与显式 apply case 同语义）。
          let _assessCtx = null;
          try {
            const { getOrCreateMultiRepoContext } = await import('./run/shared.js');
            _assessCtx = await getOrCreateMultiRepoContext({ cwd: dir, changeName: wtName, platformOpts: specDir ? { specRoot: specDir } : {} });
          } catch (e) {
            if (assessment.decision === 'SAFE' || assessment.decision === 'WARNING') {
              console.error(`❌ assess 自动 apply 失败：跨仓 MultiRepoContext 构造失败（${e.message}）`);
              process.exit(1);
            }
            // blocked 决策不触发 apply，ctx 失败仅记 warn（不阻断只读 assess 展示）
            console.warn(`⚠️ ctx 构造失败（${e.message}）`);
          }
          const SEPARATOR = '─'.repeat(32);
          console.log('Worktree Apply Decision');
          console.log(SEPARATOR);
          const decisionIcon = assessment.decision === 'SAFE' ? '✅' : assessment.decision === 'WARNING' ? '⚠️ ' : '🚫';
          console.log(`Decision:    ${decisionIcon} ${assessment.decision}`);
          console.log(`Changed files: ${assessment.changedFiles.length}`);
          if (assessment.stats.additions > 0 || assessment.stats.deletions > 0) {
            console.log(`Additions:   +${assessment.stats.additions}  Deletions: -${assessment.stats.deletions}`);
          }

          if (assessment.reasons.length > 0) {
            console.log('');
            console.log('Blocked reasons:');
            for (const r of assessment.reasons) r.split('\n').forEach(l => console.log(`   ${l}`));
          }
          if (assessment.warnings.length > 0) {
            console.log('');
            console.log('Warnings:');
            for (const w of assessment.warnings) console.log(`   ⚠️  ${w}`);
          }

          if (assessment.rescueCommands) {
            console.log('');
            console.log(`🆘 Rescue commands (${assessment.rescueCommands.cpFileCount} safe / ${assessment.rescueCommands.excludedCount} excluded，旁路 git apply，cp 后需手动 sillyspec worktree cleanup ${wtName}):`);
            for (const c of assessment.rescueCommands.commands) console.log(`   ${c}`);
            for (const w of assessment.rescueCommands.warnings) console.log(`   ⚠️  ${w}`);
          }
          console.log('');
          if (assessment.decision === 'SAFE' || assessment.decision === 'WARNING') {
            console.log('Action: auto-applying...');
            const { applyWorktree } = await import('./worktree-apply.js');
            const applyResult = applyWorktree(wtName, { cwd: dir, ctx: _assessCtx });
            if (applyResult.errors.length > 0) {
              console.error('❌ apply 失败:', applyResult.errors.join('; '));
            } else {
              console.log(`✅ 已自动应用 ${applyResult.changedFiles.length} 个文件变更：`);
              for (const f of applyResult.changedFiles) console.log(`   ${f}`);
              console.log(`   ℹ️  注：.sillyspec/changes、.sillyspec/.runtime、.sillyspec/quicklog 下的文件按规则不自动 apply（模块文档 .sillyspec/docs/ 会自动 apply），如需请手动从分支取（git show sillyspec/${wtName}:<path>）。`);
            }
          } else {
            console.log('Action: blocked');
            console.log('   → 检查变更: sillyspec worktree diff ' + wtName);
            console.log('   → 丢弃变更: sillyspec worktree cleanup ' + wtName);
            console.log('   → baseline 漂移降级: sillyspec worktree apply ' + wtName + ' --merge');
          }
          break;
        }
        case 'meta': {
          if (!wtName) {
            console.error('❌ 用法: sillyspec worktree meta <change-name>');
            process.exit(1);
          }
          const meta = wm.getMeta(wtName);
          if (!meta) {
            console.error(`❌ 未找到 worktree meta: ${wtName}（可能未创建或已被清理）`);
            process.exit(1);
          }
          console.log(`change:       ${wtName}`);
          console.log(`worktreePath: ${meta.worktreePath || '(未设置)'}`);
          console.log(`branch:       ${meta.branch || '(未设置)'}`);
          console.log(`mode:         ${meta.mode || '(未设置)'}`);
          if (meta.baseBranch) console.log(`baseBranch:   ${meta.baseBranch}`);
          if (meta.baseHash) console.log(`baseHash:     ${String(meta.baseHash).slice(0, 8)}`);
          console.log('');
          console.log('JSON:');
          console.log(JSON.stringify(meta, null, 2));
          break;
        }
        case 'diff': {
          if (!wtName) {
            console.error('❌ 用法: sillyspec worktree diff <change-name> [--base <commit>]');
            process.exit(1);
          }
          const meta = wm.getMeta(wtName);
          if (!meta) {
            console.error(`❌ 未找到 worktree meta: ${wtName}（可能未创建或已被清理）`);
            process.exit(1);
          }
          if (!meta.worktreePath || !existsSync(meta.worktreePath)) {
            console.error(`❌ worktree 目录不存在: ${meta.worktreePath || '(未设置)'}（可能已被清理，可跑 sillyspec worktree doctor）`);
            process.exit(1);
          }
          // base 优先级：显式 --base > meta.baseHash（create 时锚的主仓 HEAD）> 当前 HEAD。
          // diff 比较 worktree 工作区（含未提交）vs base，与 _changesAlreadyOnMain 同口径。
          const baseIdx = filteredArgs.indexOf('--base');
          const explicitBase = baseIdx >= 0 ? filteredArgs[baseIdx + 1] : null;
          const base = explicitBase || meta.baseHash || 'HEAD';
          let out = '';
          try {
            // base 作为独立 argv 元素传入，不经 shell 拆词/注入；worktreePath 经 cwd，不插值。
            // trim:false 保留 git diff 原始输出（含尾换行）供 stdout.write；空检查靠临时 .trim()。
            // timeout 30s：diff 属潜在长操作（对齐 design R3 与 verify-postcheck 口径）。
            out = git(meta.worktreePath, ['--no-pager', 'diff', '--no-renames', base], { trim: false, timeout: 30000 });
          } catch (e) {
            console.error(`❌ git diff 失败（base=${String(base).slice(0, 8)}）: ${e.message}`);
            process.exit(1);
          }
          if (!out.trim()) {
            console.log(`（无变更：worktree 工作区与 base ${String(base).slice(0, 8)} 一致）`);
          } else {
            process.stdout.write(out);
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
            } else if (result.result === 'blocked') {
              console.error(`🚫 拒绝清理：有未落主仓交付变更，请先 sillyspec worktree apply ${wtName} 或 --force`);
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
          const changeIdx = args.indexOf('--change');
          const changeName = changeIdx !== -1 && args[changeIdx + 1] ? args[changeIdx + 1] : null;
          const diag = wm.doctor({ fix: fixFlag, staleHours, changeName });
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
    case 'dispatch': {
      // SillyHub 派发抽象层的 agent 调用桥（design.md §Phase2 / D-007@v1）：
      // 仅做能力探测（probe）与派发策略生成（hint），**不执行任何 tool 调用**——
      // 实际 tool 调用（本机 Agent tool / SillyHub MCP tool）由 agent 据指令执行。
      // 仿 worktree 子命令的参数解析（filteredArgs[1] 取子命令）与错误处理模式。
      const dispatchSubCmd = filteredArgs[1];
      const dispatchSubs = ['probe', 'hint'];

      if (!dispatchSubCmd || dispatchSubCmd === 'help' || dispatchSubCmd === '--help' || dispatchSubCmd === '-h') {
        console.log(`
SillySpec dispatch — SillyHub 派发能力探测与策略生成（agent 调用桥，仅渲染与探测）

用法:
  sillyspec dispatch probe [--json]                   能力探测，输出 ProbeResult
  sillyspec dispatch hint --contract <json> [--json]  派发策略，输出 {instruction, backend}

子命令:
  probe   探测 SillyHub MCP 是否可用（无配置返回 available=false，正常降级不报错）
  hint    据 contract + probe 结果生成派发指令文本（agent 拿指令后执行实际 tool 调用）

选项:
  --contract <json>   hint 必填：DispatchContract（brief/worktreePath/branch/allowedPaths/readOnly/...）
  --json              程序化输出（probe → ProbeResult；hint → {backend, instruction}）
`);
        break;
      }

      if (dispatchSubCmd === 'probe') {
        const { probeSillyHub } = await import('./dispatch/probe.js');
        const result = await probeSillyHub();
        // result = { available, reason? }；无配置时 {available:false,reason:'no-config'} 不报错（正常降级）
        if (json) {
          process.stdout.write(JSON.stringify(result));
        } else if (result.available) {
          console.log('✅ SillyHub 可用');
        } else {
          console.log(`⚠️ SillyHub 不可用：${result.reason || 'unknown'}`);
        }
        break;
      }

      if (dispatchSubCmd === 'hint') {
        // 解析 --contract <json>（仿 worktree 用 args.indexOf 取 flag 后一个值）
        const contractIdx = args.indexOf('--contract');
        const contractRaw = contractIdx >= 0 && args[contractIdx + 1] ? args[contractIdx + 1] : null;
        if (!contractRaw) {
          console.error('用法: sillyspec dispatch hint --contract <json> [--json]\n  生成派发指令（DispatchContract：brief/worktreePath/branch/allowedPaths/readOnly/...）');
          process.exit(2);
        }
        let contract;
        try {
          contract = JSON.parse(contractRaw);
        } catch (e) {
          console.error(`❌ --contract JSON 解析失败: ${e.message}`);
          process.exit(2);
        }
        const { probeSillyHub } = await import('./dispatch/probe.js');
        const { renderDispatchInstruction } = await import('./dispatch/strategy.js');
        const probe = await probeSillyHub();
        const { instruction, backend } = renderDispatchInstruction(contract, probe);
        if (json) {
          process.stdout.write(JSON.stringify({ backend, instruction }));
        } else {
          console.log(`Backend: ${backend}`);
          console.log(instruction);
        }
        break;
      }

      // 未知子命令 → did-you-mean 建议 + 退出 1（仿 worktree default）
      const sug = didYouMean(dispatchSubCmd, dispatchSubs);
      console.error(`❌ 未知子命令: dispatch ${dispatchSubCmd}`);
      if (sug) console.error(`   你是想输入「dispatch ${sug}」吗？`);
      console.error(`   可用子命令：${dispatchSubs.join(' | ')}（运行 sillyspec dispatch 查看用法）`);
      process.exit(1);
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
  sillyspec platform pull [--change <name>]
  sillyspec platform resolve <change-name> <--keep-local|--take-platform|--abort>
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
                console.log(`   ℹ️  如需彻底脱离平台（含接管声明 .sillyspec-platform-managed），请使用 sillyspec platform disconnect。`)
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
                  console.log(`   ℹ️  如需彻底脱离平台（含接管声明 .sillyspec-platform-managed），请使用 sillyspec platform disconnect。`)
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
        case 'status': {
          // task-14 / FR-05：扩展 status（落后标记 + 未决冲突列表）；未连接输出与现状一致
          const st = await syncModule.collectStatus(dir);
          if (!st.connected) {
            console.log('平台: 未连接');
            break;
          }
          console.log(`平台: ${st.url}`);
          console.log(`上次连接: ${st.lastSync || '未知'}`);
          if (st.listFailed) {
            console.log('ℹ️  无法连接平台获取落后状态');
          } else if (st.behind.length > 0) {
            console.log(`⚠️ 本地可能落后（${st.behind.length} 个变更平台有更新）:`);
            for (const b of st.behind) {
              console.log(`   - ${b.name}: 平台 ${b.platform_pushed_at} > 本地 ${b.local_synced}`);
            }
          } else {
            console.log('✅ 本地与平台进度同步');
          }
          if (st.conflicts.length > 0) {
            console.log(`⚠️ 未决冲突（${st.conflicts.length} 个，请 platform resolve 处理）:`);
            for (const c of st.conflicts) {
              console.log(`   - ${c.change}${c.created_at ? ` (创建于 ${c.created_at})` : ''}`);
            }
          }
          break;
        }
        case 'pull': {
          // task-11 / D-006 / D-009 / FR-03：手动下行拉取平台进度到本地。
          // 与自动 triggerPull 共用 syncModule.pull（SyncManager.pull 实例方法），行为一致。
          const pullChangeIdx = args.indexOf('--change');
          const pullChangeName = pullChangeIdx >= 0 && args[pullChangeIdx + 1] ? args[pullChangeIdx + 1] : null;
          // 未连接明确提示不崩（acceptance：未连接平台输出明确提示）
          const smForCheck = new syncModule.SyncManager(dir);
          if (!smForCheck._getPlatform()) {
            console.error('❌ 未连接平台，请先 sillyspec platform connect');
            process.exit(1);
          }
          if (pullChangeName) {
            // 单变更完整 pull（两级 pull 第二级）
            const r = await syncModule.pull(pullChangeName, {}, dir);
            if (r.conflict) {
              console.log(`⚠️ ${pullChangeName}: 冲突（已写 sync-conflict 文件），请 sillyspec platform resolve 处理`);
            } else if (r.imported) {
              console.log(`✅ ${pullChangeName}: 已拉取并 import`);
            } else {
              console.log(`⏭️ ${pullChangeName}: 未 import（${r.reason || '无变更'}）`);
            }
          } else {
            // 无 --change：先拉轻量列表（两级 pull 第一级），再对每个 change 按需完整 pull
            const list = await syncModule.pullList(dir);
            if (!list.ok) {
              console.error(`❌ 拉取变更列表失败: ${list.reason || '未知'}`);
              process.exit(1);
            }
            console.log(`平台变更 ${list.changes.length} 个：`);
            let importedCount = 0, conflictCount = 0;
            for (const ch of list.changes) {
              const name = typeof ch === 'string' ? ch : ch.name;
              if (!name) continue;
              const r = await syncModule.pull(name, {}, dir);
              if (r.imported) { importedCount++; console.log(`  ✅ ${name}: 已 import`); }
              else if (r.conflict) { conflictCount++; console.log(`  ⚠️ ${name}: 冲突，请 platform resolve`); }
              else { console.log(`  ⏭️ ${name}: ${r.reason || '未 import'}`); }
            }
            console.log(`拉取完成：imported ${importedCount}，冲突 ${conflictCount}`);
          }
          break;
        }
        case 'resolve': {
          // task-13 / D-002 / D-010 / D-013 / FR-05：冲突解决三选一（绝不字段级 auto-merge）
          // 变更名解析（顺序）：--change <name>（与 pull/sync 兄弟命令写法一致）→ platformArgs 中
          // 第一个非 flag 位置参数 → 唯一未决冲突自动选中。修复：旧实现盲取 platformArgs[0]，
          // flag 放前面时（resolve --keep-local --change x）把 '--keep-local' 当变更名去读冲突文件。
          const changeIdx = args.indexOf('--change');
          let resolveName = changeIdx >= 0 && args[changeIdx + 1] ? args[changeIdx + 1] : null;
          if (!resolveName) {
            resolveName = platformArgs.find((a) => a && !a.startsWith('--')) || null;
          }
          if (!resolveName) {
            // 无变更名：恰有一个未决冲突时自动选中，多个/零个则列出候选
            const pendingConflicts = syncModule.listConflictFiles(dir);
            if (pendingConflicts.length === 1) {
              resolveName = pendingConflicts[0].change;
              console.log(`ℹ️ 自动选中唯一未决冲突: ${resolveName}`);
            } else {
              console.error('❌ 用法: sillyspec platform resolve <change-name> <--keep-local|--take-platform|--abort>');
              console.error('   或: sillyspec platform resolve --change <name> <--keep-local|--take-platform|--abort>');
              if (pendingConflicts.length > 1) {
                console.error(`   现有 ${pendingConflicts.length} 个未决冲突，请指定变更名:`);
                for (const c of pendingConflicts) console.error(`   - ${c.change}`);
              } else {
                console.error('   当前无 sync-conflict 文件（可先运行 sillyspec platform status 查看）');
              }
              process.exit(1);
            }
          }
          // 解析 mode flag（三选一互斥，多传/不传均报错）
          const resolveFlags = ['--keep-local', '--take-platform', '--abort'].filter((f) => args.includes(f));
          if (resolveFlags.length !== 1) {
            console.error('❌ 必须恰好指定 --keep-local / --take-platform / --abort 之一');
            process.exit(1);
          }
          const modeMap = { '--keep-local': 'keep-local', '--take-platform': 'take-platform', '--abort': 'abort' };
          const resolveMode = modeMap[resolveFlags[0]];
          const r = await syncModule.resolve(resolveName, resolveMode, dir);
          if (r.ok && r.resolved) {
            console.log(`✅ ${resolveName} [${resolveMode}]: ${r.reason}`);
          } else {
            console.error(`❌ ${resolveName}: ${r.reason}`);
            // 报错兜底：指定变更名无冲突文件时，列出 .runtime 下实际存在的冲突文件（防 flag 误当变更名再次误导）
            const pendingConflicts = syncModule.listConflictFiles(dir);
            if (pendingConflicts.length > 0 && !pendingConflicts.some((c) => c.change === resolveName)) {
              console.error('   当前未决冲突:');
              for (const c of pendingConflicts) console.error(`   - ${c.change}`);
            }
            process.exit(1);
          }
          break;
        }
        case 'approve': {
          const approveName = platformArgs[0];
          if (!approveName) {
            console.error('❌ 用法: sillyspec platform approve <change-name>');
            process.exit(1);
          }
          // 审批前下行 pull（task-10 / D-009 / FR-06）：拉最新进度避免基于过期状态审批；未连接跳过
          const { triggerPull } = await import('./run/shared.js');
          await triggerPull(dir, approveName);
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
      // F6 路径穿越消毒：renameChange 会 mv changes/<old> → changes/<new>，名含 ../ 会逃出 changes/。
      try {
        assertSafeChangeName(oldName, '旧变更名');
        assertSafeChangeName(newName, '新变更名');
      } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(2);
      }
      const pm = new ProgressManager({ specDir: resolvePlatformSpecDir(dir, specDir) });
      pm.renameChange(dir, oldName, newName);
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
        const wfSubs = ['check', 'list'];
        const sug = didYouMean(wfSub, wfSubs);
        console.error(`❌ 未知子命令: workflow ${wfSub}`);
        if (sug) console.error(`   你是想输入「workflow ${sug}」吗？`);
        console.error(`   可用子命令：${wfSubs.join(' | ')}（运行 sillyspec workflow 查看用法）`);
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
  sillyspec modules rebuild [--force]  从模块卡片 + 源码重建 _module-map.yaml（默认 dry-run 预览，--force 才覆盖）
  sillyspec modules status         显示模块索引状态
  sillyspec modules migrate        旧格式模块文档迁移到新格式
`);
        break;
      }
      if (modulesSub === 'rebuild') {
        const { rebuildModuleMap } = await import('./modules.js');
        const isForce = filteredArgs.includes('--force');
        await rebuildModuleMap(dir, { force: isForce });
      } else if (modulesSub === 'status') {
        const { showModuleStatus } = await import('./modules.js');
        await showModuleStatus(dir);
      } else if (modulesSub === 'migrate') {
        const { migrateModuleDocs } = await import('./modules.js');
        await migrateModuleDocs(dir);
      } else {
        const modSubs = ['rebuild', 'status', 'migrate'];
        const sug = didYouMean(modulesSub, modSubs);
        console.error(`❌ 未知子命令: modules ${modulesSub}`);
        if (sug) console.error(`   你是想输入「modules ${sug}」吗？`);
        console.error(`   可用子命令：${modSubs.join(' | ')}（运行 sillyspec modules 查看用法）`);
        process.exit(1);
      }
      break;
    }
    case 'local': {
      // 本地配置探测（task-04 / D-001@v1）：纯 fs 嗅探项目类型 → 生成 local.yaml。
      // 轻量独立路由，不跑 scan、不消耗 token。探测逻辑归属 local-detect.js（task-02）。
      const localSubCmd = filteredArgs[1];
      if (localSubCmd !== 'detect') {
        console.error('用法: sillyspec local detect [--dir <path>]\n  纯 fs 嗅探项目类型并生成 local.yaml（不跑 scan、零 token）');
        process.exit(2);
      }

      const detected = (await import('./local-detect.js')).detectLocalYaml(dir);
      const specRoot = resolvePlatformSpecDir(dir, specDir) || join(dir, '.sillyspec');
      const localYamlPath = join(specRoot, 'local.yaml');

      if (existsSync(localYamlPath)) {
        console.log(`ℹ️  local.yaml 已存在，跳过: ${localYamlPath}`);
        break;
      }

      // 序列化为 local.yaml 文本（与 scan.js 生成本地配置步骤的 yaml 模板格式一致，向后兼容）
      const c = detected.commands || {};
      const lines = [];
      lines.push('# SillySpec 本地配置（自动生成，可手动修改）');
      lines.push('project:');
      lines.push(`  type: ${detected.project.type}  # nodejs/maven/gradle/make/generic`);
      lines.push('');
      lines.push('commands:');
      if (c.build) lines.push(`  build: "${c.build}"`);
      if (c.test) lines.push(`  test: "${c.test}"`);
      if (c.lint) lines.push(`  lint: "${c.lint}"`);
      lines.push('');
      lines.push('# 测试策略：full=全量测试, module=只测变更模块, skip=跳过测试');
      lines.push('test_strategy: module');
      lines.push('');
      lines.push('# monorepo 子模块映射（test_strategy: module 时按 git diff 命中模块收窄测试；inline flow 形态）');
      lines.push('# modules:');
      lines.push('#   user-service: { path: "user/", test: "cd user && npm test" }');
      lines.push('#   order-service: { path: "order/", test: "cd order && npm test" }');
      lines.push('# 已知预存失败（可选）：verify 实测时这些失败被豁免、不阻断归档；fail-safe 仅豁免能检测到的失败行');
      lines.push('# known_failures:');
      lines.push('#   - "tests/test_legacy.py::test_old"');
      const yamlText = lines.join('\n') + '\n';

      // 原子写（tmp + rename + Windows EPERM 重试），避免半截 local.yaml
      mkdirSync(specRoot, { recursive: true });
      writeAtomicSync(localYamlPath, yamlText);

      console.log(`✅ 已生成 local.yaml (type: ${detected.project.type})`);
      console.log(`   路径: ${localYamlPath}`);
      break;
    }
    case 'config': {
      // local.yaml 键发现缺口（2026-08-11）：键散落 ~10 个 reader，外部项目 agent 无从得知。
      // config schema 把全部已知键 + 生效状态 + 读取点打印出来，堵住发现缺口。
      // 数据源唯一 = src/config-schema.js（与 init 落盘的 local.yaml.example 同源）。
      const configSub = filteredArgs[1];
      const wantHelp = configSub === 'help' || configSub === '--help' || configSub === '-h';
      const isSchema = !configSub || configSub === 'schema';
      if (wantHelp) {
        console.log(`
SillySpec config — local.yaml 配置键速查

用法:
  sillyspec config                打印 local.yaml 全部已知键（人类可读树，默认）
  sillyspec config schema         同上（显式子命令）
  sillyspec config --json         机读 JSON（程序化消费）
  sillyspec config schema --json  同上

说明:
  - 数据源：src/config-schema.js（唯一真相；reader 见各键「读取点」）
  - 键分两类：【生效】配了即生效；【声明但未接线】代码/JSDoc 提及但无 reader，配了不生效
  - 脱敏示例文件：sillyspec init 生成 local.yaml.example（可提交；真实 local.yaml 是 gitignored）
`);
        break;
      }
      if (!isSchema) {
        const sug = didYouMean(configSub, ['schema']);
        console.error(`❌ 未知子命令: config ${configSub}`);
        if (sug) console.error(`   你是想输入「config ${sug}」吗？`);
        console.error('用法: sillyspec config [schema] [--json]   打印 local.yaml 配置键');
        process.exit(2);
      }
      const { renderSchemaHuman, renderSchemaJson } = await import('./config-schema.js');
      if (json) console.log(renderSchemaJson());
      else console.log(renderSchemaHuman());
      break;
    }
    case 'runtime': {
      // D2：.runtime/ 产物索引。CLI 往 .runtime/ 写各种证据/状态文件（db、doctor-diagnosis、
      // workflow-runs、user-inputs…），却没有命令让 agent 一眼看到「我手上有哪些产物」。
      // 多会话/压缩后尤其痛：上轮写的证据文件，下轮不知去哪找。纯只读枚举，不写盘。
      const runtimeSubCmd = filteredArgs[1];
      if (runtimeSubCmd && runtimeSubCmd !== 'list') {
        const sug = didYouMean(runtimeSubCmd, ['list']);
        console.error(`❌ 未知子命令: runtime ${runtimeSubCmd}`);
        if (sug) console.error(`   你是想输入「runtime ${sug}」吗？`);
        console.error('用法: sillyspec runtime list   枚举 .sillyspec/.runtime/ 产物（只读）');
        process.exit(2);
      }
      const specRoot = resolvePlatformSpecDir(dir, specDir) || join(dir, '.sillyspec');
      const runtimeDir = join(specRoot, '.runtime');
      if (!existsSync(runtimeDir)) {
        if (json) { console.log(JSON.stringify({ runtimeDir, exists: false, artifacts: [] }, null, 2)); break; }
        console.log(`📭 无 .runtime/ 目录（${runtimeDir}）——尚未产生任何运行时产物。`);
        break;
      }
      // 已知产物 → 用途说明。agent 据此判断每份产物能否作为证据/该读哪个。
      const KNOWN = {
        'sillyspec.db': '进度库 SQLite（stages/steps/changes 表）',
        'sillyspec.db.bak': '进度库备份（sql.js 时代写前快照遗留，node:sqlite 不再写入，仅 _openWithFallback 向后兼容恢复用）',
        'sillyspec.db.schema-version': '进度库 schema 版本标记',
        'doctor-diagnosis.json': 'doctor --json 结构化诊断快照',
        'doctor-dumps': 'doctor --dump-db 取证输出目录',
        'workflow-runs': 'workflow check --save 归档目录',
        'scan-guard.json': 'scan 覆盖保护记录',
        'quick-sessions': 'quick 会话记录目录',
        'quick-guard.json': 'quick baseline 守卫（旧位置）',
        'worktrees': 'worktree meta（hooks 侧）',
        'user-inputs.md': '步骤输出/输入历史追加日志',
        'current-quick-run-id': '当前 quick sessionId 指针（--done 无 --change 时 fallback）',
        'scan-runs': '平台模式 scan/workflow 取证目录',
        'artifacts': '派生产物目录（init 预建）',
        'contract-artifacts': 'execute endpoint 契约产物（verify 阶段读取）',
        'history': '历史记录目录（init 预建）',
        'logs': '日志目录（init 预建）',
        'templates': '工作流模板目录（init 预建）',
      };
      let entries;
      try {
        entries = readdirSync(runtimeDir, { withFileTypes: true });
      } catch (e) {
        console.error(`❌ 读取 .runtime/ 失败: ${e.message}`);
        process.exit(1);
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      if (json) {
        console.log(JSON.stringify({
          runtimeDir, exists: true,
          artifacts: entries.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file', desc: KNOWN[e.name] || null })),
        }, null, 2));
        break;
      }
      console.log(`📂 .runtime/ 产物（${runtimeDir}）`);
      if (entries.length === 0) { console.log('   （空目录）'); break; }
      for (const e of entries) {
        const kind = e.isDirectory() ? '📁' : '📄';
        const desc = KNOWN[e.name] ? `  — ${KNOWN[e.name]}` : '';
        console.log(`   ${kind} ${e.name}${desc}`);
      }
      const unknown = entries.filter(e => !KNOWN[e.name]);
      if (unknown.length > 0) {
        console.log(`\n   （${unknown.length} 项未登记：${unknown.map(e => e.name).join(', ')}）`);
      }
      break;
    }
    default: {
      const topCommands = ['init', 'setup', 'run', 'progress', 'worktree', 'dispatch', 'local', 'workflow', 'gate', 'derive', 'backfill-reviews', 'register-stage-review', 'modules', 'change-rename', 'knowledge', 'platform', 'scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive', 'quick', 'explore', 'status', 'doctor', 'auto', 'runtime'];
      const suggestion = didYouMean(command, topCommands);
      console.error(`❌ 未知命令: ${command}`);
      if (command === '--status') {
        // --status 是阶段内 flag（sillyspec run <stage> --status），裸用会落到 default
        console.error('   --status 是阶段内 flag。查看进度请用：sillyspec status 或 sillyspec progress show');
      } else if (suggestion) {
        console.error(`   你是想输入「${suggestion}」吗？`);
      }
      printUsage();
      process.exit(1);
    }
  }
}

main().catch((err) => {
  // 平台指针失效：fail-closed，打印修复引导而非静默回退/stack trace
  if (err?.name === 'PointerUnreachableError') {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
  // message 提首行（Agent 可直接解析 stderr 首行判断成败），堆栈降级为附件；
  // 用 exitCode 而非 exit(1) 让事件循环自然 drain，缓解 Windows libuv teardown
  // 把退出码污染成 127（与 shell "command not found" 撞码）的问题。
  console.error(`❌ SillySpec 发生错误：${err?.message || err}`);
  if (err?.stack) console.error(err.stack);
  process.exitCode = 1;
});
