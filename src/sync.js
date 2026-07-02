/**
 * SillySpec SyncManager — SillyHub 平台同步模块
 *
 * 独立于 ProgressManager，由 run.js 和 index.js 调用。
 * Best effort：所有网络失败 console.warn，不抛错，不阻塞主流程。
 *
 * 配置来源：.sillyspec/local.yaml 中的 platform 段
 * HTTP 请求：Node.js 原生 fetch（Node 22+）
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { resolvePlatformSpecDir } from './progress.js';

const LOCAL_YAML = '.sillyspec/local.yaml';
const CHANGES_DIR = '.sillyspec/changes';
const REQUEST_TIMEOUT_MS = 10_000;

/** 四件套文档文件名 */
const DOCUMENT_FILES = ['proposal.md', 'design.md', 'requirements.md', 'tasks.md'];

// ── YAML 辅助 ──

/**
 * 简易 YAML 读写，只处理 project 段的扁平结构。
 * 与 worktree-guard.js 的 parseSimpleYaml 保持一致的轻量风格。
 */
function readLocalYaml(cwd) {
  const p = join(cwd, LOCAL_YAML);
  if (!existsSync(p)) return {};
  try {
    return parseSimpleYaml(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function writeLocalYaml(cwd, obj) {
  const dir = join(cwd, '.sillyspec');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const lines = [];
  const rootKeys = Object.keys(obj);
  for (const key of rootKeys) {
    const val = obj[key];
    if (val === null || val === undefined) continue;
    if (typeof val === 'object' && !Array.isArray(val)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(val)) {
        if (typeof v === 'string') {
          lines.push(`  ${k}: ${v}`);
        } else {
          lines.push(`  ${k}: ${JSON.stringify(v)}`);
        }
      }
    } else {
      lines.push(`${key}: ${typeof val === 'string' ? val : JSON.stringify(val)}`);
    }
  }
  writeFileSync(join(cwd, LOCAL_YAML), lines.join('\n') + '\n', 'utf8');
}

function parseSimpleYaml(content) {
  const result = {};
  let currentSection = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!trimmed.startsWith(' ')) {
      const m = trimmed.match(/^(\S+)\s*:\s*(.*)$/);
      if (m) {
        const key = m[1];
        const val = m[2].trim();
        if (val) {
          result[key] = val;
          currentSection = null;
        } else {
          result[key] = {};
          currentSection = key;
        }
      }
    } else if (currentSection) {
      const m = trimmed.match(/^(\S+)\s*:\s*(.*)$/);
      if (m && result[currentSection] && typeof result[currentSection] === 'object') {
        result[currentSection][m[1]] = m[2].trim();
      }
    }
  }
  return result;
}

// ── HTTP 辅助 ──

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[sync] ${options.method || 'GET'} ${url} → ${res.status} ${text.slice(0, 200)}`);
      return null;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return res.json();
    }
    return null;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[sync] ${url} 请求超时 (${REQUEST_TIMEOUT_MS}ms)`);
    } else {
      console.warn(`[sync] ${url} 请求失败: ${err.message}`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── SyncManager ──

export class SyncManager {
  constructor(cwd) {
    this.cwd = cwd;
  }

  /**
   * 连接 SillyHub 平台。
   * 保存配置到 .sillyspec/local.yaml，发送 ping 验证连接。
   */
  async connect(url, token) {
    // 验证连接
    const healthUrl = `${url.replace(/\/+$/, '')}/api/health`;
    const result = await fetchJson(healthUrl);
    if (result === null) {
      console.warn(`[sync] 平台连接验证失败: ${url}`);
      return;
    }
    console.log(`[sync] 平台连接成功: ${url}`);

    // 写入 local.yaml
    const config = readLocalYaml(this.cwd);
    config.platform = {
      url: url.replace(/\/+$/, ''),
      token,
      last_connected: new Date().toISOString(),
    };
    writeLocalYaml(this.cwd, config);
  }

  /**
   * 断开平台连接。
   * 从 local.yaml 删除 platform 配置段。
   */
  disconnect() {
    const p = join(this.cwd, LOCAL_YAML);
    if (!existsSync(p)) {
      console.log('[sync] 已断开连接（无配置文件）');
      return;
    }
    const config = readLocalYaml(this.cwd);
    if (!config.platform) {
      console.log('[sync] 已断开连接（未连接）');
      return;
    }
    delete config.platform;
    if (Object.keys(config).length === 0) {
      // 配置为空，删除整个文件
      try { unlinkSync(p); } catch { /* best effort */ }
    } else {
      writeLocalYaml(this.cwd, config);
    }
    console.log('[sync] 已断开连接');
  }

  /**
   * 增量同步变更的 progress 状态到平台。
   * 读取 ProgressManager.read() 的数据，POST 到平台。
   * 同步完成后更新 changes 表的 platform_last_sync 字段。
   */
  async sync(changeName) {
    const platform = this._getPlatform();
    if (!platform) {
      console.warn('[sync] 未连接平台，请先 sillyspec platform connect');
      return { synced: 0, errors: ['未连接平台'] };
    }

    if (!changeName) {
      console.warn('[sync] sync 需要指定变更名称 (changeName)');
      return { synced: 0, errors: ['未指定变更名称'] };
    }

    // 检查变更是否存在
    const changeDir = join(this.cwd, CHANGES_DIR, changeName);
    if (!existsSync(changeDir)) {
      console.warn(`[sync] 变更不存在: ${changeName}`);
      return { synced: 0, errors: [`变更不存在: ${changeName}`] };
    }

    // 读取 progress 数据（通过导入 ProgressManager 动态调用）
    let progressData;
    try {
      const { ProgressManager } = await import('./progress.js');
      const pm = new ProgressManager({ specDir: resolvePlatformSpecDir(this.cwd) });
      progressData = await pm.read(this.cwd, changeName);
    } catch (err) {
      console.warn(`[sync] 读取 progress 失败 (${changeName}): ${err.message}`);
      return { synced: 0, errors: [`读取 progress 失败: ${err.message}`] };
    }

    // POST 到平台
    const syncUrl = `${platform.url}/api/changes/${changeName}/progress`;
    const result = await fetchJson(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platform.token}`,
      },
      body: JSON.stringify(progressData),
    });

    if (!result) {
      return { synced: 0, errors: [`同步请求失败: ${changeName}`] };
    }

    // 更新 platform_last_sync
    try {
      const { ProgressManager } = await import('./progress.js');
      const pm = new ProgressManager({ specDir: resolvePlatformSpecDir(this.cwd) });
      await pm._updatePlatformLastSync(this.cwd, changeName);
    } catch (err) {
      console.warn(`[sync] 更新 platform_last_sync 失败: ${err.message}`);
    }

    console.log(`[sync] 已同步变更: ${changeName}`);
    return { synced: 1, errors: [] };
  }

  /**
   * 同步四件套文档到平台（全量同步）。
   * POST {url}/api/changes/{changeName}/documents
   */
  async syncDocuments(changeName) {
    const platform = this._getPlatform();
    if (!platform) {
      console.warn('[sync] 未连接平台，请先 sillyspec platform connect');
      return { synced: 0, errors: ['未连接平台'] };
    }

    if (!changeName) {
      console.warn('[sync] syncDocuments 需要指定变更名称 (changeName)');
      return { synced: 0, errors: ['未指定变更名称'] };
    }

    const changeDir = join(this.cwd, CHANGES_DIR, changeName);
    if (!existsSync(changeDir)) {
      console.warn(`[sync] 变更不存在: ${changeName}`);
      return { synced: 0, errors: [`变更不存在: ${changeName}`] };
    }

    const documents = {};
    let syncedCount = 0;
    const errors = [];

    for (const docFile of DOCUMENT_FILES) {
      const docPath = join(changeDir, docFile);
      if (existsSync(docPath)) {
        try {
          documents[docFile] = readFileSync(docPath, 'utf8');
          syncedCount++;
        } catch (err) {
          errors.push(`读取 ${docFile} 失败: ${err.message}`);
        }
      }
    }

    if (syncedCount === 0) {
      console.warn(`[sync] 未找到可同步的文档: ${changeName}`);
      return { synced: 0, errors: [...errors, '无可用文档'] };
    }

    const docUrl = `${platform.url}/api/changes/${changeName}/documents`;
    const result = await fetchJson(docUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platform.token}`,
      },
      body: JSON.stringify(documents),
    });

    if (!result) {
      return { synced: 0, errors: [...errors, '文档同步请求失败'] };
    }

    console.log(`[sync] 已同步 ${syncedCount} 个文档: ${changeName}`);
    return { synced: syncedCount, errors };
  }

  /**
   * 检查变更的审批状态。
   * GET {url}/api/changes/{changeName}/approval
   * 返回 { status: 'pending'|'approved'|'rejected', reason?: string }
   */
  async checkApproval(changeName) {
    const platform = this._getPlatform();
    if (!platform) {
      console.warn('[sync] 未连接平台，请先 sillyspec platform connect');
      return { status: 'pending', reason: '未连接平台' };
    }

    if (!changeName) {
      console.warn('[sync] checkApproval 需要指定变更名称 (changeName)');
      return { status: 'pending', reason: '未指定变更名称' };
    }

    const approvalUrl = `${platform.url}/api/changes/${changeName}/approval`;
    const result = await fetchJson(approvalUrl, {
      headers: { Authorization: `Bearer ${platform.token}` },
    });

    if (!result) {
      console.warn(`[sync] 检查审批状态失败: ${changeName}`);
      return { status: 'pending', reason: '请求失败' };
    }

    // 更新本地 approvals 表
    try {
      const { ProgressManager } = await import('./progress.js');
      const pm = new ProgressManager({ specDir: resolvePlatformSpecDir(this.cwd) });
      await pm._updateApprovalStatus(this.cwd, changeName, result.status, result.reason);
    } catch (err) {
      console.warn(`[sync] 更新本地审批状态失败: ${err.message}`);
    }

    if (result.status === 'rejected') {
      console.warn(`[sync] 审批被拒绝 (${changeName}): ${result.reason || '无原因'}`);
    }

    return result;
  }

  /**
   * 查看同步状态。
   * 读取 local.yaml 中的 platform 配置，返回连接信息。
   */
  status() {
    const config = readLocalYaml(this.cwd);
    const platform = config.platform;
    if (!platform) {
      return { connected: false };
    }
    return {
      connected: true,
      url: platform.url,
      lastSync: platform.last_connected || null,
    };
  }

  /** 获取当前平台配置，未连接返回 null */
  _getPlatform() {
    const config = readLocalYaml(this.cwd);
    return config.platform || null;
  }
}

// ── CLI 入口函数 ──

/**
 * syncModule — sillyspec platform 子命令入口
 *
 * 用法:
 *   sillyspec platform connect <url> <token>
 *   sillyspec platform disconnect
 *   sillyspec platform sync [changeName]
 *   sillyspec platform sync-docs [changeName]
 *   sillyspec platform approval <changeName>
 *   sillyspec platform status
 *
 * @param {string[]} args — 子命令及参数
 * @param {string} cwd — 工作目录
 */
/**
 * 便捷函数导出 — 供 index.js 和 run.js 直接调用
 */
export async function connect(url, token, cwd) {
  return new SyncManager(cwd).connect(url, token);
}

export async function disconnect(cwd) {
  return new SyncManager(cwd).disconnect();
}

export async function sync(changeName, cwd) {
  return new SyncManager(cwd).sync(changeName);
}

export async function syncDocuments(changeName, cwd) {
  return new SyncManager(cwd).syncDocuments(changeName);
}

export async function checkApproval(changeName, cwd) {
  return new SyncManager(cwd).checkApproval(changeName);
}

export async function approve(changeName, cwd) {
  // TODO: SillyHub 平台侧实现后启用
  console.warn(`[sync] approve 尚未实现 (${changeName})`);
}

export async function reject(changeName, reason, cwd) {
  // TODO: SillyHub 平台侧实现后启用
  console.warn(`[sync] reject 尚未实现 (${changeName})`);
}

export async function status(cwd) {
  const sm = new SyncManager(cwd);
  const st = sm.status();
  if (!st.connected) {
    console.log('平台: 未连接');
  } else {
    console.log(`平台: ${st.url}`);
    console.log(`上次连接: ${st.lastSync || '未知'}`);
  }
}

/**
 * syncModule — sillyspec platform 子命令入口
 */
export async function syncModule(args, cwd) {
  const sm = new SyncManager(cwd);

  const sub = args[0];

  switch (sub) {
    case 'connect': {
      const url = args[1];
      const token = args[2];
      if (!url || !token) {
        console.error('用法: sillyspec platform connect <url> <token>');
        process.exit(1);
      }
      await sm.connect(url, token);
      break;
    }

    case 'disconnect':
      sm.disconnect();
      break;

    case 'sync': {
      const changeName = args[1];
      const result = await sm.sync(changeName);
      if (result.errors.length > 0) {
        console.log(`同步完成，${result.errors.length} 个错误`);
      }
      break;
    }

    case 'sync-docs':
    case 'sync-documents': {
      const changeName = args[1];
      const result = await sm.syncDocuments(changeName);
      if (result.errors.length > 0) {
        console.log(`文档同步完成，${result.errors.length} 个错误`);
      }
      break;
    }

    case 'approval':
    case 'check-approval': {
      const changeName = args[1];
      if (!changeName) {
        console.error('用法: sillyspec platform approval <changeName>');
        process.exit(1);
      }
      const approval = await sm.checkApproval(changeName);
      console.log(`审批状态: ${approval.status}${approval.reason ? ` (${approval.reason})` : ''}`);
      break;
    }

    case 'status': {
      const st = sm.status();
      if (!st.connected) {
        console.log('平台: 未连接');
      } else {
        console.log(`平台: ${st.url}`);
        console.log(`上次连接: ${st.lastSync || '未知'}`);
      }
      break;
    }

    default:
      console.error(`未知子命令: ${sub || '(无)'}`);
      console.error('可用命令: connect, disconnect, sync, sync-docs, approval, status');
      process.exit(1);
  }
}
