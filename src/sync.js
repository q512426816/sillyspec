/**
 * SillySpec SyncManager — SillyHub 平台同步模块
 *
 * 独立于 ProgressManager，由 run.js 和 index.js 调用。
 * Best effort：所有网络失败 console.warn，不抛错，不阻塞主流程。
 *
 * 配置来源：.sillyspec/local.yaml 中的 platform 段
 * HTTP 请求：Node.js 原生 fetch（Node 22+）
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync, chmodSync } from 'fs';
import { join } from 'path';
import { resolvePlatformSpecDir } from './progress.js';
import { safeGit } from './git-helper.js';
import { PLATFORM_MANAGED_FILENAME } from './run/shared.js';
import { syncSpecTree } from './spec-sync.js';

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

// 未连接平台是本地独立用户的合法默认状态。sync / checkApproval 由 run 流程在后台 best-effort
// 触发（每步完成、execute 阶段启动）；syncDocuments 仅由手动 `sillyspec platform sync-docs`
// 命令触发（index.js sync-docs 分支），run 流程不自动推文档。未连接时默认静默跳过——不每步
// 催连平台制造噪音（本地用户根本不需要平台）。需要排查同步行为时设 SILLYSPEC_DEBUG_SYNC=1。
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
  const yamlPath = join(cwd, LOCAL_YAML);
  writeFileSync(yamlPath, text, 'utf8');
  // 体检 SEC-04：local.yaml 含明文 token，收紧为仅属主可读写。POSIX chmod 0600 生效；
  // Windows 上 Node chmod 只映射只读位（近似 no-op），属可接受 best-effort
  try { chmodSync(yamlPath, 0o600); } catch { /* chmod 失败不阻断连接流程 */ }
}

function parseSimpleYaml(content) {
  // 剥 YAML 双/单引号包裹（connect 写侧 yamlStr 加引号防 # : 注入，读侧对称剥；无引号值零影响）
  const unquote = (v) => {
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
      return v.slice(1, -1);
    }
    return v;
  };
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
        const val = unquote(m[2].trim());
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
        result[currentSection][m[1]] = unquote(m[2].trim());
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
    if (!token) {
      // 体检 HUB-02：falsy token 不允许 connect——health ping 无鉴权会"连接成功"，
      // 但 local.yaml 会落盘字符串 "undefined"，后续所有同步持续 401
      console.error('[sync] 缺少 token，拒绝连接（请在平台获取 token 后带 --token 重试）');
      return false;
    }
    // 验证连接
    const normalizedUrl = url.replace(/\/+$/, '');
    // 体检 SEC-04：非 https 且非本机回环时 Bearer token 明文上线——MCP client 侧
    // （sillyhub-mcp/client.js 构造器）早有同款 warn，sync 侧此前完全静默
    if (!/^https:\/\//i.test(normalizedUrl) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(normalizedUrl)) {
      console.warn(`[sync] platform.url 非 https（${normalizedUrl.slice(0, 60)}），同步 token 将明文传输——请确认为受控内网环境`);
    }
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
    // YAML 值加引号：token/url 含 # : 或首尾空白时裸写会破坏段结构或注入额外键（shpsync_ token
    // 当前不含这些字符，防御性包裹零成本；parseSimpleYaml 读侧剥引号兼容）
    const yamlStr = (v) => JSON.stringify(String(v));
    const platformEntries = [
      `  url: ${yamlStr(normalizedUrl)}`,
      `  token: ${yamlStr(effectiveToken)}`,
      `  last_connected: ${yamlStr(new Date().toISOString())}`,
    ];
    if (resolvedUser) {
      platformEntries.push(`  user: ${yamlStr(resolvedUser)}`);
    }
    let text = readLocalYamlRaw(this.cwd);
    text = replaceTopLevelSection(text, 'platform', platformEntries.join('\n'));
    // mcp 段同源假设（design §7.4）：url 复用 platform 的 url；token 用原始 user 级 token
    // （非换发的 effectiveToken——MCP 派发需 user 级权限，platform 段才是最小权限的 shpsync_）。
    // 用户已手填 mcp 段则保留不覆盖（R-09，文本级检测）
    if (findTopLevelSectionRange(text, 'mcp') === null) {
      text = replaceTopLevelSection(text, 'mcp', `  url: ${yamlStr(normalizedUrl)}\n  token: ${yamlStr(token)}`);
    }
    writeLocalYamlRaw(this.cwd, text);
  }

  /**
   * 断开平台连接（三清，D-C@v2）。
   * 1. 从 local.yaml 删除 platform 配置段；
   * 2. 删恢复指针 <cwd>/.sillyspec-platform.json；
   * 3. 删平台接管声明 <cwd>/.sillyspec-platform-managed。
   * 不删后两者则"disconnect 后恢复本地模式"不可达（指针健在时 resolvePlatformSpecDir
   * 仍解析平台 specRoot；声明健在时指针缺失会 fail-closed）。
   */
  disconnect() {
    const p = join(this.cwd, LOCAL_YAML);
    if (existsSync(p)) {
      const text = readFileSync(p, 'utf8');
      if (findTopLevelSectionRange(text, 'platform') !== null) {
        // 文本级删除 platform 段，保留注释/其他段/数组/深嵌套/CRLF
        const newText = replaceTopLevelSection(text, 'platform', null);
        if (newText.trim() === '') {
          // 删段后纯空白（无任何段也无注释）→ 删除整个文件；注释算内容，有注释则保留
          try { unlinkSync(p); } catch { /* best effort */ }
        } else {
          writeFileSync(p, newText, 'utf8');
        }
      }
    }
    // 三清之二/三：指针 + 接管声明（disconnect 是声明的唯一退出路径——design.md §5.4）
    let cleaned = [];
    for (const f of ['.sillyspec-platform.json', PLATFORM_MANAGED_FILENAME]) {
      const fp = join(this.cwd, f);
      if (existsSync(fp)) {
        try { unlinkSync(fp); cleaned.push(f); } catch { /* best effort */ }
      }
    }
    if (cleaned.length > 0) console.log(`[sync] 已清理平台指针与接管声明: ${cleaned.join(', ')}`);
    console.log('[sync] 已断开连接');
  }

  /**
   * 增量同步变更的 progress 状态到平台。
   * 读取 ProgressManager.serializeForSync() 的六表 JSON，POST 到平台。
   * 元字段（user/base_ts/pushed_at）走 HTTP header，body 保持裸 JSON（D-015，sillyhub 老版零回归）。
   * 同步完成后更新 changes 表的 platform_last_sync 字段；409 冲突读回平台最新 JSON（task-12 完整冲突处理）。
   *
   * push 409 自竞态自愈（坑 2026-08-19-platform-sync-base-ts-silent-conflict 根治侧）：
   * 同机多进程（CLI + daemon）并发 push 时，B 进程持旧 base_ts POST 撞 A 进程刚推完的 409——
   * 但 A 的成功回填就写在本机共享 DB。409 时 fresh 重读 DB：base_ts 已 ≥ 平台 409 回执 ts
   * ⇒ 赢者是自己人 → 刷新 base_ts 重试一次即收敛，不再落冲突文件卡死人工 resolve。
   * 外来推送（他机/他用户）不可能推进本机 DB 的 base_ts → 走原冲突路径，无误放行。
   */
  async sync(changeName, opts = {}) {
    const { fromResolve = false } = opts;
    const platform = this._getPlatform();
    if (!platform) {
      debugLog('[sync] 未连接平台（本地合法状态）；如需平台同步：sillyspec platform connect');
      return { synced: 0, errors: ['未连接平台'] };
    }

    if (!changeName) {
      console.warn('[sync] sync 需要指定变更名称 (changeName)');
      return { synced: 0, errors: ['未指定变更名称'] };
    }

    // 检查变更目录是否存在（warn 不拦：归档后目录已移走但 DB 仍有最终状态需推平台，
    // serializeForSync 从 DB 读不依赖文件系统目录；目录存在时 warn 也无害，仅辅助排查）
    const changeDir = join(this.cwd, CHANGES_DIR, changeName);
    if (!existsSync(changeDir)) {
      console.warn(`[sync] 变更目录不存在（可能是已归档，继续从 DB 同步最终状态）: ${changeName}`);
    }

    const MAX_PUSH_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt++) {
      // 读取 progress 数据（serializeForSync 六表裸 JSON，task-02 / D-005@v2，替代 read() 聚合视图）。
      // 每次 attempt 重新 serialize：自愈重试时本地 DB 可能已被并发进程推进，base_ts/内容都要刷新
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
      // 推送者身份（task-08）：local.yaml platform.user 显式配置优先，缺省回退
      // resolvePlatformUser（git user.name > env USER/USERNAME，与 connect 写入侧同口径）。
      // 修 last_pusher 空：此前仅 platform.user 配置时发送，本地直跑场景 local.yaml
      // 常无 user 字段 → header 缺失 → 平台 last_pusher 恒空（2026-08-19 坑文档改进点 4）。
      const pushUser = platform.user || resolvePlatformUser(this.cwd) || null;
      if (pushUser) headers['X-SillySpec-User'] = pushUser;
      const baseTs = progressData.changes && progressData.changes[0] && progressData.changes[0].last_synced_platform_ts;
      if (baseTs) headers['X-SillySpec-Base-Ts'] = baseTs; // base_ts 乐观锁（NULL=首次同步不设，平台接受首次 push）
      headers['X-SillySpec-Pushed-At'] = pushedAt; // 平台存 last_pushed_at，作下次其他用户 push 的 base_ts 比对基准

      // POST 到平台（带状态码版本：识别 409 冲突，读回平台最新 JSON）。changeName encode 对齐 pull（:673）
      const syncUrl = `${platform.url}/api/changes/${encodeURIComponent(changeName)}/progress`;
      const res = await fetchJsonWithStatus(syncUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(progressData),
      });

      if (res.ok) {
        // 更新 platform_last_sync + 推进 base_ts（ql-20260818-008：值优先平台回执 last_pushed_at，
        // 缺省用本次 pushedAt——服务器 _apply 存的就是客户端 X-SillySpec-Pushed-At 原值，回写一致。
        // 修复前该列从不写，下次 push 永不带 X-SillySpec-Base-Ts、pull 脏度检测恒 false）
        // 回填加固：共享 SQLite 并发（daemon+CLI）下 WAL 忙窗口可能偶发失败——重试一次，
        // 仍失败打醒目 warn（base_ts 停留在旧值，下次 push 会 409，届时自竞态自愈会收敛）
        let backfilled = false;
        for (let bt = 1; bt <= 2 && !backfilled; bt++) {
          try {
            const { ProgressManager } = await import('./progress.js');
            const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
            const ackTs = res.body && typeof res.body.last_pushed_at === 'string' ? res.body.last_pushed_at : pushedAt;
            pm._updatePlatformLastSync(this.cwd, changeName, ackTs);
            backfilled = true;
          } catch (err) {
            if (bt === 2) {
              console.warn(`⚠️ [sync] base_ts 回填失败（下次 push 可能 409，自愈机制会处理）: ${err.message}`);
            } else {
              await new Promise((r) => setTimeout(r, 200));
            }
          }
        }

        console.log(`[sync] 已同步变更: ${changeName}`);

        // 2026-08-16-auto-sync-from-repo：进度上行成功后顺带推四件套文档（best-effort）。
        // 根因：run 流程此前只推进度不推文档（本文件头注释），本地直跑 sillyspec 的产出
        // 文档永远不自动到平台（变更中心"进度到了文档没到"）。生产者直连，不依赖 daemon
        // 缓存链路。失败仅 debugLog——文档同步失败不得影响进度上行的返回值与流程；
        // 四件套全缺失时 syncDocuments 内部已有跳过（syncedCount===0 提前返回，不调端点）。
        try {
          await this.syncDocuments(changeName);
        } catch (err) {
          debugLog(`[sync] 文档同步失败（不影响进度）: ${changeName}: ${err.message}`);
        }

        // 2026-08-17-spec-file-incremental-sync：进度上行+文档直推成功后顺带推整个 spec 树
        // （plan.md、tasks/、module-impact.md 等），让变更中心文件树自动更新。
        // 无 daemon 时 CLI 短进程无本地清单缓存，以服务器清单为锚做增量 diff。
        // 树根与进度锚点同源（safePlatformSpecDir，平台模式 → specRoot）：此前硬编码
        // cwd/.sillyspec，平台模式下该目录只有 local.yaml（被 walk 排除）→ 本地树恒空
        // → 服务器清单全量 delete（BUG-01，computeSpecOps 护栏为第二道防线）。
        try {
          await syncSpecTree(safePlatformSpecDir(this.cwd) || join(this.cwd, '.sillyspec'), this._getPlatform(), changeName);
        } catch (err) {
          debugLog(`[sync] spec 树增量同步失败（不影响进度）: ${changeName}: ${err.message}`);
        }

        return { synced: 1, errors: [] };
      }

      if (res.status !== 409) {
        return { synced: 0, errors: [`同步请求失败: ${changeName}`] };
      }

      // ── 409 = base_ts 乐观锁冲突（平台已有更新）──
      // 平台 409 响应 { conflict:true, platform_progress, last_pushed_at }，platform_progress 即平台最新 progress JSON
      const platformProgress = res.body && res.body.platform_progress ? res.body.platform_progress : res.body;
      const platformLastPushedAt = (res.body && res.body.last_pushed_at) || null;

      // 自竞态自愈：fresh 重读本机 DB base_ts，若已被并发进程回填到 ≥ 平台 409 回执 ts，
      // 说明赢者是本机自己人——刷新 base_ts 重试一次即收敛，不落冲突文件（外来推送不可能
      // 推进本机 DB 的 base_ts，不满足条件自然落回下方真冲突分支，零误放行）
      if (attempt < MAX_PUSH_ATTEMPTS && await this._localBaseTsCovers(changeName, platformLastPushedAt)) {
        console.warn(`⚠️ [sync] push 409 自竞态判定：本机并发推送已回填 base_ts（平台 ts=${platformLastPushedAt}），刷新后自动重试`);
        continue;
      }

      // resolve --keep-local 的自动重推再撞 409：不落新冲突文件、不打「已卡死」横幅——
      // 原 conflict 已按用户裁决处理完（base_ts 已推进），此刻的 409 只是「平台在用户裁决期间
      // 又动了」；立即落新文件会破坏「keep-local 清冲突文件回 clean」的生命周期契约（冲突文件
      // 代表待人工三选一的未决状态，而用户刚做完选择）。下次常规同步会按新 base 重新判定，
      // 真有新分歧自然再进 conflict 态。
      if (fromResolve) {
        console.warn(`⚠️ [sync] keep-local 自动重推被拒（平台又有更新，ts=${platformLastPushedAt}）；base_ts 已推进，下次常规同步将重新判定`);
        return { synced: 0, errors: [`keep-local 自动重推被拒: ${changeName}`], conflict: true, platform_progress: platformProgress, suppressedConflictFile: true };
      }

      // 醒目冲突横幅（坑 2026-08-19-platform-sync-base-ts-silent-conflict 改进点 2）：
      // 此前仅单行 warn，冲突文件静默落 .runtime——同步已卡死但 Agent/用户无从察觉，
      // 平台页面永久停在旧阶段。横幅明确告知「已卡死 + 卡死原因 + 恢复命令」，不能只落文件。
      console.warn('');
      console.warn('⚠️⚠️⚠️════════════════════════════════════════════════════');
      console.warn(`⚠️ 平台同步冲突：变更「${changeName}」推送被拒（base_ts 过期，平台已有更新）`);
      console.warn('⚠️ 该变更的自动同步已卡死，不会自愈——需人工 resolve 才能恢复：');
      console.warn(`⚠️   1. sillyspec platform status     # 查看未决冲突`);
      console.warn(`⚠️   2. sillyspec platform resolve ${changeName} --keep-local | --take-platform | --abort`);
      console.warn(`⚠️   3. sillyspec platform sync --change ${changeName}`);
      console.warn('⚠️ 冲突详情已落盘: .sillyspec/.runtime/sync-conflict-' + changeName + '.json');
      console.warn('⚠️⚠️⚠️════════════════════════════════════════════════════');
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

    // 循环耗尽（自愈重试后仍 409——两次都撞且第二次非自竞态；理论上第二次会落上方真冲突分支返回，
    // 此行只作结构兜底）
    return { synced: 0, errors: [`同步重试耗尽（仍冲突）: ${changeName}`] };
  }

  /**
   * 自竞态判定辅助：fresh 读本地 DB 的 last_synced_platform_ts（base_ts），判断它是否已覆盖
   * 平台 409 回执的 last_pushed_at（字符串字典序比较，契约 §4.2——ISO 8601 字典序 == 时间序）。
   * 已覆盖 ⇒ 打赢 409 的推送来自本机并发进程（其成功回填写的就是这个共享 DB）。
   * @param {string} changeName
   * @param {string|null} platformTs 409 回执 last_pushed_at
   * @returns {Promise<boolean>}
   */
  async _localBaseTsCovers(changeName, platformTs) {
    if (!platformTs) return false;
    try {
      const { ProgressManager } = await import('./progress.js');
      const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
      const row = pm._ensureDB(this.cwd).getDb().prepare(
        'SELECT last_synced_platform_ts FROM changes WHERE name = ?'
      ).get(changeName);
      const localTs = row && row.last_synced_platform_ts;
      if (!localTs) return false;
      return localTs >= platformTs;
    } catch {
      return false; // 读失败按非自竞态处理（fail-closed 到真冲突分支）
    }
  }

  /**
   * 同步四件套文档到平台（全量同步）。
   * POST {url}/api/changes/{changeName}/documents
   * @param {string} changeName
   * @param {{manual?: boolean}} [opts] - manual=true 手动 sync-docs 命令路径（四件套缺失打 warn）；
   *   默认自动路径（sync() 顺带推）四件套缺失是流程早期正常状态，降 debug 不噪音（ql-20260818-008）
   */
  async syncDocuments(changeName, opts = {}) {
    const { manual = false } = opts;
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
      // ql-20260818-008：四件套缺失在流程早期是正常状态（brainstorm 中途 design/proposal 还没写），
      // 自动路径降 debug——原 warn「未找到可同步的文档」不说只找四件套，曾让用户误判同步逻辑错了；
      // 手动 platform sync-docs 是显式意图，保留 warn 但说清范围。
      if (manual) {
        console.warn(`[sync] 未找到可同步的四件套文档（proposal/design/requirements/tasks.md）: ${changeName}`);
      } else {
        debugLog(`[sync] 四件套尚未生成，跳过文档直推: ${changeName}`);
      }
      return { synced: 0, errors: [...errors, '无可用文档'] };
    }

    const docUrl = `${platform.url}/api/changes/${encodeURIComponent(changeName)}/documents`;
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

    const approvalUrl = `${platform.url}/api/changes/${encodeURIComponent(changeName)}/approval`;
    const result = await fetchJson(approvalUrl, {
      headers: { Authorization: `Bearer ${platform.token}` },
    });

    if (!result) {
      console.warn(`[sync] 检查审批状态失败: ${changeName}`);
      return { status: 'unknown', reason: '请求失败（404/断网/超时），无法核实审批状态' };
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
   * @param {{force?: boolean, skipIfLocalDirty?: boolean}} [opts] - force 跳过本地脏度冲突检测直接
   *   import（task-12 resolve --take-platform 用）；skipIfLocalDirty 自动注入点（triggerPull/
   *   triggerPullActiveChange）专用保守守卫——本地有未同步改动时跳过 import（ql-20260818-008）
   * @returns {Promise<{ok: boolean, imported: boolean, conflict: boolean, reason?: string}>}
   */
  async pull(changeName, opts = {}) {
    const { force = false, skipIfLocalDirty = false } = opts;
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
      let localDirty = localLastModified && localLastSynced && localLastModified > localLastSynced;
      let platformNewer = platformPushedAt && (!localLastSynced || platformPushedAt > localLastSynced);
      // 自竞态防御（坑 2026-08-19-platform-sync-base-ts-silent-conflict 改进点 3）：
      // 判冲突用的 localLastSynced 若落后于本进程刚完成的 push 回填（另一连接 3ms 前推完、
      // 本 pull 在其回填写库前读了旧值），会把自己刚写的 platformPushedAt 误判为「平台有更新」
      // → 卡死。重读一次 DB：期间 push 回填已落库则 base_ts 已推进（>= platformPushedAt），
      // platformNewer 翻 false，冲突自愈。重读仍旧则真冲突，维持原判。
      if (localDirty && platformNewer) {
        try {
          const { ProgressManager } = await import('./progress.js');
          const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
          const fresh = pm._ensureDB(this.cwd).getDb().prepare(
            'SELECT last_synced_platform_ts FROM changes WHERE name = ?'
          ).get(changeName);
          if (fresh && fresh.last_synced_platform_ts) {
            localLastSynced = fresh.last_synced_platform_ts;
            platformNewer = platformPushedAt && platformPushedAt > localLastSynced;
            if (!platformNewer) {
              debugLog(`[sync] pull 自竞态解除: base_ts 已被本进程 push 回填推进到 ${localLastSynced}，平台 ts ${platformPushedAt} 非更新`);
            }
          }
        } catch { /* 重读失败维持原判（fail-closed 到真冲突分支） */ }
      }
      if (localDirty && platformNewer) {
        console.warn('');
        console.warn('⚠️⚠️⚠️════════════════════════════════════════════════════');
        console.warn(`⚠️ 平台同步冲突：变更「${changeName}」pull 判定冲突（本地有未同步改动且平台已更新，base_ts 过期）`);
        console.warn('⚠️ 该变更的自动同步已卡死，不会自愈——需人工 resolve 才能恢复：');
        console.warn(`⚠️   1. sillyspec platform status     # 查看未决冲突`);
        console.warn(`⚠️   2. sillyspec platform resolve ${changeName} --keep-local | --take-platform | --abort`);
        console.warn(`⚠️   3. sillyspec platform sync --change ${changeName}`);
        console.warn('⚠️ 冲突详情已落盘: .sillyspec/.runtime/sync-conflict-' + changeName + '.json');
        console.warn('⚠️⚠️⚠️════════════════════════════════════════════════════');
        // 写冲突文件（task-12 / D-002）：强制提示，绝不 auto-merge
        const conflictPath = this._writeConflictFile(changeName, {
          base_ts: localLastSynced,
          local_modified_ts: localLastModified,
          platform_last_pushed_at: platformPushedAt,
          platform_progress: platformProgress,
        });
        return { ok: false, imported: false, conflict: true, reason: `冲突: ${changeName} 本地脏且平台更新`, conflictPath };
      }
      // ql-20260818-008：自动注入点（triggerPull/triggerPullActiveChange）保守守卫——本地有未同步
      // 改动时跳过 import。原逻辑只拦「本地脏 且 平台更新」的真冲突，「本地领先」（本地脏、平台更旧）
      // 仍会 import 平台旧快照覆盖本地新进度（数据丢失）。手动 platform pull 不传该 flag，语义不变。
      if (skipIfLocalDirty && localDirty) {
        debugLog(`[sync] pull 跳过（本地有未同步改动，防平台旧快照覆盖）: ${changeName}`);
        return { ok: false, imported: false, conflict: false, reason: '本地有未同步改动，自动 pull 跳过' };
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
      // base_ts 推进到平台最新 last_pushed_at；本地 DB 不 import（用户本地为准，后续手动 push）。
      // MAX() 单调防回退（坑 2026-08-19-resolve-keep-local-base-ts-rollback）：冲突文件是历史快照，
      // 其 platform_last_pushed_at 可能早于 DB 已由后续成功 push 回填的 base_ts——无条件覆盖会把
      // base_ts 拉回过去，下次 sync 立即撞 409 再落冲突文件（恢复时实测二轮才收敛）。
      // COALESCE 防 NULL：SQLite 标量 MAX(x, NULL) 恒 NULL，首同步前 base_ts NULL 应直取平台 ts。
      try {
        const { ProgressManager } = await import('./progress.js');
        const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
        const db = pm._ensureDB(this.cwd).getDb();
        db.prepare('UPDATE changes SET last_synced_platform_ts = MAX(?, COALESCE(last_synced_platform_ts, ?)) WHERE name = ?')
          .run(platformPushedAt, platformPushedAt, changeName);
      } catch (err) {
        return { ok: false, resolved: false, reason: `keep-local 更新 base_ts 失败: ${err.message}` };
      }
      this.clearConflictFile(changeName);
      // 自动重推闭环（坑 2026-08-19-platform-sync-base-ts-silent-conflict 收尾侧）：keep-local 语义 =
      // 本地为准，必然收尾是把本地推上平台。此前停在「后续请手动 platform sync」——忘了推，
      // 期间他人再推 → 下次自动同步又 409 落冲突文件（「冲突再现」的根源之一）。resolve 成功即
      // 自动 push 一次闭环；真撞上外来更新时软提示（fromResolve 抑制新冲突文件——冲突文件代表
      // 待人工三选一的未决状态，用户刚做完选择，下次常规同步按新 base 重新判定）。
      let repush = null;
      try {
        repush = await this.sync(changeName, { fromResolve: true });
      } catch (err) {
        debugLog(`[sync] keep-local 自动重推异常（不阻断 resolve 结果）: ${changeName}: ${err.message}`);
      }
      if (repush && repush.synced === 1) {
        return { ok: true, resolved: true, mode: 'keep-local', reason: '保留本地，并已自动推送平台——冲突闭环，无需再手动 sync' };
      }
      if (repush && repush.conflict) {
        return { ok: true, resolved: true, mode: 'keep-local', reason: '保留本地，base_ts 已推进；自动重推被拒（平台在裁决期间又有更新），下次常规同步将重新判定' };
      }
      return { ok: true, resolved: true, mode: 'keep-local', reason: '保留本地，base_ts 已推进；自动重推未成功（未连接/网络），请手动 sillyspec platform sync --change ' + changeName };
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

// manual=true：本导出对应 CLI platform sync-docs 手动命令（index.js platform 分支唯一调用方），
// 四件套缺失打 warn；sync() 内的自动顺带推走 SyncManager 实例方法默认 auto（ql-20260818-008）
export async function syncDocuments(changeName, cwd) {
  return new SyncManager(cwd).syncDocuments(changeName, { manual: true });
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

// 未决冲突文件列表便捷导出（index.js platform resolve 参数解析/报错兜底用，只读）
export function listConflictFiles(cwd) {
  return new SyncManager(cwd).listConflictFiles();
}

// ql-20260818-011：quick 会话专用 spec 树同步入口。quick-<hex8> 会话按设计无
// changes/<name>/ 实体目录，progress/四件套上行对它是孤儿数据（平台变更中心按磁盘
// change_key join 永不命中），但 spec 树增量（QUICKLOG/模块文档的上行通道）以服务器
// 清单为锚做全树 diff，与变更目录无关——triggerSync 对 quick 会话降级只调本函数，
// 不走 sync()（后者第二道 existsSync 门会以「变更不存在」提前 return）。
// 未连接平台 → {synced: 0} 静默（本地合法状态，与 syncSpecTree 内部口径一致）。
export async function syncSpecTreeOnly(changeName, cwd) {
  const sm = new SyncManager(cwd);
  const platform = sm._getPlatform();
  if (!platform) return { synced: 0 };
  // 树根与 sync() 内链式推送同源（BUG-01：平台模式必须锚 specRoot，防本地空树触发全量 delete）
  return syncSpecTree(safePlatformSpecDir(cwd) || join(cwd, '.sillyspec'), platform, changeName);
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
      // manual=true：CLI 手动命令路径，四件套缺失打 warn（ql-20260818-008 措辞分级）
      const result = await sm.syncDocuments(changeName, { manual: true });
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
