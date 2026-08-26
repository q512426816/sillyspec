import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { gitQuiet } from './git-helper.js';
import { nowWallClock } from './datetime.js';


/**
 * 查找项目下的 _module-map.yaml 路径
 */
function findModuleMapPath(cwd) {
  // 查找 .sillyspec/docs/<project>/modules/_module-map.yaml
  const docsDir = join(cwd, '.sillyspec', 'docs');
  if (!existsSync(docsDir)) return null;

  const projects = readdirSync(docsDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  for (const proj of projects) {
    const mapPath = join(docsDir, proj.name, 'modules', '_module-map.yaml');
    if (existsSync(mapPath)) return mapPath;
  }

  // 如果没有找到已有的，返回第一个项目的路径（用于创建）
  if (projects.length > 0) {
    return join(docsDir, projects[0].name, 'modules', '_module-map.yaml');
  }

  return null;
}

/**
 * 从模块卡片文件名提取 module_id
 */
function parseModuleIdFromFilename(filename) {
  return filename.replace(/\.md$/, '');
}

/**
 * 从模块卡片读取 frontmatter 中的 module_id
 */
function parseModuleCardFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return {};
  const fm = fmMatch[1];
  const moduleIdMatch = fm.match(/^module_id:\s*(.+)$/m);
  return {
    module_id: moduleIdMatch ? moduleIdMatch[1].trim() : null
  };
}

/**
 * 从模块卡片 + 源码重建 _module-map.yaml
 *
 * schema_version 2 扩展字段：
 *   - role: 模块职责描述
 *   - core_files: 核心源文件列表
 *   - test_files: 测试文件列表
 *   - entrypoints: 入口点
 *   - depends_on: 依赖的其他模块
 *   - used_by: 被哪些模块使用
 *   - risk_level: 风险等级（low/medium/high）
 *   - verify_commands: 验证命令（build/test/lint）
 *   - related_docs: 关联文档路径
 */
export async function rebuildModuleMap(cwd, { force = false } = {}) {
  const mapPath = findModuleMapPath(cwd);
  if (!mapPath) {
    console.error('❌ 未找到 .sillyspec/docs/<project>/modules/ 目录');
    console.log('   提示：先运行 sillyspec run scan 生成模块文档');
    return;
  }

  const modulesDir = join(mapPath, '..');
  const existingMap = existsSync(mapPath) ? readFileSync(mapPath, 'utf8') : null;

  // 收集现有模块卡片
  const cards = [];
  if (existsSync(modulesDir)) {
    const files = readdirSync(modulesDir).filter(f => f.endsWith('.md') && f !== '_module-map.yaml');
    for (const f of files) {
      // CRLF 归一：Windows 卡片 \r 会使 parseModuleCardFrontmatter 的 ^---\n 与
      // extractSection 的 ## <名>\n 失配 → module_id 回退文件名、role 提取恒空
      const content = readFileSync(join(modulesDir, f), 'utf8').replace(/\r\n/g, '\n');
      const fm = parseModuleCardFrontmatter(content);
      const moduleId = fm.module_id || parseModuleIdFromFilename(f);
      cards.push({ filename: f, moduleId, content });
    }
  }

  // 解析现有 _module-map.yaml 保留已有字段（复用 parseModuleMapSimple：原内置解析只收模块名、
  // 从不收集列表项 → existingPaths 恒空 → --force 重建后 core_files 全丢，scan-diff scope 退化
  // 为全量、module-impact classifyFile 全 unmatched——注释声称的「从已有 map 保留」名存实亡）
  let existingModules = {};
  if (existingMap) {
    const parsed = parseModuleMapSimple(existingMap);
    for (const [id, fields] of Object.entries(parsed || {})) {
      existingModules[id] = {
        core_files: Array.isArray(fields.core_files) ? fields.core_files : [],
        test_files: Array.isArray(fields.test_files) ? fields.test_files : [],
        entrypoints: Array.isArray(fields.entrypoints) ? fields.entrypoints : [],
      };
    }
  }

  // 如果没有模块卡片也没有已有映射
  if (cards.length === 0 && Object.keys(existingModules).length === 0) {
    console.log('📭 没有模块卡片，也没有已有的模块映射');
    console.log('   提示：先运行 sillyspec run scan 生成模块文档');
    return;
  }

  // 生成新的 _module-map.yaml
  // 保留已有的完整字段，补齐新卡片
  const now = nowWallClock();
  let headCommit = '';
  try {
    // QUAL-01 收口：走 git-helper 统一入口（safe.directory + 数组形式）
    headCommit = gitQuiet(cwd, ['rev-parse', '--short', 'HEAD']) || '';
  } catch { /* ignore */ }

  let yaml = `schema_version: 2\n`;
  yaml += `generated_at: ${now}\n`;
  yaml += `generator: sillyspec-modules-rebuild\n`;
  if (headCommit) yaml += `source_commit: ${headCommit}\n`;
  yaml += `\n# Module Context Index — 机器可读的模块上下文索引\n`;
  yaml += `# scan 阶段自动生成，brainstorm/plan/execute 阶段按任务命中模块精准注入上下文\n`;
  yaml += `\nmodules:\n`;

  // 合并：已有映射 + 新卡片
  const allModuleIds = new Set([
    ...Object.keys(existingModules),
    ...cards.map(c => c.moduleId)
  ]);

  for (const moduleId of allModuleIds) {
    const card = cards.find(c => c.moduleId === moduleId);
    const cardContent = card?.content || '';

    // 从模块卡片提取 context index 字段
    const role = extractSection(cardContent, '定位') || '';
    const contract = extractSection(cardContent, '契约摘要') || '';
    const logic = extractSection(cardContent, '关键逻辑') || '';
    const notes = extractSection(cardContent, '注意事项') || '';

    yaml += `  ${moduleId}:\n`;
    yaml += `    status: active\n`;
    if (card) yaml += `    doc: modules/${card.filename}\n`;
    else yaml += `    doc: modules/${moduleId}.md\n`;
    yaml += `    needs_review: false\n`;
    yaml += `    review_reasons: []\n`;
    // context index 字段（v2）
    if (role) yaml += `    role: "${escapeYamlString(role)}"\n`;
    // core_files / test_files / entrypoints 从已有 _module-map.yaml 全量保留（列表项级保真）
    const existing = existingModules[moduleId] || {};
    for (const [field, items] of [['core_files', existing.core_files], ['test_files', existing.test_files], ['entrypoints', existing.entrypoints]]) {
      if (Array.isArray(items) && items.length > 0) {
        yaml += `    ${field}:\n`;
        for (const p of items) yaml += `      - ${p}\n`;
      }
    }
    if (card) yaml += `    verify_commands: []\n`;
    yaml += `    risk_level: low\n`;
    if (contract || logic) yaml += `    related_docs: []\n`;
    yaml += `\n`;
  }

  // 破坏性保护（multi-agent-platform 坑 modules-rebuild-destructive）：默认 dry-run 只预览不写，--force 才覆盖。
  if (!force && existingMap) {
    console.log('⚠️  rebuild 默认不写入（破坏性保护）：该命令会覆盖 _module-map.yaml，清空 tags/entrypoints/main_symbols/depends_on/used_by 等手动维护字段');
    console.log('    本次为预览，未写入磁盘。确认覆盖请运行：sillyspec modules rebuild --force');
    return { dryRun: true, path: mapPath }
  }

  writeFileSync(mapPath, yaml, 'utf8');
  console.log(`✅ _module-map.yaml 已重建：${mapPath}`);
  console.log(`   模块数量：${allModuleIds.size}`);
  for (const id of allModuleIds) {
    console.log(`   - ${id}`);
  }
  console.log(`\n⚠️  注意：rebuild 只重建骨架。tags/entrypoints/main_symbols/depends_on/used_by 需要重新运行 scan 或手动补充。`);
  console.log(`ℹ️  schema 已升级到 v2，支持 role/core_files/test_files/entrypoints/depends_on/risk_level/verify_commands 等字段。`);
  return { dryRun: false, path: mapPath, modules: allModuleIds.size }
}

/**
 * split-changelog：把模块卡的「变更索引」历史段迁出到同目录 <module>.changelog.md sidecar
 * （token 成本优化 P0b，2026-08-22-token-cost-optimization）。
 *
 * 背景：变更索引段每变更追加、单调膨胀（multi-agent-platform backend.md 实测 19.9KB/占整卡
 * 36%，18 天 3.6 倍），而子代理实现新 task 只需要卡的「定位/契约摘要/注意事项」当前态——
 * 历史段是纯读取税。迁出后卡只留指针行，新条目由 prompt 约定直接追加 sidecar。
 *
 * 安全（对齐 rebuild 的破坏性保护）：默认 dry-run 只预览不写，--force 才落盘。
 * 只动「## 变更索引」一节，卡内其他节原样保留；sidecar 已存在则追加（幂等可重跑）。
 *
 * @param {string} cwd 项目根
 * @param {{ force?: boolean }} opts
 * @returns {{ dryRun: boolean, files: Array<{ card: string, sidecar: string, bytesMoved: number }>, skipped: number }}
 */
export function splitChangelog(cwd, { force = false } = {}) {
  const docsDir = join(cwd, '.sillyspec', 'docs');
  const results = [];
  let skipped = 0;
  const projects = existsSync(docsDir)
    ? readdirSync(docsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
    : [];

  for (const project of projects) {
    const modulesDir = join(docsDir, project, 'modules');
    if (!existsSync(modulesDir)) continue;
    const cards = readdirSync(modulesDir).filter(f => f.endsWith('.md') && f !== '_module-map.yaml');
    for (const f of cards) {
      const cardPath = join(modulesDir, f);
      const content = readFileSync(cardPath, 'utf8');
      // 提取「## 变更索引」节（CRLF 归一后行级匹配，与 modules.js 其余解析同防线）
      const lines = content.replace(/\r\n/g, '\n').split('\n');
      const startIdx = lines.findIndex(l => /^##\s*变更索引\s*$/.test(l));
      if (startIdx < 0) { skipped++; continue; }
      let endIdx = lines.length;
      for (let i = startIdx + 1; i < lines.length; i++) {
        if (/^##\s/.test(lines[i])) { endIdx = i; break; }
      }
      const body = lines.slice(startIdx + 1, endIdx).join('\n').trim();
      // 已迁出（只剩指针行）或本就为空 → 跳过
      if (!body || /^见\s/.test(body) || body.includes('.changelog.md')) { skipped++; continue; }
      const bytesMoved = Buffer.byteLength(body, 'utf8');
      const stem = f.replace(/\.md$/, '');
      const sidecarPath = join(modulesDir, `${stem}.changelog.md`);
      results.push({ card: cardPath, sidecar: sidecarPath, bytesMoved, _lines: lines, _startIdx: startIdx, _endIdx: endIdx, _body: body });
    }
  }

  if (!force) {
    if (results.length === 0) {
      console.log('📭 没有需要迁出的「变更索引」段（无模块卡 / 已迁出 / 段为空）');
    } else {
      console.log('⚠️  split-changelog 默认不写入（破坏性保护）：会把模块卡「变更索引」节迁出到同目录 <module>.changelog.md');
      for (const r of results) {
        console.log(`    ${r.card} → ${r.sidecar}（${(r.bytesMoved / 1024).toFixed(1)}KB）`);
      }
      console.log('    本次为预览，未写入磁盘。确认迁出请运行：sillyspec modules split-changelog --force');
    }
    return { dryRun: true, files: results.map(({ card, sidecar, bytesMoved }) => ({ card, sidecar, bytesMoved })), skipped };
  }

  for (const r of results) {
    // sidecar：已存在追加（分隔线 + 迁出来源），否则新建带头部
    const header = `# ${r.card.split(/[\\/]/).pop().replace(/\.md$/, '')} 变更索引\n\n> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。\n`;
    let sidecarContent = header;
    if (existsSync(r.sidecar)) {
      sidecarContent = readFileSync(r.sidecar, 'utf8').replace(/\s*$/, '') + '\n\n---\n\n' + r._body + '\n';
    } else {
      sidecarContent = header + '\n' + r._body + '\n';
    }
    writeFileSync(r.sidecar, sidecarContent, 'utf8');
    // 卡内节体替换为指针行（只动该节，其余逐字保留；_lines 已是 LF 归一）
    const stem = r.card.split(/[\\/]/).pop().replace(/\.md$/, '');
    const newLines = [...r._lines.slice(0, r._startIdx + 1), '', `见 \`${stem}.changelog.md\`——历史条目已迁出；新条目直接追加 sidecar，勿写回本卡。`, '', ...r._lines.slice(r._endIdx)];
    writeFileSync(r.card, newLines.join('\n'), 'utf8');
    console.log(`✅ ${r.card} → ${r.sidecar}（迁出 ${(r.bytesMoved / 1024).toFixed(1)}KB，卡内留指针）`);
  }
  if (results.length === 0) console.log('📭 没有需要迁出的「变更索引」段');
  return { dryRun: false, files: results.map(({ card, sidecar, bytesMoved }) => ({ card, sidecar, bytesMoved })), skipped };
}

/**
 * status: 显示模块索引状态
 */
export async function showModuleStatus(cwd) {  const mapPath = findModuleMapPath(cwd);
  if (!mapPath || !existsSync(mapPath)) {
    console.log('📭 未找到 _module-map.yaml');
    console.log('   提示：先运行 sillyspec run scan 生成模块文档');
    return;
  }

  const content = readFileSync(mapPath, 'utf8');

  // 简单解析（CRLF 兼容：坑 verify-modules-crlf-blanket-fallback 同类——`$` 锚定正则在
  // Windows 编辑器写出的 CRLF 文件上模块条目全失配，模块数恒显示 0）
  const lines = content.split(/\r?\n/);
  const modules = [];
  let currentModule = null;
  let needsReview = false;

  for (const line of lines) {
    const moduleMatch = line.match(/^  ([a-zA-Z0-9_-]+):$/);
    if (moduleMatch) {
      if (currentModule) modules.push(currentModule);
      currentModule = { id: moduleMatch[1], hasTags: false, hasEntryPoints: false, hasDepends: false, needsReview: false, hasRole: false, hasCoreFiles: false, hasRisk: false, hasVerify: false };
    }
    if (currentModule) {
      if (line.includes('tags:')) currentModule.hasTags = true;
      if (line.includes('entrypoints:')) currentModule.hasEntryPoints = true;
      if (line.includes('depends_on:')) currentModule.hasDepends = true;
      if (line.includes('needs_review: true')) { currentModule.needsReview = true; needsReview = true; }
      if (line.includes('role:')) currentModule.hasRole = true;
      if (line.includes('core_files:')) currentModule.hasCoreFiles = true;
      if (line.includes('risk_level:')) currentModule.hasRisk = true;
      if (line.includes('verify_commands:')) currentModule.hasVerify = true;
    }
  }
  if (currentModule) modules.push(currentModule);

  console.log(`\n_module-map.yaml: ${mapPath}`);
  console.log(`模块数量：${modules.length}\n`);

  const maxId = Math.max(5, ...modules.map(m => m.id.length));
  console.log(`  ${'模块'.padEnd(maxId)}  tags  entry  deps  role  core  risk  review`);
  console.log(`  ${''.padEnd(maxId, '─')}  ────  ─────  ────  ────  ────  ────  ──────`);
  for (const m of modules) {
    const tags = m.hasTags ? '✅' : '⬜';
    const entry = m.hasEntryPoints ? '✅' : '⬜';
    const deps = m.hasDepends ? '✅' : '⬜';
    const role = m.hasRole ? '✅' : '⬜';
    const core = m.hasCoreFiles ? '✅' : '⬜';
    const risk = m.hasRisk ? '✅' : '⬜';
    const verify = m.hasVerify ? '✅' : '⬜';
    const review = m.needsReview ? '⚠️' : '✅';
    console.log(`  ${m.id.padEnd(maxId)}  ${tags}     ${entry}     ${deps}     ${role}     ${core}     ${risk}     ${verify}     ${review}`);
  }

  if (needsReview) {
    console.log(`\n⚠️  有模块标记为 needs_review，建议检查或重新 scan`);
  }
}

/**
 * 从模块卡片提取指定 section 的内容
 */
function extractSection(content, sectionName) {
  const match = content.match(new RegExp(`## ${escapeRegExp(sectionName)}\\n([\\s\\S]*?)(?=\\n##|$)`));
  return match ? match[1].trim().split('\n')[0] : '';  // 只取第一行作为摘要
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeYamlString(s) {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ').slice(0, 200);  // 截断避免过长
}

/**
 */
export async function generateDependenciesMd(cwd) {
  const mapPath = findModuleMapPath(cwd);
  if (!mapPath || !existsSync(mapPath)) return;

  const content = readFileSync(mapPath, 'utf8');
  const modules = parseModuleMapSimple(content);

  if (Object.keys(modules).length === 0) return;

  const depsPath = join(mapPath, '..', 'dependencies.md');
  const maxName = Math.max(6, ...Object.keys(modules).map(k => k.length));

  let md = `# Module Dependencies\n\n`;
  md += `> 自动生成，由 sillyspec 维护\n\n`;
  md += `| ${'Module'.padEnd(maxName)} | Depends On | Used By |\n`;
  md += `| ${''.padEnd(maxName, '-')}:--- | :--- | :--- |\n`;

  for (const [id, data] of Object.entries(modules)) {
    const depends = (data.depends_on || []).join(', ') || '—';
    const usedBy = (data.used_by || []).join(', ') || '—';
    md += `| ${id.padEnd(maxName)} | ${depends} | ${usedBy} |\n`;
  }

  writeFileSync(depsPath, md, 'utf8');
  console.log(`✅ dependencies.md 已生成`);
}

// _module-map.yaml 简单 YAML 解析（模块上下文索引）。canonical 单一真相源——run/prompt.js
// 的 loadModuleContextIndex 与本文件 generateDependenciesMd 共用此函数（合并历史两份分叉副本，
// 2026-08-07；字段集取并集：core_files/test_files/related_docs/verify_commands + role/risk_level）。
export function parseModuleMapSimple(content) {
  // CRLF 归一（2026-08-15 docs-debt-inject P1）：Windows 下生成的 map 是 CRLF 行尾，下方全部
  // 行级正则（/^  (w+):$/ 等）不容  会整体失配 → 解析返回空对象 → 模块上下文注入全部哑掉。
  // 入口一行归一，纯正则无副作用；行为扩散（本仓模块注入被激活）记录在 file-lifecycle。
  if (typeof content === 'string') content = content.replace(/\r\n/g, '\n');
  const modules = {};
  let currentModule = null;
  let currentKey = null;
  let currentArray = null;

  for (const line of content.split('\n')) {
    // 模块 id 字符集含点（db.engine 等，与 module-impact.js classifyFile 同口径）：
    // 不含点时带点 id 的条目被静默丢弃，上下文注入/scan-diff 侧与 module-impact 侧给相反结论
    const moduleMatch = line.match(/^  ([a-zA-Z0-9_.\-]+):$/);
    if (moduleMatch) {
      if (currentArray && currentModule && currentKey) {
        modules[currentModule][currentKey] = currentArray;
      }
      currentModule = moduleMatch[1];
      modules[currentModule] = {};
      currentKey = null;
      currentArray = null;
      continue;
    }
    if (!currentModule) continue;

    // Array field like depends_on:\n  - xxx
    const arrayFieldMatch = line.match(/^    (depends_on|used_by|paths|tags|aliases|entrypoints|main_symbols|review_reasons|core_files|test_files|related_docs|verify_commands):$/);
    if (arrayFieldMatch) {
      if (currentArray && currentKey) modules[currentModule][currentKey] = currentArray;
      currentKey = arrayFieldMatch[1];
      currentArray = [];
      continue;
    }

    // Inline array like tags: [a, b]
    const inlineArrayMatch = line.match(/^    (depends_on|used_by|paths|tags|aliases|entrypoints|main_symbols|review_reasons|core_files|test_files|related_docs|verify_commands): \[(.*)\]$/);
    if (inlineArrayMatch) {
      if (currentArray && currentKey) modules[currentModule][currentKey] = currentArray;
      const vals = inlineArrayMatch[2].split(',').map(v => v.trim()).filter(Boolean);
      modules[currentModule][inlineArrayMatch[1]] = vals;
      currentKey = null;
      currentArray = null;
      continue;
    }

    // Scalar field
    const scalarMatch = line.match(/^    (status|doc|needs_review|role|risk_level): (.+)$/);
    if (scalarMatch) {
      if (currentArray && currentKey) { modules[currentModule][currentKey] = currentArray; currentArray = null; currentKey = null; }
      modules[currentModule][scalarMatch[1]] = scalarMatch[2];
      continue;
    }

    // Array item
    const itemMatch = line.match(/^      - (.+)$/);
    if (itemMatch && currentArray !== null) {
      currentArray.push(itemMatch[1].trim());
      continue;
    }
  }

  // Flush last
  if (currentArray && currentModule && currentKey) {
    modules[currentModule][currentKey] = currentArray;
  }

  return modules;
}

/**
 * migrate: 旧格式模块文档迁移到新格式
 */
export async function migrateModuleDocs(cwd) {
  const mapPath = findModuleMapPath(cwd);
  if (!mapPath || !existsSync(mapPath)) {
    console.error('❌ 未找到 _module-map.yaml');
    return;
  }

  const modulesDir = join(mapPath, '..');
  const files = readdirSync(modulesDir).filter(f => f.endsWith('.md') && f !== '_module-map.yaml');

  if (files.length === 0) {
    console.log('📭 没有模块文档需要迁移');
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const f of files) {
    const filePath = join(modulesDir, f);
    const content = readFileSync(filePath, 'utf8');

    // 检查是否已经是新格式（有 schema_version + doc_type: module-card）
    if (content.includes('schema_version:') && content.includes('doc_type: module-card')) {
      skipped++;
      continue;
    }

    // 提取模块名（从 H1 或文件名）
    const h1Match = content.match(/^# (.+)$/m);
    const moduleId = h1Match ? h1Match[1].trim().replace(/\s+/g, '-').toLowerCase() : f.replace('.md', '');

    // 提取旧的“职责”和“注意事项”作为语义内容保留
    const dutyMatch = content.match(/## 职责\n([\s\S]*?)(?=\n##|$)/);
    const notesMatch = content.match(/## 注意事项\n([\s\S]*?)(?=\n##|$)/);
    const designMatch = content.match(/## 当前设计\n([\s\S]*?)(?=\n##|$)/);
    const interfaceMatch = content.match(/## 对外接口[\s\S]*?(?=\n##|$)/);

    const duty = dutyMatch ? dutyMatch[1].trim() : '';
    const notes = notesMatch ? notesMatch[1].trim() : '';
    const design = designMatch ? designMatch[1].trim() : '';

    // 检查是否有人工备注
    const manualMatch = content.match(/<!-- MANUAL_NOTES_START -->([\s\S]*?)<!-- MANUAL_NOTES_END -->/);
    const manualContent = manualMatch ? manualMatch[1].trim() : '';

    // 生成新格式
    let newContent = `---
schema_version: 1
doc_type: module-card
module_id: ${moduleId}
---

# ${moduleId}

`;

    if (duty) {
      newContent += `## 定位

${duty}

`;
    } else {
      newContent += `## 定位

（待补充）

`;
    }

    if (design || interfaceMatch) {
      newContent += `## 契约摘要

`;
      if (interfaceMatch) newContent += `${interfaceMatch[0].replace('## 对外接口', '').trim()}

`;
      else newContent += `（待从源码提取）

`;
    } else {
      newContent += `## 契约摘要

（待从源码提取）

`;
    }

    if (design) {
      newContent += `## 关键逻辑

${design}

`;
    } else {
      newContent += `## 关键逻辑

（待补充）

`;
    }

    if (notes) {
      newContent += `## 注意事项

${notes}

`;
    } else {
      newContent += `## 注意事项

（待补充）

`;
    }

    newContent += `## 人工备注

<!-- MANUAL_NOTES_START -->
${manualContent}
<!-- MANUAL_NOTES_END -->
`;

    writeFileSync(filePath, newContent, 'utf8');
    migrated++;
  }

  console.log(`✅ 迁移完成`);
  console.log(`   已迁移：${migrated} 个`);
  console.log(`   已跳过（新格式）：${skipped} 个`);
  if (migrated > 0) {
    console.log(`\n⚠️  迁移后的卡片可能需要补充内容，建议检查并运行 sillyspec modules status`);
  }
}
