/**
 * SillySpec ProgressManager — 进度恢复管理
 *
 * 纯 Node.js，无外部依赖。管理 .sillyspec/.runtime/progress.json。
 *
 * Schema v2: { project, currentStage, stages: { [name]: { status, steps, startedAt, completedAt } }, lastActive }
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, unlinkSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RUNTIME_DIR = '.sillyspec/.runtime';
const PROGRESS_FILE = 'progress.json';
const BACKUP_FILE = 'progress.json.bak';

const CURRENT_VERSION = 2;
const VALID_STAGES = ['brainstorm', 'propose', 'plan', 'execute', 'verify', 'scan', 'quick', 'archive', 'status'];
const VALID_STATUSES = ['pending', 'in-progress', 'completed', 'failed', 'blocked'];

const STAGE_LABELS = {
  brainstorm: '🧠 需求探索',
  propose: '📋 方案设计',
  plan: '📐 实现计划',
  execute: '⚡ 波次执行',
  verify: '🔍 验证确认',
  scan: '🔍 代码扫描',
  quick: '⚡ 快速任务',
  archive: '📦 归档变更',
  status: '📊 状态查看',
};

function emptyStage() {
  return { status: 'pending', steps: [], startedAt: null, completedAt: null };
}

function makeInitialProgress(project) {
  const stages = {};
  for (const s of VALID_STAGES) stages[s] = emptyStage();
  return { _version: CURRENT_VERSION, project: project || '', currentStage: '', currentChange: null, stages, lastActive: null };
}

// ── ProgressManager ──

export class ProgressManager {
  // ── 核心读写 ──

  _path(cwd, ...parts) {
    return join(cwd, RUNTIME_DIR, ...parts);
  }

  read(cwd) {
    const progressPath = this._path(cwd, PROGRESS_FILE);
    const backupPath = this._path(cwd, BACKUP_FILE);

    for (const p of [progressPath, backupPath]) {
      if (!existsSync(p)) continue;
      const parsed = this._parseWithRecovery(readFileSync(p, 'utf8'));
      if (parsed) {
        if (p === backupPath) {
          console.log('⚠️  progress.json 损坏，已从备份恢复');
          writeFileSync(progressPath, JSON.stringify(parsed, null, 2) + '\n');
        }
        return parsed;
      }
    }
    return null;
  }

  _write(cwd, data) {
    const progressPath = this._path(cwd, PROGRESS_FILE);
    const tmpPath = progressPath + '.tmp';
    this._ensureDir(cwd);
    writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n');
    renameSync(tmpPath, progressPath);
  }

  _ensureDir(cwd) {
    const runtimeDir = this._path(cwd);
    if (!existsSync(runtimeDir)) {
      mkdirSync(runtimeDir, { recursive: true });
      for (const d of ['artifacts', 'history', 'logs', 'templates']) {
        mkdirSync(join(runtimeDir, d), { recursive: true });
      }
    }
  }

  _backup(cwd) {
    const p = this._path(cwd, PROGRESS_FILE);
    if (existsSync(p)) renameSync(p, this._path(cwd, BACKUP_FILE));
  }

  // ── CLI 命令 ──

  init(cwd) {
    this._ensureDir(cwd);
    const progressPath = this._path(cwd, PROGRESS_FILE);

    if (existsSync(progressPath)) {
      console.log(`ℹ️  progress.json 已存在，跳过`);
      return this.read(cwd);
    }

    const project = basename(cwd);
    const data = makeInitialProgress(project);
    this._write(cwd, data);
    console.log(`✅ 已创建 ${join(RUNTIME_DIR, PROGRESS_FILE)}`);

    // 创建 user-inputs.md
    const inputsPath = this._path(cwd, 'user-inputs.md');
    if (!existsSync(inputsPath)) {
      writeFileSync(inputsPath, '# 用户输入记录\n\n> 每步完成时由 AI 自动追加，记录用户所有原话。\n\n');
    }

    this._ensureGitignore(cwd);
    return data;
  }

  setStage(cwd, stage) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}，可选: ${VALID_STAGES.join(', ')}`);
      return;
    }

    const data = this._readOrInit(cwd);
    if (!data) return;

    if (!data.stages[stage]) data.stages[stage] = emptyStage();
    const stageData = data.stages[stage];

    data.currentStage = stage;
    if (stageData.status === 'pending') {
      stageData.status = 'in-progress';
      stageData.startedAt = new Date().toLocaleString('zh-CN',{hour12:false});
    }
    data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});

    this._backup(cwd);
    this._write(cwd, data);
    console.log(`✅ 当前阶段已设为: ${STAGE_LABELS[stage] || stage} (${stageData.status})`);
  }

  addStep(cwd, stage, stepName) {
    if (!stepName) { console.log('❌ 请指定步骤名称'); return; }
    const data = this._requireStage(cwd, stage);
    if (!data) return;

    const stageData = data.stages[stage];
    if (stageData.steps.some(s => s.name === stepName)) {
      console.log(`ℹ️  步骤 "${stepName}" 已存在于 ${stage}`);
      return;
    }

    stageData.steps.push({ name: stepName, status: 'pending' });
    data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});

    this._backup(cwd);
    this._write(cwd, data);
    console.log(`✅ 已添加步骤: ${stage}/${stepName}`);
  }

  updateStep(cwd, stage, stepName, options = {}) {
    const { status, output } = options;
    if (!stepName) { console.log('❌ 请指定步骤名称'); return; }
    const data = this._requireStage(cwd, stage);
    if (!data) return;

    const stageData = data.stages[stage];
    const step = stageData.steps.find(s => s.name === stepName);
    if (!step) { console.log(`❌ 步骤不存在: ${stage}/${stepName}`); return; }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        console.log(`❌ 无效状态: ${status}，可选: ${VALID_STATUSES.join(', ')}`);
        return;
      }
      step.status = status;
    }
    if (output !== undefined) step.output = output;

    // 检查是否所有步骤都 completed
    if (stageData.steps.length > 0 && stageData.steps.every(s => s.status === 'completed')) {
      stageData.status = 'completed';
      stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false});
      console.log(`✅ 阶段 ${stage} 所有步骤已完成，阶段已标记为 completed`);
    }

    data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});
    this._backup(cwd);
    this._write(cwd, data);
    console.log(`✅ 步骤已更新: ${stage}/${stepName} → ${status || step.status}`);
  }

  completeStage(cwd, stage) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}`);
      return;
    }

    const data = this._readOrInit(cwd);
    if (!data) return;

    if (!data.stages[stage]) data.stages[stage] = emptyStage();
    const stageData = data.stages[stage];
    stageData.status = 'completed';
    stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false});

    // 标记所有未完成步骤为 completed
    for (const step of stageData.steps) {
      if (step.status === 'pending') step.status = 'completed';
    }

    // 推进到下一个未完成阶段
    const idx = VALID_STAGES.indexOf(stage);
    let nextStage = null;
    for (let i = idx + 1; i < VALID_STAGES.length; i++) {
      const s = data.stages[VALID_STAGES[i]];
      if (!s || s.status !== 'completed') {
        nextStage = VALID_STAGES[i];
        break;
      }
    }

    if (nextStage) {
      data.currentStage = nextStage;
      if (!data.stages[nextStage]) data.stages[nextStage] = emptyStage();
      if (data.stages[nextStage].status === 'pending') {
        data.stages[nextStage].status = 'in-progress';
        data.stages[nextStage].startedAt = new Date().toLocaleString('zh-CN',{hour12:false});
      }
      console.log(`✅ 阶段 ${stage} 已完成，推进到: ${STAGE_LABELS[nextStage] || nextStage}`);
    } else {
      data.currentStage = stage;
      console.log(`✅ 阶段 ${stage} 已完成（已是最后阶段）`);
    }

    data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});

    // 归档到 history/
    const historyDir = this._path(cwd, 'history');
    mkdirSync(historyDir, { recursive: true });
    const ts = new Date().toLocaleString('zh-CN',{hour12:false}).replace(/[:.]/g, '-');
    writeFileSync(join(historyDir, `${stage}-${ts}.json`), JSON.stringify({ stage, data: stageData, completedAt: stageData.completedAt }, null, 2) + '\n');

    this._backup(cwd);
    this._write(cwd, data);
  }

  show(cwd) {
    const data = this.read(cwd);
    if (!data) {
      console.log('❌ 未找到 progress.json，请先运行 sillyspec progress init');
      return;
    }

    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  项目:     ${data.project || '(未命名)'}`);
    console.log(`  当前阶段: ${STAGE_LABELS[data.currentStage] || data.currentStage || '(无)'}`);
    console.log(`  最近活跃: ${data.lastActive ? this._timeAgo(data.lastActive) : '未知'}`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    const statusIcons = { pending: '⬜', 'in-progress': '🔵', completed: '✅', failed: '❌', blocked: '🚫' };

    for (const stage of VALID_STAGES) {
      const stageData = data.stages[stage] || emptyStage();
      const label = STAGE_LABELS[stage] || stage;
      const icon = statusIcons[stageData.status] || '⬜';
      const isCurrent = data.currentStage === stage ? ' ◀' : '';

      console.log(`  ${icon} ${label}${isCurrent}`);

      if (stageData.steps && stageData.steps.length > 0) {
        for (const step of stageData.steps) {
          const si = statusIcons[step.status] || '○';
          const out = step.output ? ` — ${step.output.slice(0, 60)}` : '';
          console.log(`    ${si} ${step.name}${out}`);
        }
      }

      if (stageData.startedAt) {
        console.log(`    开始: ${new Date(stageData.startedAt).toLocaleString('zh-CN')}`);
      }
      if (stageData.completedAt) {
        console.log(`    完成: ${new Date(stageData.completedAt).toLocaleString('zh-CN')}`);
      }
    }

    console.log('');
  }

  status(cwd) {
    this.show(cwd);
  }

  validate(cwd) {
    const data = this.read(cwd);
    if (!data) { console.log('❌ 无法读取 progress.json'); return false; }

    const errors = [];
    if (!data._version || !Number.isInteger(data._version) || data._version < 1) {
      errors.push(`_version 缺失或无效（期望正整数，实际为 ${JSON.stringify(data._version)}）`);
    }
    if (!data.stages || typeof data.stages !== 'object') errors.push('缺少 stages');
    if (!VALID_STAGES.every(s => data.stages[s])) errors.push('缺少阶段定义');

    if (errors.length === 0) { console.log('✅ progress.json 格式正确'); return true; }

    console.log(`⚠️  发现问题，尝试修复...`);
    let fixed = { ...data, stages: { ...data.stages } };
    let changed = false;
    if (!fixed._version || !Number.isInteger(fixed._version) || fixed._version < 1) {
      fixed._version = CURRENT_VERSION;
      changed = true;
    }
    for (const s of VALID_STAGES) {
      if (!fixed.stages[s]) { fixed.stages[s] = emptyStage(); changed = true; }
    }
    if (changed) {
      this._backup(cwd);
      this._write(cwd, fixed);
      console.log('✅ 已修复并备份');
    }
    return true;
  }

  reset(cwd, stage) {
    this._ensureDir(cwd);
    this._backup(cwd);

    if (stage) {
      const data = this.read(cwd);
      if (!data) { console.log('❌ 无法读取 progress.json'); return; }
      if (!data.stages[stage]) { console.log(`❌ 未知阶段: ${stage}`); return; }
      data.stages[stage] = emptyStage();
      data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});
      this._write(cwd, data);
      console.log(`✅ 已重置阶段: ${stage}`);
    } else {
      const p = this._path(cwd, PROGRESS_FILE);
      if (existsSync(p)) { unlinkSync(p); console.log('✅ 已重置所有进度（备份已保留）'); }
      else console.log('ℹ️  无进度文件可重置');
    }
  }

  complete(cwd, stage) {
    this.completeStage(cwd, stage);
  }

  // ── 内部辅助 ──

  _readOrInit(cwd) {
    let data = this.read(cwd);
    if (!data) {
      this._ensureDir(cwd);
      const progressPath = this._path(cwd, PROGRESS_FILE);
      if (!existsSync(progressPath)) {
        data = makeInitialProgress(basename(cwd));
        this._write(cwd, data);
      } else {
        console.log('❌ progress.json 损坏，请运行 sillyspec progress validate');
        return null;
      }
    }
    return data;
  }

  _requireStage(cwd, stage) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}，可选: ${VALID_STAGES.join(', ')}`);
      return null;
    }
    const data = this._readOrInit(cwd);
    if (!data) return null;
    if (!data.stages[stage]) data.stages[stage] = emptyStage();
    return data;
  }

  _parseWithRecovery(jsonString) {
    try { return JSON.parse(jsonString); } catch {}

    let fixed = jsonString.replace(/,\s*([}\]])/g, '$1');
    fixed = fixed.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
    fixed = fixed.replace(/:\s*'([^']*)'([,}\]])/g, ':"$1"$2');
    try { return JSON.parse(fixed); } catch {}

    const lastBrace = fixed.lastIndexOf('}');
    if (lastBrace > 0) {
      let open = 0;
      for (const ch of fixed.substring(0, lastBrace + 1)) {
        if (ch === '{') open++;
        if (ch === '}') open--;
      }
      try { return JSON.parse(fixed.substring(0, lastBrace + 1) + '}'.repeat(Math.max(0, open))); } catch {}
    }
    return null;
  }

  _timeAgo(dateStr) {
    if (!dateStr) return '未知';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return `${m} 分钟前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} 小时前`;
    return `${Math.floor(h / 24)} 天前`;
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
