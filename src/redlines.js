/**
 * redlines.js —— 红线机检评估器（2026-09-20-redline-machine-check）
 *
 * 为什么需要（2026-09-19 双实现对撞实验核心教训）：语义级设计红线（「已结束会话
 * 不得假运行」「用量归属不得后写覆盖」）活在历史 design/knowledge 散文里，无机器
 * 可查形态——三层独立评审 + 352 例测试拦不住两处红线失分，靠事后人工逐文件深读
 * 才发现。本模块把红线转成机器可查断言：消费者仓 `.sillyspec/redlines.yaml` 条目
 * = forbid/require 正则 × scope 文件 glob × severity × origin 文档锚。
 *
 * 定位与边界（decisions.md D-001~D-004）：
 *   - v1 = 模式级断言（人写正则人负责；statement/origin 保留散文溯源）；不做
 *     AST/语义级，不做散文自动提炼。
 *   - 机制与内容分离：清单消费者仓自持；本仓缺清单 = 不适用（零打扰）。
 *   - fail-open 全链：坏 yaml→不适用+注记；单条求值异常→跳过+warn；任何红线面
 *     故障不炸 verify 主链（探针 11 接线侧 try/catch fail-soft，同探针 8/9/10）。
 *   - advisory：探针渲染 ❌/⚠️ 进 verify-result 骨架供 agent 裁定；不进 PASS
 *     封顶（D-003：攒误报率数据后另案升硬门）。
 *
 * 纯函数纪律：root 注入，不读 env/时钟；fs 只经 resolveScopeFiles 的 walk。
 * 零新增外部依赖（js-yaml 已有）。
 */
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import jsYaml from 'js-yaml';

/** scope walk 排除目录（依赖/版本库/工具自身产物——含 .sillyspec：清单/进度文件不得喂饱 require 造成假阴性，S2 审查 D1）。 */
const SKIP_DIRS = new Set(['node_modules', '.git', '.sillyspec', '.runtime', 'dist', 'build', '.next', '__pycache__']);

/** 单文件扫描上限：2MB（大产物/锁文件跳过，warn 留痕）。 */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** glob → 正则：`**` 跨层、`*` 单段（不跨 /）；段全等不认长名（src-guide 不蹭 src）。 */
function globToRegExp(glob) {
  const esc = String(glob).replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    '^' + esc.replace(/\*\*/g, '⟦⟦DBL⟧⟧').replace(/\*/g, '⟦SGL⟧')
      .replace(/⟦⟦DBL⟧⟧/g, '(?:.*)').replace(/⟦SGL⟧/g, '[^/]*') + '$',
  );
}

/** 递归收集 root 下全部文件（排除 SKIP_DIRS；返回仓根相对 POSIX 路径）。 */
function walkFiles(root) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        visit(p);
      } else if (e.isFile()) {
        out.push(relative(root, p).replace(/\\/g, '/'));
      }
    }
  };
  visit(root);
  return out;
}

/**
 * 解析 redlines.yaml 文本为条目数组（纯函数）。
 * 无效条目四判据（跳过 + warnings 留痕）：缺 id / 缺 scope / forbid 与 require
 * 全空 / 任一正则编译失败。severity 缺省 'error'。
 * @param {string} yamlText
 * @returns {{ entries: Array<object>, warnings: string[] }}
 */
export function parseRedlines(yamlText) {
  const warnings = [];
  const doc = jsYaml.load(yamlText);
  const rawList = doc && Array.isArray(doc.redlines) ? doc.redlines : [];
  const entries = [];
  for (const raw of rawList) {
    if (!raw || typeof raw !== 'object') {
      warnings.push('跳过非对象条目');
      continue;
    }
    const id = typeof raw.id === 'string' && raw.id.trim() !== '' ? raw.id.trim() : null;
    if (id === null) { warnings.push('跳过缺 id 条目'); continue; }
    const scope = Array.isArray(raw.scope) ? raw.scope.filter((s) => typeof s === 'string' && s !== '') : [];
    if (scope.length === 0) { warnings.push(`条目 ${id} 缺 scope，跳过`); continue; }
    const forbid = Array.isArray(raw.forbid) ? raw.forbid.filter((s) => typeof s === 'string' && s !== '') : [];
    const require_ = Array.isArray(raw.require) ? raw.require.filter((s) => typeof s === 'string' && s !== '') : [];
    if (forbid.length === 0 && require_.length === 0) {
      warnings.push(`条目 ${id} 的 forbid 与 require 全空，跳过`);
      continue;
    }
    const severity = raw.severity === 'warning' ? 'warning' : 'error';
    const entry = {
      id,
      statement: typeof raw.statement === 'string' ? raw.statement : '',
      scope,
      forbid,
      require: require_,
      severity,
      origin: typeof raw.origin === 'string' ? raw.origin : null,
      _res: { forbid: [], require: [] },
    };
    let badRe = false;
    for (const re of forbid) {
      try { entry._res.forbid.push(new RegExp(re, 'm')); } catch (e) { warnings.push(`条目 ${id} forbid 正则编译失败（${re}），跳过该条`); badRe = true; }
    }
    for (const re of require_) {
      try { entry._res.require.push(new RegExp(re, 'm')); } catch (e) { warnings.push(`条目 ${id} require 正则编译失败（${re}），跳过该条`); badRe = true; }
    }
    if (badRe) continue;
    entries.push(entry);
  }
  return { entries, warnings };
}

/**
 * scope glob 列表 → 命中文件集（root 下仓根相对 POSIX 路径，排序去重）。
 * @param {string[]} scopeGlobs
 * @param {string} root
 * @returns {string[]}
 */
export function resolveScopeFiles(scopeGlobs, root) {
  const all = walkFiles(root);
  const res = (Array.isArray(scopeGlobs) ? scopeGlobs : [])
    .filter((g) => typeof g === 'string' && g !== '')
    .map((g) => globToRegExp(g));
  return [...new Set(all.filter((f) => res.some((r) => r.test(f))))].sort();
}

/**
 * 逐条评估红线：forbid 命中收集 file:line + require 缺失 + severity 透传。
 * 单条求值异常跳过 + warnings（fail-open，D-004）。
 * @param {object} opts
 * @param {Array<object>} opts.entries - parseRedlines 产物
 * @param {string} opts.root - 求值根（worktree 或仓根，绝对路径）
 * @returns {{ applicable: boolean, entryCount: number, findings: Array<object>, warnings: string[] }}
 */
export function evaluateRedlines({ entries, root }) {
  const warnings = [];
  const findings = [];
  const list = Array.isArray(entries) ? entries : [];
  for (const entry of list) {
    try {
      const files = resolveScopeFiles(entry.scope, root);
      const contents = new Map();
      const readIfBig = (rel) => {
        if (!contents.has(rel)) {
          const abs = join(root, rel);
          let text = '';
          try {
            if (statSync(abs).size > MAX_FILE_BYTES) {
              warnings.push(`条目 ${entry.id}：${rel} 超 2MB 跳过`);
            } else {
              text = readFileSync(abs, 'utf8');
            }
          } catch (e) {
            warnings.push(`条目 ${entry.id}：读 ${rel} 失败（${e && e.code ? e.code : 'error'}），跳过该文件`);
          }
          contents.set(rel, text);
        }
        return contents.get(rel);
      };
      for (const rel of files) {
        const text = readIfBig(rel);
        if (!text) continue;
        const lines = text.split('\n');
        for (const re of entry._res ? entry._res.forbid : []) {
          for (let i = 0; i < lines.length; i++) {
            const m = lines[i] && re.exec(lines[i]);
            if (m) {
              findings.push({
                id: entry.id, severity: entry.severity, kind: 'forbid',
                file: rel, line: i + 1, snippet: String(m[0]).slice(0, 160),
                statement: entry.statement, origin: entry.origin,
              });
            }
          }
        }
      }
      for (const re of entry._res ? entry._res.require : []) {
        const satisfied = [...contents.values()].some((text) => re.test(text));
        if (!satisfied) {
          findings.push({
            id: entry.id, severity: 'warning', kind: 'require-missing',
            statement: entry.statement, origin: entry.origin,
            detail: `require 模式在 scope 全集（${files.length} 文件）无命中`,
          });
        }
      }
    } catch (e) {
      warnings.push(`条目 ${entry.id} 求值异常跳过（${e && e.message ? e.message : e}）`);
    }
  }
  return { applicable: true, entryCount: list.length, findings, warnings };
}
