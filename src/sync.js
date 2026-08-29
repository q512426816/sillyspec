/**
 * SillySpec SyncManager — SillyHub 平台同步模块
 *
 * 独立于 ProgressManager，由 run.js 和 index.js 调用。
 * Best effort：所有网络失败 console.warn，不抛错，不阻塞主流程。
 *
 * 配置来源：.sillyspec/local.yaml 中的 platform 段
 * HTTP 请求：Node.js 原生 fetch（Node 22+）
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync, chmodSync, rmSync } from 'fs';
import { writeAtomicSync } from './fs-atomic.js';
import { join, dirname, isAbsolute, relative } from 'path';
import { resolvePlatformSpecDir } from './progress.js';
import { safeGit } from './git-helper.js';
import { openDatabase } from './db-engine.js';
import { PLATFORM_MANAGED_FILENAME, QUICK_SID_RE } from './run/shared.js';
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

/** 文本级写 local.yaml（保留传入 text 的注释/结构）；确保 .sillyspec 目录存在。
 *  原子写（fs-atomic 契约：local.yaml 被 hook/probe 等其他进程并发读，裸 writeFileSync 的
 *  写入窗口可读到半截文件 → mcp 段解析失败回退 env → 误判 no-config 降级）。 */
function writeLocalYamlRaw(cwd, text) {
  const dir = join(cwd, '.sillyspec');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const yamlPath = join(cwd, LOCAL_YAML);
  writeAtomicSync(yamlPath, text, 'utf8');
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

// HUB-09：单请求超时与外部 signal 合并——自动同步熔断（run/shared.js trigger* 的 race）
// 触发 abort 时在飞 fetch 被真实取消，而不是熔断后任由请求自行完成（平台可能已接受，
// 客户端却当作超时放弃；spec 树推送无 base_ts 自愈兜底）。AbortSignal.any 需 Node ≥20.3。
function combineSignals(external) {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return external ? AbortSignal.any([timeoutSignal, external]) : timeoutSignal;
}

async function fetchJson(url, options = {}) {
  const signal = combineSignals(options.signal);
  try {
    const res = await fetch(url, { ...options, signal });
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
      console.warn(`[sync] ${url} 请求超时/中断 (${REQUEST_TIMEOUT_MS}ms 上限或外部熔断)`);
    } else {
      console.warn(`[sync] ${url} 请求失败: ${err.message}`);
    }
    return null;
  }
}

/**
 * 带状态码的 fetch：不吞非 2xx（fetchJson 在 !res.ok 时返回 null 丢状态，无法区分 409 冲突）。
 * 返回 { ok, status, body }：body 尽力 JSON.parse（平台冲突响应带 progress JSON，读回给调用方）。
 * 仅 sync() 的 progress POST 使用（识别 base_ts 乐观锁冲突，D-015 / task-09）；其余调用仍走 fetchJson。
 */
async function fetchJsonWithStatus(url, options = {}) {
  const signal = combineSignals(options.signal);
  try {
    const res = await fetch(url, { ...options, signal });
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
      console.warn(`[sync] ${url} 请求超时/中断 (${REQUEST_TIMEOUT_MS}ms 上限或外部熔断)`);
    } else {
      console.warn(`[sync] ${url} 请求失败: ${err.message}`);
    }
    return { ok: false, status: 0, body: null };
  }
}

// ── X2 spec bundle tar 解析（task-14 / design §7.1）──

// 平台 build_bundle（spec_workspace/service.py，Python tarfile mode "w"）输出未压缩 tar，
// Python 3.8+ 默认 PAX 格式：路径 ≤100 字符是纯 ustar 头，超限走 typeflag 'x' 的 PAX
// 扩展头（path 记录）+ 截断名条目；GNU tar 长名走 'L'。仓内无三方 tar 库（package.json
// deps 无 tar/zlib 需求），按 512 字节头极简自实现——tar-slip 双重校验照搬 daemon
// extractTar（sillyhub-daemon/src/spec-sync.ts:982）同款范式，两仓行为对齐。

/** tar 头字符串字段读：截到首个 NUL，去首尾空白。 */
function _readTarString(buf) {
  const end = buf.indexOf(0);
  const s = (end === -1 ? buf : buf.subarray(0, end)).toString('utf8');
  return s.replace(/\0/g, '').trim();
}

/** tar 头 size 字段（12 字节八进制）→ 字节数。 */
function _readTarSize(field) {
  const s = _readTarString(field);
  if (!s) return 0;
  return parseInt(s, 8) || 0;
}

/** PAX 扩展头 data 解析为 {key: value}：记录形态 "<len> <key>=<value>\n" 重复，len 含自身位数。 */
function _parsePaxRecords(data) {
  const text = data.toString('utf8');
  const out = {};
  let pos = 0;
  while (pos < text.length) {
    const sp = text.indexOf(' ', pos);
    if (sp === -1) break;
    const len = parseInt(text.slice(pos, sp), 10);
    if (!Number.isInteger(len) || len <= 0 || pos + len > text.length) break;
    const record = text.slice(sp + 1, pos + len - 1); // 尾部 \n 不属于 value
    const eq = record.indexOf('=');
    if (eq > 0) out[record.slice(0, eq)] = record.slice(eq + 1);
    pos += len;
  }
  return out;
}

/**
 * tar-slip 双重校验（daemon extractTar 同款）：显式穿越模式 + join 后 relative 复核。
 * 通过返回安全相对路径的原样 name；命中穿越抛 Error（调用方转为失败 reason，不落盘）。
 */
function _assertSafeTarName(name, targetDir) {
  if (name.includes('..') || isAbsolute(name) || /^[A-Za-z]:[\\/]/.test(name)) {
    throw new Error(`tar 路径越界已拦截: ${name}`);
  }
  const fullPath = join(targetDir, name);
  const rel = relative(targetDir, fullPath);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`tar 路径逃逸目标目录已拦截: ${name} -> ${fullPath}`);
  }
}

/**
 * 解析整只未压缩 tar 为条目列表 [{ name, isDir, data }]（先全量解析校验，后落盘——
 * 恶意/损坏 tar 在任何本地删除动作之前暴露，见 pullSpecBundle 覆盖顺序）。
 * 容忍并落地 tar 顶层 PLATFORM-BUNDLE.json（task-08 快照元数据，design §7.3）；
 * symlink/fifo/dev 等非常规条目跳过（spec 树不应含，daemon 同款）。
 * @param {Buffer} tarBuf
 * @returns {Array<{name: string, isDir: boolean, data: Buffer}>}
 */
function _parseSpecTar(tarBuf) {
  const entries = [];
  let offset = 0;
  let pendingPath = null; // PAX 'x' path 记录 / GNU 'L' 长名，覆盖下一实条目的 name
  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break; // 结尾 zero block → 结束
    const typeflag = String.fromCharCode(header[156] ?? 0);
    const size = _readTarSize(header.subarray(124, 136));
    offset += 512;
    const data = tarBuf.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;

    let name = _readTarString(header.subarray(0, 100));
    // POSIX ustar prefix 字段（magic 'ustar\0' + version '00' 时有效）；GNU 长名走 'L' 条目
    const magic = header.subarray(257, 263).toString('latin1');
    const version = header.subarray(263, 265).toString('latin1');
    if (magic.startsWith('ustar') && version === '00') {
      const prefix = _readTarString(header.subarray(345, 500));
      if (prefix) name = `${prefix}/${name}`;
    }
    if (pendingPath) { name = pendingPath; pendingPath = null; }

    if (typeflag === 'x' || typeflag === 'X') {
      const recs = _parsePaxRecords(data);
      if (recs.path) pendingPath = recs.path;
      continue;
    }
    if (typeflag === 'L') { // GNU LongLink（长文件名）
      pendingPath = _readTarString(data);
      continue;
    }
    if (typeflag === 'K') continue; // GNU 长链接目标：spec 树无符号链接，跳过
    if (!name) continue;

    if (typeflag === '5' || name.endsWith('/')) {
      _assertSafeTarName(name.replace(/\/+$/, ''), '.'); // 目录条目同样过穿越校验（相对假根）
      entries.push({ name, isDir: true, data: Buffer.alloc(0) });
      continue;
    }
    if (typeflag === '0' || typeflag === '\0') {
      _assertSafeTarName(name, '.');
      entries.push({ name, isDir: false, data });
      continue;
    }
    debugLog(`[sync] spec bundle tar 跳过非常规条目: ${name} (typeflag ${typeflag})`);
  }
  return entries;
}

/** 目录有内容判定（daemon dirHasContent 同语义）：不存在/读失败/空均视为无内容。 */
function _dirHasContent(dir) {
  try { return readdirSync(dir).length > 0; } catch { return false }
}

// ── SyncManager ──

export class SyncManager {
  constructor(cwd) {
    this.cwd = cwd;
    // 归档尾声静默化旗标（坑 post-archive-sync-noise）：sync() 探测到已归档时置位，
    // 链内 syncDocuments 的「变更不存在」降 debug（每次 sync 调用重置）
    this._suppressDocsMissingWarn = false;
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
          writeAtomicSync(p, newText, 'utf8');
        }
      }
    }
    // 三清之二/三：指针 + 接管声明（disconnect 是声明的唯一退出路径——design.md §5.4）。
    // HUB-12 有意不清 .sillyspec-platform-cleaned marker：它防的是「重新接入平台时 init
    // 重复做残留清理」——disconnect 后重连若清掉 marker，init 会对现在装着本地数据的
    // .sillyspec 再跑一次平台残留清理（误删风险）。marker 跨 disconnect 存活是保护语义。
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

    // 冲突降噪（坑 sync-conflict-banner-spam，2026-08-23 实证：push 冲突落 sync-conflict 文件后，
    // 每步完成的 triggerSync 都会再 push 再 409 再打全幅双线横幅——「已卡死不会自愈」连环刷屏，
    // 观感像致命错误。冲突文件本身就代表「待人工三选一的未决状态」，文件在 = 用户已被告知，
    // 后续自动同步单行提示即可（可见但不吓人）；resolve 后文件删除，推送自动恢复。fromResolve
    // （keep-local 自动重推）不在此列——resolve 流程刚删冲突文件，它需要真实 push 判定平台态。
    if (!fromResolve) {
      const pendingConflict = this.readConflictFile(changeName);
      if (pendingConflict) {
        console.warn(`⚠️ [sync] 变更 ${changeName} 存在未决平台冲突，跳过自动推送。处理：sillyspec platform resolve ${changeName} --keep-local | --take-platform | --abort`);
        return { synced: 0, errors: [`conflict pending: ${changeName}`], conflict: true, suppressed: true };
      }
    }

    // 检查变更目录是否存在（归档后目录已移走但 DB 仍有最终状态需推平台，serializeForSync 从
    // DB 读不依赖文件系统目录）。树根与 syncDocuments/spec 树同源（safePlatformSpecDir，
    // BUG-01 同族）：此前硬编码 cwd/.sillyspec/changes，平台模式（specRoot 指向外部）目录
    // 恒不存在 → 每次同步打「变更目录不存在」warn 噪音。归档终态探测（坑 post-archive-
    // sync-noise，2026-08-21 实证：归档尾声连打「目录不存在/变更不存在」warn，观感像出错）：
    // 确认已归档（changes/archive/ 有实体 或 DB status='archived'）时降为一行 info 措辞——
    // 正常时序不是告警。
    const specBase = safePlatformSpecDir(this.cwd) || join(this.cwd, '.sillyspec');
    const changeDir = join(specBase, 'changes', changeName);
    let archivedQuietly = false;
    if (!existsSync(changeDir)) {
      archivedQuietly = existsSync(join(specBase, 'changes', 'archive', changeName))
        || this._isChangeArchivedInDb(changeName);
      if (archivedQuietly) {
        console.log(`[sync] 变更已归档（目录在 archive/），继续从 DB 推送最终状态: ${changeName}`);
      } else {
        console.warn(`[sync] 变更目录不存在（可能是已归档，继续从 DB 同步最终状态）: ${changeName}`);
      }
    }
    // 透传给本次 sync 链内的 syncDocuments（best-effort 四件套直推：归档后目录已移走，
    // 其「变更不存在」warn 属正常时序，静默化）
    this._suppressDocsMissingWarn = archivedQuietly;

    // X1 墓碑判据之一（design §5.5，变更 2026-08-29-change-delete-closure-and-spec-pull task-13）：
    // 实体目录双失——changes/<name>/ 与 changes/archive/<name>/ 都不在 = 本地裸删（用户手动
    // rm -rf 变更目录）。归档态（DB status='archived'）在 serialize 后于循环内判定。
    // 常规终态推送保持原语义（archived/active 原值照推，platform-sync-archive-final-state 钉死），
    // 墓碑作为推送链成功后的追加 POST（见 _pushTombstone）。
    const entityDirGone = !existsSync(changeDir) && !existsSync(join(specBase, 'changes', 'archive', changeName));

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

      // X1 墓碑判定（design §5.5 / task-13）：本地已注销（unregisterChange 链——归档收尾/自愈/
      // quick 收尾均置 status='archived'）或实体目录双失（裸删）时，常规推送成功后追加一次
      // changes[].status='deleted' 墓碑（平台 task-04 写路径置 location='deleted' 收敛镜像）。
      // quick 会话豁免：triggerSync 对 quick 已降级 syncSpecTreeOnly，直调也不给孤儿 key 造墓碑。
      const tombstoneDue = !QUICK_SID_RE.test(changeName)
        && (progressData.changes?.[0]?.status === 'archived' || entityDirGone);

      // X3 步骤开始上报（design §8.2 / task-13）：opts.stepStart 时把 current_stage 的第一个
      // 未完成步投影为 in-progress（仅载荷不写 DB；triggerStepStartSync 是唯一传该 flag 的入口）
      if (opts.stepStart) this._projectStepStart(progressData, changeName);

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
        signal: opts.signal, // HUB-09：熔断 abort 传到底层请求
      });

      // X1（task-04 契约）：409 + code='change_deleted' = 平台已删 key 拒收——不是 base_ts 冲突。
      // 单行提示即可，不落冲突文件、不打全幅横幅：墓碑已收敛后的重复上行（归档收尾多步各推一次）、
      // 多用户下他端删除后本地仍在推进，都是可预期态，按冲突卡死人工 resolve 反而是误报。
      if (res.status === 409 && res.body && res.body.code === 'change_deleted') {
        console.warn(`⚠️ [sync] 平台已删除变更「${changeName}」，本次进度上行被拒收（change_deleted）；本地如仍需推进请在平台侧确认`);
        return { synced: 0, errors: [], platformDeleted: true, reason: '平台已删除（change_deleted 拒收）' };
      }

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
          await this.syncDocuments(changeName, { signal: opts.signal });
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
          await syncSpecTree(safePlatformSpecDir(this.cwd) || join(this.cwd, '.sillyspec'), this._getPlatform(), changeName, { signal: opts.signal });
        } catch (err) {
          debugLog(`[sync] spec 树增量同步失败（不影响进度）: ${changeName}: ${err.message}`);
        }

        // X1 墓碑上行（收敛加速器，best-effort）：常规终态 + 文档/spec 树都推完后追加一次
        // changes[].status='deleted'（顺序在后——常规推送保持 archived/active 原语义是既有
        // 契约，platform-sync-archive-final-state 钉死）。失败静默：平台闭环走方案 A 镜像驱动
        // 收敛（design §5.5），墓碑只是让收敛即时。
        if (tombstoneDue) {
          try {
            await this._pushTombstone(changeName, { signal: opts.signal });
          } catch (err) {
            debugLog(`[sync] 墓碑上行失败（不影响主推送）: ${changeName}: ${err.message}`);
          }
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

      // push 侧内容一致自愈（坑 push-409-foreign-noise，2026-08-23 实证：他机/部署重推了内容
      // 相同的进度——pull 侧已有 _progressContentEquals 自愈（坑 pull-deploy-noise-conflict），
      // push 409 路径没有：外来噪声形态落真冲突 + 横幅 + 人工 resolve，而内容其实零分歧）。
      // 409 回执的 platform_progress 与本次待推内容过同一比对（忽略时间戳列），一致 → 平台
      // 「更新」只是噪声重推，本地无可丢失 → 跳过本次推送 + base_ts 推进到平台 ts（与
      // resolve --keep-local 同语义，自动闭环），不落冲突文件。内容不同 → 真分歧，维持原判。
      try {
        if (platformProgress && this._progressContentEquals(progressData, platformProgress)) {
          try {
            const { ProgressManager } = await import('./progress.js');
            const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
            pm._ensureDB(this.cwd).getDb().prepare(
              'UPDATE changes SET last_synced_platform_ts = MAX(?, COALESCE(last_synced_platform_ts, ?)) WHERE name = ?'
            ).run(platformLastPushedAt || pushedAt, platformLastPushedAt || pushedAt, changeName);
          } catch {}
          console.warn(`⚠️ [sync] push 409 内容一致自愈: 平台 ts=${platformLastPushedAt} 为外来噪声重推（六表内容与本地一致），base_ts 已推进，不落冲突文件`);
          return { synced: 1, errors: [], selfHealed: true, reason: 'push 409 平台内容与本地一致（外来噪声重推），base_ts 已推进' };
        }
      } catch { /* 比对失败维持原判（fail-closed 到真冲突分支） */ }

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
      console.warn('⚠️ 该变更的自动同步已暂停，等待人工 resolve 恢复（期间不再重复刷本横幅，后续自动同步单行提示）：');
      console.warn(`⚠️   1. sillyspec platform status     # 查看未决冲突`);
      console.warn(`⚠️   2. sillyspec platform resolve ${changeName} --keep-local | --take-platform | --abort`);
      console.warn(`⚠️   3. sillyspec platform sync --change ${changeName}`);
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
      console.warn(`⚠️ 冲突详情已落盘: ${conflictPath}`);
      return { synced: 0, errors: [`冲突: ${changeName}`], conflict: true, platform_progress: platformProgress, conflictPath };
    }

    // 循环耗尽（自愈重试后仍 409——两次都撞且第二次非自竞态；理论上第二次会落上方真冲突分支返回，
    // 此行只作结构兜底）
    return { synced: 0, errors: [`同步重试耗尽（仍冲突）: ${changeName}`] };
  }

  /**
   * X3 步骤开始上报的载荷投影（design §8.2，变更 2026-08-29-change-delete-closure-and-spec-pull
   * task-13）：把 current_stage 下第一个未完成步（completed/skipped 之外，含 waiting——等待中
   * 的步同样「在跑」）的 status 改为 'in-progress'。
   *
   * 仅改本次上行载荷，不写 DB——步骤行 DB 种子是 pending，completeStep 的
   * findIndex(pending||in-progress) 两者等价，但保持 DB 不被推送侧污染（--done 推送路径
   * 行为不变，回归约束）。六表 steps[].status 状态机本就含 in-progress 值（step-store
   * VALID_STATUSES），平台侧裸 JSON 透传（design §8.2 已核实后端零改动）。
   * @param {object} progressData serializeForSync 输出（原地修改）
   * @param {string} changeName
   */
  _projectStepStart(progressData, changeName) {
    try {
      const row = progressData && progressData.changes && progressData.changes[0];
      if (!row || !row.current_stage || !Array.isArray(progressData.steps)) return;
      const idx = progressData.steps.findIndex(s =>
        s.change_name === changeName && s.stage === row.current_stage
        && s.status !== 'completed' && s.status !== 'skipped');
      if (idx !== -1) progressData.steps[idx].status = 'in-progress';
    } catch { /* 投影失败按原载荷推送（best-effort） */ }
  }

  /**
   * X1：把墓碑状态写进载荷——changes[0].status='deleted'（对齐既有 'archived' 状态语义，
   * design §5.5）。平台写路径（服务端 task-04 `_apply_cli_tombstone`）见到该值即置
   * Change.location='deleted' 并触发镜像软删收敛。
   * @param {object} progressData serializeForSync 输出（原地修改，返回同一引用）
   */
  _applyTombstoneStatus(progressData) {
    if (progressData && Array.isArray(progressData.changes) && progressData.changes[0]) {
      progressData.changes[0].status = 'deleted';
    }
    return progressData;
  }

  /**
   * X1 墓碑上行（design §5.5 / task-13）：同端点同结构的一次追加 POST（changes[].status='deleted'）。
   *
   * 由 sync() 成功路径在常规推送 + 文档/spec 树链之后触发（CLI 单进程顺序推送，base_ts 进程内
   * 单调，无乐观锁冲突）。fresh 重读 DB 序列化——常规推送成功的 base_ts 回填已落库，本推送带上
   * 该 base_ts；重复墓碑（平台已删）收到 409 code='change_deleted' 属预期，静默返回。
   * Best-effort：任何失败只 debugLog，不影响 sync() 主结果（平台闭环走方案 A 兜底）。
   * @param {string} changeName
   * @param {{signal?: object}} [opts]
   * @returns {Promise<{synced: number}>}
   */
  async _pushTombstone(changeName, opts = {}) {
    const platform = this._getPlatform();
    if (!platform) return { synced: 0 };
    const { ProgressManager } = await import('./progress.js');
    const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
    const progressData = pm.serializeForSync(this.cwd, changeName);
    if (progressData === null) return { synced: 0 }; // DB 行已不在（彻底删除），无墓碑可推，方案 A 兜底
    this._applyTombstoneStatus(progressData);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${platform.token}`,
    };
    const pushedAt = new Date().toISOString();
    const pushUser = platform.user || resolvePlatformUser(this.cwd) || null;
    if (pushUser) headers['X-SillySpec-User'] = pushUser;
    const baseTs = progressData.changes?.[0]?.last_synced_platform_ts;
    if (baseTs) headers['X-SillySpec-Base-Ts'] = baseTs;
    headers['X-SillySpec-Pushed-At'] = pushedAt;

    const syncUrl = `${platform.url}/api/changes/${encodeURIComponent(changeName)}/progress`;
    const res = await fetchJsonWithStatus(syncUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(progressData),
      signal: opts.signal,
    });
    if (res.ok) {
      console.log(`[sync] 已上行墓碑（status=deleted）: ${changeName}`);
      try {
        const ackTs = res.body && typeof res.body.last_pushed_at === 'string' ? res.body.last_pushed_at : pushedAt;
        pm._updatePlatformLastSync(this.cwd, changeName, ackTs);
      } catch { /* 回填失败下次 push 409 由自竞态自愈收敛 */ }
      return { synced: 1 };
    }
    debugLog(`[sync] 墓碑上行未成功: ${changeName} (status=${res.status}，平台方案 A 兜底)`);
    return { synced: 0 };
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

    // 树根与进度/spec 树同源（safePlatformSpecDir，BUG-01 同族）：此前硬编码 cwd/.sillyspec/changes，
    // 平台模式（specRoot 指向外部）下路径不存在 → syncDocuments 恒报「变更不存在」且调用方不查
    // 返回值 → 文档在平台模式下静默永不同步。
    const changeDir = join(safePlatformSpecDir(this.cwd) || join(this.cwd, '.sillyspec'), 'changes', changeName);
    if (!existsSync(changeDir)) {
      // 归档尾声静默化（坑 post-archive-sync-noise）：sync() 链内调用（_suppressDocsMissingWarn
      // 置位，目录已移 archive/ 的正常时序）降为 debug；独立调用（手动 sync-docs）保留 warn
      if (this._suppressDocsMissingWarn) {
        debugLog(`[sync] 四件套目录不存在（变更已归档，跳过文档直推）: ${changeName}`);
        return { synced: 0, errors: [] };
      }
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
      signal: opts.signal, // HUB-09：熔断 abort 传到底层请求
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
   * 基于本实例解析出的平台配置（env 优先，见 _getPlatform）返回连接信息；
   * env 通道无 last_connected 可读，返回 null。
   */
  status() {
    const platform = this._getPlatform();
    if (!platform) {
      return { connected: false };
    }
    return {
      connected: true,
      url: platform.url,
      lastSync: readLocalYaml(this.cwd).platform?.last_connected || null,
    };
  }

  /**
   * 获取当前平台配置，未连接返回 null。
   * 优先级：env SILLYHUB_PLATFORM_URL + SILLYHUB_PLATFORM_TOKEN（两键齐全才生效——
   * daemon 注入通道，平台模式 specRoot/local.yaml 常无 platform 段，与链路 D
   * readPlatformPushConfig 同款先例）> local.yaml platform 段。
   * env 由 daemon 注入、CLI 不管其生命周期（disconnect 仍只清 local.yaml——daemon
   * 停止注入即失效）；triggerSync 平台模式放行（2026-08-26）后这是回传走通的关键通道。
   */
  _getPlatform() {
    if (process.env.SILLYHUB_PLATFORM_URL && process.env.SILLYHUB_PLATFORM_TOKEN) {
      return {
        url: process.env.SILLYHUB_PLATFORM_URL,
        token: process.env.SILLYHUB_PLATFORM_TOKEN,
      };
    }
    const config = readLocalYaml(this.cwd);
    return config.platform || null;
  }

  /**
   * DB 侧归档态探测（坑 post-archive-sync-noise）：changes 表 status='archived' 即真。
   * 只读直查（node:sqlite，不经 ProgressManager——sync 是短进程，惰性 import 无收益且
   * 本调用点在同步代码段）；DB 不存在/无行/读失败 → false（保守退回普通 warn 措辞）。
   * @param {string} changeName
   * @returns {boolean}
   */
  _isChangeArchivedInDb(changeName) {
    try {
      const dbPath = join(safePlatformSpecDir(this.cwd) || join(this.cwd, '.sillyspec'), '.runtime', 'sillyspec.db');
      if (!existsSync(dbPath)) return false;
      const db = openDatabase(dbPath, { readOnly: true });
      try {
        const row = db.prepare("SELECT status FROM changes WHERE name = ?").get(changeName);
        return row?.status === 'archived';
      } finally { try { db.close() } catch {} }
    } catch { return false }
  }

  /**
   * 写冲突文件 .runtime/sync-conflict-<change>.json（task-12 / D-002 / D-008 / D-010 / FR-05）。
   * push 409 与 pull 本地脏度双向冲突命中时调用，强制提示用户走 platform resolve 三选一。
   * 绝不字段级 auto-merge；文件在 .runtime 下不入版本控制（gitignore）。
   * @param {string} changeName
   * @param {{base_ts?: string|null, local_modified_ts?: string|null, platform_last_pushed_at?: string|null, platform_progress?: object|null}} info
   * @returns {string|null} 冲突文件路径（specDir 不可达返回 null）
   */
  /**
   * 六表内容比对（坑 pull-deploy-noise-conflict 自愈用）：本地 serializeForSync 快照与平台
   * 拉回的 JSON 逐表深度比对，忽略时间戳/同步元数据列（last_active/last_synced_platform_ts/
   * last_local_modified_ts/started_at/completed_at/pushed_at/checked_at/completed_at 等——部署
   * 噪声重推会刷新这些列但内容不变）。任一实质差异 → false。
   * @param {object} local - serializeForSync 输出
   * @param {object} platform - 平台 GET progress JSON（serializeForSync 同构）
   * @returns {boolean}
   */
  _progressContentEquals(local, platform) {
    try {
      const IGNORE_KEYS = new Set([
        'last_active', 'last_synced_platform_ts', 'last_local_modified_ts',
        'started_at', 'completed_at', 'pushed_at', 'last_pushed_at', 'created_at',
        'deps_checked_at', 'checked_at', 'waited_at', 'completedat',
      ]);
      const strip = (v) => {
        if (Array.isArray(v)) return v.map(strip);
        if (v && typeof v === 'object') {
          const out = {};
          // sort 必须按 key 字符串比较（坑 content-equals-sort-typeerror，2026-08-23 实证：
          // 默认比较器把 [key, value] 元素转字符串，serializeForSync 输出的 project 字段是
          // null-prototype 对象（不可转原始值）→ sort 抛 TypeError 被下方 catch 吞成恒 false
          // ——pull/push 两侧内容一致自愈形同虚设，部署噪声全部落真冲突人工 resolve）。
          const entries = Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
          for (const [k, val] of entries) {
            if (IGNORE_KEYS.has(k)) continue;
            out[k] = strip(val);
          }
          return out;
        }
        return v;
      };
      return JSON.stringify(strip(local)) === JSON.stringify(strip(platform));
    } catch { return false }
  }

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

  // ── HUB-08：spec 树冲突文件（spec-sync-conflict-<change>.json，由 spec-sync.js 写入）──

  /** 读取 spec 树冲突文件；无/损坏返回 null */
  readSpecConflictFile(changeName) {
    const specDir = safePlatformSpecDir(this.cwd);
    if (!specDir) return null;
    const p = join(specDir, '.runtime', `spec-sync-conflict-${changeName}.json`);
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      return null;
    }
  }

  /** 删除 spec 树冲突文件 */
  clearSpecConflictFile(changeName) {
    const specDir = safePlatformSpecDir(this.cwd);
    if (!specDir) return false;
    const p = join(specDir, '.runtime', `spec-sync-conflict-${changeName}.json`);
    if (!existsSync(p)) return false;
    try { unlinkSync(p); return true; }
    catch { return false; }
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
      signal: opts.signal, // HUB-09：熔断 abort 传到底层请求
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
      // ── 内容一致自愈（坑 pull-deploy-noise-conflict，2026-08-22 实证：并行会话部署扰动——
      // 他机 push 了内容相同的进度（如重启/重部署触发重推），本地脏 + 平台 ts 更新 → 拉冲突落
      // sync-conflict 文件需人工 resolve，但内容其实无分歧。比对平台 JSON 与本地 serializeForSync
      // 的六表内容（忽略时间戳列），一致 → 跳过 import（本地为准）+ base_ts 推进到平台 ts——
      // 与 resolve --keep-local 同语义，自动闭环。内容不同 → 真冲突，维持原判。
      if (localDirty && platformNewer && platformProgress) {
        try {
          const { ProgressManager } = await import('./progress.js');
          const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
          const localSnapshot = pm.serializeForSync(this.cwd, changeName);
          if (localSnapshot && this._progressContentEquals(localSnapshot, platformProgress)) {
            try {
              const db = pm._ensureDB(this.cwd).getDb();
              db.prepare(
                'UPDATE changes SET last_synced_platform_ts = MAX(?, COALESCE(last_synced_platform_ts, ?)) WHERE name = ?'
              ).run(platformPushedAt, platformPushedAt, changeName);
            } catch {}
            debugLog(`[sync] pull 内容一致自愈: 平台 ts ${platformPushedAt} 为部署噪声重推（六表内容与本地一致），base_ts 已推进，不落冲突文件`);
            return { ok: true, imported: false, conflict: false, reason: '平台重推内容与本地一致（部署噪声），base_ts 已推进' };
          }
        } catch { /* 比对失败维持原判（fail-closed 到真冲突分支） */ }
      }
      if (localDirty && platformNewer) {
        console.warn('');
        console.warn('⚠️⚠️⚠️════════════════════════════════════════════════════');
        console.warn(`⚠️ 平台同步冲突：变更「${changeName}」pull 判定冲突（本地有未同步改动且平台已更新，base_ts 过期）`);
        console.warn('⚠️ 该变更的自动同步已暂停，等待人工 resolve 恢复（推送侧后续自动同步单行提示，不再重复刷本横幅）：');
        console.warn(`⚠️   1. sillyspec platform status     # 查看未决冲突`);
        console.warn(`⚠️   2. sillyspec platform resolve ${changeName} --keep-local | --take-platform | --abort`);
        console.warn(`⚠️   3. sillyspec platform sync --change ${changeName}`);
        console.warn('⚠️⚠️⚠️════════════════════════════════════════════════════');
        // 写冲突文件（task-12 / D-002）：强制提示，绝不 auto-merge
        const conflictPath = this._writeConflictFile(changeName, {
          base_ts: localLastSynced,
          local_modified_ts: localLastModified,
          platform_last_pushed_at: platformPushedAt,
          platform_progress: platformProgress,
        });
        console.warn(`⚠️ 冲突详情已落盘: ${conflictPath}`); // HUB-12d：真实落点（平台模式在 specRoot/.runtime），勿硬编码
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
   * X2（task-14 / design §7.1 / FR-07 / FR-08）：拉平台 spec 整树快照并解压到 specDir。
   *
   * 与既有 pull()（进度六表 DB import）正交：本方法操作的是 .sillyspec **文件树**——
   * GET {platform.url}/api/changes/-/spec-bundle（task-08 端点，Bearer shpsync token，
   * application/x-tar 流 + X-Spec-Version 响应头）下载未压缩 tar 后解包。
   *
   * 覆盖语义对齐 daemon pullSpecBundle（sillyhub-daemon/src/spec-sync.ts）：
   * - specDir 为空（或不存在）→ 直接解压；
   * - 非空且无 force → 拒绝并明确提示（fail-fast，不发网络请求）；
   * - force → rm 整树 + 解包（先下载并全量解析校验 tar，成功后才 rm——恶意/损坏
   *   bundle 不先删本地）。
   *
   * 快照语义（design §7.4）：主动拉取服务器**打包时刻**快照，无自动同步、无会话中
   * 刷新；daemon 模式任务/会话开始时按 latest_spec_version 自动取新（本方法不涉）。
   *
   * Best Effort：未连接平台静默跳过（本地合法状态）；网络/解包失败返回 ok:false 不抛。
   * @param {{force?: boolean, specDir?: string|null, signal?: AbortSignal}} [opts]
   *   force 整树覆盖；specDir 显式覆盖树根（--spec-dir 全局选项通道；缺省与 sync()
   *   同源：平台模式锚 specRoot，本地模式 cwd/.sillyspec）；signal 外部熔断
   * @returns {Promise<{ok: boolean, pulled: boolean, specDir?: string, specVersion?: string|null, reason?: string}>}
   */
  async pullSpecBundle(opts = {}) {
    const { force = false } = opts;
    const platform = this._getPlatform();
    if (!platform) {
      debugLog('[sync] 未连接平台（本地合法状态）；pullSpecBundle 跳过');
      return { ok: false, pulled: false, reason: '未连接平台' };
    }
    // 树根与 sync()/spec 树推送同源（BUG-01：平台模式必须锚 specRoot，勿硬编码 cwd/.sillyspec）
    const specDir = opts.specDir || safePlatformSpecDir(this.cwd) || join(this.cwd, '.sillyspec');

    // 覆盖守卫（daemon 同款）：非空且无 --force 拒绝——先于网络请求，本地不可逆动作前 fail-fast
    if (_dirHasContent(specDir) && !force) {
      return {
        ok: false, pulled: false, specDir,
        reason: `specDir 非空（${specDir}），拒绝整树覆盖；确认用平台快照替换本地请加 --force`,
      };
    }

    // 下载流式 tar（spec 树小，整只缓冲与 daemon getSpecBundle 同口径）
    const bundleUrl = `${platform.url}/api/changes/-/spec-bundle`;
    let res;
    try {
      res = await fetch(bundleUrl, {
        headers: { Authorization: `Bearer ${platform.token}` },
        signal: combineSignals(opts.signal),
      });
    } catch (err) {
      const why = err.name === 'AbortError' ? `请求超时/中断 (${REQUEST_TIMEOUT_MS}ms 上限或外部熔断)` : err.message;
      console.warn(`[sync] GET ${bundleUrl} 请求失败: ${why}`);
      return { ok: false, pulled: false, specDir, reason: `拉取 spec bundle 失败: ${why}` };
    }
    if (!res.ok) {
      const why = res.status === 404
        ? '平台工作区尚无 spec 内容（HTTP 404，空 bundle）'
        : `HTTP ${res.status}`;
      console.warn(`[sync] GET ${bundleUrl} → ${res.status}`);
      return { ok: false, pulled: false, specDir, reason: `拉取 spec bundle 失败: ${why}` };
    }
    const specVersion = res.headers.get('x-spec-version');
    let tarBuf;
    try {
      tarBuf = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.warn(`[sync] 读取 spec bundle 响应体失败: ${err.message}`);
      return { ok: false, pulled: false, specDir, reason: `读取 spec bundle 失败: ${err.message}` };
    }

    // 全量解析 + 穿越校验在 rm 之前（tar-slip 命中时本地原样保留）
    let entries;
    try {
      entries = _parseSpecTar(tarBuf);
    } catch (err) {
      console.warn(`[sync] spec bundle 无效: ${err.message}`);
      return { ok: false, pulled: false, specDir, reason: `spec bundle 无效: ${err.message}` };
    }

    // 覆盖语义：rm 整树（容忍不存在）→ 逐条目落盘（join 后 relative 双重校验再走一道）
    try {
      rmSync(specDir, { recursive: true, force: true });
      for (const e of entries) {
        _assertSafeTarName(e.name.replace(/\/+$/, ''), specDir);
        const fullPath = join(specDir, e.name);
        if (e.isDir) {
          mkdirSync(fullPath, { recursive: true });
        } else {
          mkdirSync(dirname(fullPath), { recursive: true });
          writeFileSync(fullPath, e.data);
        }
      }
    } catch (err) {
      console.warn(`[sync] 解压 spec bundle 失败: ${err.message}`);
      return { ok: false, pulled: false, specDir, reason: `解压 spec bundle 失败: ${err.message}` };
    }
    console.log(`[sync] 已拉取 spec 快照并解压到 ${specDir}${specVersion ? `（平台 spec_version: ${specVersion}，打包时刻快照非实时）` : ''}`);
    return { ok: true, pulled: true, specDir, specVersion };
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
    const specCf = this.readSpecConflictFile(changeName);
    if (!cf && !specCf) {
      return { ok: false, resolved: false, reason: `无可解决冲突: ${changeName}（无 sync-conflict / spec-sync-conflict 文件）` };
    }
    const platformPushedAt = (cf && cf.platform_last_pushed_at) || null;

    // HUB-08：resolve 同时管辖进度冲突（sync-conflict-*）与 spec 树冲突（spec-sync-conflict-*），
    // 各自产出 outcome 后合并返回；abort 统一清两类标记。
    let progressOutcome = null;
    if (mode === 'keep-local' && cf) {
      // base_ts 推进到平台最新 last_pushed_at；本地 DB 不 import（用户本地为准，后续手动 push）。
      // MAX() 单调防回退（坑 2026-08-19-resolve-keep-local-base-ts-rollback）：冲突文件是历史快照，
      // 其 platform_last_pushed_at 可能早于 DB 已由后续成功 push 回填的 base_ts——无条件覆盖会把
      // base_ts 拉回过去，下次 sync 立即撞 409 再落冲突文件（恢复时实测二轮才收敛）。
      // COALESCE 防 NULL：SQLite 标量 MAX(x, NULL) 恒 NULL，首同步前 base_ts NULL 应直取平台 ts。
      try {
        const { ProgressManager } = await import('./progress.js');
        const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
        const db = pm._ensureDB(this.cwd).getDb();
        // 参数侧同样 COALESCE（坑 keep-local-base-ts-null-param）：SQLite 标量 MAX() 任一参数
        // 为 NULL 即返回 NULL——冲突文件 platform_last_pushed_at 为 null 时 MAX(NULL, 旧值)
        // 会把已回填的 base_ts 清空，恰好违背本注释的单调防回退意图。
        db.prepare('UPDATE changes SET last_synced_platform_ts = MAX(COALESCE(?, last_synced_platform_ts), COALESCE(last_synced_platform_ts, ?)) WHERE name = ?')
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
        progressOutcome = { ok: true, resolved: true, reason: '保留本地，并已自动推送平台——冲突闭环，无需再手动 sync' };
      } else if (repush && repush.conflict) {
        progressOutcome = { ok: true, resolved: true, reason: '保留本地，base_ts 已推进；自动重推被拒（平台在裁决期间又有更新），下次常规同步将重新判定' };
      } else {
        progressOutcome = { ok: true, resolved: true, reason: '保留本地，base_ts 已推进；自动重推未成功（未连接/网络），请手动 sillyspec platform sync --change ' + changeName };
      }
    }

    if (mode === 'take-platform' && cf) {
      // 用冲突文件的 platform_progress 调 import 覆盖本地（保隔离：import 不覆盖 isolation_*）。
      // fail-closed（坑 take-platform-empty-import）：缺 platform_progress 时必须直接返回——
      // { ...null } 展开为 {}，import 会照常跑完整事务（DELETE stages 后按空 JSON 重建 =
      // 清空本地进度），返回值却报 ok:false「未执行」，用户以为无事发生实则数据已丢。
      if (!cf.platform_progress) {
        return { ok: false, resolved: false, reason: '冲突文件缺 platform_progress，无法 take-platform（建议先 platform pull）' };
      }
      try {
        const { ProgressManager } = await import('./progress.js');
        const pm = new ProgressManager({ specDir: safePlatformSpecDir(this.cwd) });
        pm.import(this.cwd, { ...cf.platform_progress, pushed_at: platformPushedAt || new Date().toISOString() }, changeName);
      } catch (err) {
        progressOutcome = { ok: false, resolved: false, reason: `take-platform import 失败: ${err.message}` };
      }
      if (progressOutcome === null) {
        this.clearConflictFile(changeName);
        progressOutcome = { ok: true, resolved: true, reason: '已用平台进度覆盖本地' };
      }
    }

    // ── spec 树冲突处置（HUB-08）──
    let specOutcome = null;
    if (specCf && mode === 'keep-local') {
      // keep-local = 本地胜出：重新 GET 清单重定 base 后 POST 本地内容（last-writer-wins），
      // 成功清冲突文件闭环；仍冲突（平台又有更新）保留文件待下次裁决
      try {
        const r = await syncSpecTree(safePlatformSpecDir(this.cwd) || join(this.cwd, '.sillyspec'), this._getPlatform(), changeName);
        if (!r.conflict) {
          this.clearSpecConflictFile(changeName);
          specOutcome = { ok: true, resolved: true, reason: 'spec 树已以本地为准重定基线重推，冲突闭环' };
        } else {
          specOutcome = { ok: true, resolved: false, reason: 'spec 树重推仍冲突（平台在裁决期间又有更新），冲突文件保留待下次裁决' };
        }
      } catch (err) {
        specOutcome = { ok: false, resolved: false, reason: `spec 树重推异常: ${err.message}` };
      }
    } else if (specCf && mode === 'take-platform') {
      // fail-closed：平台无文件下载端点，无法把服务器内容写回本地——明确报错指路，不清文件
      specOutcome = { ok: false, resolved: false, reason: 'spec 树冲突不支持 take-platform（平台无文件下载端点，无法把服务器内容写回本地）：请手动对齐本地文件后跑 --keep-local' };
    }

    // ── abort：两类标记一并清（本地 DB 与文件均不变，下次 push/pull 重新检测）──
    if (mode === 'abort') {
      if (cf) this.clearConflictFile(changeName);
      if (specCf) this.clearSpecConflictFile(changeName);
      return { ok: true, resolved: true, mode: 'abort', reason: '放弃本次同步，本地不变' };
    }

    if (mode !== 'keep-local' && mode !== 'take-platform') {
      return { ok: false, resolved: false, reason: `未知 resolve 模式: ${mode}（--keep-local / --take-platform / --abort）` };
    }

    // ── 合并两类冲突的处置结果 ──
    const outcomes = [progressOutcome, specOutcome].filter(Boolean);
    if (outcomes.length === 0) {
      return { ok: false, resolved: false, reason: `无可解决冲突: ${changeName}` };
    }
    return {
      ok: outcomes.every((o) => o.ok),
      resolved: outcomes.every((o) => o.resolved),
      mode,
      reason: outcomes.map((o) => o.reason).join('；'),
    };
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
    // HUB-08：同时扫描进度冲突（sync-conflict-*）与 spec 树冲突（spec-sync-conflict-*），
    // type 字段供 status 展示与 resolve 分流
    for (const f of files) {
      let prefix = null;
      if (f.startsWith('sync-conflict-') && f.endsWith('.json')) prefix = 'sync-conflict-';
      else if (f.startsWith('spec-sync-conflict-') && f.endsWith('.json')) prefix = 'spec-sync-conflict-';
      else continue;
      const type = prefix === 'sync-conflict-' ? 'progress' : 'spec-tree';
      const filePath = join(runtimeDir, f);
      try {
        const cf = JSON.parse(readFileSync(filePath, 'utf8'));
        conflicts.push({
          change: cf.change || f.replace(/^spec-sync-conflict-|^sync-conflict-/, '').replace(/\.json$/, ''),
          created_at: cf.created_at || null,
          path: filePath,
          type,
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
 * 便捷函数导出 — 供 index.js 直接调用（platform 子命令分发生在 index.js case 'platform'）。
 * HUB-10：原此处另有内嵌 syncModule(args) CLI 分发死代码（全仓零调用、参数形态/子命令面与
 * index.js 实际分叉——位置参数 token、缺 pull/resolve/pointer、多余 approval/check-approval），
 * 误导维护者改错地方，已删除。
 */
export async function connect(url, token, cwd) {
  return new SyncManager(cwd).connect(url, token);
}

export async function disconnect(cwd) {
  return new SyncManager(cwd).disconnect();
}

export async function sync(changeName, cwd, opts) {
  return new SyncManager(cwd).sync(changeName, opts);
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

// X2（task-14 / FR-07 / FR-08）：spec 整树快照拉取便捷导出（index.js 顶层 pull --spec 命令用，
// 与 SyncManager.pullSpecBundle 实例方法共用实现）。快照语义见实例方法 docstring（design §7.4）。
export async function pullSpecBundle(cwd, opts) {
  return new SyncManager(cwd).pullSpecBundle(opts);
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
export async function syncSpecTreeOnly(changeName, cwd, opts = {}) {
  const sm = new SyncManager(cwd);
  const platform = sm._getPlatform();
  if (!platform) return { synced: 0 };
  // 树根与 sync() 内链式推送同源（BUG-01：平台模式必须锚 specRoot，防本地空树触发全量 delete）
  return syncSpecTree(safePlatformSpecDir(cwd) || join(cwd, '.sillyspec'), platform, changeName, { signal: opts.signal });
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
