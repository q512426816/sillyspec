/**
 * 2026-10-06-verify-friction-fix — YAML 报错分诊与 taskcard 独立校验回归
 *
 * 厚流程 postmortem（sess_4769fd5d）实证：任务卡 frontmatter 校验完全后置在 plan postcheck，
 * js-yaml 英文原文直接透传，分诊知识已在 templates/prompts/taskcard-rules.md 却未接进报错，
 * 实测连撞 6 轮门禁。本文件钉三件行为：
 *   ① diagnoseTaskYamlError：消息 + 出错行内容双信号分诊（js-yaml v4 真实报错形态实证：
 *      `title: A: B` 报 bad indentation 而非 mapping values——不能只匹配消息文本）；
 *   ② validatePlanFeasibility 的非法 YAML 报错含「分诊：」动作行；
 *   ③ validateTaskcardsCli：独立校验入口（好卡过 / 占位骨架拦 / target_files 严格形态拦）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diagnoseTaskYamlError } from '../src/taskcard-frontmatter.js';
import { validatePlanFeasibility, validateTaskcardsCli } from '../src/stages/plan-postcheck.js';

const GOOD_CARD = `---
id: task-01
title: Add force backup
title_zh: 强制重生成前备份
allowed_paths:
  - src/verify-probes.js
goal: >
  覆盖重生成前自动备份手填内容
implementation:
  - 备份函数与接线
acceptance:
  - 备份文件落 verify-runs 目录
verify:
  - node --test test/verify-probes-refresh-backup.test.mjs
constraints:
  - 不改变无备份时的行为语义
---
正文
`;

test('diagnoseTaskYamlError：冒号值 / 反引号指示符 / 引号不成对 / 流序列四类分诊', () => {
  const colon = diagnoseTaskYamlError('bad indentation of a mapping entry (1:9)', 'title: Add backup: force path');
  assert.ok(colon.includes('冒号'), `冒号分诊：${colon}`);
  const bt = diagnoseTaskYamlError('bad indentation of a sequence entry (2:5)', '  - `node --test a.mjs` 执行');
  assert.ok(bt.includes('反引号') || bt.includes('指示符'), `指示符分诊：${bt}`);
  const q = diagnoseTaskYamlError('unexpected end of the stream within a double quoted scalar (2:1)', 'title: "未闭合');
  assert.ok(q.includes('引号'), `引号分诊：${q}`);
  const flow = diagnoseTaskYamlError("expected ',' or ']' (1:20)", 'allowed_paths: [src/a.js, }b]');
  assert.ok(flow.includes('块式') || flow.includes('流序列'), `流序列分诊：${flow}`);
});

test('diagnoseTaskYamlError：未知消息给通用兜底动作（不返回空）', () => {
  const fb = diagnoseTaskYamlError('some future js-yaml message', 'whatever: line');
  assert.ok(typeof fb === 'string' && fb.length > 4, `兜底非空：${fb}`);
});

test('validatePlanFeasibility：非法 YAML 报错含分诊动作', () => {
  const root = mkdtempSync(join(tmpdir(), 'tc-triage-'));
  const changeDir = join(root, 'change');
  mkdirSync(join(changeDir, 'tasks'), { recursive: true });
  writeFileSync(
    join(changeDir, 'tasks', 'task-01.md'),
    GOOD_CARD.replace('title: Add force backup', 'title: Add backup: force path'),
    'utf8',
  );
  const r = validatePlanFeasibility(changeDir, null);
  assert.ok(!r.ok, '坏卡应失败');
  assert.ok(
    r.errors.some(e => e.includes('分诊') && e.includes('冒号')),
    `报错含分诊：${r.errors.join(' | ')}`,
  );
});

test('validateTaskcardsCli：好卡过、target_files 非法形态拦、占位骨架拦', () => {
  const root = mkdtempSync(join(tmpdir(), 'tc-validate-'));
  const changeDir = join(root, 'change');
  mkdirSync(join(changeDir, 'tasks'), { recursive: true });
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), GOOD_CARD, 'utf8');
  const ok = validateTaskcardsCli({ changeDir, projectRoot: null });
  assert.equal(ok.ok, true, `好卡应过：${ok.errors.join(' | ')}`);
  assert.equal(ok.files, 1);

  // target_files 含 glob（严格形态：禁通配符）
  writeFileSync(
    join(changeDir, 'tasks', 'task-02.md'),
    GOOD_CARD.replace('id: task-01', 'id: task-02').replace('constraints:', 'target_files:\n  - src/*.js\nconstraints:'),
    'utf8',
  );
  const bad = validateTaskcardsCli({ changeDir, projectRoot: null });
  assert.ok(!bad.ok, 'glob 形态应拦');
  assert.ok(
    bad.errors.some(e => e.includes('target_files') && e.includes('通配')),
    `glob 拦截：${bad.errors.join(' | ')}`,
  );

  // 占位骨架（goal 未替换占位标记）
  const root2 = mkdtempSync(join(tmpdir(), 'tc-validate2-'));
  const changeDir2 = join(root2, 'change');
  mkdirSync(join(changeDir2, 'tasks'), { recursive: true });
  writeFileSync(
    join(changeDir2, 'tasks', 'task-01.md'),
    GOOD_CARD.replace('  覆盖重生成前自动备份手填内容', '  一句话说明这个 task'),
    'utf8',
  );
  const ph = validateTaskcardsCli({ changeDir: changeDir2, projectRoot: null });
  assert.ok(!ph.ok, '占位骨架应拦');
  assert.ok(
    ph.errors.some(e => e.includes('骨架') || e.includes('占位')),
    `占位拦截：${ph.errors.join(' | ')}`,
  );
});
