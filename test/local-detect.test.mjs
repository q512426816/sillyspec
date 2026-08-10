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

// Case 1: nodejs（写 package.json {}）— 无 scripts 字段 → commands 应为空对象（缺键 undefined）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-nodejs-'))
  writeFileSync(join(dir, 'package.json'), '{}')
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'nodejs', `nodejs: type=nodejs（=${r.project.type}）`)
  assert(r.commands.build === undefined, `nodejs 空 scripts: commands.build=undefined（=${r.commands.build}）`)
  assert(r.commands.test === undefined, `nodejs 空 scripts: commands.test=undefined（=${r.commands.test}）`)
  assert(r.commands.lint === undefined, `nodejs 空 scripts: commands.lint=undefined（=${r.commands.lint}）`)
  assert(r.commands && typeof r.commands === 'object' && Object.keys(r.commands).length === 0,
    `nodejs 空 scripts: commands 为空对象（=${JSON.stringify(r.commands)}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 1b: nodejs（package.json scripts 仅含 build+test 子集，无 lint）→ 仅生成 build/test 键，lint undefined
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-nodejs-scripts-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'sub',
    scripts: { build: 'node build.js', test: 'node test.js' },
  }))
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'nodejs', `nodejs-scripts: type=nodejs（=${r.project.type}）`)
  assert(r.commands.build === 'npm run build', `nodejs-scripts: commands.build='npm run build'（=${r.commands.build}）`)
  assert(r.commands.test === 'npm test', `nodejs-scripts: commands.test='npm test'（=${r.commands.test}）`)
  assert(r.commands.lint === undefined, `nodejs-scripts: commands.lint=undefined（无 lint script）（=${r.commands.lint}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 1c: nodejs（package.json 非法 JSON → throw 'package.json 解析失败：<path>'，CONVENTIONS #4）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-nodejs-bad-'))
  const pkgPath = join(dir, 'package.json')
  writeFileSync(pkgPath, '{ not valid json')
  let threw = false
  let errMsg = ''
  try {
    detectLocalYaml(dir)
  } catch (e) {
    threw = true
    errMsg = e.message
  }
  assert(threw, `nodejs-bad: 非法 JSON 必须抛错（未抛）`)
  assert(errMsg.startsWith('package.json 解析失败：'),
    `nodejs-bad: 错误信息前缀='package.json 解析失败：'（=${errMsg}）`)
  assert(errMsg.endsWith(pkgPath), `nodejs-bad: 错误信息含完整路径（=${errMsg}）`)
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

// Case 3: gradle（写 build.gradle + gradlew → 前缀 ./gradlew）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-gradle-'))
  writeFileSync(join(dir, 'build.gradle'), "plugins { id 'java' }")
  writeFileSync(join(dir, 'gradlew'), '') // 补 gradlew 空文件使 existsSync 成立
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'gradle', `gradle: type=gradle（=${r.project.type}）`)
  assert(r.commands.build === './gradlew build', `gradle: commands.build='./gradlew build'（=${r.commands.build}）`)
  assert(r.commands.test === './gradlew test', `gradle: commands.test='./gradlew test'（=${r.commands.test}）`)
  assert(r.commands.lint === './gradlew check', `gradle: commands.lint='./gradlew check'（=${r.commands.lint}）`)
  rmSync(dir, { recursive: true, force: true })
}

// Case 3b: gradle（仅 build.gradle 无 gradlew → 前缀 gradle）
{
  const dir = mkdtempSync(join(tmpdir(), 'ld-gradle-nogw-'))
  writeFileSync(join(dir, 'build.gradle'), "plugins { id 'java' }")
  const r = detectLocalYaml(dir)
  assert(r.project.type === 'gradle', `gradle-nogw: type=gradle（=${r.project.type}）`)
  assert(r.commands.build === 'gradle build', `gradle-nogw: commands.build='gradle build'（=${r.commands.build}）`)
  assert(r.commands.test === 'gradle test', `gradle-nogw: commands.test='gradle test'（=${r.commands.test}）`)
  assert(r.commands.lint === 'gradle check', `gradle-nogw: commands.lint='gradle check'（=${r.commands.lint}）`)
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
