import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

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
  // codex outputs to user home directory
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

// ── 主命令 ──

export function cmdInit(projectDir, options = {}) {
  const { tool, workspace } = options;

  // 确定要安装的工具
  let tools;
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

  console.log('🤪 SillySpec v2.2 — 规范驱动开发');
  console.log('====================================');
  console.log('');
  console.log(`📦 安装工具: ${tools.join(', ')}`);
  if (workspace) console.log('📦 工作区模式');
  console.log('');

  // 创建基础目录
  const dirs = [
    '.sillyspec/codebase',
    '.sillyspec/changes/archive',
    '.sillyspec/plans',
    '.sillyspec/specs',
    '.sillyspec/phases',
  ];
  if (workspace) {
    dirs.push('.sillyspec/shared', '.sillyspec/workspace');
  }
  for (const d of dirs) {
    mkdirSync(join(projectDir, d), { recursive: true });
  }
  mkdirSync(join(homedir(), '.sillyspec', 'templates'), { recursive: true });

  // .gitignore
  const gitignorePath = join(projectDir, '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, '.sillyspec/STATE.md\n');
  }

  // 为每个工具生成文件
  const templateFiles = readdirSync(TEMPLATE_DIR).filter(f => f.endsWith('.md'));
  let count = 0;

  for (const toolName of tools) {
    console.log(`🔧 安装 ${toolName}...`);
    const gen = GENERATORS[toolName];
    for (const file of templateFiles) {
      const name = file.replace('.md', '');
      const desc = DESCRIPTIONS[name] || `SillySpec ${name}`;
      const argHint = ARG_HINTS[name] || '';
      const body = readFileSync(join(TEMPLATE_DIR, file), 'utf8');
      gen(projectDir, name, desc, body, argHint);
      count++;
    }
    console.log(`  ✅ ${toolName} 完成`);
  }

  console.log('');
  console.log(`📄 ${count} 个命令已安装`);

  // 工作区配置
  if (workspace) {
    const configPath = join(projectDir, '.sillyspec', 'config.yaml');
    if (!existsSync(configPath)) {
      writeFileSync(configPath,
`# SillySpec 工作区配置
# 修改此文件后运行 /sillyspec:workspace 更新

projects: {}
  # 示例：
  # frontend:
  #   path: ./frontend
  #   role: 前端 - Vue3 + TypeScript
  # backend:
  #   path: ./backend
  #   role: 后端 - Node.js + PostgreSQL

shared: []
`
      );
      console.log('📄 .sillyspec/config.yaml → 工作区配置 ✓');
    }
  }

  console.log('');
  console.log('=====================================');
  if (workspace) {
    console.log('✅ SillySpec v2.2 安装完成！（工作区模式）');
    console.log('');
    console.log(`已安装工具: ${tools.join(', ')}`);
    console.log('');
    console.log('工作区命令：');
    console.log('  /sillyspec:workspace add    — 添加子项目');
    console.log('  /sillyspec:workspace status — 查看工作区状态');
  } else {
    console.log('✅ SillySpec v2.2 安装完成！');
    console.log('');
    console.log(`已安装工具: ${tools.join(', ')}`);
    console.log('');
    console.log('入口选择：');
    console.log('  绿地项目：/sillyspec:init');
    console.log('  棕地项目：/sillyspec:scan');
    console.log('  自由思考：/sillyspec:explore "你的想法"');
  }
}
