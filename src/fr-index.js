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
  // L2（2026-09-20-fr-index-l2）：决策覆盖矩阵解析——requirements.md 尾表行
  // `| D-xxx@vN | FR-01, FR-02 |` 提取 D→FR-NN 映射（local 号），归档时随条目落「依据决策：」行。
  // 格式漂移/缺矩阵 → decisions 恒 []（省略行降级，不阻断归档）。
  const decisionMap = new Map();
  for (const line of lines) {
    const m = line.match(/^\|\s*(D-\d+@v\d+)\s*\|([^|]+)\|/);
    if (!m) continue;
    for (const tok of m[2].split(/[,，、]/)) {
      const fr = tok.trim().match(/^(FR-\d+)$/);
      if (!fr) continue;
      if (!decisionMap.has(fr[1])) decisionMap.set(fr[1], []);
      decisionMap.get(fr[1]).push(m[1]);
    }
  }
  let cur = null;
  // L2 厚版（D-003@v2）：GWT 行捕获——Given/When/Then 归最近场景名下（无名归默认场景）。
  // scenarioBodies: [{name, given, when, then}]；scenarios（名字数组）保留 L1 契约不动。
  for (const line of lines) {
    const h = line.match(/^###\s+(FR-\d+)\s*[:：]\s*(.*)$/);
    if (h) {
      if (cur) frs.push(cur);
      cur = { local: h[1], title: (h[2] || '').trim(), supersedes: [], scenarios: [], decisions: decisionMap.get(h[1]) || [], __bodies: [{ name: null, given: '', when: '', then: '' }] };
      continue;
    }
    if (!cur) continue;
    const s = line.match(/^\s*承接\s*[:：]\s*(.+)$/);
    if (s) {
      for (const tok of s[1].split(/[,，、]/)) {
        const t = tok.trim();
        if (!t) continue;
        // 退役理由语法（追平刀②，对标 OpenSpec REMOVED 语义）：`FR-域-NNN（退役理由：一句话）`
        //——理由随承接令牌走，翻链时写进被取代条目。理由内禁逗号（token 切分边界）。
        const rm = t.match(/^(FR-[A-Za-z0-9-]+)[（(]\s*退役理由[：:]\s*([^）)]+)[）)]$/);
        if (rm) {
          if (FR_GLOBAL_ID_RE.test(rm[1])) {
            cur.supersedes.push(rm[1]);
            if (!cur.supersedeReasons) cur.supersedeReasons = {};
            cur.supersedeReasons[rm[1]] = rm[2].trim();
          } else {
            malformed.push(`${cur.local} 的承接行退役理由令牌含非全局 id 形态「${rm[1]}」（应为 FR-<域>-NNN）`);
          }
          continue;
        }
        if (FR_GLOBAL_ID_RE.test(t)) cur.supersedes.push(t);
        else malformed.push(`${cur.local} 的承接行含非全局 id 形态「${t}」（应为 FR-<域>-NNN）`);
      }
      continue;
    }
    const sc = line.match(/^\s*(?:#{2,4}\s*场景\s*[:：]\s*(.+)|\*\*场景\s*[:：]\s*([^*]+)\*\*)\s*$/);
    if (sc) {
      const name = ((sc[1] || sc[2] || '')).trim() || `场景${cur.scenarios.length + 1}`;
      cur.scenarios.push(name);
      cur.__bodies.push({ name, given: '', when: '', then: '' });
      continue;
    }
    const gwt = line.match(/^\s*(Given|When|Then)\s+(.+)$/i);
    if (gwt) {
      const body = cur.__bodies[cur.__bodies.length - 1];
      const key = gwt[1].toLowerCase();
      body[key] = (body[key] ? body[key] + ' ' : '') + gwt[2].trim();
      // 无名默认场景已收 GWT → 命名并同步进 scenarios 名字数组（L1 摘要契约兼容）
      if (body.name === null && cur.scenarios.length === 0 && (body.given || body.when || body.then)) {
        cur.scenarios.push('默认场景');
        body.name = '默认场景';
      }
    }
  }
  if (cur) frs.push(cur);
  // 剥离内部键，暴露 scenarioBodies（有 GWT 内容的体块才进）
  for (const fr of frs) {
    fr.scenarioBodies = (fr.__bodies || []).filter((b) => b.name !== null || b.given || b.when || b.then).map((b) => ({ name: b.name, given: b.given, when: b.when, then: b.then }));
    delete fr.__bodies;
  }
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
        `> 模块卡：modules/${domain}.md（域=模块 id 同构；行为条目↔模块契约互跳）`,
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
  // L2：依据决策行（决策覆盖矩阵提取；空省略——旧条目无此行照常解析）。
  if (Array.isArray(entry.decisions) && entry.decisions.length > 0) {
    lines.push(`依据决策：${entry.decisions.join('、')}`);
  }
  // L2 厚版（D-003@v2）：场景正文块——每场景一行（各段截 80 字，≤5 场景）。
  // 空体块省略整块；回填幂等锚=「场景正文：」行在场即跳过。
  const bodies = (entry.scenarioBodies || []).filter((b) => b.given || b.when || b.then).slice(0, 5);
  if (bodies.length > 0) {
    lines.push('场景正文：');
    const cut = (s) => String(s || '').slice(0, 80);
    for (const b of bodies) {
      const parts = [`Given ${cut(b.given)}`, `When ${cut(b.when)}`, `Then ${cut(b.then)}`].filter((p) => !p.endsWith(' '));
      lines.push(`- 场景：${b.name || '默认场景'} — ${parts.join('；')}`);
    }
  }
  // 全文锚（追平刀①）：正文是截断摘要，全文活在来源归档——引用行不复制正文零体积税，
  // 锚=归档 requirements.md 内的 FR 局部号标题（### FR-NN:），docs-check 层1 可校验存在性。
  if (entry.local) {
    lines.push(`全文：.sillyspec/changes/archive/${entry.change}/requirements.md#${entry.local}`);
  }
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
      lines: renderFrLines({ id, title: fr.title, change: changeName, scenarios: fr.scenarios, decisions: fr.decisions, scenarioBodies: fr.scenarioBodies, local: fr.local }, headHash),
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
          .filter((l) => !l.startsWith('superseded_by：') && !l.startsWith('取代链：') && !l.startsWith('退役理由：'));
        const stateIdx = target.lines.findIndex((l) => l.startsWith('状态：'));
        // 退役理由（追平刀②）：承接令牌带（退役理由：…）时写进被取代条目——对标 OpenSpec REMOVED
        // 的 Migration 语义；无理由则省略行（不伪造）。
        const reason = fr.supersedeReasons && fr.supersedeReasons[refId];
        target.lines.splice(stateIdx + 1, 0,
          `superseded_by：${id}`,
          `取代链：${refId} ← ${id}（${changeName} 承接）`,
          ...(reason ? [`退役理由：${reason}`] : []));
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
 * L2 厚版（D-003@v2 / FR-04）：存量回填——active 条目缺「场景正文：」块 → 从其来源
 * 变更的归档 requirements.md 按标题匹配补齐（fallback 按序）。幂等：已有正文块的条目
 * 跳过；来源归档缺失/标题不匹配 → 警告不阻断。回填只动正文块，其余行（摘要/依据决策/
 * 状态链/最近确认）原样保留。
 * @param {object} opts
 * @param {string} opts.knowledgeRoot - knowledge/ 目录
 * @param {string} opts.archiveRoot - changes/archive/ 目录
 * @returns {{backfilled: Array<{file,id,title}>, skipped: number, warnings: string[]}}
 */
export function backfillScenarioBodies({ knowledgeRoot, archiveRoot }) {
  const backfilled = [];
  const warnings = [];
  let skipped = 0;
  // 归档 requirements 缓存：changeName → parse 结果（多条目共享一次读盘）
  const parsedCache = new Map();
  const parseArchive = (changeName) => {
    if (parsedCache.has(changeName)) return parsedCache.get(changeName);
    const dir = join(archiveRoot, changeName);
    let result = null;
    try { result = parseChangeRequirements(dir); } catch { result = { missing: true, frs: [] }; }
    if (!result || result.missing) {
      warnings.push(`来源归档缺 requirements.md：${changeName}（该条目正文不回填）`);
    }
    parsedCache.set(changeName, result);
    return result;
  };
  let files;
  try { files = readdirSync(frDirPath(knowledgeRoot)).filter((f) => f.endsWith('.md')); }
  catch { return { backfilled: [], skipped: 0, warnings: ['knowledge/fr 目录不可读'] }; }
  for (const f of files) {
    const p = join(frDirPath(knowledgeRoot), f);
    let content;
    try { content = readFileSync(p, 'utf8'); } catch (e) { warnings.push(`读 ${f} 失败（${e && e.code ? e.code : 'error'}）跳过`); continue; }
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    // 按条目分段：## 开头为新段；段内判定「场景正文：」在场性
    const out = [];
    let sectionLines = [];
    let sectionMeta = null; // {title, change, hasBody, backfilled}
    const flushSection = () => {
      if (sectionMeta === null) return;
      // 全文锚回填（追平刀①）：独立于正文块——已有正文（或 superseded）的条目缺锚同样补
      //（正文块早退分支之前的必经路径；锚插入位=场景正文/摘要行后）。
      let anchoredThisSection = false;
      if (sectionMeta.change && !sectionLines.some((l) => l.startsWith('全文：'))) {
        const parsedA = parseArchive(sectionMeta.change);
        if (parsedA && !parsedA.missing) {
          let srcA = parsedA.frs.find((fr) => (fr.title || '').trim() === sectionMeta.title);
          if (!srcA) srcA = parsedA.frs[sectionMeta.ordInChange - 1] || null;
          if (srcA) {
            const isSceneLine = (l) => l.startsWith('场景正文：') || l.startsWith('- 场景：');
            const aIdx = sectionLines.findLastIndex ? sectionLines.findLastIndex(isSceneLine) : -1;
            const fallbackIdx = sectionLines.findLastIndex ? sectionLines.findLastIndex((l) => l.startsWith('摘要：')) : -1;
            sectionLines.splice(Math.max(aIdx, fallbackIdx) + 1, 0, `全文：.sillyspec/changes/archive/${sectionMeta.change}/requirements.md#${srcA.local}`);
            backfilled.push({ file: `fr/${f}`, id: sectionMeta.id, title: sectionMeta.title, what: '全文锚' });
            anchoredThisSection = true;
          }
        }
      }
      if (sectionMeta.hasBody || !sectionMeta.change) {
        if (!sectionMeta.hasBody) skipped++;
        out.push(...sectionLines);
        return;
      }
      const parsed = parseArchive(sectionMeta.change);
      if (!parsed || parsed.missing) { skipped++; out.push(...sectionLines); return; }
      // 标题匹配（剥 FR-x-NNN 前缀后的标题全等；fallback 按序：本域文件中该来源变更的第 n 条）
      const bareTitle = sectionMeta.title;
      let src = parsed.frs.find((fr) => (fr.title || '').trim() === bareTitle);
      if (!src) {
        const sameChange = parsed.frs;
        src = sameChange[sectionMeta.ordInChange - 1] || null;
        if (src) warnings.push(`${f} 的「${sectionMeta.title}」按序匹配回填（标题不精确匹配——建议核对）`);
      }
      const bodies = src && Array.isArray(src.scenarioBodies) ? src.scenarioBodies.filter((b) => b.given || b.when || b.then).slice(0, 5) : [];
      if (!src || bodies.length === 0) {
        if (!anchoredThisSection) {
          warnings.push(`${f} 的「${sectionMeta.title}」来源无场景正文可回填（跳过）`);
          skipped++;
        }
        out.push(...sectionLines);
        return;
      }
      // 就地插入：状态行后（依据决策行若有则其后）
      const insertAfter = Math.max(
        sectionLines.findLastIndex ? sectionLines.findLastIndex((l) => l.startsWith('依据决策：')) : -1,
        sectionLines.findLastIndex ? sectionLines.findLastIndex((l) => l.startsWith('摘要：')) : -1,
      );
      const block = ['场景正文：'];
      const cut = (s) => String(s || '').slice(0, 80);
      for (const b of bodies) {
        const parts = [`Given ${cut(b.given)}`, `When ${cut(b.when)}`, `Then ${cut(b.then)}`].filter((x) => !x.endsWith(' '));
        block.push(`- 场景：${b.name || '默认场景'} — ${parts.join('；')}`);
      }
      sectionLines.splice(insertAfter + 1, 0, ...block);
      backfilled.push({ file: `fr/${f}`, id: sectionMeta.id, title: sectionMeta.title });
      out.push(...sectionLines);
    };
    let ordCounter = new Map(); // changeName → 该来源在当前文件已见条目数
    for (const line of lines) {
      const hm = line.match(/^##\s+(FR-[A-Za-z0-9-]+)\s+(.*)$/);
      if (hm) {
        flushSection();
        sectionLines = [line];
        const changeLine = null; // 变更行在下文读取；先记标题
        sectionMeta = { title: hm[2].trim(), change: null, hasBody: false, id: hm[1], ordInChange: 0 };
        continue;
      }
      sectionLines.push(line);
      if (sectionMeta) {
        if (line.startsWith('变更：')) {
          sectionMeta.change = line.replace(/^变更：\s*/, '').trim();
          const n = (ordCounter.get(sectionMeta.change) || 0) + 1;
          ordCounter.set(sectionMeta.change, n);
          sectionMeta.ordInChange = n;
        }
        if (line.startsWith('状态：superseded')) sectionMeta.hasBody = true; // superseded 条目不回填（历史回溯面）
        if (line.startsWith('场景正文：')) sectionMeta.hasBody = true;
      }
    }
    flushSection();
    if (backfilled.length > 0 || content !== out.join('\n')) {
      // 仅当本文件确有回填才写盘（无回填保持字节不变）
      const orig = content.replace(/\r\n/g, '\n');
      if (out.join('\n') !== orig) {
        try { writeFileSync(p, out.join('\n')); } catch (e) { warnings.push(`写 ${f} 失败（${e && e.message ? e.message : e}）`); }
      }
    }
  }
  return { backfilled, skipped, warnings };
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
      const decisionLine = s.lines.find((l) => l.startsWith('依据决策：'));
      const decisions = decisionLine ? decisionLine.replace(/^依据决策：s*/, '').split('、').map((x) => x.trim()).filter(Boolean) : [];
      const scenarios = scenarioLine ? scenarioLine.replace(/^摘要：\s*/, '').split('；').map((x) => x.trim()).filter(Boolean) : [];
      out.push({ domain, id: s.number, title: s.title || '', change: s.change || '', scenarios, decisions });
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
