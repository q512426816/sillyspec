/**
 * module-map-parser.test.mjs — parseModuleMapSimple 合并后的 canonical 解析器单测
 *
 * 覆盖 sss1.md P1②：历史 modules.js 与 run/prompt.js 两份 parseModuleMapSimple 字段集分叉
 * （prompt.js 版是超集，多 core_files/test_files/related_docs/verify_commands + role/risk_level）。
 * 2026-08-07 合并为 modules.js 单一 export，prompt.js import 复用。本测试锁定：
 *   - canonical 解析器（modules.js export）解析全部超集字段（数组 + 标量）
 *   - 兼容 block 数组 + inline 数组两种写法
 *   - generateDependenciesMd 所需 depends_on/used_by 仍正确（回归）
 */
import { parseModuleMapSimple } from '../src/modules.js'

let passed = 0
let failed = 0
function assert(name, cond, detail = '') {
  if (cond) { console.log(`✅ PASS: ${name}`); passed++ }
  else { console.error(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`); failed++ }
}

const YAML = `schema_version: 2
generated_at: 2026-08-07
modules:
  auth:
    role: 认证模块
    risk_level: high
    status: active
    doc: auth.md
    needs_review: false
    paths:
      - src/auth/login.js
      - src/auth/logout.js
    depends_on:
      - db
    used_by:
      - api
    tags:
      - security
    aliases:
      - authentication
    entrypoints:
      - login
    main_symbols:
      - AuthService
    review_reasons:
      - 高危：处理凭证
    core_files:
      - src/auth/core.js
    test_files:
      - test/auth.test.js
    related_docs:
      - docs/auth-design.md
    verify_commands:
      - npm test auth
  db:
    role: 数据库
    paths: [src/db.js, src/db-pool.js]
    tags: [storage, persist]
    depends_on: []
`

const m = parseModuleMapSimple(YAML)

// 结构：两个模块
assert('解析出 auth + db 两个模块', Object.keys(m).length === 2 && m.auth && m.db, JSON.stringify(Object.keys(m)))

// 超集标量（prompt.js buildModuleContextInjection 依赖 role/risk_level）
assert('auth.role 解析（超集标量）', m.auth.role === '认证模块', JSON.stringify(m.auth.role))
assert('auth.risk_level 解析（超集标量）', m.auth.risk_level === 'high', JSON.stringify(m.auth.risk_level))
assert('auth.status/doc/needs_review 解析（原标量）',
  m.auth.status === 'active' && m.auth.doc === 'auth.md' && m.auth.needs_review === 'false')

// 超集数组字段（prompt.js 副本多出的 4 个）
assert('auth.core_files 解析（超集数组）', Array.isArray(m.auth.core_files) && m.auth.core_files[0] === 'src/auth/core.js', JSON.stringify(m.auth.core_files))
assert('auth.test_files 解析（超集数组）', m.auth.test_files[0] === 'test/auth.test.js')
assert('auth.related_docs 解析（超集数组）', m.auth.related_docs[0] === 'docs/auth-design.md')
assert('auth.verify_commands 解析（超集数组）', m.auth.verify_commands[0] === 'npm test auth')

// 原数组字段（modules.js generateDependenciesMd 依赖 depends_on/used_by —— 回归）
assert('auth.depends_on 解析（generateDependenciesMd 依赖）',
  Array.isArray(m.auth.depends_on) && m.auth.depends_on[0] === 'db', JSON.stringify(m.auth.depends_on))
assert('auth.used_by 解析（generateDependenciesMd 依赖）', m.auth.used_by[0] === 'api')
assert('auth.paths/tags/aliases/entrypoints/main_symbols/review_reasons 解析（原数组）',
  m.auth.paths.length === 2 && m.auth.tags[0] === 'security' && m.auth.aliases[0] === 'authentication'
  && m.auth.entrypoints[0] === 'login' && m.auth.main_symbols[0] === 'AuthService' && m.auth.review_reasons[0] === '高危：处理凭证')

// inline 数组写法（db.paths: [...] / db.tags: [...]）
assert('db.paths inline 数组解析', Array.isArray(m.db.paths) && m.db.paths.length === 2 && m.db.paths[1] === 'src/db-pool.js', JSON.stringify(m.db.paths))
assert('db.tags inline 数组解析', m.db.tags.length === 2 && m.db.tags[0] === 'storage' && m.db.tags[1] === 'persist', JSON.stringify(m.db.tags))
assert('db.role 解析（超集标量）', m.db.role === '数据库')

// 空模块字典（无 modules 块）
assert('无 modules 块 → 空字典', Object.keys(parseModuleMapSimple('schema_version: 2\n')).length === 0)

console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 项失败`}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
