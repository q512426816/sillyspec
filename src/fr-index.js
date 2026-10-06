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

import { readChangeTrace, upsertFrBindings, applySupersededToEntryLines, testAnchorFile, resolveTestFileRel } from './test-bindings.js'
import { suggestDomainFromFiles, snapDomainToDictionary } from './knowledge-digest.js'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { writeAtomicSync } from './fs-atomic.js';
import {
  splitKnowledgeSections,
  joinKnowledgeFile,
  syncIndexRoutingLines,
  discoverModuleIndex,
} from './decision-distill.js';

/** epoch：此前归档不检查/不索引（存量 93 份不回填——不伪造历史，D-007）。 */
export const FR_INDEX_EPOCH = '2026-09-18';

/** design.md 交付清单表行解析（「| 新增|修改|删除 | 路径 |」行，含 NEW: 前缀形态）——剥反引号：
 * 实测 29.4% 厚道交付条目带壳（fr-rot-precision 评审 P1-2），不剥与 git 路径永不相等。
 * 从 resolveTouchedDomains 内部正则抽出公共（frCoverageFiles 与域路由共用同一解析）。 */
export function deliverableFilesFromDesignText(text) {
  const out = [];
  for (const line of String(text || '').replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^\|\s*(?:新增|修改|删除)\s*\|\s*(?:NEW:)?([^\s|]+)\s*\|/);
    if (m) out.push(m[1].trim().replace(/^`+|`+$/g, ''));
  }
  return out;
}

/**
 * FR 覆盖文件集（fr-rot-precision：rot 三分判据/存量清理的文件面底座）——归档变更三源并集：
 * ①design.md 交付表（厚道主源，剥反引号）②change-patch.json 的 files（thin 主源——thin 归档
 * 27/30 在场，早期 3 份缺补位靠绑定）③（绑定由消费方并入——readActiveFrDigest.bindings）。
 * 统一剔 .sillyspec/ 前缀（内部产物≠交付面）；POSIX 归一；fail-soft（缺件=空贡献）。
 * 匹配口径（消费方约定）：changed 恒为文件级路径，判定用单向「相等 || changed.startsWith(cov 补/ 结尾)」。
 */
export function frCoverageFiles({ archiveRoot, changeName }) {
  const out = new Set();
  const dir = join(archiveRoot, String(changeName || ''));
  try {
    const dp = join(dir, 'design.md');
    if (existsSync(dp)) {
      for (const f of deliverableFilesFromDesignText(readFileSync(dp, 'utf8'))) {
        const v = f.replace(/\\/g, '/').replace(/\/+$/, '');
        if (v) out.add(v);
      }
    }
  } catch { /* 源1 fail-soft */ }
  try {
    const pp = join(dir, 'change-patch.json');
    if (existsSync(pp)) {
      const j = JSON.parse(readFileSync(pp, 'utf8'));
      for (const f of (Array.isArray(j && j.files) ? j.files : [])) {
        const v = String(f || '').replace(/\\/g, '/').replace(/\/+$/, '');
        if (v) out.add(v);
      }
    }
  } catch { /* 源2 fail-soft */ }
  return [...out].filter((p) => !p.startsWith('.sillyspec/'));
}

/** 条目「测试绑定：」子块的 tests 文件提取（多文件 | 分隔）。边界=下一个 ## 节头（FR 节）——
 * 子块内顶格的 `<!-- test-bindings -->` 机器注释与 `- row:` 行不终止收集（评审 P1 修复：
 * 原「任意顶格行 break」遇子块首行顶格注释即断，生产库 bindings 恒空；缩进 tests: 键名 +
 * 节头边界已足够防条目正文误匹配）。readActiveFrDigest.bindings 与 activeFrCoverageHits 共用。 */
function readEntryBindings(lines) {
  const idx = lines.findIndex((l) => l.startsWith('测试绑定：'));
  if (idx === -1) return [];
  const out = [];
  for (const l of lines.slice(idx + 1)) {
    if (/^##\s/.test(l)) break; // 下一节头=条目边界
    const m = l.match(/^\s+tests:\s*(.+)$/);
    if (m) {
      for (const t of m[1].split('|')) {
        const v = t.trim().replace(/^['"]|['"]$/g, '');
        if (v) out.push(v.replace(/\\/g, '/'));
      }
    }
  }
  return out;
}

/** 条目未确认绑定行计数（2026-09-27-confirm-on-use）：绑定子块内 confirmed_by≠agent 的
 * `- row:` 块数——机器提升行恒 candidate/null（状态机有机制无消费者的病灶面），注入面据此
 * 打 ⚪N未确认 标记 + 抽查确认提示。行块边界=下一个 `- row:` 或节头。 */
export function readEntryUnconfirmed(lines) {
  const idx = lines.findIndex((l) => l.startsWith('测试绑定：'));
  if (idx === -1) return 0;
  let unconfirmed = 0
  let inRow = false
  let rowConfirmed = false
  for (const l of lines.slice(idx + 1)) {
    if (/^##\s/.test(l)) break
    if (/^-\s+row:/.test(l)) {
      if (inRow && !rowConfirmed) unconfirmed++
      inRow = true; rowConfirmed = false; continue
    }
    if (inRow && /^\s+confirmed_by:\s*agent\s*$/.test(l)) rowConfirmed = true
  }
  if (inRow && !rowConfirmed) unconfirmed++
  return unconfirmed
}

/** 标题 bigram 重叠判「重复嫌疑/承接漏写」的阈值（fr-index 判据函数与两处消费方——brainstorm
 * 软门（stage-contract.js）与轻量道 dup 软门（flow.js）——共用同一常量，防两处各写一份字面量
 * 漂移（fr-rot-precision 评审 P3 清偿：改阈值只改这里）。 */
export const FR_TITLE_OVERLAP_THRESHOLD = 0.6;

const FR_DIR = 'fr';
/** FR 节头：## FR-<域>-NNN 标题（域=[a-z0-9-] **含连字符**——真实模块 id 多为 cli-entry/core-engine 等连字符形态，
 *  R1 审查阻断①实证：漏 - 会让连字符域的发号/幂等/解析/承接全断。第二组为非捕获可选占位，
 *  三组结构与底座 splitKnowledgeSections 的 decisions 正则对齐（m[3]=标题，勿改组序）。 */
export const FR_SECTION_RE = /^## (FR-[a-z0-9-]+-\d+)(?:@v(\d+))?\s*(.*)$/;
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

/** 域解析（导出供注入/软门消费）：变更自身 design.md 文件变更清单表行（剥 NEW: 前缀）× moduleIndex paths 前缀匹配；
 * 无匹配 → 伪域回退（auto-<路径段>，按文件路径段投票——2026-09-21 R5R 实证主仓 706 条 FR 落
 * unmapped 大池且 INDEX 路由键为通用词无法命中，模块卡覆盖不足时 FR 复利断路）；无文件清单 → unmapped。
 * filesOverride（2026-09-22-thin-fr-distill-sync）：显式交付文件清单旁路 design.md 解析——轻量变更
 * 变更无 design.md（轻量工件面三件套），flow done 以基线以来交付 diff 供清单，伪域路由同口径。 */
/** 路径 ↔ 模块匹配规则（精确或目录前缀）——resolveTouchedDomains 域路由与 flow start 在场
 * 过滤（坑 module-map-list-leak）共用同一判定的单一来源。@returns {string[]} 命中模块 id */
export function matchedModuleIds(moduleIndex, filePath) {
  if (!moduleIndex) return [];
  const hits = [];
  for (const [modId, mod] of Object.entries(moduleIndex)) {
    const paths = (mod && Array.isArray(mod.paths)) ? mod.paths : [];
    if (paths.some((pp) => filePath === pp || filePath.startsWith(pp.endsWith('/') ? pp : pp + '/'))) {
      hits.push(modId);
    }
  }
  return hits;
}

export function resolveTouchedDomains(changeDir, moduleIndex, filesOverride = null, knowledgeRoot = null) {
  const domains = new Set();
  const designPath = join(changeDir, 'design.md');
  const files = [];
  const matchModules = (filePath) => {
    for (const modId of matchedModuleIds(moduleIndex, filePath)) domains.add(modId);
  };
  if (Array.isArray(filesOverride)) {
    for (const f of filesOverride) {
      const filePath = String(f || '').trim();
      if (!filePath) continue;
      files.push(filePath);
      matchModules(filePath);
    }
  } else if (existsSync(designPath)) {
    let design;
    try {
      design = readFileSync(designPath, 'utf8');
    } catch {
      design = '';
    }
    for (const filePath of deliverableFilesFromDesignText(design)) {
      files.push(filePath);
      matchModules(filePath);
    }
  }
  // 伪域铸造过词典守卫（坑 fr-domain-suggest-typo-and-no-split-migration 缺陷1：路径段投票产出
  // 拼写漂移段时吸附既有域，杜绝 auto-rontend 类伪域凭空出生；knowledgeRoot 缺席=无词典不干预）。
  if (domains.size === 0) domains.add(files.length > 0 ? pseudoDomainFromPaths(files, knowledgeRoot) : 'unmapped');
  return [...domains];
}

// 泛化首段（src/lib/test/...）不承载域语义——目录段里跳过它们取首个具体段。
const GENERIC_PATH_SEGMENTS = new Set(['src', 'lib', 'test', 'tests', 'spec', 'docs', 'doc', 'app', 'packages', 'scripts', 'config', 'public', 'internal']);

/**
 * 文件清单 → 伪域名（auto-<段>）：逐文件取目录段（末段是文件名不投票）里首个非泛化段，
 * 按出现次数投票取众数；全部泛化/根文件 → 'unmapped'。auto- 前缀保证与真实模块 id
 * （模块卡派生）不冲突，且在 fr 文件头与 INDEX 路由键里自明身份。
 */
function pseudoDomainFromPaths(files, knowledgeRoot = null) {
  const votes = new Map();
  for (const f of files) {
    const segs = String(f || '').replace(/\\/g, '/').split('/').filter(Boolean);
    if (segs.length < 2) continue; // 根文件无目录段
    for (const seg of segs.slice(0, -1)) {
      const s = seg.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      if (!s || GENERIC_PATH_SEGMENTS.has(s)) continue;
      votes.set(s, (votes.get(s) || 0) + 1);
      break; // 首个非泛化目录段即该文件的票，一文件一票
    }
  }
  if (votes.size === 0) return 'unmapped';
  const top = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  // 词典守卫（坑 fr-domain-suggest 缺陷1）：top 与既有域编辑距离 ≤1 → 直接落既有域
  //（fr/<既有域>.md 已在场，条目并入真域而非另铸 auto- 拼写漂移壳）；远距离=绿地新模块照旧。
  const snapped = snapDomainToDictionary(top, { knowledgeRoot });
  if (snapped) return snapped;
  return `auto-${top}`;
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
        String(domain).startsWith('auto-')
          ? '> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域'
          : `> 模块卡：modules/${domain}.md（域=模块 id 同构；行为条目↔模块契约互跳）`,
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
  // 骨架标记（2026-10-03-fr-skeleton-gate）：纯骨架条目（全部场景体 Then=flow-draft 占位句）
  // 落「骨架：thin」——注入面据此排除（TierA 覆盖命中例外）；查重/rot/绑定面不受影响。
  if (entry.skeleton) lines.push('骨架：thin');
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
 * @param {{ changeDir: string, knowledgeRoot: string, headHash?: string, cwd?: string, deliverableFiles?: string[] }} args
 *   deliverableFiles：显式交付文件清单（轻量变更无 design.md 时由调用方供基线 diff，域路由同口径）
 * @returns {{ skipped?: string, written: Array<{file,id,action}>, superseded: Array<{from,to,change}>, unreferenced: Array<{domain,count}>, warnings: string[] }}
 */
/** projectRoot 启发式（绑定路径仓根归一用）：specBase 目录名是 .sillyspec 且其父像仓根
 * （.git/package.json/pyproject.toml 在场）→ 父目录；否则 null（不猜——归一跳过保原值）。 */
function deriveProjectRootFromSpec(specBase) {
  try {
    const parent = dirname(specBase)
    if (basename(specBase) === '.sillyspec'
      && (existsSync(join(parent, '.git')) || existsSync(join(parent, 'package.json')) || existsSync(join(parent, 'pyproject.toml')))) return parent
  } catch { /* 启发式失败 → null */ }
  return null
}

export function indexRequirements({ changeDir, knowledgeRoot, headHash = '', deliverableFiles = null, projectRoot = null }) {
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
  const domains = resolveTouchedDomains(changeDir, moduleIndex, deliverableFiles, knowledgeRoot);
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
      lines: renderFrLines({ id, title: fr.title, change: changeName, scenarios: fr.scenarios, decisions: fr.decisions, scenarioBodies: fr.scenarioBodies, local: fr.local, skeleton: isThinSkeletonBodies(fr.scenarioBodies) }, headHash),
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
        // 绑定行同步退役（2026-09-24-fr-test-bindings task-06，fr-test-binding §3.2 四硬约束④）：
        // 被承接条目的绑定行 status→superseded（内存态翻转——文件稍后统一落盘，禁死锚）
        try {
          target.lines = applySupersededToEntryLines(target.lines);
        } catch { /* 绑定翻转 fail-open：翻链语义不受影响 */ }
        // scenario-loss 检测（对标 OpenSpec 同名检查）：被取代条目的场景名在新 FR 场景集
        //（scenarios 名字数组 ∪ scenarioBodies 名）无对应 → warning 提示核对（advisory 不阻断
        //——场景名合法漂移存在，人裁）。旧条目无场景信息（摘要「（无场景名）」/空）不比对。
        const oldNames = new Set();
        for (const l of target.lines) {
          const sm = l.match(/^- 场景：(.+?)\s*—/);
          if (sm) oldNames.add(sm[1].trim());
        }
        const summaryLine = target.lines.find((l) => l.startsWith('摘要：'));
        if (summaryLine && !summaryLine.includes('（无场景名）')) {
          for (const n of summaryLine.replace(/^摘要：\s*/, '').split('；')) {
            const t = n.trim();
            if (t) oldNames.add(t);
          }
        }
        if (oldNames.size > 0) {
          const newNames = new Set([...(fr.scenarios || []), ...((fr.scenarioBodies || []).map((b) => b.name).filter(Boolean))]);
          const dropped = [...oldNames].filter((n) => !newNames.has(n));
          if (dropped.length > 0) {
            warnings.push(`scenario-loss：${refId} 被承接时新 FR 未覆盖旧场景「${dropped.join('、')}」——若非故意丢弃（合并/更名/降维），请在新 FR 场景集补对应场景或在退役理由说明去向`);
          }
        }
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
    const unreferencedIds = activeIds.filter((id) => !refIds.has(id));
    // ids（2026-10-03-fr-governance-telemetry）：条目级信号帽 20——archive-distill 透传进事件，
    // stats 裁决候选视图按 id 聚合（域级计数保留兼容）。
    if (unreferencedIds.length > 0) unreferenced.push({ domain, count: unreferencedIds.length, ids: unreferencedIds.slice(0, 20) });
  }

  // 落盘（dirty 集=新条目域 ∪ 翻链命中域——R1 审查阻断②：漏翻链域会返回值谎报成功但盘上丢失）
  mkdirSync(frDirPath(knowledgeRoot), { recursive: true });
  for (const d of dirtyDomains) {
    const stx = all.get(d);
    writeFileSync(join(frDirPath(knowledgeRoot), `${d}.md`), joinKnowledgeFile(stx.preamble, stx.sections));
  }
  // ── 归档提升（2026-09-24-fr-test-bindings task-06，fr-test-binding §3.2）：本变更 test-trace
  //    的 FR 局部锚行随发号映射铸全局后 upsert 进活库条目机器子块（source_change+row_id 键、
  //    内容全等 no-op、机器不删 agent 行）；orphan/ql 行不在此面（前者留档审计，后者在
  //    quicklog 机器面）。fail-open：提升异常只告警不炸归档（幂等可重跑）。──
  const promotedBindings = [];
  try {
    const traceRows = readChangeTrace(changeDir);
    if (traceRows.length > 0) {
      // 局部→全局映射：本函数发号段 written[{id}] 与 parsed.frs 逐条对应（同循环序）
      const localToGlobal = new Map();
      parsed.frs.forEach((fr, i) => { if (written[i] && written[i].id) localToGlobal.set(fr.local, written[i].id); });
      for (const [local, globalId] of localToGlobal) {
        const rows = traceRows.filter((r) => r.anchor === local);
        if (rows.length === 0) continue;
        // projectRoot 优先调用方（真仓根），缺省启发式自 specBase 推（.sillyspec 父目录像仓根才取）
        const res = upsertFrBindings({ knowledgeRoot, frId: globalId, rows, projectRoot: projectRoot || deriveProjectRootFromSpec(dirname(changeDir)) });
        if (res.ok) promotedBindings.push({ fr: globalId, rows: rows.length, changed: res.changed });
      }
      if (promotedBindings.length > 0) {
        console.log(`🔗 测试绑定归档提升：${promotedBindings.map((p) => `${p.fr}(${p.rows}行)`).join('、')} → knowledge/fr/ 机器子块`);
      }
    }
  } catch (e) {
    console.warn(`⚠️ 测试绑定归档提升失败（fail-open，可重跑归档幂等重试）：${e && e.message ? e.message : e}`);
  }
  if (written.length > 0 || superseded.length > 0) {
    syncIndexRoutingLines(knowledgeRoot, {
      section: 'FR 需求索引',
      subdir: FR_DIR,
      // 伪域路由行追加裸段关键词（auto-backend 行同时吃 'backend' 命中——域名字面作为
      // 唯一路由键对 auto- 域过窄，2026-09-21 unmapped 大池路由失效的教训）
      makeLine: (d) => d.startsWith('auto-')
        ? `- ${d}|${d.slice(5)}|FR|需求|承接 → [${FR_DIR}/${d}.md](${FR_DIR}/${d}.md)`
        : `- ${d}|FR|需求|承接 → [${FR_DIR}/${d}.md](${FR_DIR}/${d}.md)`,
    });
  }

  // ── 绿地知识面提醒（greenfield-bootstrap）：本变更条目落伪域/unmapped 时提示升级路径；
  //    unmapped 域总条目超阈（50）告警配治理指引（本仓 720 条实证堆积病——告警不阻断）。──
  try {
    const pseudoHits = written.filter((w) => /^(auto-|unmapped$)/.test(String(w.file || '').replace(/^fr\//, '')))
    if (pseudoHits.length > 0) {
      // 落域机械改进（2026-09-27-knowledge-digest）：伪域告警附交付路径推导的建议域——
      // 归档时转达人工 1 秒确认（建议器与 digest 信号卡共用 suggestDomainFromFiles 单源）
      const suggested = suggestDomainFromFiles(deliverableFiles || [], { knowledgeRoot })
      console.warn(`⚠️ [FR 域路由降级] 本变更 ${pseudoHits.length} 条 FR 落伪域/unmapped（${[...new Set(pseudoHits.map((w) => w.file))].join('、')}）${suggested ? `——按交付路径建议域：${suggested}（确认后可迁移；` : '（'}补模块卡（docs/<项目>/modules/_module-map.yaml 登记该目录）后，新变更将自动落回真域；绿地仓可跑 sillyspec run scan 校准）`)
      if (suggested) console.warn(`   迁移/存量清单：sillyspec knowledge digest（伪域信号卡）`)
    }
    const unm = all.get('unmapped')
    if (unm && unm.sections.length > 50) {
      // 基线消音（2026-09-26 修复轮）：本仓 unmapped 720 条是 MP 仓历史变更的跨仓知识基线
      // （103 个来源变更全在归档，非新增堆积）——警告只对新增超基线时触发，不重复刷历史池。
      // 基线锚定 local.yaml 的 fr_unmapped_baseline（缺省 0=无基线，警告行为不变）。
      let baseline = 0
      try {
        const raw = readFileSync(join(knowledgeRoot, '..', 'local.yaml'), 'utf8')
        const m = raw.match(/^fr_unmapped_baseline:\s*(\d+)\s*$/m)
        if (m) baseline = parseInt(m[1], 10)
      } catch { /* 无 local.yaml = 无基线 */ }
      if (unm.sections.length > Math.max(50, baseline + 10)) {
        console.warn(`⚠️ [unmapped 大池] ${unm.sections.length} 条 FR 堆积在 unmapped 域（基线 ${baseline} + 增量 >10）——若为跨仓历史基线可在 local.yaml 设 fr_unmapped_baseline: ${unm.sections.length} 消音；新变更落 unmapped 时建议补模块卡自动分流`)
      }
    }
  } catch { /* 提醒 fail-open */ }

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
      // 骨架位（2026-10-03-fr-skeleton-gate）：「骨架：thin」行在场 → skeleton=true——纯增量字段，
      // 注入面消费（TierA 例外）；查重/rot/绑定消费方不读此位照旧。
      const skeleton = s.lines.some((l) => l.startsWith('骨架：thin'));
      // bindings（fr-rot-precision）：条目测试绑定的 test 文件——rot coverage 三源之一；纯新增
      // 字段，既有消费方（prompt.js 注入渲染等）不受影响。
      out.push({ domain, id: s.number, title: s.title || '', change: s.change || '', scenarios, decisions, bindings: readEntryBindings(s.lines), unconfirmed: readEntryUnconfirmed(s.lines), skeleton });
    }
  }
  return out;
}

// ── 骨架信息量门（2026-10-03-fr-skeleton-gate）─────────────────────────────────────
// 薄道机器预填的空 GWT 骨架（When=标题回显、Then=占位句）永久入索引，挤占注入席位——
// 判据锚定 flow-draft 占位句字面量，标记（骨架：thin）+ 存量回填 + 注入面排除（TierA 例外）。
// 只装阀门不删数据：查重/rot/测试绑定/承接面零改动。

/** flow-draft draftGwtSkeleton 的 Then 兜底占位句（字面量锚点——判据与起草端同源防漂移）。 */
export const SKELETON_THEN_PLACEHOLDER = '行为符合本条标准描述';

/** 纯骨架判据：全部场景体的 Then 均为占位句 → true；任一实质 Then 或无场景体 → false
 *  （保守，宁漏勿误杀：误标只影响注入可见性，漏标只是继续占席）。 */
export function isThinSkeletonBodies(scenarioBodies) {
  const bodies = (Array.isArray(scenarioBodies) ? scenarioBodies : []).filter((b) => b && (b.given || b.when || b.then))
  if (bodies.length === 0) return false
  return bodies.every((b) => String(b.then || '').trim() === SKELETON_THEN_PLACEHOLDER)
}

/** 条目 场景正文 行的 Then 段提取（lastIndexOf——When 文本含「Then」字样不误切）。 */
function scenarioLineThen(line) {
  const i = line.lastIndexOf('Then ')
  return i < 0 ? null : line.slice(i + 5).trim()
}

/** 存量回填（幂等）：全域扫描，纯骨架（场景正文行的 Then 全为占位句）且未标 → 状态行后插
 *  「骨架：thin」。已有标记/非骨架/无场景体零变更；二次执行零写盘。
 *  @returns {{ marked: Array<{domain,id}>, files: string[] }} */
export function markSkeletonThin(knowledgeRoot) {
  const marked = []
  const files = []
  const all = scanAllDomains(knowledgeRoot)
  for (const [domain, st] of all.entries()) {
    if (!st.sections || st.sections.length === 0) continue
    let dirty = false
    for (const s of st.sections) {
      if (s.lines.some((l) => l.startsWith('骨架：thin'))) continue
      const scenarioLines = s.lines.filter((l) => l.startsWith('- 场景：'))
      if (scenarioLines.length === 0) continue
      if (!scenarioLines.every((l) => scenarioLineThen(l) === SKELETON_THEN_PLACEHOLDER)) continue
      const stateIdx = s.lines.findIndex((l) => l.startsWith('状态：'))
      if (stateIdx < 0) continue
      s.lines.splice(stateIdx + 1, 0, '骨架：thin')
      dirty = true
      marked.push({ domain, id: s.number || s.id })
    }
    if (dirty) {
      writeFileSync(join(frDirPath(knowledgeRoot), `${domain}.md`), joinKnowledgeFile(st.preamble, st.sections))
      files.push(`${FR_DIR}/${domain}.md`)
    }
  }
  return { marked, files }
}

// ── active FR 覆盖命中查询（2026-09-26-dynamic-test-inference）─────────────────────
// 查询核单源双消费：flow 侧 rotSuspectFlow 出收口 advisory 与遥测（信号面）；verify 侧
// collectFrLinkedTests 反用为「需求关联回归测试面」（测试门三源之二）；2026-10-03 起
// rankFrDigestForInjection 作第三消费方（注入排序 TierA）。覆盖判定与 rot 完全同口径：
// 来源变更 patch 文件 ∪ 绑定 tests（剥用例锚）∩ 本次触碰文件 ≠ ∅。

/** 覆盖三分判定（2026-10-03-fr-inject-relevance-rank 自 activeFrCoverageHits 抽取）：
 *  active FR × 触碰文件 → hits（覆盖相交）/ skip（覆盖可判无交集）/ unknown（覆盖源缺失）。
 *  判据逐字不变——三消费方（rot/测试门/注入排序）共用同一实现，防口径漂移。
 *  covCache 供调用方跨查询复用归档读取。 */
function partitionActiveByCoverage({ archiveRoot, frs, changed, covCache = new Map() }) {
  const hits = []
  const unknownSources = new Set()
  let skip = 0
  let unknownFrCount = 0
  for (const f of frs) {
    if (!covCache.has(f.change)) covCache.set(f.change, frCoverageFiles({ archiveRoot, changeName: f.change }))
    // bindings 可携带用例锚（2026-09-26-binding-anchor-fidelity）——覆盖判定按文件面取值走剥锚
    const cov = new Set([...(covCache.get(f.change) || []), ...(Array.isArray(f.bindings) ? f.bindings.map((b) => testAnchorFile(b)) : [])])
    if (cov.size === 0) { unknownSources.add(f.change || '（无来源变更）'); unknownFrCount++; continue }
    const hit = [...cov].some((p) => changed.some((c) => c === p || c.startsWith(p.endsWith('/') ? p : p + '/')))
    if (hit) hits.push({ domain: f.domain, id: f.id, title: f.title, change: f.change, bindings: f.bindings || [], coverage: cov })
    else skip++
  }
  return { hits, skip, unknownFrCount, unknownSources: [...unknownSources] }
}

/**
 * 注入排序（2026-10-03-fr-inject-relevance-rank）：取代「文件序前 N」——域增长后注入面恒为
 * 每域最老 N 条，新立规格与覆盖命中的老规格均不可见（平台 backend 域 480 条实证：9 月新立
 * 455 条永不出现在注入里）。两档：TierA=覆盖命中（partitionActiveByCoverage 同口径）置前；
 * TierB=其余按来源变更日期新→旧（`变更：` 字段 YYYY-MM-DD 前缀；无日期/异形来源居尾——存量
 * 43 条非日期形态实证）；同档 tie-break 全局 id 升序。纯排序不删条目，cap/指针行由消费方裁。
 * @returns {{ ranked: Array, tierAIds: Set<string> }}
 */
export function rankFrDigestForInjection({ archiveRoot, frs, changed = [], covCache = new Map() }) {
  const normalized = (Array.isArray(changed) ? changed : []).map((f) => String(f || '').replace(/\\/g, '/')).filter(Boolean)
  const { hits } = partitionActiveByCoverage({ archiveRoot, frs, changed: normalized, covCache })
  const tierAIds = new Set(hits.map((h) => h.id))
  const dateOf = (f) => { const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(f.change || '')); return m ? m[1] : '' }
  const byRecency = (a, b) => {
    const da = dateOf(a)
    const db = dateOf(b)
    if (da !== db) return da < db ? 1 : -1 // 日期新→旧；空串（无日期）居尾
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  }
  const tierA = frs.filter((f) => tierAIds.has(f.id)).sort(byRecency)
  const tierB = frs.filter((f) => !tierAIds.has(f.id)).sort(byRecency)
  return { ranked: [...tierA, ...tierB], tierAIds }
}

/**
 * 触达域内 active FR 的强命中集。
 * @returns {{ domains: string[], hits: Array<{domain,id,title,change,bindings:string[],coverage:Set}>, unknownSources: string[] }}
 *   hits=覆盖面与触碰文件相交者；unknownSources=覆盖源缺失（无 patch 无绑定）的来源变更名。
 */
export function activeFrCoverageHits({ specBase, change = null, changeDir = null, files = [] }) {
  const knowledgeRoot = join(specBase, 'knowledge')
  const archiveRoot = join(specBase, 'changes', 'archive')
  const moduleIndex = discoverModuleIndex(knowledgeRoot)
  const changed = (Array.isArray(files) ? files : []).map((f) => String(f || '').replace(/\\/g, '/')).filter(Boolean)
  // changeDir 仅为 design.md 兜底路由用（files 在场时不读）；不可传 null——resolveTouchedDomains 无条件 join
  const domains = resolveTouchedDomains(changeDir || join(specBase, 'changes', String(change || 'x')), moduleIndex, changed, knowledgeRoot).filter((d) => d !== 'unmapped')
  if (domains.length === 0) return { domains: [], hits: [], unknownSources: [] }
  const frs = readActiveFrDigest(knowledgeRoot, domains)
  if (frs.length === 0) return { domains, hits: [], unknownSources: [] }
  const { hits, skip, unknownFrCount, unknownSources } = partitionActiveByCoverage({ archiveRoot, frs, changed })
  return { domains, hits, unknownSources, unknownFrCount, skip, total: frs.length }
}

/**
 * 需求关联回归测试面（测试门三源之二）：强命中 FR 的绑定 tests 解析为仓根相对文件集。
 * 路径解析三段（resolveTestFileRel）：根相对直取 → 子项目根前缀补全 → 裸文件名受限 glob；
 * 解析失败路径不进测试面（unresolved 披露，宁缺勿错跑）。
 * @returns {{ files: string[], frHits: Array<{domain,id,title,files:string[]}>, unresolved: string[], domains: string[] }}
 */
export function collectFrLinkedTests({ specBase, changeName = null, changedFiles = [], projectRoot }) {
  const q = activeFrCoverageHits({
    specBase,
    change: changeName,
    changeDir: changeName ? join(specBase, 'changes', changeName) : null,
    files: changedFiles,
  })
  const filesSet = new Set()
  const frHits = []
  const unresolved = []
  for (const h of q.hits) {
    if (!Array.isArray(h.bindings) || h.bindings.length === 0) continue
    const resolvedFiles = new Set()
    for (const b of h.bindings) {
      const filePart = testAnchorFile(b)
      const rel = resolveTestFileRel(filePart, { projectRoot })
      if (rel) { resolvedFiles.add(rel); filesSet.add(rel) } else unresolved.push(`${h.id}:${b}`)
    }
    if (resolvedFiles.size > 0) frHits.push({ domain: h.domain, id: h.id, title: h.title, files: [...resolvedFiles].sort() })
  }
  return { files: [...filesSet].sort(), frHits, unresolved, domains: q.domains }
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

// ── needs_review 持久标记层（2026-09-20-quick-asset-tail D-003）已拆除 ──────────────
// 2026-09-29-rot-retire-inject-cap：markFrNeedsReview/FR_NEEDS_REVIEW_PREFIX/cleanupStaleReviewMarks
// 移除——371 条标记零消费实证（归档全量检索无一次复核行动），信号饱和反噬注入排序。腐烂 suspect
// 的信号面保留在 flow.js rotSuspectFlow（收口 advisory + fr-rot-suspect 遥测），不再落盘。

/**
 * 归档侧 FR 域路由文件面（greenfield-bootstrap：archive 侧 indexRequirements 此前不传
 * deliverableFiles——域路由退化为 design 清单单源，design 全泛化段/根文件时落 unmapped，
 * R17 臂3 十条 FR 实证）：design 交付表 ∪ apply-manifest.json 的 files[].path（apply 链
 * 落盘的真实交付清单）。与轻量道 attributedChangedFiles 口径对齐（文件面供域路由投票）。
 */
export function archiveDeliverableFiles(changeDir) {
  const out = new Set()
  try {
    const dp = join(changeDir, 'design.md')
    if (existsSync(dp)) {
      for (const f of deliverableFilesFromDesignText(readFileSync(dp, 'utf8'))) out.add(f.replace(/\\/g, '/'))
    }
  } catch { /* fail-soft */ }
  try {
    const mp = join(changeDir, 'apply-manifest.json')
    if (existsSync(mp)) {
      const j = JSON.parse(readFileSync(mp, 'utf8'))
      for (const f of Array.isArray(j && j.files) ? j.files : []) {
        const p = String(f && f.path ? f.path : f || '').replace(/\\/g, '/').replace(/\/+$/, '')
        if (p) out.add(p)
      }
    }
  } catch { /* fail-soft */ }
  return [...out].filter((p) => !p.startsWith('.sillyspec/'))
}

