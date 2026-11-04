/**
 * shipped-hygiene.test.mjs — 交付面无开发物料（2026-11-04-shipped-hygiene-prompt-golden）
 *
 * 依据：superpowers #2277——压力测试场景（"This is a real scenario. You must choose and
 * act" 开头）装在技能目录里，会被工作态 agent grep 到并当活指令执行。templates/ 与
 * .claude/skills/ 是随 init 复制给用户仓的交付面，必须只含交付物料；本测试是
 * asset-audit-2026-09-20 手动审计的自动化接替。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 开发物料命名黑名单（文件名级）：开发日志/测试脚本/压力场景。 */
const DEV_MATERIAL_RE = /(^|\/)(CREATION-LOG[^/]*|[^/]*\.test\.[cm]?js|test-[^/]*\.mjs|[^/]*pressure[^/]*)$/

function listFilesRecursively(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFilesRecursively(full))
    else out.push(full)
  }
  return out
}

test('交付面无开发物料：templates/ 与 .claude/skills/ 文件名黑名单扫描', () => {
  const hits = []
  for (const base of ['templates', join('.claude', 'skills')]) {
    for (const f of listFilesRecursively(join(ROOT, base))) {
      const rel = relative(ROOT, f).split('\\').join('/')
      if (DEV_MATERIAL_RE.test(rel)) hits.push(rel)
    }
  }
  assert.deepEqual(hits, [], `交付面出现开发物料（会随 init 进用户仓并被工作态 agent 当活指令）：\n${hits.join('\n')}`)
})

test('负例自证：夹具开发物料能被判红（临时目录自建自清）', () => {
  const tmp = join(ROOT, 'test', '.hygiene-fixture-tmp')
  try {
    mkdirSync(join(tmp, 'skills', 'some-skill'), { recursive: true })
    mkdirSync(join(tmp, 'prompts'), { recursive: true })
    writeFileSync(join(tmp, 'skills', 'some-skill', 'CREATION-LOG.md'), 'x\n')
    writeFileSync(join(tmp, 'skills', 'some-skill', 'foo-pressure-scenario.md'), 'x\n')
    writeFileSync(join(tmp, 'skills', 'some-skill', 'SKILL.md'), 'x\n')
    writeFileSync(join(tmp, 'prompts', 'testcase-design.md'), 'x\n')
    const files = listFilesRecursively(tmp)
    const flagged = files.filter((f) => DEV_MATERIAL_RE.test(relative(tmp, f).split('\\').join('/')))
    assert.deepEqual(
      flagged.map((f) => relative(tmp, f).split('\\').join('/')).sort(),
      ['skills/some-skill/CREATION-LOG.md', 'skills/some-skill/foo-pressure-scenario.md'],
      '必须恰好判红两件开发物料；testcase-design.md（交付提示词）不得误伤'
    )
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})
