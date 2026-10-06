/**
 * 2026-10-06-verify-friction-fix — 防丢失与定向刷新回归
 *
 * 厚流程 postmortem（sess_4769fd5d）实证：verify-probes --init --force 整体重置全骨架且无备份，
 * 38 格手填复核成果被清后只能靠对话记录重建。本文件钉三件行为：
 *   ① backupVerifyResult：覆盖/刷新前落时间戳备份（verify-runs 目录，原文不动）；
 *   ② refreshProbeSections：定向刷新——含待填占位（<待填 / <!--TODO）的机械段被替换，
 *      已手填段保留；表格已填行按行携载到新渲染（半填矩阵不丢已填格）；
 *   ③ parseDesignApiTable 声明宽收：同义零端点声明（无接口变更/不涉及接口/零端点/0 端点）
 *      认作 declared=0；数字声明优先；HTML 注释内的声明句式不自动生效（骨架指引防误判）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  backupVerifyResult, refreshProbeSections, parseDesignApiTable,
} from '../src/verify-probes.js';
import { generateDesignSkeleton } from '../src/design-facts.js';

test('backupVerifyResult：落时间戳备份，原文不动，路径在 verify-runs 下', () => {
  const root = mkdtempSync(join(tmpdir(), 'vp-backup-'));
  const mdPath = join(root, 'verify-result.md');
  writeFileSync(mdPath, '# 原文\n\n手填结论\n', 'utf8');
  const runtimeRoot = join(root, '.runtime');
  const p = backupVerifyResult({ mdPath, runtimeRoot });
  assert.ok(p, '返回备份路径');
  assert.ok(existsSync(p), '备份文件存在');
  assert.ok(p.includes(join('.runtime', 'verify-runs')), `落在 verify-runs 目录：${p}`);
  assert.equal(readFileSync(p, 'utf8'), '# 原文\n\n手填结论\n', '备份内容=覆盖前原文');
  assert.equal(readFileSync(mdPath, 'utf8'), '# 原文\n\n手填结论\n', '原文件未被改动');
});

test('backupVerifyResult：目标缺失时返回 null 不抛（fail-soft）', () => {
  const root = mkdtempSync(join(tmpdir(), 'vp-backup2-'));
  const p = backupVerifyResult({ mdPath: join(root, 'none.md'), runtimeRoot: join(root, '.runtime') });
  assert.equal(p, null);
});

test('refreshProbeSections：含待填占位的段被刷新，已手填段保留，表格已填行携载', () => {
  const existing = [
    '# 验证报告',
    '',
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：PASS WITH NOTES（手填——不可被刷新动）',
    '',
    '## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]',
    '#### 探针 1：未实现标记扫描（design 清单文件）',
    '- ✅ 无 TODO/FIXME 标记命中',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '| 验收 | 判定 | 证据 |',
    '|---|---|---|',
    '| task-01 验收 A | covered | test/a.test.mjs（手填） |',
    '| task-02 验收 B | <待填：五选一> | <待填：用例 ID> |',
    '',
    '## 测试结果 [层：确定性检查]',
    '手填叙述保留',
  ].join('\n');
  const fresh = [
    '#### 探针 1：未实现标记扫描（design 清单文件）',
    '- ⚠️ `src/x.js:1` TODO 标记（新扫描结果）',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '| 验收 | 判定 | 证据 |',
    '|---|---|---|',
    '| task-01 验收 A | <待填：五选一> | <待填：用例 ID> |',
    '| task-02 验收 B | <待填：五选一> | <待填：用例 ID> |',
    '| task-03 验收 C | <待填：五选一> | <待填：用例 ID> |',
    '',
  ].join('\n');
  const r = refreshProbeSections(existing, fresh);
  // 探针 1 无占位（机械结论行直接渲染）→ 保留旧段不动；探针 7 含 <待填 → 刷新但已填行携载
  assert.ok(r.kept.includes(1), `探针 1（无占位）保留：kept=${r.kept}`);
  assert.ok(r.replaced.includes(7), `探针 7（含待填占位）被刷新：replaced=${r.replaced}`);
  assert.ok(r.text.includes('covered | test/a.test.mjs（手填）'), '已填表格行按行携载保留');
  assert.ok(r.text.includes('task-03 验收 C'), '新增矩阵行进入');
  assert.ok(r.text.includes('结论枚举：PASS WITH NOTES'), '结论槽行不动');
  assert.ok(r.text.includes('手填叙述保留'), '非探针段正文不动');
  assert.ok(!r.text.includes('| task-01 验收 A | <待填'), '旧已填行未被待填占位覆盖');
  assert.ok(r.carriedRows >= 1, `携载计数 carriedRows=${r.carriedRows}`);
});

test('refreshProbeSections：全新探针段追加（有既有段时插在其后 / 无段时整体补注入）', () => {
  const withProbe = ['# x', '', '#### 探针 3：验收标准测试覆盖', '- ℹ️ 旧注记（已含结论，无占位）', '', '## 测试结果', ''].join('\n');
  const fresh = '#### 探针 4：决策追踪覆盖\n<!--TODO: 语义探针 -->\n\n#### 探针 5：API Contract Parity\n- backend 0 端点 / frontend 0 调用\n';
  const r = refreshProbeSections(withProbe, fresh);
  assert.deepEqual(r.appended, [4, 5], `两个全新探针都追加：appended=${r.appended}`);
  assert.ok(r.text.includes('#### 探针 4'), '探针 4 注入');
  assert.ok(r.text.indexOf('#### 探针 3') < r.text.indexOf('#### 探针 4'), '追加在既有探针段之后');

  const noProbe = ['# 验证报告', '', '结论枚举：PASS', ''].join('\n');
  const fresh3 = '#### 探针 3：验收标准测试覆盖\n- ✅ task-01: 找到 2 个测试文件\n';
  const r2 = refreshProbeSections(noProbe, fresh3);
  assert.deepEqual(r2.appended, [3]);
  assert.ok(r2.text.includes('#### 探针 3：验收标准测试覆盖'), '无既有探针段时新段注入');
  assert.ok(r2.text.includes('结论枚举：PASS'), '既有正文不动');
});

test('parseDesignApiTable 声明宽收：同义零端点 → declared=0；数字优先；注释内不认', () => {
  const mk = (s) => `## 接口定义\n\n${s}\n`;
  assert.equal(parseDesignApiTable(mk('本变更无接口变更，仅内部重构')).declared, 0);
  assert.equal(parseDesignApiTable(mk('本变更不涉及接口')).declared, 0);
  assert.equal(parseDesignApiTable(mk('零端点')).declared, 0);
  assert.equal(parseDesignApiTable(mk('本变更接口面：0 端点')).declared, 0);
  assert.equal(parseDesignApiTable(mk('本变更接口面：3 端点')).declared, 3, '原数字形态不回归');
  // 数字优先于同义措辞（并存时以数字声明为准，同既有「声明与解析并存以解析为准」口径的声明侧内序）
  assert.equal(parseDesignApiTable('本变更接口面：10 端点（另有无接口变更的既有说明）').declared, 10);
  // HTML 注释内的声明句式不算（design 骨架指引防自动生效）
  assert.equal(parseDesignApiTable('<!-- 本变更接口面：0 端点（无接口变更） -->\n## 接口定义\nGET /a').declared, null);
});

test('design 骨架接口段 TODO 附可粘贴声明句式（注释形态不自动生效）', () => {
  const sk = generateDesignSkeleton({ changeName: 'demo', decisionsText: '', author: 't', now: new Date('2026-10-06T00:00:00Z') });
  assert.ok(sk.includes('本变更接口面：0 端点'), '骨架含可粘贴句式');
  assert.ok(/<!--[^>]*本变更接口面：0 端点/.test(sk), '句式在 HTML 注释内（不自动声明）');
});
