#!/usr/bin/env node

/**
 * SillySpec CLI — 流程状态机
 * 
 * 核心理念：AI 不自己推断下一步该做什么，而是调用 CLI 获取状态和指令。
 * CLI 是调度器，AI 是执行者。
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { cmdInit } from './init.js';

const SILLYSPEC_DIR = '.sillyspec';
const CODEBASE_DIR = `${SILLYSPEC_DIR}/codebase`;
const CHANGES_DIR = `${SILLYSPEC_DIR}/changes`;

// ── SillySpec 生命周期定义 ──
// 每个阶段需要的文件，只有全部齐全才算该阶段完成

const LIFECYCLE = {
  scan: {
    label: '扫描',
    files: [
      { path: `${CODEBASE_DIR}/STACK.md`, label: '技术栈' },
      { path: `${CODEBASE_DIR}/STRUCTURE.md`, label: '目录结构' },
    ],
  },
  'scan:deep': {
    label: '深度扫描',
    files: [
      { path: `${CODEBASE_DIR}/STACK.md`, label: '技术栈' },
      { path: `${CODEBASE_DIR}/ARCHITECTURE.md`, label: '架构' },
      { path: `${CODEBASE_DIR}/STRUCTURE.md`, label: '目录结构' },
      { path: `${CODEBASE_DIR}/CONVENTIONS.md`, label: '代码约定' },
      { path: `${CODEBASE_DIR}/INTEGRATIONS.md`, label: '集成' },
      { path: `${CODEBASE_DIR}/TESTING.md`, label: '测试' },
      { path: `${CODEBASE_DIR}/CONCERNS.md`, label: '技术债务' },
    ],
  },
  brainstorm: {
    label: '需求探索',
    // brainstorm 生成的设计文档在 specs/ 下，文件名不固定
    detect: (dir) => {
      const specsDir = `${dir}/${SILLYSPEC_DIR}/specs`;
      if (!existsSync(specsDir)) return false;
      const files = readdirSync(specsDir).filter(f => f.endsWith('.md'));
      return files.length > 0;
    },
    detectLabel: 'specs/ 下的设计文档',
  },
  propose: {
    label: '生成规范',
    // 需要 changes/<name>/proposal.md
    detect: (dir) => {
      const changesDir = `${dir}/${CHANGES_DIR}`;
      if (!existsSync(changesDir)) return false;
      const changes = readdirSync(changesDir).filter(d => {
        const p = join(changesDir, d);
        return statSync(p).isDirectory() && d !== 'archive';
      });
      return changes.some(c => existsSync(join(changesDir, c, 'proposal.md')));
    },
    detectLabel: 'changes/<name>/proposal.md',
  },
  plan: {
    label: '编写计划',
    detect: (dir) => {
      const changesDir = `${dir}/${CHANGES_DIR}`;
      if (!existsSync(changesDir)) return false;
      const changes = readdirSync(changesDir).filter(d => {
        const p = join(changesDir, d);
        return statSync(p).isDirectory() && d !== 'archive';
      });
      return changes.some(c => existsSync(join(changesDir, c, 'tasks.md')));
    },
    detectLabel: 'changes/<name>/tasks.md',
  },
  execute: {
    label: '执行实现',
    // 有 tasks.md 且 checkbox 未全部完成
    detect: (dir) => {
      const changesDir = `${dir}/${CHANGES_DIR}`;
      if (!existsSync(changesDir)) return false;
      const changes = readdirSync(changesDir).filter(d => {
        const p = join(changesDir, d);
        return statSync(p).isDirectory() && d !== 'archive';
      });
      return changes.some(c => {
        const tasksPath = join(changesDir, c, 'tasks.md');
        if (!existsSync(tasksPath)) return false;
        const content = readFileSync(tasksPath, 'utf8');
        // 有未完成的 checkbox (- [ ])
        const unchecked = (content.match(/- \[ \]/g) || []).length;
        return unchecked > 0;
      });
    },
    detectLabel: 'tasks.md 有未完成项',
  },
  verify: {
    label: '验证实现',
    // tasks.md 全部完成但没有归档
    detect: (dir) => {
      const changesDir = `${dir}/${CHANGES_DIR}`;
      if (!existsSync(changesDir)) return false;
      const changes = readdirSync(changesDir).filter(d => {
        const p = join(changesDir, d);
        return statSync(p).isDirectory() && d !== 'archive';
      });
      return changes.some(c => {
        const tasksPath = join(changesDir, c, 'tasks.md');
        if (!existsSync(tasksPath)) return false;
        const content = readFileSync(tasksPath, 'utf8');
        const unchecked = (content.match(/- \[ \]/g) || []).length;
        const checked = (content.match(/- \[x\]/gi) || []).length;
        return unchecked === 0 && checked > 0;
      });
    },
    detectLabel: 'tasks.md 全部完成',
  },
};

// ── 工具函数 ──

function getLatestChange(dir) {
  const changesDir = join(dir, CHANGES_DIR);
  if (!existsSync(changesDir)) return null;
  
  const changes = readdirSync(changesDir)
    .filter(d => {
      const p = join(changesDir, d);
      return statSync(p).isDirectory() && d !== 'archive';
    })
    .sort((a, b) => {
      const sa = statSync(join(changesDir, a));
      const sb = statSync(join(changesDir, b));
      return sb.mtimeMs - sa.mtimeMs;
    });
  
  return changes[0] || null;
}

function checkChangeFiles(dir, changeName) {
  const changeDir = join(dir, CHANGES_DIR, changeName);
  if (!existsSync(changeDir)) return {};
  
  const checks = {
    proposal: existsSync(join(changeDir, 'proposal.md')),
    design: existsSync(join(changeDir, 'design.md')),
    tasks: existsSync(join(changeDir, 'tasks.md')),
  };
  
  // 统计 tasks 完成情况
  const tasksPath = join(changeDir, 'tasks.md');
  if (checks.tasks) {
    const content = readFileSync(tasksPath, 'utf8');
    checks.totalTasks = (content.match(/- \[[ x]\]/gi) || []).length;
    checks.completedTasks = (content.match(/- \[x\]/gi) || []).length;
    checks.pendingTasks = (content.match(/- \[ \]/g) || []).length;
  }
  
  return checks;
}

function checkCodebaseFiles(dir) {
  const files = {};
  const allFiles = [
    'STACK.md', 'ARCHITECTURE.md', 'STRUCTURE.md',
    'CONVENTIONS.md', 'INTEGRATIONS.md', 'TESTING.md',
    'CONCERNS.md', 'PROJECT.md', 'SCAN-RAW.md',
  ];
  for (const f of allFiles) {
    const p = join(dir, CODEBASE_DIR, f);
    files[f] = existsSync(p);
  }
  return files;
}

// ── 确定当前阶段 ──

function determinePhase(dir) {
  const codebase = checkCodebaseFiles(dir);
  const latestChange = getLatestChange(dir);
  const changeFiles = latestChange ? checkChangeFiles(dir, latestChange) : {};
  
  // 检查大模块模式（MASTER.md）
  let masterMode = false;
  let masterChange = null;
  let stages = {};
  if (latestChange) {
    const masterPath = join(dir, CHANGES_DIR, latestChange, 'MASTER.md');
    if (existsSync(masterPath)) {
      masterMode = true;
      masterChange = latestChange;
      const stagesDir = join(dir, CHANGES_DIR, latestChange, 'stages');
      if (existsSync(stagesDir)) {
        for (const stage of readdirSync(stagesDir)) {
          const stageDir = join(stagesDir, stage);
          if (statSync(stageDir).isDirectory()) {
            const stageFiles = checkChangeFiles(dir, join(latestChange, 'stages', stage));
            stages[stage] = stageFiles;
          }
        }
      }
    }
  }
  
  // 检查深度扫描是否做过
  const hasDeepScan = codebase['ARCHITECTURE.md'] && codebase['CONVENTIONS.md'];
  
  // 检查快速扫描
  const hasQuickScan = codebase['STACK.md'] && codebase['STRUCTURE.md'];
  
  // 检查扫描中断
  if (existsSync(join(dir, CODEBASE_DIR, 'SCAN-RAW.md')) && !hasDeepScan) {
    // 有预处理数据但文档不全，说明深度扫描中断
    const missingDeep = Object.entries(codebase)
      .filter(([f, exists]) => ['ARCHITECTURE.md','CONVENTIONS.md','INTEGRATIONS.md','TESTING.md','CONCERNS.md'].includes(f) && !exists)
      .map(([f]) => f);
    return {
      phase: 'scan:resume',
      label: '深度扫描（中断恢复）',
      command: '/sillyspec:scan --deep',
      details: { missingDocs: missingDeep },
      masterMode: false,
    };
  }
  
  if (hasQuickScan && !hasDeepScan) {
    return {
      phase: 'scan:quick_done',
      label: '快速扫描完成',
      command: '/sillyspec:scan --deep',
      suggestion: '快速扫描已完成，可以用深度扫描获取更详细的分析',
    };
  }
  
  if (!hasQuickScan) {
    return {
      phase: 'init',
      label: '未开始',
      command: '/sillyspec:scan',
      suggestion: '棕地项目从这里开始',
    };
  }
  
  // 已扫描，检查是否做过 brainstorm
  const specsDir = join(dir, SILLYSPEC_DIR, 'specs');
  let hasBrainstorm = false;
  let designDocs = [];
  if (existsSync(specsDir)) {
    designDocs = readdirSync(specsDir).filter(f => f.endsWith('.md'));
    hasBrainstorm = designDocs.length > 0;
  }
  
  if (!hasBrainstorm) {
    return {
      phase: 'brainstorm',
      label: '需求探索',
      command: '/sillyspec:brainstorm',
      suggestion: '扫描已完成，开始头脑风暴',
    };
  }
  
  // 有 brainstorm，检查变更
  if (!latestChange) {
    return {
      phase: 'propose',
      label: '生成规范',
      command: '/sillyspec:propose',
      suggestion: '头脑风暴完成，开始生成结构化规范',
    };
  }
  
  // 大模块模式
  if (masterMode) {
    return {
      phase: 'master',
      label: '大模块执行中',
      masterChange,
      stages,
      command: '/sillyspec:resume',
      suggestion: '大模块模式，各阶段独立生命周期',
    };
  }
  
  // 普通变更
  if (!changeFiles.proposal) {
    return {
      phase: 'propose',
      label: '生成规范',
      latestChange,
      command: `/sillyspec:propose ${latestChange}`,
    };
  }
  
  if (!changeFiles.design) {
    return {
      phase: 'plan',
      label: '编写计划',
      latestChange,
      command: `/sillyspec:plan ${latestChange}`,
    };
  }
  
  if (!changeFiles.tasks) {
    return {
      phase: 'plan',
      label: '编写计划（生成任务）',
      latestChange,
      command: `/sillyspec:plan ${latestChange}`,
    };
  }
  
  // 有 tasks，检查完成情况
  if (changeFiles.pendingTasks > 0) {
    return {
      phase: 'execute',
      label: '执行实现',
      latestChange,
      progress: {
        completed: changeFiles.completedTasks,
        total: changeFiles.totalTasks,
        pending: changeFiles.pendingTasks,
      },
      command: `/sillyspec:execute ${latestChange}`,
    };
  }
  
  // tasks 全部完成
  return {
    phase: 'verify',
    label: '验证实现',
    latestChange,
    command: `/sillyspec:verify ${latestChange}`,
    suggestion: '所有任务已完成，验证后可归档',
  };
}

// ── 命令实现 ──

function cmdStatus(dir, options = {}) {
  const phase = determinePhase(dir);
  const codebase = checkCodebaseFiles(dir);
  const latestChange = getLatestChange(dir);
  
  if (options.json) {
    const output = {
      phase: phase.phase,
      label: phase.label,
      command: phase.command,
      suggestion: phase.suggestion || null,
      currentChange: phase.latestChange || null,
      codebase: codebase,
      masterMode: phase.masterMode || false,
      ...(phase.masterMode ? { masterChange: phase.masterChange, stages: phase.stages } : {}),
      ...(phase.progress ? { progress: phase.progress } : {}),
      ...(phase.details ? { details: phase.details } : {}),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // 人类可读
    console.log('');
    console.log(`📋 当前阶段: ${phase.label}`);
    console.log(`📦 当前变更: ${phase.latestChange || '无'}`);
    
    if (phase.progress) {
      const pct = Math.round(phase.progress.completed / phase.progress.total * 100);
      console.log(`📊 进度: ${phase.progress.completed}/${phase.progress.total} (${pct}%)`);
    }
    
    console.log(`➡️  下一步: ${phase.command}`);
    
    if (phase.suggestion) {
      console.log(`💡 ${phase.suggestion}`);
    }
    
    // codebase 文件概览
    const codebaseCount = Object.values(codebase).filter(Boolean).length;
    console.log(``);
    console.log(`🗂️  codebase 文档: ${codebaseCount}/9`);
    
    // 大模块信息
    if (phase.masterMode && phase.stages) {
      console.log('');
      console.log('🏗️  大模块阶段:');
      for (const [name, files] of Object.entries(phase.stages)) {
        const hasTasks = files.tasks;
        const pending = files.pendingTasks || 0;
        const total = files.totalTasks || 0;
        const status = !hasTasks ? '⬜' : pending > 0 ? '🔄' : '✅';
        console.log(`  ${status} ${name}: ${hasTasks ? `${total - pending}/${total}` : '未计划'}`);
      }
    }
  }
}

function cmdNext(dir, options = {}) {
  const phase = determinePhase(dir);
  
  if (options.json) {
    const output = {
      phase: phase.phase,
      command: phase.command,
      reason: phase.suggestion || `当前处于 ${phase.label} 阶段`,
      ...(phase.details ? { missingDocs: phase.details.missingDocs } : {}),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(phase.command);
  }
}

function cmdCheck(dir, options = {}) {
  // 只检查文件存在性，用于断点续扫
  const codebase = checkCodebaseFiles(dir);
  const deepFiles = ['ARCHITECTURE.md','CONVENTIONS.md','INTEGRATIONS.md','TESTING.md','CONCERNS.md'];
  
  const result = {
    quickScan: {
      STACK: codebase['STACK.md'],
      STRUCTURE: codebase['STRUCTURE.md'],
      done: codebase['STACK.md'] && codebase['STRUCTURE.md'],
    },
    deepScan: {},
    allDone: true,
  };
  
  for (const f of deepFiles) {
    const name = f.replace('.md', '');
    result.deepScan[name] = codebase[f];
    if (!codebase[f]) result.allDone = false;
  }
  
  if (!result.quickScan.done) result.allDone = false;
  
  // 检查误放文件
  const misplaced = [];
  const docNames = ['ARCHITECTURE.md','STACK.md','STRUCTURE.md','CONVENTIONS.md','INTEGRATIONS.md','TESTING.md','CONCERNS.md','PROJECT.md','SCAN-RAW.md'];
  for (const name of docNames) {
    // 检查项目根目录
    if (existsSync(join(dir, name))) {
      misplaced.push({ file: name, location: './', shouldBe: `${CODEBASE_DIR}/` });
    }
    // 检查 .sillyspec/ 但不在 codebase/ 下
    if (existsSync(join(dir, SILLYSPEC_DIR, name))) {
      misplaced.push({ file: name, location: `${SILLYSPEC_DIR}/`, shouldBe: `${CODEBASE_DIR}/` });
    }
  }
  result.misplaced = misplaced;
  
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('');
    console.log('📊 快速扫描:');
    console.log(`  ${result.quickScan.STACK ? '✅' : '⬜'} STACK.md`);
    console.log(`  ${result.quickScan.STRUCTURE ? '✅' : '⬜'} STRUCTURE.md`);
    console.log('');
    console.log('📊 深度扫描:');
    for (const [name, exists] of Object.entries(result.deepScan)) {
      console.log(`  ${exists ? '✅' : '⬜'} ${name}.md`);
    }
    if (result.misplaced.length > 0) {
      console.log('');
      console.log('❌ 误放文件:');
      for (const m of result.misplaced) {
        console.log(`  ${m.file} 在 ${m.location}，应在 ${m.shouldBe}`);
      }
    }
  }
}

// ── CLI 入口 ──

function printUsage() {
  console.log(`
SillySpec CLI — 流程状态机

用法:
  sillyspec status [--json]    显示当前项目状态
  sillyspec next [--json]      显示下一步该执行的命令
  sillyspec check [--json]     检查文档完整性和路径
  sillyspec init               初始化 SillySpec（安装到各工具）
    [--tool <name>]            只安装指定工具
    [--workspace]              工作区模式
    [--dir <path>]             指定目录

选项:
  --json                       输出 JSON（给 AI 程序化读取）
  --dir <path>                 指定项目目录（默认当前目录）

示例:
  sillyspec status
  sillyspec status --json
  sillyspec next --json
  sillyspec check
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }
  
  // 解析全局选项
  let json = false;
  let targetDir = process.cwd();
  let tool = null;
  let workspace = false;
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
    case 'status':
      cmdStatus(dir, { json });
      break;
    case 'next':
      cmdNext(dir, { json });
      break;
    case 'check':
      cmdCheck(dir, { json });
      break;
    case 'init':
      cmdInit(dir, { tool, workspace });
      break;
    default:
      console.error(`❌ 未知命令: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
