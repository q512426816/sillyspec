/**
 * SillySpec SyncManager — SillyHub 平台同步模块
 *
 * 独立于 ProgressManager，由 run.js 和 index.js 调用。
 * Best effort：所有网络失败 console.warn，不抛错，不阻塞主流程。
 *
 * 配置来源：.sillyspec/local.yaml 中的 platform 段
 * HTTP 请求：Node.js 原生 fetch（Node 22+）
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { resolvePlatformSpecDir } from './progress.js';
import { safeGit } from './git-helper.js';

// sync 是 best-effort（网络失败只 warn）：平台指针失效时不抛，跳过平台、回退本地。
function safePlatformSpecDir(cwd) {
  try {
    return resolvePlatformSpecDir(cwd);
  } catch (e) {
    console.warn(`[sync] 平台指针不可用，跳过平台同步：${String(e.message).split('\n')[0]}`);
    return undefined;
  }
}

const LOCAL_YAML = '.sillyspec/local.yaml';
const CHANGES_DIR = '.sillyspec/changes';
const REQUEST_TIMEOUT_MS = 10_000;

// 未连接平台是本地独立用户的合法默认状态。sync / syncDocuments / checkApproval 由 run 流程
// 在后台 best-effort 触发（每步完成、execute 阶段启动），未连接时默认静默跳过——不每步催连
// 平台制造噪音（本地用户根本不需要平台）。需要排查同步行为时设 SILLYSPEC_DEBUG_SYNC=1。
function debugLog(msg) {
  if (process.env.SILLYSPEC_DEBUG_SYNC) console.warn(msg)
}

/** 四件套文档文件名 */
const DOCUMENT_FILES = ['proposal.md', 'design.md', 'requirements.md', 'tasks.md'];

// ── YAML 辅助 ──

/**
 * 简易 YAML 读取（解析为扁平 obj），供 _getPlatform / status 只读用。
 * 与 worktree-guard.js 的 parseSimpleYaml 保持一致的轻量风格。
 *
 * 写入侧（connect/disconnect）**不再**走 parse→modify→write 有损往返——
 * readLocalYaml/parseSimpleYaml 丢注释（:85 跳 # 行）、丢数组/深嵌套（只认一层 key:value），
 * round-trip 会清空用户手填的注释与其他段。改为 readLocalYamlRaw + replaceTopLevelSection
 * 文本级定向替换 platform 段，原文件注释/空行/其他段/数组/深嵌套/CRLF 字节级保留。
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

/** 读 local.yaml 原始文本（保留注释/换行/结构），不存在返回 ''。供 connect/disconnect 文本级改写。 */
function readLocalYamlRaw(cwd) {
  const p = join(cwd, LOCAL_YAML);
  if (!existsSync(p)) return '';
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

/**
 * 定位顶层 YAML 段（如 platform:/mcp:）的行范围 [start, end)。
 * 段 = key 行（行首非空白 + 以 'name:' 开头）+ 后续连续缩进行（以空格/tab 开头）。
 * 遇空行/注释/下一个顶层 key 即段结束——这些行不属于本段，保留不动。
 * split('\n')/join('\n') 操作：CRLF 下 '\r' 留在行尾，重组原样还原（Windows 兼容，CLAUDE.md #13）。
 * @param {string} text
 * @param {string} name - 段名（不含冒号，如 'platform'）
 * @returns {{start: number, end: number} | null} 不存在返回 null
 */
function findTopLevelSectionRange(text, name) {
  const lines = text.split('\n');
  const prefix = `${name}:`;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 顶层 key 行：行首非空白（排除缩进子段）+ 以 'name:' 开头
    if (/^\S/.test(line) && line.startsWith(prefix)) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && /^[ \t]/.test(lines[end])) {
    end++;
  }
  return { start, end };
}

/**
 * 文本级定向替换/删除/追加一个顶层 YAML 段，保留文件其余所有字节
 * （注释/空行/其他段/数组/深嵌套/CRLF 全保留）。
 * @param {string} text - 原始文件文本
 * @param {string} name - 段名（不含冒号）
 * @param {string|null} body - 段体（不含 key 行）；null=删除该段；string=替换或追加
 * @returns {string} 新文本
 */
function replaceTopLevelSection(text, name, body) {
  const lines = text.split('\n');
  const range = findTopLevelSectionRange(text, name);
  if (range) {
    const before = lines.slice(0, range.start);
    const after = lines.slice(range.end);
    if (body === null) {
      return [...before, ...after].join('\n');
    }
    const sectionLines = [`${name}:`, ...body.split('\n')];
    return [...before, ...sectionLines, ...after].join('\n');
  }
  // 段不存在
  if (body === null) return text; // 删不存在的段，原样返回
  // 追加：去尾换行后加空行分隔 + 新段；空文件直接起段
  const stripped = text.replace(/(\r?\n)+$/, '');
  if (stripped === '') {
    return `${name}:\n${body}\n`;
  }
  return `${stripped}\n\n${name}:\n${body}\n`;
}

/** 文本级写 local.yaml（保留传入 text 的注释/结构）；确保 .sillyspec 目录存在。 */
function writeLocalYamlRaw(cwd, text) {
  const dir = join(cwd, '.sillyspec');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(cwd, LOCAL_YAML), text, 'utf8');
}

function parseSimpleYaml(content) {
  const result = {};
  let currentSection = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // 用原始 line（非 trimmed）判断缩进：trimmed 已去前导空格，startsWith(' ') 恒 false
    // 会导致缩进子段（如 platform 下 url/token）被误判为 root 行、section 恒为空 {}
    if (!line.startsWith(' ')) {
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

/**
 * 解析推送者身份（user）：区分多用户，供 push 时 X-SillySpec-User 标识（design D-004）。
 * 优先级：显式参数 > git user.name（与 quicklog / prompt <git-user> 同口径）> process.env.USER
 * （Unix）/ USERNAME（Windows）。Best effort：全失败返回 null，调用方据此决定是否写 user 字段
 * （缺字段等价于「未知推送者」，平台侧自行兜底，不报错）。
 */
function resolvePlatformUser(cwd, explicitUser) {
  if (typeof explicitUser === 'string' && explicitUser.trim()) {
    return explicitUser.trim();
  }
  // 回退 1：git user.name（safeGit 失败返回 null，不抛）
  const gitUser = safeGit(cwd, ['config', 'user.name']).value;
  if (gitUser) return gitUser;
  // 回退 2：环境变量（USER=Unix / USERNAME=Windows；跨平台兼容 CLAUDE.md #13）
  return process.env.USER || process.env.USERNAME || null;
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

/**
 * 带状态码的 fetch：不吞非 2xx（fetchJson 在 !res.ok 时返回 null 丢状态，无法区分 409 冲突）。
 * 返回 { ok, status, body }：body 尽力 JSON.parse（平台冲突响应带 progress JSON，读回给调用方）。
 * 仅 sync() 的 progress POST 使用（识别 base_ts 乐观锁冲突，D-015 / task-09）；其余调用仍走 fetchJson。
 */
async function fetchJsonWithStatus(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text().catch(() => '');
    let body = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = null; }
    }
    if (!res.ok) {
      console.warn(`[sync] ${options.method || 'GET'} ${url} → ${res.status} ${text.slice(0, 200)}`);
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[sync] ${url} 请求超时 (${REQUEST_TIMEOUT_MS}ms)`);
    } else {
      console.warn(`[sync] ${url} 请求失败: ${err.message}`);
    }
    return { ok: false, status: 0, body: null };
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
   * @param {string} url - 平台地址
   * @param {string} token - 认证 token
   * @param {string} [user] - 推送者身份（可空，回退 git user.name / env，见 resolvePlatformUser）
   */
  async connect(url, token, user) {
    // 验证连接
    const normalizedUrl = url.replace(/\/+$/, '');
    const healthUrl = `${normalizedUrl}/api/health`;
    const result = await fetchJson(healthUrl);
    if (result === null) {
      console.warn(`[sync] 平台连接验证失败: ${url}`);
      return;
    }
    console.log(`[sync] 平台连接成功: ${url}`);

    // 换发 workspace-scoped 同步 token（task-09 / D-005@v1）：用传入 user 级 token
    // （shk_live_ / JWT）作 Bearer + 本地 root_path（connect 的 cwd，与平台
    // Workspace.root_path 绑定值等值匹配）调 resolve-by-root-path。成功取 shpsync_
    // 覆盖 token 写入 platform 段；404（root_path 未绑）/403（无 WORKSPACE_WRITE）/断网
    // 均降级沿用原 token 继续（best-effort 不阻断 connect）。
    let effectiveToken = token;
    const resolveUrl = `${normalizedUrl}/api/workspaces/resolve-by-root-path`;
    const resolved = await fetchJson(resolveUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ root_path: this.cwd }),
    });
    if (resolved && resolved.token && resolved.token.startsWith('shpsync_')) {
      effectiveToken = resolved.token;
      console.log(
        `[sync] 已换发 workspace-scoped 同步 token (workspace: ${resolved.workspace_id})`
      );
    } else {
      console.warn(
        '[sync] 换发 workspace-scoped token 失败（404/403/断网），沿用原 token 继续'
      );
    }

    // 解析推送者身份（D-004）：显式 > git user.name > env；全失败留空不写 user 字段
    const resolvedUser = resolvePlatformUser(this.cwd, user);

    // 文本级改写 local.yaml：定向替换 platform 段，原文件注释/其他段/数组/深嵌套/CRLF 字节级保留
    // （旧 read-modify-write 经 parseSimpleYaml 丢注释+丢非扁平结构，round-trip 清空用户手填内容）。
    const platformEntries = [
      `  url: ${normalizedUrl}`,
      `  token: ${effectiveToken}`,
      `  last_connected: ${new Date().toISOString()}`,
    ];
    if (resolvedUser) {
      platformEntries.push(`  user: ${resolvedUser}`);
    }
    let text = readLocalYamlRaw(this.cwd);
    text = replaceTopLevelSection(text, 'platform', platformEntries.join('\n'));
    // mcp 段同源假设（design §7.4）：复用 platform 的 url/token；用户已手填 mcp 段则保留不覆盖（R-09，文本级检测）
    if (findTopLevelSectionRange(text, 'mcp') === null) {
      text = replaceTopLevelSection(text, 'mcp', `  url: ${normalizedUrl}\n  token: ${token}`);
    }
    writeLocalYamlRaw(this.cwd, text);
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
    const text = readFileSync(p, 'utf8');
    if (findTopLevelSectionRange(text, 'platform') === null) {
      console.log('[sync] 已断开连接（未连接）');
      return;
    }
    // 文本级删除 platform 段，保留注释/其他段/数组/深嵌套/CRLF
    const newText = replaceTopLevelSection(text, 'platform', null);
    if (newText.trim() === '') {
      // 删段后纯空白（无任何段也无注释）→ 删除整个文件；注释算内容，有注释则保留
      try { unlinkSync(p); } catch { /* best effort */ }
    } else {
      writeFileSync(p, newText, 'utf8');
    }
    console.log('[sync] 已断开连接');
  }

  /**
   * 增量同步变更的 progress 状态到平台。
   * 读取 ProgressManager.serializeForSync() 的六表 JSON，POST 到平台。
   * 元字段（user/base_ts/pushed_at）走 HTTP header，body 保持裸 JSON（D-015，sillyhub 老版零回归）。
   * 同步完成后更新 changes 表的 platform_last_sync 字段；409 冲突读回平台最新 JSON（task-12 完整冲突处理）。
   */
  async sync(changeName) {
    const platform = this._getPlatform();
    if (!platform) {
      debugLog('[sync] 未连接平台（本地合法状态）；如需平台同步：sillyspec platform connect');
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

    // 读取 progress 数据（serializeForSync 六表裸 JSON，task-02 / D-005@v2，替代 read() 聚合视图）
    let progressData;
    try {
      const { ProgressManager } = await import('./progress.js');
      const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
      progressData = pm.serializeForSync(this.cwd, changeName);
    } catch (err) {
      console.warn(`[sync] 读取 progress 失败 (${changeName}): ${err.message}`);
      return { synced: 0, errors: [`读取 progress 失败: ${err.message}`] };
    }
    if (progressData === null) {
      console.warn(`[sync] 变更无进度数据 (无活跃进度): ${changeName}`);
      return { synced: 0, errors: [`变更无进度数据: ${changeName}`] };
    }

    // 元字段走 HTTP header（D-015 / task-09）：body 保持裸六表 JSON，sillyhub 老版忽略 header 零回归
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${platform.token}`,
    };
    const pushedAt = new Date().toISOString();
    if (platform.user) headers['X-SillySpec-User'] = platform.user; // 推送者身份（task-08 local.yaml platform.user）
    const baseTs = progressData.changes && progressData.changes[0] && progressData.changes[0].last_synced_platform_ts;
    if (baseTs) headers['X-SillySpec-Base-Ts'] = baseTs; // base_ts 乐观锁（NULL=首次同步不设，平台接受首次 push）
    headers['X-SillySpec-Pushed-At'] = pushedAt; // 平台存 last_pushed_at，作下次其他用户 push 的 base_ts 比对基准

    // POST 到平台（带状态码版本：识别 409 冲突，读回平台最新 JSON）
    const syncUrl = `${platform.url}/api/changes/${changeName}/progress`;
    const res = await fetchJsonWithStatus(syncUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(progressData),
    });

    if (!res.ok) {
      // 409 = base_ts 乐观锁冲突（平台已有更新）；读回平台最新 JSON 供 task-12 完整冲突处理
      if (res.status === 409) {
        console.warn(`[sync] 冲突: ${changeName} 平台已有更新（base_ts 过期），请 platform status / resolve 处理`);
        // 平台 409 响应 { conflict:true, platform_progress, last_pushed_at }，platform_progress 即平台最新 progress JSON
        const platformProgress = res.body && res.body.platform_progress ? res.body.platform_progress : res.body;
        const platformLastPushedAt = (res.body && res.body.last_pushed_at) || null;
        // 本地脏度（progressData 是 serializeForSync 输出，changes[0] 含 last_local_modified_ts）
        const localModified = (progressData.changes && progressData.changes[0] && progressData.changes[0].last_local_modified_ts) || null;
        // 写冲突文件（task-12 / D-002）：base_ts=本次 push 的 base，强制提示走 resolve
        const conflictPath = this._writeConflictFile(changeName, {
          base_ts: baseTs || null,
          local_modified_ts: localModified,
          platform_last_pushed_at: platformLastPushedAt,
          platform_progress: platformProgress,
        });
        return { synced: 0, errors: [`冲突: ${changeName}`], conflict: true, platform_progress: platformProgress, conflictPath };
      }
      return { synced: 0, errors: [`同步请求失败: ${changeName}`] };
    }

    // 更新 platform_last_sync
    try {
      const { ProgressManager } = await import('./progress.js');
      const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
      pm._updatePlatformLastSync(this.cwd, changeName);
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
      debugLog('[sync] 未连接平台（本地合法状态）；如需平台同步：sillyspec platform connect');
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
      debugLog('[sync] 未连接平台（本地合法状态）；如需平台同步：sillyspec platform connect');
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
      const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
      pm._updateApprovalStatus(this.cwd, changeName, result.status, result.reason);
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

  /**
   * 写冲突文件 .runtime/sync-conflict-<change>.json（task-12 / D-002 / D-008 / D-010 / FR-05）。
   * push 409 与 pull 本地脏度双向冲突命中时调用，强制提示用户走 platform resolve 三选一。
   * 绝不字段级 auto-merge；文件在 .runtime 下不入版本控制（gitignore）。
   * @param {string} changeName
   * @param {{base_ts?: string|null, local_modified_ts?: string|null, platform_last_pushed_at?: string|null, platform_progress?: object|null}} info
   * @returns {string|null} 冲突文件路径（specDir 不可达返回 null）
   */
  _writeConflictFile(changeName, info = {}) {
    const specDir = safePlatformSpecDir(this.cwd);
    if (!specDir) return null;
    const runtimeDir = join(specDir, '.runtime');
    if (!existsSync(runtimeDir)) mkdirSync(runtimeDir, { recursive: true });
    const conflictPath = join(runtimeDir, `sync-conflict-${changeName}.json`);
    const payload = {
      change: changeName,
      base_ts: info.base_ts ?? null,
      local_modified_ts: info.local_modified_ts ?? null,
      platform_last_pushed_at: info.platform_last_pushed_at ?? null,
      created_at: new Date().toISOString(),
      // 额外存平台最新 progress JSON，供 resolve --take-platform 直接 import（无需再 pull）
      platform_progress: info.platform_progress ?? null,
    };
    writeFileSync(conflictPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    return conflictPath;
  }

  /**
   * 读取冲突文件（task-13 resolve / task-14 status 用）。
   * @returns {object|null} 冲突文件内容；无文件返回 null
   */
  readConflictFile(changeName) {
    const specDir = safePlatformSpecDir(this.cwd);
    if (!specDir) return null;
    const conflictPath = join(specDir, '.runtime', `sync-conflict-${changeName}.json`);
    if (!existsSync(conflictPath)) return null;
    try {
      return JSON.parse(readFileSync(conflictPath, 'utf8'));
    } catch {
      return null;
    }
  }

  /**
   * 删除冲突文件（resolve 完成后清理，task-13 用）。
   * @returns {boolean} 是否删除（文件不存在返回 false）
   */
  clearConflictFile(changeName) {
    const specDir = safePlatformSpecDir(this.cwd);
    if (!specDir) return false;
    const conflictPath = join(specDir, '.runtime', `sync-conflict-${changeName}.json`);
    if (!existsSync(conflictPath)) return false;
    try { unlinkSync(conflictPath); return true; }
    catch { return false; }
  }

  /**
   * 两级 pull 第一级：轻量 change 列表（design §7 / D-001 / D-006 / task-06 / FR-01 / FR-03）。
   * GET {url}/api/changes → [{ name, current_stage, last_pushed_at, last_pusher }]（兼容 { changes: [...] } 包裹）。
   * CLI 比对本地决定哪些 change 需更新，控制 pull 性能（不每次全量拉单 change JSON）。
   * Best Effort：未连接 / 网络失败 console.warn 不抛，返回 PullListResult { ok, changes, reason? }。
   * @returns {Promise<{ok: boolean, changes: Array<object>, reason?: string}>}
   */
  async pullList() {
    const platform = this._getPlatform();
    if (!platform) {
      debugLog('[sync] 未连接平台（本地合法状态）；pullList 跳过');
      return { ok: false, changes: [], reason: '未连接平台' };
    }

    const listUrl = `${platform.url}/api/changes`;
    const result = await fetchJson(listUrl, {
      headers: { Authorization: `Bearer ${platform.token}` },
    });

    if (result === null) {
      console.warn(`[sync] 拉取变更列表失败: ${listUrl}`);
      return { ok: false, changes: [], reason: '拉取变更列表失败' };
    }

    // 兼容两种响应形态：裸数组 / { changes: [...] } 包裹（sillyhub 后端实际 API 而定）
    const changes = Array.isArray(result) ? result : (Array.isArray(result.changes) ? result.changes : []);
    return { ok: true, changes, reason: undefined };
  }

  /**
   * 两级 pull 第二级：按需拉平台单 change 完整 JSON 并 import 重建本地 DB 行（design §7 / D-001 / D-006 / D-014 / task-07 / FR-01 / FR-03 / FR-09）。
   * GET {url}/api/changes/{name}/progress → 平台权威 JSON（serializeForSync 六表 + 顶层 last_pushed_at）。
   * 本地脏度比对：last_local_modified_ts > last_synced_platform_ts（本地有未同步改动）且 平台 last_pushed_at 更新 → 冲突，不 import 返回 conflict:true（task-12 负责写 sync-conflict 文件）。
   * 无冲突 → import() 重建 DB 行；import 后本地 base_ts/脏度重置为 pushed_at（D-013）。
   * Best Effort：未连接 / 网络失败 / 404 console.warn 不抛，返回 PullResult { ok, imported, conflict, reason? }。
   * @param {string} changeName
   * @param {{force?: boolean}} [opts] - force 跳过本地脏度冲突检测直接 import（task-12 resolve --take-platform 用）
   * @returns {Promise<{ok: boolean, imported: boolean, conflict: boolean, reason?: string}>}
   */
  async pull(changeName, opts = {}) {
    const { force = false } = opts;
    const platform = this._getPlatform();
    if (!platform) {
      debugLog('[sync] 未连接平台（本地合法状态）；pull 跳过');
      return { ok: false, imported: false, conflict: false, reason: '未连接平台' };
    }
    if (!changeName) {
      console.warn('[sync] pull 需要指定变更名称 (changeName)');
      return { ok: false, imported: false, conflict: false, reason: '未指定变更名称' };
    }

    // 1. GET 平台完整 progress JSON
    const progressUrl = `${platform.url}/api/changes/${encodeURIComponent(changeName)}/progress`;
    const result = await fetchJson(progressUrl, {
      headers: { Authorization: `Bearer ${platform.token}` },
    });
    if (result === null) {
      // sillyhub 未就绪 / 404 / 网络失败均 fetchJson 返回 null → Best Effort 降级
      console.warn(`[sync] 拉取变更进度失败: ${changeName}（sillyhub 未就绪或变更不存在）`);
      return { ok: false, imported: false, conflict: false, reason: '拉取变更进度失败' };
    }

    // 平台响应：serializeForSync 六表 + 顶层 last_pushed_at（兼容 { progress: {...} } 包裹）
    const platformProgress = (result && result.project && result.changes) ? result : (result.progress || result);
    const platformPushedAt = (result && result.last_pushed_at) || null;

    // 2. 本地脏度比对（非 force 时）：本地脏 AND 平台更新 → 冲突
    if (!force) {
      let localLastModified = null;
      let localLastSynced = null;
      try {
        const { ProgressManager } = await import('./progress.js');
        const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
        const row = pm._ensureDB(this.cwd).getDb().prepare(
          'SELECT last_local_modified_ts, last_synced_platform_ts FROM changes WHERE name = ?'
        ).get(changeName);
        if (row) {
          localLastModified = row.last_local_modified_ts;
          localLastSynced = row.last_synced_platform_ts;
        }
      } catch (err) {
        console.warn(`[sync] 读取本地脏度失败 (${changeName}): ${err.message}`);
      }
      const localDirty = localLastModified && localLastSynced && localLastModified > localLastSynced;
      const platformNewer = platformPushedAt && (!localLastSynced || platformPushedAt > localLastSynced);
      if (localDirty && platformNewer) {
        console.warn(`[sync] pull 冲突: ${changeName} 本地有未同步改动且平台已更新（base_ts 过期），请 platform resolve 处理`);
        // 写冲突文件（task-12 / D-002）：强制提示，绝不 auto-merge
        const conflictPath = this._writeConflictFile(changeName, {
          base_ts: localLastSynced,
          local_modified_ts: localLastModified,
          platform_last_pushed_at: platformPushedAt,
          platform_progress: platformProgress,
        });
        return { ok: false, imported: false, conflict: true, reason: `冲突: ${changeName} 本地脏且平台更新`, conflictPath };
      }
    }

    // 3. 无冲突（或 force）→ import 平台 JSON 重建本地 DB 行
    try {
      const { ProgressManager } = await import('./progress.js');
      const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
      const importInput = { ...platformProgress, pushed_at: platformPushedAt || new Date().toISOString() };
      pm.import(this.cwd, importInput, changeName);
      console.log(`[sync] 已拉取变更进度: ${changeName}`);
      return { ok: true, imported: true, conflict: false, reason: undefined };
    } catch (err) {
      console.warn(`[sync] import 失败 (${changeName}): ${err.message}`);
      return { ok: false, imported: false, conflict: false, reason: `import 失败: ${err.message}` };
    }
  }

  /**
   * 冲突解决三选一（task-13 / D-002 / D-010 / D-013 / FR-05）。
   * 读 task-12 写的 sync-conflict-<change>.json，按 mode 处理后必清冲突文件防累积（R-04 / constraints）。
   *
   * 三种语义（design 生命周期契约表）：
   * - keep-local：本地 DB 不变，仅把 last_synced_platform_ts（base_ts）推进到平台 last_pushed_at
   *   （表示「已知平台最新，本地为准」），用户后续手动 platform sync push 本地。
   * - take-platform：用冲突文件存的 platform_progress 调 import() 覆盖本地（保隔离状态，D-013 重置脏度）。
   * - abort：本地 DB 与 base_ts 均不变，仅清冲突文件（放弃本次同步）。
   *
   * 无冲突文件 → ok:false resolved:false（index.js 据此提示「无可解决冲突」）。
   * 绝不字段级 auto-merge（D-002）。
   * @param {string} changeName
   * @param {'keep-local'|'take-platform'|'abort'} mode
   * @returns {Promise<{ok: boolean, resolved: boolean, mode?: string, reason: string}>}
   */
  async resolve(changeName, mode) {
    const cf = this.readConflictFile(changeName);
    if (!cf) {
      return { ok: false, resolved: false, reason: `无可解决冲突: ${changeName}（无 sync-conflict 文件）` };
    }
    const platformPushedAt = cf.platform_last_pushed_at || null;

    if (mode === 'keep-local') {
      // base_ts 推进到平台最新 last_pushed_at；本地 DB 不 import（用户本地为准，后续手动 push）
      try {
        const { ProgressManager } = await import('./progress.js');
        const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
        const db = pm._ensureDB(this.cwd).getDb();
        db.prepare('UPDATE changes SET last_synced_platform_ts = ? WHERE name = ?')
          .run(platformPushedAt, changeName);
      } catch (err) {
        return { ok: false, resolved: false, reason: `keep-local 更新 base_ts 失败: ${err.message}` };
      }
      this.clearConflictFile(changeName);
      return { ok: true, resolved: true, mode: 'keep-local', reason: '保留本地，base_ts 已推进到平台最新（后续请 platform sync push 本地）' };
    }

    if (mode === 'take-platform') {
      // 用冲突文件的 platform_progress 调 import 覆盖本地（保隔离：import 不覆盖 isolation_*）
      if (!cf.platform_progress) {
        return { ok: false, resolved: false, reason: '冲突文件缺 platform_progress，无法 take-platform（建议先 platform pull）' };
      }
      try {
        const { ProgressManager } = await import('./progress.js');
        const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
        pm.import(this.cwd, { ...cf.platform_progress, pushed_at: platformPushedAt || new Date().toISOString() }, changeName);
      } catch (err) {
        return { ok: false, resolved: false, reason: `take-platform import 失败: ${err.message}` };
      }
      this.clearConflictFile(changeName);
      return { ok: true, resolved: true, mode: 'take-platform', reason: '已用平台进度覆盖本地' };
    }

    if (mode === 'abort') {
      // 本地 DB 与 base_ts 均不变，仅清冲突文件（放弃本次同步，下次 push/pull 会重新检测）
      this.clearConflictFile(changeName);
      return { ok: true, resolved: true, mode: 'abort', reason: '放弃本次同步，本地不变' };
    }

    return { ok: false, resolved: false, reason: `未知 resolve 模式: ${mode}（--keep-local / --take-platform / --abort）` };
  }

  /**
   * 扫描 .runtime/sync-conflict-*.json 列出未决冲突（task-14 / D-002 / D-010 / FR-05）。
   * 只读 + 容错：损坏文件跳过不崩（constraints）。供 collectStatus / platform status 展示。
   * @returns {Array<{change: string, created_at: string|null, path: string}>}
   */
  listConflictFiles() {
    const specDir = safePlatformSpecDir(this.cwd);
    if (!specDir) return [];
    const runtimeDir = join(specDir, '.runtime');
    if (!existsSync(runtimeDir)) return [];
    let files = [];
    try { files = readdirSync(runtimeDir); }
    catch { return []; }
    const conflicts = [];
    for (const f of files) {
      if (!f.startsWith('sync-conflict-') || !f.endsWith('.json')) continue;
      const filePath = join(runtimeDir, f);
      try {
        const cf = JSON.parse(readFileSync(filePath, 'utf8'));
        conflicts.push({
          change: cf.change || f.replace(/^sync-conflict-/, '').replace(/\.json$/, ''),
          created_at: cf.created_at || null,
          path: filePath,
        });
      } catch {
        // 损坏文件跳过不崩（constraints：容错）
      }
    }
    return conflicts;
  }

  /**
   * 扩展 status（task-14 / FR-05）：连接信息 + 落后标记 + 未决冲突列表。
   * 只读展示，不修改任何进度（constraints）。未连接返回 base.status（connected:false，behind/conflicts 空）。
   * 连接时调 pullList（轻量 GET）拿平台各 change last_pushed_at，比对本地 last_synced_platform_ts
   * 标记本地可能落后；扫描 sync-conflict-*.json 列未决冲突。网络失败 listFailed=true 不崩。
   * @returns {Promise<{connected: boolean, url?: string, lastSync?: string|null, behind: Array<object>, conflicts: Array<object>, listFailed: boolean}>}
   */
  async collectStatus() {
    const base = this.status();
    if (!base.connected) {
      return { ...base, behind: [], conflicts: [], listFailed: false };
    }
    const behind = [];
    let listFailed = false;
    const list = await this.pullList();
    if (list.ok) {
      for (const ch of list.changes) {
        const name = typeof ch === 'string' ? ch : ch.name;
        if (!name) continue;
        const platformPushedAt = (typeof ch === 'object' && (ch.last_pushed_at || ch.last_active)) || null;
        if (!platformPushedAt) continue;
        let localSynced = null;
        try {
          const { ProgressManager } = await import('./progress.js');
          const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
          const row = pm._ensureDB(this.cwd).getDb().prepare('SELECT last_synced_platform_ts FROM changes WHERE name = ?').get(name);
          if (row) localSynced = row.last_synced_platform_ts;
        } catch {
          // 本地无该 change 记录 / DB 不可达 → 不算落后，跳过
        }
        // 仅本地有同步基准（last_synced_platform_ts）且平台更新晚于本地 → 落后
        if (localSynced && platformPushedAt > localSynced) {
          behind.push({ name, local_synced: localSynced, platform_pushed_at: platformPushedAt });
        }
      }
    } else {
      listFailed = true;
    }
    const conflicts = this.listConflictFiles();
    return { ...base, behind, conflicts, listFailed };
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

// task-11 / D-006 / D-009 / FR-03：手动 pull 便捷导出（index.js platform pull 子命令用，
// 与自动 triggerPull 共用 SyncManager.pull 实例方法，行为一致）
export async function pull(changeName, opts, cwd) {
  return new SyncManager(cwd).pull(changeName, opts);
}

// 两级 pull 第一级（轻量 change 列表），platform pull 无 --change 时先拉列表再按需 pull
export async function pullList(cwd) {
  return new SyncManager(cwd).pullList();
}

// task-13 / D-002 / D-010 / D-013 / FR-05：冲突解决三选一（index.js platform resolve 子命令用）
export async function resolve(changeName, mode, cwd) {
  return new SyncManager(cwd).resolve(changeName, mode);
}

// task-14 / FR-05：扩展 status（连接信息 + 落后标记 + 未决冲突列表），index.js platform status 用
export async function collectStatus(cwd) {
  return new SyncManager(cwd).collectStatus();
}

// TBD-hub-api: approve/reject 端点路径与请求体以 SillyHub 仓库实际 API 为准；
// 对齐时只改本函数（_submitApproval），无需动 approve/reject 入口。
/**
 * 向平台提交审批决定（approve/reject 共用）。
 *
 * 显式用户/daemon 动作：网络/平台失败必须可见（decisions.md D-006@v1）——
 * 与 best-effort 的 sync 不同，此处失败打 error 并置 process.exitCode = 1。
 *
 * @param {string} cwd - 工作目录
 * @param {string} changeName - 变更名称
 * @param {'approved'|'rejected'} decision - 审批决定
 * @param {string|null} reason - rejected 时的原因（approved 时忽略）
 * @returns {Promise<boolean>} 是否成功
 */
async function _submitApproval(cwd, changeName, decision, reason = null) {
  const sm = new SyncManager(cwd);
  const platform = sm._getPlatform();
  if (!platform) {
    console.error('❌ 未连接平台，请先 sillyspec platform connect');
    process.exitCode = 1;
    return false;
  }

  if (!changeName) {
    console.error('❌ 审批需要指定变更名称 (changeName)');
    process.exitCode = 1;
    return false;
  }

  // TBD-hub-api: 端点路径/body 以 SillyHub 实际 API 为准，对齐时只改此处
  const approvalUrl = `${platform.url}/api/changes/${encodeURIComponent(changeName)}/approval`;
  const body = decision === 'rejected'
    ? { decision: 'rejected', reason }
    : { decision: 'approved' };

  const result = await fetchJson(approvalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${platform.token}`,
    },
    body: JSON.stringify(body),
  });

  // fetchJson 在非 2xx / 网络错 / 超时 / 非 JSON 时返回 null
  if (result === null) {
    console.error(`❌ 审批请求失败 (${changeName} → ${decision})，详情见上方 [sync] 警告`);
    process.exitCode = 1;
    return false;
  }

  // HTTP 成功后更新本地 approvals 表（HTTP 已成功是主要目标，落库失败只 warn 不阻断）
  try {
    const { ProgressManager } = await import('./progress.js');
    const pm = new ProgressManager({ specDir: safePlatformSpecDir(cwd) });
    pm._updateApprovalStatus(cwd, changeName, decision, reason);
  } catch (err) {
    console.warn(`[sync] 更新本地审批状态失败 (${changeName}): ${err.message}`);
  }

  if (decision === 'approved') {
    console.log(`✅ 已批准变更 ${changeName}`);
  } else {
    console.log(`✅ 已拒绝变更 ${changeName}${reason ? `（原因: ${reason}）` : ''}`);
  }
  return true;
}

export async function approve(changeName, cwd) {
  return _submitApproval(cwd, changeName, 'approved');
}

export async function reject(changeName, reason, cwd) {
  return _submitApproval(cwd, changeName, 'rejected', reason);
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
