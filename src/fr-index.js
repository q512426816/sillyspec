/**
 * fr-index.js — FR 稳定索引核心（L1：稳定 id + knowledge 索引 + 取代标记）
 *
 * 2026-09-18-fr-index-l1（三轮评审+战略定位定稿）：requirements.md 归档后首次被语义消费——
 * 全局稳定 id（FR-<域>-NNN，archive 时 CLI 发号）+ knowledge/fr/<域>.md 索引 + 承接引用驱动的
 * 取代链。定位=**L3 的证据发生器**：四类遥测事件（fr-inject/fr-supersede/fr-duplicate-warning/
 * fr-unreferenced，由消费方经 knowledge-hits.js 落盘）供 20-30 change 后裁决活规格真源——
 * 含证伪出口（design 实验裁决条款：承接引用率趋零/链无人跟/重复靠人眼 ⇒ 可杀可冻 L3，索引降级检索面）。
 *
 * 纪律：
 *   - CLI 单一写入方：索引只在 indexRequirements 内部写（archive noAI 步调用）；
 *   - 幂等键=全局 id（「来源变更」字段变更名命中即 no-op——同变更重跑零新增零漂移）；
 *   - 承接 id 不存在 → warnings 收集不阻断（typo 不炸归档）；
 *   - 未引用旧 FR 的删除/修改零判定（D-002 边界——undeclared deletion 是 L3 合并门禁领地，
 *     L1 只经 unreferenced 计数采观察信号，显式「不算 L3 门禁」）；
 *   - 域文件读写复用 decision-distill 参数化底座（splitKnowledgeSections/joinKnowledgeFile/
 *     syncIndexRoutingLines/discoverModuleIndex），不复制实现。
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  splitKnowledgeSections,
  joinKnowledgeFile,
  syncIndexRoutingLines,
  discoverModuleIndex,
} from './decision-distill.js';

/** epoch：此前归档不检查/不索引（存量 93 份不回填——不伪造历史，D-007）。 */
export const FR_INDEX_EPOCH = '2026-09-18';

const FR_DIR = 'fr';
/** FR 节头：## FR-<域>-NNN 标题（域=[a-z0-9-] **含连字符**——真实模块 id 多为 cli-entry/core-engine 等连字符形态，
 *  R1 审查阻断①实证：漏 - 会让连字符域的发号/幂等/解析/承接全断。第二组为非捕获可选占位，
 *  三组结构与底座 splitKnowledgeSections 的 decisions 正则对齐（m[3]=标题，勿改组序）。 */
const FR_SECTION_RE = /^## (FR-[a-z0-9-]+-\d+)(?:@v(\d+))?\s*(.*)$/;
const FR_GLOBAL_ID_RE = /^FR-[a-z0-9-]+-\d+$/;

/**
 * 解析变更 requirements.md 的 FR 块。
 * 形态（brainstorm step8 指引）：`### FR-NN: 标题` + 可选 `承接: FR-<域>-NNN[, ...]` 行 +
 * Given/When/Then 块（场景名取 `#### 场景：X` 或 `**场景：X**` 行；无场景名的 GWT 块按序号占位）。
 * @returns {{ missing: boolean, frs: Array<{local:string,title:string,supersedes:string[],scenarios:string[]}>, malformed: string[] }}
 */
export function parseChangeRequirements(changeDir) {
  const p = join(changeDir, 'requirements.md');
  if (!existsSync(p)) return { missing: true, frs: [], malformed: [] };
  let content;
  try {
    content = readFileSync(p, 'utf8');
  } catch {
    return { missing: true, frs: [], malformed: [] };
  }
  const frs = [];
  const malformed = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^###\s+(FR-\d+)\s*[:：]\s*(.*)$/);
    if (h) {
      if (cur) frs.push(cur);
      cur = { local: h[1], title: (h[2] || '').trim(), supersedes: [], scenarios: [] };
      continue;
    }
    if (!cur) continue;
    const s = line.match(/^\s*承接\s*[:：]\s*(.+)$/);
    if (s) {
      for (const tok of s[1].split(/[,，、]/)) {
        const id = tok.trim();
        if (!id) continue;
        if (FR_GLOBAL_ID_RE.test(id)) cur.supersedes.push(id);
        else malformed.push(`${cur.local} 的承接行含非全局 id 形态「${id}」（应为 FR-<域>-NNN）`);
      }
      continue;
    }
    const sc = line.match(/^\s*(?:#{2,4}\s*场景\s*[:：]\s*(.+)|\*\*场景\s*[:：]\s*([^*]+)\*\*)\s*$/);
    if (sc) {
      const name = ((sc[1] || sc[2] || '')).trim();
      cur.scenarios.push(name || `场景${cur.scenarios.length + 1}`);
    }
  }
  if (cur) frs.push(cur);
  return { missing: false, frs, malformed };
}

/** 域解析（导出供注入/软门消费）：变更自身 design.md 文件变更清单表行（剥 NEW: 前缀）× moduleIndex paths 前缀匹配；无匹配 → unmapped。 */
export function resolveTouchedDomains(changeDir, moduleIndex) {
  const domains = new Set();
  const designPath = join(changeDir, 'design.md');
  if (moduleIndex && existsSync(designPath)) {
    let design;
    try {
      design = readFileSync(designPath, 'utf8');
    } catch {
      design = '';
    }
    for (const line of design.replace(/\r\n/g, '\n').split('\n')) {
      const m = line.match(/^\|\s*(?:新增|修改|删除)\s*\|\s*(?:NEW:)?([^\s|]+)\s*\|/);
      if (!m) continue;
      const filePath = m[1].trim();
      for (const [modId, mod] of Object.entries(moduleIndex)) {
        const paths = (mod && Array.isArray(mod.paths)) ? mod.paths : [];
        if (paths.some((pp) => filePath === pp || filePath.startsWith(pp.endsWith('/') ? pp : pp + '/'))) {
          domains.add(modId);
        }
      }
    }
  }
  if (domains.size === 0) domains.add('unmapped');
  return [...domains];
}

/** 域文件路径与域索引读写（复用参数化底座；FR 节无版本段，id 恒等）。 */
function frDirPath(knowledgeRoot) {
  return join(knowledgeRoot, FR_DIR);
}

function loadDomainSections(knowledgeRoot, domain) {
  const p = join(frDirPath(knowledgeRoot), `${domain}.md`);
  if (!existsSync(p)) {
    return {
      preamble: [
        '---',
        `author: sillyspec-fr-index`,
        `created_at: ${new Date().toISOString()}`,
        '---',
        '',
        `# FR 索引 — ${domain}`,
        '',
        '> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。',
        '> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。',
        '',
      ],
      sections: [],
    };
  }
  try {
    return splitKnowledgeSections(readFileSync(p, 'utf8'), {
      sectionRegex: FR_SECTION_RE,
      buildId: (n) => n,
    });
  } catch {
    return { preamble: [], sections: [] };
  }
}

function renderFrLines(entry, headHash) {
  const lines = [`## ${entry.id} ${entry.title}`];
  // 归属行键用「变更：」——与 decision-distill splitKnowledgeSections 的机械解析契约对齐
  // （design 接口定义示例中的「来源变更」即本字段，语义等价，取解析器认的字面）
  lines.push(`变更：${entry.change}`);
  lines.push(`状态：${entry.supersededBy ? 'superseded' : 'active'}`);
  if (entry.supersededBy) lines.push(`superseded_by：${entry.supersededBy}`);
  if (entry.supersededOf) lines.push(`取代链：${entry.supersededOf} ← 本条目（${entry.change} 承接）`);
  lines.push(`摘要：${(entry.scenarios || []).slice(0, 5).join('；') || '（无场景名）'}`);
  lines.push(`最近确认：${headHash || ''}`);
  return lines;
}

/** 全域条目扫描：domain → sections（供发号取 max、承接翻链、在场性检查）。 */
function scanAllDomains(knowledgeRoot) {
  const out = new Map();
  try {
    for (const f of readdirSync(frDirPath(knowledgeRoot))) {
      if (!f.endsWith('.md')) continue;
      const domain = f.replace(/\.md$/, '');
      out.set(domain, loadDomainSections(knowledgeRoot, domain));
    }
  } catch { /* 目录不存在 → 空索引 */ }
  return out;
}

function nextIdForDomain(domain, allSections) {
  let max = 0;
  const re = new RegExp(`^FR-${domain.replace(/[-]/g, '-')}-(\\d+)$`);
  for (const st of allSections.values()) {
    for (const s of st.sections) {
      const m = (s.number || '').match(re);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return `FR-${domain}-${String(max + 1).padStart(3, '0')}`;
}

/**
 * 归档索引主入口（幂等）：解析 → 域解析 → 发号 → 承接翻链 → 写域文件 → INDEX 路由。
 * @param {{ changeDir: string, knowledgeRoot: string, headHash?: string, cwd?: string }} args
 * @returns {{ skipped?: string, written: Array<{file,id,action}>, superseded: Array<{from,to,change}>, unreferenced: Array<{domain,count}>, warnings: string[] }}
 */
export function indexRequirements({ changeDir, knowledgeRoot, headHash = '' }) {
  const changeName = changeDir.split(/[\\/]/).pop();
  const parsed = parseChangeRequirements(changeDir);
  if (parsed.missing) {
    return { skipped: 'requirements.md 不存在（quick/scale:small 无索引义务）', written: [], superseded: [], unreferenced: [], warnings: [] };
  }
  if (parsed.frs.length === 0) {
    return { skipped: 'requirements.md 无 FR 块', written: [], superseded: [], unreferenced: [], warnings: [] };
  }

  const warnings = [...parsed.malformed];
  const moduleIndex = discoverModuleIndex(knowledgeRoot);
  const domains = resolveTouchedDomains(changeDir, moduleIndex);
  const all = scanAllDomains(knowledgeRoot);

  // 幂等闸门：任一域文件已有本变更「来源变更」条目 → 全量 no-op（同变更重跑零新增零漂移）
  for (const st of all.values()) {
    if (st.sections.some((s) => s.change === changeName)) {
      return { written: [], superseded: [], unreferenced: [], warnings };
    }
  }

  // 承接校验：引用的全局 id 必须在现有索引中存在（typo → warn 不阻断）
  const knownIds = new Set();
  for (const st of all.values()) for (const s of st.sections) knownIds.add(s.number);
  const refIds = new Set();
  for (const fr of parsed.frs) for (const id of fr.supersedes) refIds.add(id);
  for (const id of refIds) {
    if (!knownIds.has(id)) warnings.push(`承接引用的 ${id} 不在索引中（域拼错或号不存在）——该引用不翻链，请核对`);
  }

  // 发号 + 写入（每 FR 落其首个触达域；多域变更按域去重逐条落）
  const written = [];
  const superseded = [];
  const perDomainCounter = new Map();
  const ensureDomain = (domain) => {
    if (!all.has(domain)) all.set(domain, loadDomainSections(knowledgeRoot, domain));
    return all.get(domain);
  };
  // 发号与翻链：每条 FR 落**首个触达域**（primary domain）取一个全局 id——幂等键=全局 id 单一身份
  // （R1 审查缺口：per-domain × per-FR 会给同一 FR 发 N 个 id，违背 D-001 单一身份）；
  // 承接翻链可跨全域命中目标条目（新条目在 primary 域，旧条目可在任何域）。
  const dirtyDomains = new Set();
  const primaryDomain = domains[0];
  const st = ensureDomain(primaryDomain);
  for (const fr of parsed.frs) {
    const id = nextIdForDomain(primaryDomain, all);
    perDomainCounter.set(primaryDomain, (perDomainCounter.get(primaryDomain) || 0) + 1);
    st.sections.push({
      number: id,
      version: NaN,
      id,
      title: fr.title,
      change: changeName,
      lines: renderFrLines({ id, title: fr.title, change: changeName, scenarios: fr.scenarios }, headHash),
    });
    dirtyDomains.add(primaryDomain);
    written.push({ file: `${FR_DIR}/${primaryDomain}.md`, id, action: 'added' });
    // 本 FR 的承接引用 → 翻旧条目（跨全域扫描目标段；就地补丁不动原摘要——R1 审查缺口：整段重写会抹掉摘要）
    for (const refId of fr.supersedes) {
      if (!knownIds.has(refId)) continue;
      for (const [st2Domain, st2] of all.entries()) {
        const target = st2.sections.find((s) => s.number === refId && !s.lines.some((l) => l.startsWith('superseded_by：')));
        if (!target) continue;
        // 就地补丁：状态翻 superseded + 插 superseded_by + 追取代链注记 + 刷新最近确认（摘要/标题保留）
        target.lines = target.lines
          .map((l) => (l.startsWith('状态：') ? `状态：superseded` : l.startsWith('最近确认：') ? `最近确认：${headHash || ''}` : l))
          .filter((l) => !l.startsWith('superseded_by：') && !l.startsWith('取代链：'));
        const stateIdx = target.lines.findIndex((l) => l.startsWith('状态：'));
        target.lines.splice(stateIdx + 1, 0, `superseded_by：${id}`, `取代链：${refId} ← ${id}（${changeName} 承接）`);
        dirtyDomains.add(st2Domain);
        superseded.push({ from: refId, to: id, change: changeName });
      }
    }
  }

  // unreferenced 探针（D-008 护栏③）：触达域 active 条目未被本次承接引用的计数——观察信号，不算 L3 门禁
  const unreferenced = [];
  for (const domain of domains) {
    const stx = all.get(domain);
    if (!stx) continue;
    const activeIds = stx.sections
      .filter((s) => !s.lines.some((l) => l.startsWith('superseded_by：')))
      .map((s) => s.number)
      .filter((n) => n && !written.some((w) => w.id === n));
    const count = activeIds.filter((id) => !refIds.has(id)).length;
    if (count > 0) unreferenced.push({ domain, count });
  }

  // 落盘（dirty 集=新条目域 ∪ 翻链命中域——R1 审查阻断②：漏翻链域会返回值谎报成功但盘上丢失）
  mkdirSync(frDirPath(knowledgeRoot), { recursive: true });
  for (const d of dirtyDomains) {
    const stx = all.get(d);
    writeFileSync(join(frDirPath(knowledgeRoot), `${d}.md`), joinKnowledgeFile(stx.preamble, stx.sections));
  }
  if (written.length > 0 || superseded.length > 0) {
    syncIndexRoutingLines(knowledgeRoot, {
      section: 'FR 需求索引',
      subdir: FR_DIR,
      makeLine: (d) => `- ${d}|FR|需求|承接 → [${FR_DIR}/${d}.md](${FR_DIR}/${d}.md)`,
    });
  }

  return { written, superseded, unreferenced, warnings };
}

/**
 * 全量索引扫描（doctor D14 第四检查消费）：全部域的全部条目（含 superseded）拍平。
 * @returns {Array<{domain,id,title,change,supersededBy:string|null}>} fr/ 目录不存在 → []
 */
export function scanFrIndex(knowledgeRoot) {
  const out = [];
  let files = [];
  try {
    files = readdirSync(frDirPath(knowledgeRoot)).filter((f) => f.endsWith('.md'));
  } catch {
    return out;
  }
  for (const f of files) {
    const domain = f.replace(/\.md$/, '');
    const st = loadDomainSections(knowledgeRoot, domain);
    for (const s of st.sections) {
      const sup = s.lines.find((l) => l.startsWith('superseded_by：'));
      out.push({
        domain,
        id: s.number,
        title: s.title || '',
        change: s.change || '',
        supersededBy: sup ? sup.replace(/^superseded_by：\s*/, '').trim() : null,
      });
    }
  }
  return out;
}

/**
 * 注入源：触达域的 active 条目（superseded 默认藏——D-004）。
 * @returns {Array<{domain,id,title,change,scenarios:string[]}>}
 */
export function readActiveFrDigest(knowledgeRoot, domains) {
  const out = [];
  for (const domain of domains || []) {
    const st = loadDomainSections(knowledgeRoot, domain);
    for (const s of st.sections) {
      if (s.lines.some((l) => l.startsWith('superseded_by：'))) continue;
      const scenarioLine = s.lines.find((l) => l.startsWith('摘要：'));
      const scenarios = scenarioLine ? scenarioLine.replace(/^摘要：\s*/, '').split('；').map((x) => x.trim()).filter(Boolean) : [];
      out.push({ domain, id: s.number, title: s.title || '', change: s.change || '', scenarios });
    }
  }
  return out;
}

/**
 * 标题 bigram 重叠率（中英混排零依赖）：字符 bigram 集合 |A∩B| / |A∪B|。
 */
export function frTitleOverlap(a, b) {
  const grams = (s) => {
    const t = String(s || '').replace(/\s+/g, '');
    const set = new Set();
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}
