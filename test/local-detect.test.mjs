/**
 * task-02: detectLocalYaml 纯 fs 项目类型嗅探
 *
 * 验证点：
 * - nodejs（package.json 存在）→ type=nodejs + npm 系 commands
 * - maven（pom.xml）→ type=maven + mvn 系 commands
 * - gradle（build.gradle）→ type=gradle + gradlew 系 commands
 * - make（Makefile 含 `test: pytest`）→ type=make, commands.test='pytest'
 * - make 空 test 目标（`test:` 单独成行）→ commands.test='make test'
 * - generic（空目录）→ type=generic, commands={}
 * - 纯 fs：返回结构固定形状 { project:{type}, commands:{build?,test?,lint?} }
 */
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectLocalYaml } from '../src/local-detect.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✅ ' + msg) }
  else { failed++; console.log('  ❌ ' + msg) }
}

console.log('=== task-02: detectLocalYaml 纯 fs 嗅探 ===\n')

// Case 1: nodejs（写 package.json {}）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-nodejs-'))
  writeFileSync(join(dir, 'package.json'), '{}')
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'nodejs', `nodejs: type=nodejs（=${r.project.type}）`)
  assert(r.commands.build === 'npm run build', `nodejs: commands.build='npm run build'（=${r.commands.build}）`)
  assert(r.commands.test === 'npm test', `nodejs: commands.test='npm test'（=${r.commands.test}）`)
  assert(r.commands.lint === 'npm run lint', `nodejs: commands.lint='npm run lint'（=${r.commands.lint}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 2: maven（写 pom.xml）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-maven-'))
  writeFileSync(join(dir, 'pom.xml'), '<project></project>')
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'maven', `maven: type=maven（=${r.project.type}）`)
  assert(r.commands.build === 'mvn compile', `maven: commands.build='mvn compile'（=${r.commands.build}）`)
  assert(r.commands.test === 'mvn test', `maven: commands.test='mvn test'（=${r.commands.test}）`)
  assert(r.commands.lint === 'mvn checkstyle:check', `maven: commands.lint='mvn checkstyle:check'（=${r.commands.lint}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 3: gradle（写 build.gradle）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-gradle-'))
  writeFileSync(join(dir, 'build.gradle'), "plugins { id 'java' }")
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'gradle', `gradle: type=gradle（=${r.project.type}）`)
  assert(r.commands.build === './gradlew build', `gradle: commands.build='./gradlew build'（=${r.commands.build}）`)
  assert(r.commands.test === './gradlew test', `gradle: commands.test='./gradlew test'（=${r.commands.test}）`)
  assert(r.commands.lint === './gradlew check', `gradle: commands.lint='./gradlew check'（=${r.commands.lint}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 4: make（Makefile 含 `test: pytest`）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-make-'))
  writeFileSync(join(dir, 'Makefile'), 'test:\tpytest\nbuild:\tgo build ./...\n')
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'make', `make: type=make（=${r.project.type}）`)
  assert(r.commands.test === 'pytest', `make: commands.test 从 test: 解析='pytest'（=${r.commands.test}）`)
  assert(r.commands.build === undefined, 'make: commands.build 缺省（无 build 默认）')
  assert(r.commands.lint === undefined, 'make: commands.lint 缺省（无 lint 默认）')
  rmSync(dir, { recursive: true, force: true })
}

// Case 4b: make tab 续行命令（`test:\n\tpytest -v`）→ 'pytest -v'
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-make-cont-'))
  writeFileSync(join(dir, 'Makefile'), 'test:\n\tpytest -v\n')
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'make', `make-cont: type=make（=${r.project.type}）`)
  assert(r.commands.test === 'pytest -v', `make-cont: tab 续行 → 'pytest -v'（=${r.commands.test}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 4c: make 纯空 test 目标（`test:` 单行，无同行命令、无 tab 续行）→ 'make test'
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-make-empty-'))
  writeFileSync(join(dir, 'Makefile'), 'test:\n')
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'make', `make-empty: type=make（=${r.project.type}）`)
  assert(r.commands.test === 'make test', `make-empty: 纯空目标 → 'make test'（=${r.commands.test}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 5: generic（空目录）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-generic-'))
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'generic', `generic: type=generic（=${r.project.type}）`)
  assert(r.commands && typeof r.commands === 'object' && Object.keys(r.commands).length === 0,
    `generic: commands 为空对象（=${JSON.stringify(r.commands)}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 6: 优先级——同时有 package.json + Makefile，命中前者（nodejs）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-prio-'))
  writeFileSync(join(dir, 'package.json'), '{}')
  writeFileSync(join(dir, 'Makefile'), 'test:\tpytest\n')
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'nodejs', `优先级: package.json 先于 Makefile → nodejs（=${r.project.type}）`)
  rmSync(dir, { recursive: true, force: true })
}

console.log('\n==================================================')
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log('==================================================')
process.exit(failed ? 1 : 0)
