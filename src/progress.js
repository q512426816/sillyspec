/**
 * SillySpec ProgressManager — 进度恢复管理
 *
 * 纯 Node.js，无外部依赖。管理 .sillyspec/.runtime/progress.json。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, unlinkSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RUNTIME_DIR = '.sillyspec/.runtime';
const PROGRESS_FILE = 'progress.json';
const BACKUP_FILE = 'progress.json.bak';

// ── 默认步骤定义 ──

const STEP_DEFINITIONS = {
  brainstorm: [
    { id: 1, name: '加载项目上下文' },
    { id: 2, name: '协作与复用检查' },
    { id: 3, name: '原型/设计图分析' },
    { id: 4, name: '评估需求范围' },
    { id: 5, name: '对话式探索' },
    { id: 6, name: '提出方案并推荐' },
    { id: 7, name: '分段展示设计' },
    { id: 8, name: '写设计文档' },
    { id: 9, name: 'AI 自审' },
    { id: 10, name: '用户确认设计方案' },
    { id: 11, name: '输出技术方案' },
    { id: 12, name: '更新 STATE.md' },
    { id: 13, name: '保存最终进度' },
  ],
  propose: [
    { id: 1, name: '变更范围' },
    { id: 2, name: '方案设计' },
    { id: 3, name: '任务拆分' },
    { id: 4, name: '优先级排序' },
    { id: 5, name: '规范输出' },
  ],
  plan: [
    { id: 1, name: '任务分析' },
    { id: 2, name: '依赖梳理' },
    { id: 3, name: '实现路径' },
    { id: 4, name: '风险评估' },
    { id: 5, name: '计划输出' },
  ],
  execute: [
    { id: 1, name: '环境准备' },
    { id: 2, name: '编码实现' },
    { id: 3, name: '单元测试' },
    { id: 4, name: '代码审查' },
    { id: 5, name: '集成验证' },
  ],
  verify: [
    { id: 1, name: '规范对照' },
    { id: 2, name: '功能测试' },
    { id: 3, name: '边界测试' },
    { id: 4, name: '回归测试' },
    { id: 5, name: '验收报告' },
  ],
};

const EMPTY_PROGRESS = {
  _version: 1,
  schemaVersion: '1.0.0',
  currentStage: 'brainstorm',
  lastActiveAt: new Date().toISOString(),
  resumeCount: 0,
  checkpoint: '',
  stages: {},
  artifacts: [],
};

function emptyStage() {
  return {
    status: 'not_started',
    completedSteps: [],
    inProgressStep: null,
    summaries: {},
    artifacts: [],
    stageSummary: null,
  };
}

// ── ProgressManager ──

export class ProgressManager {
  // ── 公开方法 ──

  init(cwd) {
    const runtimeDir = join(cwd, RUNTIME_DIR);
    const subdirs = ['artifacts', 'history', 'logs', 'templates'];
    mkdirSync(runtimeDir, { recursive: true });
    for (const d of subdirs) {
      mkdirSync(join(runtimeDir, d), { recursive: true });
    }

    const progressPath = join(runtimeDir, PROGRESS_FILE);
    if (!existsSync(progressPath)) {
      // 初始化所有阶段
      const data = { ...EMPTY_PROGRESS, stages: {} };
      for (const stage of Object.keys(STEP_DEFINITIONS)) {
        data.stages[stage] = emptyStage();
      }
      writeFileSync(progressPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`✅ 已创建 ${join(RUNTIME_DIR, PROGRESS_FILE)}`);
    } else {
      console.log(`ℹ️  ${join(RUNTIME_DIR, PROGRESS_FILE)} 已存在，跳过`);
    }

    // 复制 resume-dialog.md 模板
    const templateDir = resolve(__dirname, '..', 'templates');
    const resumeSrc = join(templateDir, 'resume-dialog.md');
    const resumeDest = join(runtimeDir, 'templates', 'resume-dialog.md');
    if (existsSync(resumeSrc) && !existsSync(resumeDest)) {
      copyFileSync(resumeSrc, resumeDest);
    }

    // 创建 user-inputs.md
    const inputsPath = join(runtimeDir, 'user-inputs.md');
    if (!existsSync(inputsPath)) {
      writeFileSync(inputsPath, '# 用户输入记录\n\n> 每步完成时由 AI 自动追加，记录用户所有原话。\n\n');
    }

    // .gitignore
    this._ensureGitignore(cwd);

    return this.read(cwd);
  }

  read(cwd) {
    const progressPath = join(cwd, RUNTIME_DIR, PROGRESS_FILE);
    const backupPath = join(cwd, RUNTIME_DIR, BACKUP_FILE);

    // 三层容错：正常解析 → 修复 → 读 .bak
    if (existsSync(progressPath)) {
      const raw = readFileSync(progressPath, 'utf8');
      const parsed = this._parseWithRecovery(raw);
      if (parsed) return parsed;
    }

    if (existsSync(backupPath)) {
      const raw = readFileSync(backupPath, 'utf8');
      const parsed = this._parseWithRecovery(raw);
      if (parsed) {
        console.log('⚠️  progress.json 损坏，已从备份恢复');
        writeFileSync(progressPath, JSON.stringify(parsed, null, 2) + '\n');
        return parsed;
      }
    }

    return null;
  }

  validate(cwd) {
    const data = this.read(cwd);
    if (!data) {
      console.log('❌ 无法读取 progress.json');
      return false;
    }

    const errors = this._validate(data);
    if (errors.length === 0) {
      console.log('✅ progress.json 格式正确');
      return true;
    }

    console.log(`⚠️  发现 ${errors.length} 个问题，尝试修复...`);

    // 自动修复：补全缺失的阶段
    let fixed = { ...data };
    let changed = false;
    for (const stage of Object.keys(STEP_DEFINITIONS)) {
      if (!fixed.stages[stage]) {
        fixed.stages[stage] = emptyStage();
        changed = true;
      }
    }
    if (!fixed._version) { fixed._version = 1; changed = true; }
    if (!fixed.schemaVersion) { fixed.schemaVersion = '1.0.0'; changed = true; }
    if (!fixed.artifacts) { fixed.artifacts = []; changed = true; }
    if (!fixed.lastActiveAt) { fixed.lastActiveAt = new Date().toISOString(); changed = true; }

    if (changed) {
      this._backup(cwd);
      const progressPath = join(cwd, RUNTIME_DIR, PROGRESS_FILE);
      writeFileSync(progressPath, JSON.stringify(fixed, null, 2) + '\n');
      console.log('✅ 已修复并备份');
    } else {
      console.log('❌ 无法自动修复：');
      errors.forEach(e => console.log(`   - ${e}`));
    }

    return errors.length === 0;
  }

  status(cwd) {
    const data = this.read(cwd);
    if (!data) {
      console.log('❌ 未找到 progress.json，请先运行 sillyspec progress init');
      return;
    }

    const stageLabels = {
      brainstorm: '🧠 需求探索',
      propose: '📋 方案设计',
      plan: '📐 实现计划',
      execute: '⚡ 波次执行',
      verify: '🔍 验证确认',
    };

    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  当前阶段: ${(stageLabels[data.currentStage] || data.currentStage)}`);
    console.log(`  最近活跃: ${data.lastActiveAt ? this._timeAgo(data.lastActiveAt) : '未知'}`);
    console.log(`  恢复次数: ${data.resumeCount ?? 0}`);
    if (data.checkpoint) {
      console.log(`  检查点:   ${data.checkpoint}`);
    }
    console.log('  ═══════════════════════════════════════');
    console.log('');

    for (const [stage, def] of Object.entries(STEP_DEFINITIONS)) {
      const stageData = data.stages[stage] || emptyStage();
      const label = stageLabels[stage] || stage;
      const statusIcons = { not_started: '⬜', in_progress: '🔵', completed: '✅' };
      const icon = statusIcons[stageData.status] || '⬜';

      let steps = '';
      for (const step of def) {
        if (stageData.completedSteps.includes(step.id)) {
          steps += '●';
        } else if (stageData.inProgressStep && stageData.inProgressStep.id === step.id) {
          steps += '◐';
        } else {
          steps += '○';
        }
      }

      const completed = (stageData.completedSteps || []).length;
      const total = def.length;
      console.log(`  ${icon} ${label}  [${steps}]  ${completed}/${total}`);
    }

    console.log('');

    // 产出文件
    if (data.artifacts && data.artifacts.length > 0) {
      console.log('  📦 产出文件:');
      for (const a of data.artifacts) {
        console.log(`     - ${a.name} (${a.stage}) → ${a.path}`);
      }
      console.log('');
    }
  }

  reset(cwd, stage) {
    this._ensureDir(cwd);
    this._backup(cwd);

    const progressPath = join(cwd, RUNTIME_DIR, PROGRESS_FILE);

    if (stage) {
      // 只重置指定阶段
      const data = this.read(cwd);
      if (!data) { console.log('❌ 无法读取 progress.json'); return; }
      if (!data.stages[stage]) { console.log(`❌ 未知阶段: ${stage}`); return; }

      data.stages[stage] = emptyStage();
      data.lastActiveAt = new Date().toISOString();
      writeFileSync(progressPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`✅ 已重置阶段: ${stage}`);
    } else {
      // 全部重置：备份后删除
      if (existsSync(progressPath)) {
        unlinkSync(progressPath);
        console.log('✅ 已重置所有进度（备份已保留）');
      } else {
        console.log('ℹ️  无进度文件可重置');
      }
    }
  }

  complete(cwd, stage) {
    if (!stage) {
      console.log('❌ 请指定阶段: --stage <stage>');
      return;
    }

    const data = this.read(cwd);
    if (!data) { console.log('❌ 无法读取 progress.json'); return; }

    const stageData = data.stages[stage];
    if (!stageData) { console.log(`❌ 未知阶段: ${stage}`); return; }

    // 归档到 history/
    const historyDir = join(cwd, RUNTIME_DIR, 'history');
    mkdirSync(historyDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${stage}-${ts}.json`;
    writeFileSync(join(historyDir, archiveName), JSON.stringify({ stage, data: stageData, completedAt: new Date().toISOString() }, null, 2) + '\n');

    console.log(`✅ 已归档 ${stage} → ${join(RUNTIME_DIR, 'history', archiveName)}`);
  }

  // ── 内部方法 ──

  _ensureDir(cwd) {
    const runtimeDir = join(cwd, RUNTIME_DIR);
    if (!existsSync(runtimeDir)) {
      mkdirSync(runtimeDir, { recursive: true });
      for (const d of ['artifacts', 'history', 'logs', 'templates']) {
        mkdirSync(join(runtimeDir, d), { recursive: true });
      }
    }
  }

  _backup(cwd) {
    const progressPath = join(cwd, RUNTIME_DIR, PROGRESS_FILE);
    const backupPath = join(cwd, RUNTIME_DIR, BACKUP_FILE);
    if (existsSync(progressPath)) {
      renameSync(progressPath, backupPath);
    }
  }

  _parseWithRecovery(jsonString) {
    // 第一层：直接解析
    try {
      return JSON.parse(jsonString);
    } catch {}

    // 第二层：修复常见问题
    let fixed = jsonString;

    // 去尾随逗号（对象和数组中的 ,} 和 ,]）
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');

    // 单引号转双引号（简易处理）
    // 只处理 key 和简单字符串值
    fixed = fixed.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
    fixed = fixed.replace(/:\s*'([^']*)'([,}\]])/g, ':"$1"$2');

    try {
      return JSON.parse(fixed);
    } catch {}

    // 第三层：尝试截断到最后一个完整对象
    const lastBrace = fixed.lastIndexOf('}');
    if (lastBrace > 0) {
      const truncated = fixed.substring(0, lastBrace + 1);
      // 补全外层括号
      let open = 0;
      for (const ch of truncated) {
        if (ch === '{') open++;
        if (ch === '}') open--;
      }
      const repaired = truncated + '}'.repeat(Math.max(0, open));
      try {
        return JSON.parse(repaired);
      } catch {}
    }

    return null;
  }

  _validate(data) {
    const errors = [];
    if (!data || typeof data !== 'object') { errors.push('数据不是有效对象'); return errors; }
    if (!data.stages || typeof data.stages !== 'object') { errors.push('缺少 stages 字段'); }
    if (!data.currentStage || typeof data.currentStage !== 'string') { errors.push('缺少 currentStage 字段'); }
    if (!data.schemaVersion) { errors.push('缺少 schemaVersion 字段'); }
    if (typeof data._version !== 'number' || data._version < 1) { errors.push('_version 应为正整数'); }

    // 校验阶段数据
    if (data.stages) {
      for (const [name, stage] of Object.entries(data.stages)) {
        if (!stage.status) errors.push(`阶段 ${name} 缺少 status`);
        if (stage.completedSteps && !Array.isArray(stage.completedSteps)) {
          errors.push(`阶段 ${name} 的 completedSteps 不是数组`);
        }
      }
    }

    return errors;
  }

  _timeAgo(dateStr) {
    if (!dateStr) return '未知';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小时前`;
    if (minutes > 0) return `${minutes} 分钟前`;
    return '刚刚';
  }

  _getStepDefinitions(stage) {
    return STEP_DEFINITIONS[stage] || [];
  }

  _ensureGitignore(cwd) {
    const gitignorePath = join(cwd, '.gitignore');
    const rule = '.sillyspec/.runtime/';

    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf8');
      if (content.includes(rule)) return;
      writeFileSync(gitignorePath, content.trimEnd() + '\n' + rule + '\n');
    } else {
      writeFileSync(gitignorePath, rule + '\n');
    }
  }
}
