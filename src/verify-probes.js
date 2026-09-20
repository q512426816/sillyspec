/**
 * verify-probes.js — `sillyspec verify-probes` 的机械探针实现 + verify-result.md 骨架生成
 * （2026-08-21 agent-手工产出审计第三批 H1/H3/H5/H7/F9）。
 *
 * verify-probes.md 模板定义六个探针，agent 此前逐条手跑 grep/递归查找/git 对账再手工拼表格。
 * 本模块把纯机械的四个探针命令化（语义判断的留 agent，输出里显式标注）：
 *   探针1 未实现标记扫描：design §6 清单的具体文件逐行 grep TODO/FIXME/尚未实现 等 probe1-noqa
 *   探针3 测试覆盖：逐 task 按 allowed_paths 定位模块目录，递归找测试文件（co-located tests/ 陷阱
 *        + JVM src/test/<lang> 同包镜像根——Maven/Gradle 布局测试与 main 侧永不 co-located）
 *   探针5 API 契约对账：复用 contract-matrix.verifyApiParity（endpoints.json × 前端调用）+ 表格渲染
 *   探针6 删除对账：git diff --name-status HEAD 的 D/R × design 声明操作三态判定
 *   探针7 验收×测试覆盖矩阵：task 卡 acceptance 自解析（jsYaml，string/array 双形态）+ 双源结构
 *        归属（allowed_paths 测试模式 ∪ execute-runs review.json changedFiles test/ 前缀）+
 *        关键词命中提示（命中≠判定，不参与门禁；2026-09-14-acceptance-test-matrix）
 *   探针10 预填注清零（error 门）：design.md + tasks/task-*.md 白名单槽宿主文件集逐个
 *        hasUnconfirmedPrefill（注在场=未确认）——--init 预填进探针段 + gates.js verify 收尾
 *        复跑同一实现阻断（门禁梯度 error 档；2026-09-18-artifact-prefill task-03）
 * 探针2（关键词提取半语义）/探针3.4 集成盲区/3.5 断言抽查/探针4（决策追踪语义）留 agent。
 *
 * verify-result.md 骨架：七章节固定结构 + 探针结果机械预填 + 其余章节 <!--TODO--> 占位。 probe1-noqa
 * 结论走「结论枚举：」固定槽行（刀③）——占位符不含枚举词，槽未填 extractVerifyConclusionSlot
 * 返回 '' 即判不过，骨架不能直接过门（与 symbol-impact 骨架同款防偷懒语义）。
 * P3b 增量：①章节标题行末尾 claims 层标注（可复跑探针/确定性检查/人工判断，纯后缀不新增行）；
 * ②--init 同步落盘 verify-facts.json 机器底稿（探针命令行 + 首跑关键指标 + 时间戳，CLI 全权写，
 * 供事后独立复跑审计；重复 --init 覆盖为最近一次 init 快照）。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, dirname, basename, resolve, isAbsolute, relative } from 'path'
import { gitQuiet, unquoteGitPath } from './git-helper.js'
import { hasUnconfirmedPrefill } from './prefill.js'
import {
  FACTS_SCHEMA_VERSION, EVIDENCE_SLOT_HEADING, RECEIPT_SLOT_HEADING, parseEvidenceSlots,
} from './verify-facts-schema.js'
import { parseFileChangeListDetailed } from './change-list.js'
import { parseDecisions } from './decision-distill.js'
import { parseAllowedPaths, parseRepo, parseRepoRegistry } from './stages/plan-postcheck.js'
import { verifyApiParity, _readWorktreeMeta } from './contract-matrix.js'
import { parseTaskFrontmatter } from './taskcard-frontmatter.js'
import { RECEIPT_SOURCE_CROSS_LAYER_RE as RECEIPT_CROSS_LAYER_RE, RECEIPT_SOURCE_UNIT_RE as RECEIPT_UNIT_RE, CLI_SMOKE_SOURCE_MARK as SMOKE_RECEIPT_SOURCE_MARK } from './change-risk-profile.js'
import { splitOwnVsForeignDiffFiles } from './foreign-declared.js'
import { resolveSpecDir, resolveRuntimeRoot, detectWorktreeSpecDrift } from './run/shared.js'
// 探针 11（2026-09-20-redline-machine-check）：红线机检评估器——纯函数模块，依赖
// （fs/js-yaml）已在模块图内，静态导入零增量开销；评估器异常由探针 fail-soft 捕获。
import { parseRedlines, evaluateRedlines } from './redlines.js'

// 探针1 未实现标记匹配（坑 probe1-literal-false-positive，2026-09-15 复盘实证：16 命中全
// 字面误报——TODO_FLAG_TODO 业务常量、「XXX完成处置」中文占位模板）。口径分三级：
// - 尚未实现：中文短语高置信，保持子串匹配； /* probe1-noqa */
// - TODO/FIXME/HACK：ASCII 标识符边界匹配——TODO_FLAG_TODO / parseHackArgs 等标识符内部不再 /* probe1-noqa */
//   命中（两侧任一边贴 [A-Za-z0-9_] 即视为标识符成分）；
// - XXX：边界匹配且前或后紧邻 CJK 表意字符即排除——「XXX完成处置」「订单XXX号」类中文占位 /* probe1-noqa */
//   模板不再命中（独立代码注释 `XXX:` / `// XXX fix` 紧邻标点空白，仍命中）。 /* probe1-noqa */
const CJK_IDEOGRAPH_CLASS = '\\u4e00-\\u9fff\\u3400-\\u4dbf'
const TODO_ASCII_MARKER_RE = new RegExp(`(^|[^A-Za-z0-9_])(?:TODO|FIXME|HACK)(?![A-Za-z0-9_])`) /* probe1-noqa */
const XXX_MARKER_RE = new RegExp(`(^|[^A-Za-z0-9_${CJK_IDEOGRAPH_CLASS}])XXX(?![A-Za-z0-9_${CJK_IDEOGRAPH_CLASS}])`) /* probe1-noqa */
export function isUnimplementedMarkerLine(line) {
  if (line.includes('尚未实现')) return true /* probe1-noqa */
  if (TODO_ASCII_MARKER_RE.test(line)) return true
  if (XXX_MARKER_RE.test(line)) return true
  return false
}
// 测试文件名判定（坑 probe3-testname-false-positive，2026-09-15 EHS 生产实证：model 目录下
// TestData.java 数据夹具被旧 /test|spec/i 子串命中 → task-01 假绿「找到 1 个测试文件」；
// specification.md / contest.css 同族反向噪音）。三路命中，任一即测试文件：
// - 分隔符分词（按非字母数字切段）含 test/tests/spec/specs —— foo.test.js、test_utils.py、foo-spec.ts
// - 裸词文件名（去扩展名即上述词，大小写归一）—— test.js、Tests.java
// - 驼峰末段后缀 Test/Tests/Spec/Specs/IT（Java/Kotlin 惯例 FooTest/FooIT）——只认末位驼峰段：
//   RpFlowEngineTest 命中；TestData/TestUtil/TestMain（Test 是首段=夹具命名惯势）不命中
// 取向：漏检罕见命名（FooTestCase/TestFoo 前缀式）→ ⚠️ 落 agent 手查（fail-visible 可接受）；
// 假绿掩盖真缺测是 fail-hidden，更糟——宁紧勿松。
const TEST_NAME_TOKENS = new Set(['test', 'tests', 'spec', 'specs'])
const TEST_NAME_SUFFIXES = new Set(['Test', 'Tests', 'Spec', 'Specs', 'IT'])
export function isTestFileName(name) {
  const stem = String(name || '').replace(/\.[^.]+$/, '')
  if (!stem) return false
  if (TEST_NAME_TOKENS.has(stem.toLowerCase())) return true
  const tokens = stem.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  if (tokens.some(t => TEST_NAME_TOKENS.has(t))) return true
  const lastHump = stem.match(/(?:[A-Z][a-z0-9]*|[A-Z]+)$/)
  return !!lastHump && TEST_NAME_SUFFIXES.has(lastHump[0])
}
const PROBE1_MAX_MATCHES = 200

/**
 * verify-probes 的 spec 根解析（含 worktree 副本漂移锚定）。
 *
 * 坑 worktree-spec-artifact-misplace（2026-08-24 用户实证）：在 worktree 内跑
 * `verify-probes --init` 时 spec 根随 cwd 落进 worktree 的 .sillyspec checkout 副本——骨架
 * 写进副本、主仓 verify gate 读不到，副本随 worktree 清理蒸发。与 run/command.js 对
 * plan/execute/verify/archive 的漂移守卫同口径：命中副本自动锚回主仓后继续（不 exit）；
 * 平台模式 / 显式 --spec-dir 已明确指定，不纠正。
 * @param {string} cwd
 * @param {string|null} [specDir] --spec-dir（显式指定则不锚定）
 * @param {string|null} [platformBase] 平台 spec 根（仅 .sillyspec-platform.json pointer 存在时传入；
 *   resolvePlatformSpecDir 无 pointer 时回退本地解析会返回 worktree 副本根，不能当平台根传）
 * @returns {string} spec 根绝对路径（漂移时为主仓）
 */
export function resolveVerifyProbesSpecBase(cwd, specDir = null, platformBase = null) {
  if (platformBase) return platformBase
  const base = resolveSpecDir(cwd, { specDir: specDir || undefined })
  if (specDir) return base
  const wt = detectWorktreeSpecDrift(base)
  if (wt) {
    console.warn(`⚠️ 已自动锚定主仓 spec：${wt.mainSpecBase}（原 cwd 命中 worktree 副本 ${wt.changeName}，verify-probes 产物落主仓，已纠正，流程继续）`)
    return wt.mainSpecBase
  }
  return base
}

function listTaskIds(tasksPath) {
  if (!existsSync(tasksPath)) return []
  const ids = []
  for (const line of readFileSync(tasksPath, 'utf8').split('\n')) {
    const m = line.match(/^[-*]\s*\[[ xX]\]\s*(task-\d+)\b/)
    if (m) ids.push(m[1])
  }
  return ids
}

/** 递归找测试文件（排除 node_modules/.git/dist 等；返回 posix 相对 cwd 路径，封顶展示） */
function findTestFiles(rootDir, cwd, cap = 10) {
  const found = []
  const skip = new Set(['node_modules', '.git', '.gradle', '__pycache__', '.venv', 'dist', 'build', 'target', 'out'])
  const walk = (d) => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(d, e.name)
      if (e.isDirectory()) {
        if (!skip.has(e.name)) walk(full)
      } else if (e.isFile() && isTestFileName(e.name)) {
        found.push(full.split('\\').join('/').replace(cwd.split('\\').join('/').replace(/\/$/, '') + '/', ''))
        if (found.length >= cap) return
      }
    }
  }
  if (existsSync(rootDir)) walk(rootDir)
  return found
}

// ── 探针 8（载荷字段契约对账，2026-09-16 EHS 二次独立复核驱动）常量与纯函数 ──
// 5 个 P1 里 4 处是字段/载荷错位（leaderUserId↔rpLeaderUserId 三处 Jackson 静默丢弃、小程序
// 缺发 reportOrgId、sourceShdId↔safelyHiddenId、report_org_name NOT NULL 边界）——探针 5 只对
// 账 method+path（URL 级），载荷级错位零覆盖。本探针三面启发式比对（advisory，命中≠结论）：
// 前端请求载荷键 × 后端 Java 字段（归一化覆盖）∪ 子串疑似错位配对 ∪ SQL NOT NULL 列缺送核对。
const PROBE8_HEADING = '#### 探针 8：载荷字段契约对账（advisory）'
// 服务端填充/标准列豁免（NOT NULL 但不该由前端送）
const PROBE8_SERVER_FILLED_RE = /^(id|create_by|create_date|update_by|update_date|remarks|dept_id|tenant_id|del_flag)$/i

/**
 * 归一化键：小写 + 剥全部分隔线（snake/连字符）——两侧同构（rp_category / rpCategory /
 * rp-category → rpcategory）。注意不能「小写后再 camel 化」（会单侧引入大写不对称）。
 */
const normFieldKey = (s) => String(s || '').trim().toLowerCase().replace(/[_-]/g, '')

/** Java private 字段名提取（全大写常量 TODO_FLAG_TODO 排除——EHS 探针1 同款教训） */
export function extractJavaFields(text) {
  const names = new Set()
  const re = /private\s+(?:static\s+|final\s+)*[\w.$<>[\]]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*[;=]/g
  let m
  while ((m = re.exec(String(text || ''))) !== null) {
    if (!/^[A-Z0-9_]+$/.test(m[1])) names.add(m[1])
  }
  return names
}

/** SQL CREATE TABLE 行的 NOT NULL 业务列（审计列豁免） */
export function extractSqlNotNullColumns(text) {
  const cols = new Set()
  for (const line of String(text || '').split('\n')) {
    const m = line.match(/^\s*`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+(?:varchar|char|int|integer|bigint|decimal|datetime|date|timestamp|text|double|float)\b[^,]*NOT NULL\b/i)
    if (m && !PROBE8_SERVER_FILLED_RE.test(m[1])) cols.add(m[1])
  }
  return cols
}

/**
 * 请求载荷键提取：apiFetch/request/axios/$http/fetch( 调用行后 8 行窗口内的对象键
 * （key: 后随值起始为字面量/对象/数组/null/undefined/负号——排除 case/三元等形态）。
 * UI 本地态对象（请求区外）天然不收。
 */
export function extractPayloadKeys(text) {
  const keys = new Set()
  const lines = String(text || '').split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/\b(apiFetch|request|axios|\$http|fetch)\s*\(/.test(lines[i])) continue
    for (let j = i; j < Math.min(i + 8, lines.length); j++) {
      for (const m of lines[j].matchAll(/(?:^|[{,(\s])([A-Za-z_][A-Za-z0-9]*)\s*:\s(?:["'`\d{[tfn-]|null\b|undefined\b)/g)) {
        keys.add(m[1])
      }
    }
  }
  return keys
}

// ── probe8 diff 源采集器（task-01，2026-09-18-probe8-direct-compare / D-001@v1：文件源从
//    design 清单声明面切到 diff 实际面——三态 fallback 链 + 文件分类 + design 差集 advisory）──
// 文件分类规则（Grill B-10）：.java→backend；.js/.jsx/.wxml/.vue→frontend（.vue 无条件
// frontend，N-2）；.ts/.tsx 按目录启发式裁决——目录段词（驼峰拆词，只看目录部分、文件名不
// 参与——classifyConsumerHints 段级匹配同哲学，'homepages.js' 文件名不命中 pages 段）含
// routes/pages/components/models→frontend；含 controller/service/mapper/entity/dto/api（含
// 常见复数形）→backend；目录两不中再看文件头 10 行含 @RequestMapping/@RestController/@Service
// →backend；仍两不中→other。.css/.less/.json/.md/.sql 等→other。
const PROBE8_FE_DIR_WORDS = new Set(['routes', 'pages', 'components', 'models'])
const PROBE8_BE_DIR_WORDS = new Set(['controller', 'controllers', 'service', 'services', 'mapper', 'mappers', 'entity', 'entities', 'dto', 'dtos', 'api', 'apis'])
const PROBE8_BE_HEAD_RE = /@(?:RequestMapping|RestController|Service)\b/

/** 目录段词化（驼峰拆词 + 非字母数字切段；只取目录部分，根级文件无目录词） */
function probe8DirWords(p) {
  const posix = String(p || '').split('\\').join('/')
  const cut = posix.lastIndexOf('/')
  return (cut === -1 ? '' : posix.slice(0, cut))
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * probe8 文件分类（task-01，纯函数——采集器内部消费；task-02/03 经 collectProbe8DiffFiles 的
 * fileClassification 字段消费，不直接引用本函数）。
 * @param {string} filePath 仓根相对路径（反斜杠容忍）
 * @param {string|null} [headText] 文件头文本（调用方传头 10 行；.ts/.tsx 目录启发式未裁决时消费）
 * @returns {'frontend'|'backend'|'other'}
 */
function classifyProbe8FilePath(filePath, headText = null) {
  const p = String(filePath || '').split('\\').join('/')
  const lower = p.toLowerCase()
  if (lower.endsWith('.java')) return 'backend'
  if (/\.(js|jsx|wxml|vue)$/.test(lower)) return 'frontend'
  if (/\.(ts|tsx)$/.test(lower)) {
    const words = probe8DirWords(p)
    if (words.some(w => PROBE8_FE_DIR_WORDS.has(w))) return 'frontend'
    if (words.some(w => PROBE8_BE_DIR_WORDS.has(w))) return 'backend'
    if (headText && PROBE8_BE_HEAD_RE.test(headText)) return 'backend'
  }
  return 'other'
}

/**
 * collectProbe8DiffFiles——probe8 文件源 diff 实际面采集器（task-01，D-001@v1）。三态 fallback 链
 * （各级 fail-open 不抛）：
 *   ① diff——worktree 可用（_readWorktreeMeta 命中且 gitDir≠主仓 cwd；in-place-fallback/仓
 *      已删的 meta 落回 ②）：gitQuiet 数组参数取 diff baseline..HEAD ∪ status --porcelain
 *      （-uall 防目录折叠，同构先例 _resolveDiffFilesForParity，contract-matrix.js）；
 *   ② in-place——worktree 缺失：主仓 diff HEAD~1..HEAD ∪ porcelain（含已提交窗口，Grill B-9）；
 *   ③ design-list——主仓两路 git 取数全失败：退 design 清单声明面（parseFileChangeListDetailed）
 *      + 模式注记「文件源=design 清单（diff 不可用）」（fail-open 不抛）。
 * 跨仓双源直采（①②态启用，不 import run/ 目录）：parseRepoRegistry 读 local.yaml repos →
 * 每注册仓根 git diff HEAD~1..HEAD ∪ porcelain（复刻 collectCrossRepoDiffRoots 只读口径，
 * run/complete.js 同款）；仓根不存在/取数失败跳过不炸；产物仓根相对路径。
 * design 差集（advisory，不参与对账不阻断）：design 清单有但 diff 面无的路径收 designOnlyPaths
 * （跨仓条目带 cross-repo:<key>: 前缀消歧）；design-list 态文件源即清单面 → 差集恒空。
 * 产物路径一律 unquoteGitPath + 正斜杠归一（quotepath=false 下仍防控制字符引号形态）。
 * @param {{ cwd: string, changeName: string, specBase: string, repoKeys?: string[]|null }} args
 * @returns {{ source: 'diff'|'in-place'|'design-list', fallbackMode: 'diff'|'in-place'|'design-list',
 *   diffFiles: string[], fileClassification: {frontend: string[], backend: string[], other: string[]},
 *   frontend: string[], backend: string[], other: string[], designOnlyPaths: string[], notes: string[] }}
 */
export function collectProbe8DiffFiles({ cwd, changeName, specBase, repoKeys = null }) {
  const out = {
    source: 'design-list', fallbackMode: 'design-list', diffFiles: [],
    fileClassification: { frontend: [], backend: [], other: [] },
    frontend: [], backend: [], other: [], designOnlyPaths: [], notes: [],
  }
  if (!cwd || !specBase || !changeName) {
    out.notes.push('collectProbe8DiffFiles 入参缺失（cwd/specBase/changeName）——文件源空面')
    return out
  }

  // 路径归一：剥外层引号 → unquoteGitPath 解码转义（八进制/\"/\\）→ 正斜杠归一
  const normGitPath = (raw) => unquoteGitPath(String(raw || '').trim().replace(/^"|"$/g, '')).split('\\').join('/')
  // porcelain 行：XY <path>（前 3 字符状态码，trim:false 保前导空格；重命名 old -> new 取 new）
  // ——口径同 _resolveDiffFilesForParity（contract-matrix.js）
  const fromPorcelain = (stOut) => {
    const files = []
    for (const line of String(stOut || '').split('\n')) {
      if (!line || line.length < 4) continue
      const p = line.slice(3).trim().split(' -> ').pop() || ''
      if (p) files.push(normGitPath(p))
    }
    return files
  }
  // git 双源采集：diff --name-only ∪ status --porcelain -uall；两取数任一成功即 ok（全失败
  // 返 null 交 fallback 链降级）；产物 Set 去重
  const gitFace = (gitDir, diffSpec) => {
    let ok = false
    const files = new Set()
    const d = gitQuiet(gitDir, ['diff', '--name-only', diffSpec], { timeout: 30000 })
    if (d !== null) {
      ok = true
      for (const line of String(d).split('\n')) {
        const f = normGitPath(line)
        if (f) files.add(f)
      }
    }
    const st = gitQuiet(gitDir, ['status', '--porcelain', '--untracked-files=all'], { timeout: 30000, trim: false })
    if (st !== null) {
      ok = true
      for (const f of fromPorcelain(st)) files.add(f)
    }
    return ok ? [...files] : null
  }

  // ── 主仓三态 fallback ──
  let source = null
  let mainRoot = cwd
  const mainFiles = []
  const wt = _readWorktreeMeta(specBase, cwd, changeName)
  if (wt && resolve(wt.gitDir) !== resolve(cwd)) {
    // baseline 口径同 _resolveDiffFilesForParity：baselineCommit / actualBaseHash / baseHash
    const diffBase = wt.meta.baselineCommit || wt.meta.actualBaseHash || wt.meta.baseHash
    if (diffBase) {
      const face = gitFace(wt.gitDir, `${diffBase}..HEAD`)
      if (face) {
        source = 'diff'
        mainRoot = wt.gitDir
        mainFiles.push(...face)
        out.notes.push(`文件源=worktree diff（${diffBase.slice(0, 8)}..HEAD ∪ porcelain）`)
      }
    }
  }
  if (!source) {
    // in-place（Grill B-9 含已提交窗口）：HEAD~1..HEAD ∪ porcelain（初提交仓 HEAD~1 不存在时
    // 两取数全失败 → 落 design-list）
    const face = gitFace(cwd, 'HEAD~1..HEAD')
    if (face) {
      source = 'in-place'
      mainFiles.push(...face)
      out.notes.push('文件源=in-place diff（HEAD~1..HEAD ∪ porcelain，含已提交窗口）')
    }
  }

  // ── local.yaml 注册表（跨仓直采 + design 清单 repoKeys 解析共用；specBase/local.yaml 优先，
  //    兼容 cwd/.sillyspec/local.yaml——runProbe8PayloadParity / collectCrossRepoDiffRoots 双读点合一）──
  let registry = new Map()
  try {
    for (const yamlPath of [join(specBase, 'local.yaml'), join(cwd, '.sillyspec', 'local.yaml')]) {
      if (!existsSync(yamlPath)) continue
      registry = parseRepoRegistry(readFileSync(yamlPath, 'utf8'))
      if (registry.size > 0) break
    }
  } catch { /* 注册表不可读 → 跨仓空面（fail-open） */ }
  const repoRootOf = (raw) => (isAbsolute(raw) ? raw : resolve(cwd, raw))

  // ── design 清单声明面（③态文件源 + 差集基准；NEW: 待建前缀剥除，probe1-new-prefix-miss 同款）──
  const designPath = join(specBase, 'changes', changeName, 'design.md')
  let designList = []
  try {
    if (existsSync(designPath)) designList = parseFileChangeListDetailed(designPath, { repoKeys: repoKeys || [...registry.keys()] })
  } catch { designList = [] }
  const designNorm = []
  for (const e of designList) {
    let p = String((e && e.path) || '').replace(/^NEW:\s*/, '').split('\\').join('/').trim()
    let repo = (e && e.repo) || null
    if (!p || p.startsWith('.sillyspec/')) continue
    // 未注册跨仓前缀兜底识别（change-list 只对注册 key 落 e.repo）：前缀剥掉按路径启发式
    // 分类 + 未注册注记（runProbe8 readEntry 同款现身原则，不静默吞）
    if (!repo) {
      const cr = p.match(/^cross-repo:([A-Za-z0-9_.\-]+):(.*)$/)
      if (cr) {
        p = cr[2]
        out.notes.push(`repo「${cr[1]}」未在 local.yaml repos 注册——该仓文件不进 diff 面，按路径启发式分类`)
      }
    }
    if (p) designNorm.push({ repo, path: p })
  }

  // ── 跨仓双源直采（diff/in-place 态；design-list 态文件源即清单面不直采）──
  const fileEntries = [] // { path, roots[] }（roots = 文件头 10 行读取候选根，先主后次）
  if (source === 'diff' || source === 'in-place') {
    for (const f of mainFiles) fileEntries.push({ path: f, roots: [mainRoot] })
    for (const [key, raw] of registry.entries()) {
      try {
        if (!raw) continue
        const root = repoRootOf(raw)
        if (!root || !existsSync(root) || resolve(root) === resolve(cwd)) continue // 主仓自身不重复计
        const face = gitFace(root, 'HEAD~1..HEAD')
        if (!face) { out.notes.push(`跨仓「${key}」diff 取数失败——跳过`); continue }
        for (const f of face) fileEntries.push({ path: f, roots: [root] })
      } catch { out.notes.push(`跨仓「${key}」采集异常——跳过`) }
    }
  } else {
    out.notes.push('文件源=design 清单（diff 不可用）')
    for (const e of designNorm) {
      const roots = e.repo && registry.has(e.repo)
        ? [repoRootOf(registry.get(e.repo))]
        : [wt && resolve(wt.gitDir) !== resolve(cwd) ? wt.gitDir : null, cwd].filter(Boolean)
      fileEntries.push({ path: e.path, roots })
    }
  }

  // ── design 差集（advisory）：design 清单有但 diff 面无（design-list 态清单即面 → 恒空）──
  if (source === 'diff' || source === 'in-place') {
    // 主仓面直接对集合；跨仓面按 roots[0] 反查仓根对应的 fileEntries 集合（多仓同根退化为主
    // 仓口径，advisory 可接受；未注册 repo 无根可查 → 其条目恒落 design-only，如实现身不静默吞）
    const mainFace = new Set(mainFiles)
    const faceByRoot = new Map()
    const faceAt = (root) => {
      const abs = resolve(root)
      if (!faceByRoot.has(abs)) {
        faceByRoot.set(abs, new Set(fileEntries.filter(fe => resolve(fe.roots[0]) === abs).map(fe => fe.path)))
      }
      return faceByRoot.get(abs)
    }
    for (const e of designNorm) {
      if (e.repo) {
        const face = registry.has(e.repo) ? faceAt(repoRootOf(registry.get(e.repo))) : new Set()
        if (!face.has(e.path)) out.designOnlyPaths.push(`cross-repo:${e.repo}:${e.path}`)
      } else if (!mainFace.has(e.path)) {
        out.designOnlyPaths.push(e.path)
      }
    }
  }

  // ── 分类（.ts/.tsx 目录启发式未裁决时才读文件头 10 行，省 IO；读不到按无头处理）──
  const head10 = (roots, relPath) => {
    for (const r of roots || []) {
      try { return readFileSync(join(r, relPath), 'utf8').split('\n').slice(0, 10).join('\n') } catch { /* 试下一根 */ }
    }
    return null
  }
  const cls = { frontend: [], backend: [], other: [] }
  const seen = new Set()
  for (const fe of fileEntries) {
    if (seen.has(fe.path)) continue
    seen.add(fe.path)
    let c
    if (/\.(ts|tsx)$/i.test(fe.path)) {
      const words = probe8DirWords(fe.path)
      const dirResolved = words.some(w => PROBE8_FE_DIR_WORDS.has(w) || PROBE8_BE_DIR_WORDS.has(w))
      c = classifyProbe8FilePath(fe.path, dirResolved ? null : head10(fe.roots, fe.path))
    } else {
      c = classifyProbe8FilePath(fe.path)
    }
    cls[c].push(fe.path)
  }
  out.source = source || 'design-list'
  out.fallbackMode = out.source
  out.diffFiles = [...seen].sort()
  out.frontend = cls.frontend
  out.backend = cls.backend
  out.other = cls.other
  out.fileClassification = { frontend: cls.frontend, backend: cls.backend, other: cls.other }
  out.designOnlyPaths.sort()
  return out
}

// ── probe8 前端载荷字段提取器（task-02，2026-09-18-probe8-direct-compare / D-002@v1）──
// 前端面从「单文件键集」（extractPayloadKeys）升级为「字段 + 首命中行号 + URL 关联素材」三元组，
// 供 task-04 前端×后端直查对账。三后缀选匹配族（.js/.ts/.jsx/.tsx 基础四形态；.vue 追加
// v-model/prop；.wxml 追加 value 插值/data- 前缀）；DTO 键仅收请求调用 8 行邻近窗口
// （R-08/Grill B-5：全文件字面量键污染防线，窗口机制对齐 extractPayloadKeys）。
// 请求调用定位族——词边界前置防 myDelete(/onSearch( 类标识符内误命中（EHS onDelete 形态）
const PROBE8_REQUEST_CALL_RE = /\b(?:fetch|post|put|delete|getRequest|postRequest|putRequest|deleteRequest|search)\s*\(/
// DTO 对象字面量起始键（{ key: 形态，{ 与键同行）；控制流/声明关键字经保留字 Set 排除
const PROBE8_DTO_KEY_RE = /[{]\s*([a-zA-Z]\w+)\s*:/g
const PROBE8_DTO_KEY_RESERVED = new Set([
  'if', 'for', 'while', 'switch', 'return', 'function', 'const', 'let', 'var', 'new', 'typeof',
  'await', 'try', 'catch', 'else', 'do', 'case', 'default', 'export', 'import', 'class',
  'extends', 'super', 'this', 'null', 'undefined', 'true', 'false',
])
// js 族基础三正则（+ 上方 DTO 邻近窗口族）；带 g 供 matchAll（matchAll 不推进原正则 lastIndex）
const PROBE8_FE_FORMDATA_RE = /formData\.([a-zA-Z]\w+)/g
const PROBE8_FE_PAYLOAD_RE = /payload\.([a-zA-Z]\w+)/g
const PROBE8_FE_NAME_RE = /name="(\w+)"/g
// vue 追加：v-model 绑定值 + prop 属性值（(?<![:\w]) 排 vue 动态绑定 :prop= 与连写词内 prop=）
const PROBE8_FE_VMODEL_RE = /v-model="(\w+)"/g
const PROBE8_FE_PROP_RE = /(?<![:\w])prop="(\w+)"/g
// wxml 追加：value 插值绑定值 + data- 前缀属性名（事件传参 data-xxx= 形态）
const PROBE8_FE_WXML_VALUE_RE = /value="{{(\w+)}}"/g
const PROBE8_FE_WXML_DATA_RE = /data-(\w+)=/g
// URL 捕获：请求调用首参（引号/反引号/斜杠起始；变量首参不收，fail-visible 保守面）
const PROBE8_URL_CALL_RE = /\b(?:fetch|post|put|delete|getRequest|postRequest|putRequest|deleteRequest|search)\s*\(\s*['"`/]([^'"`,\s]+)/g

/** 字段名归一：snake_case → lowerCamel（_x → X，_ 后随字母数字大写化） */
const camelProbe8Field = (s) => String(s || '').replace(/_([A-Za-z0-9])/g, (_, c) => c.toUpperCase())

/** URL 归一化三步：去 ?query → 去首 /api/ 前缀 → 去尾斜杠（task-04 段边界匹配消费口径） */
const normalizeProbe8Url = (u) => String(u || '')
  .split('?')[0]
  .replace(/^\/?api\//, '')
  .replace(/\/+$/, '')

/**
 * 段边界后缀匹配（task-02）：前端归一 URL 是否为后端完整 path 的路径段边界后缀——
 * backendPath === frontendUrl ‖ 以 '/'+frontendUrl 收尾 ‖ 以 frontendUrl+'/' 收尾。
 * 段首对齐：'/orders' 命中 '/api/v1/orders' 不命中 '/rporders'（裸 endsWith 的段中假阳防线）。
 * @param {string} frontendUrl 前端归一 URL
 * @param {string} backendPath 后端完整 path（类级+方法级 @RequestMapping 拼接形态）
 * @returns {boolean}
 */
export function isSegmentSuffix(frontendUrl, backendPath) {
  // 前后都归一去前导/尾随斜杠再比——修前导斜杠缺口（task-06 发现：'/' + '/orders'
  // 拼成 '//orders' 永不命中，非 /api/ 前缀前端 URL 对 /api 前缀后端端点静默失联）
  const fe = String(frontendUrl || '').trim().replace(/^\/+|\/+$/g, '')
  const be = String(backendPath || '').trim().replace(/^\/+|\/+$/g, '')
  if (!fe || !be) return false
  return be === fe || be.endsWith('/' + fe)
}

/**
 * extractFrontendPayloadFields——前端载荷构造点字段提取（task-02）。
 *   - 逃生门：文件前 5 行任意一行含 probe8-skip → escapeHatch=true 整文件跳过
 *     （probe9-skip 文件级豁免同款先例；不限定注释形态——js/vue/wxml 注释语法各异）。
 *   - fields：归一（snake→lowerCamel）后字段名数组（首命中序，Set 语义去重）；
 *   - fieldLines：Map<归一字段, 首命中行号（1-based，多族命中取最小行号）>——task-04
 *     driftWarnings 行号来源；
 *   - urlsByCall：{ url, normalizedUrl, line }[] 逐请求调用记录——无 URL 文件产出空数组
 *     （未关联端点面处置归 task-04）。
 * 三后缀之外的文件返回空面（escapeHatch=false）。
 * @param {string} filePath 仓根相对路径（反斜杠/大小写容忍）
 * @param {string} content 文件全文
 * @returns {{ escapeHatch: boolean, fields: string[], fieldLines: Map<string, number>,
 *   urlsByCall: Array<{ url: string, normalizedUrl: string, line: number}> }}
 */
export function extractFrontendPayloadFields(filePath, content) {
  const text = String(content || '')
  // 前 5 行逃生门（slice(0,5) 即第 1-5 行）
  if (text.split('\n').slice(0, 5).some(l => l.includes('probe8-skip'))) {
    return { escapeHatch: true, fields: [], fieldLines: new Map(), urlsByCall: [] }
  }
  const p = String(filePath || '').split('\\').join('/').toLowerCase()
  const isJs = /\.(?:js|ts|jsx|tsx)$/.test(p)
  const isVue = p.endsWith('.vue')
  const isWxml = p.endsWith('.wxml')
  if (!isJs && !isVue && !isWxml) {
    return { escapeHatch: false, fields: [], fieldLines: new Map(), urlsByCall: [] }
  }

  const lines = text.split('\n')
  const fieldLines = new Map() // 归一字段 → 首命中行号（行级族与 DTO 族独立扫描，合并取最小）
  const record = (raw, line) => {
    const f = camelProbe8Field(raw)
    if (!f) return
    const prev = fieldLines.get(f)
    if (prev === undefined || line < prev) fieldLines.set(f, line)
  }

  // ── 行级匹配族：js 基础三正则（formData./payload./name=）+ vue/wxml 追加族 ──
  const lineRes = [PROBE8_FE_FORMDATA_RE, PROBE8_FE_PAYLOAD_RE, PROBE8_FE_NAME_RE]
  if (isVue) lineRes.push(PROBE8_FE_VMODEL_RE, PROBE8_FE_PROP_RE)
  if (isWxml) lineRes.push(PROBE8_FE_WXML_VALUE_RE, PROBE8_FE_WXML_DATA_RE)
  for (let i = 0; i < lines.length; i++) {
    for (const re of lineRes) {
      for (const m of lines[i].matchAll(re)) record(m[1], i + 1)
    }
  }

  // ── 请求调用：调用行起 8 行窗口 DTO 键（窗口口径对齐 extractPayloadKeys）+ 首参 URL 捕获 ──
  const urlsByCall = []
  for (let i = 0; i < lines.length; i++) {
    if (!PROBE8_REQUEST_CALL_RE.test(lines[i])) continue
    for (let j = i; j < Math.min(i + 8, lines.length); j++) {
      for (const m of lines[j].matchAll(PROBE8_DTO_KEY_RE)) {
        if (!PROBE8_DTO_KEY_RESERVED.has(m[1])) record(m[1], j + 1)
      }
    }
    for (const um of lines[i].matchAll(PROBE8_URL_CALL_RE)) {
      urlsByCall.push({ url: um[1], normalizedUrl: normalizeProbe8Url(um[1]), line: i + 1 })
    }
  }
  return { escapeHatch: false, fields: [...fieldLines.keys()], fieldLines, urlsByCall }
}

// ── probe8 后端字段两趟提取器（task-03，2026-09-18-probe8-direct-compare / D-003@v1）──
// 后端面两趟结构（Grill B-4——@RequestBody 类型名跨文件解析，单文件签名不可行）：一趟 Controller
// 定位（类级 @RequestMapping 前缀 × 方法级动词注解 path 拼接完整端点）+ 方法签名区参数提取
// （Grill B-3 修正正则）；二趟 @RequestBody 类型名经 resolveTypeContent 全仓回调解析出字段集
// （R-07——变更不动实体时不再全量假阳：只解析被引用类型非全仓字段；全仓性体现在检索面由回调
// 承担）。函数本体零文件系统 IO（纯函数可测）——全仓检索经回调注入，工厂 createTypeResolver
// 另行导出供调用侧组装（task-05 接线）。
// 类级前缀：@RequestMapping(value = "/x") 且位置在 class 声明前（首个命中）
const PROBE8_CLASS_PREFIX_RE = /@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']+)["']/
// class 声明锚（前缀只认首个 class/interface/enum 声明之前；方法级注解按 index 与之比较）
const PROBE8_CLASS_DECL_RE = /\b(?:class|interface|enum)\s+\w+/
// 含任一 mapping 注解 → 本文件进一趟端点提取（service/entity 的 .java 不含，天然排除）
const PROBE8_CONTROLLER_RE = /@(?:RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\b/
// 方法级端点（动词组含 Request → 无动词时 'REQUEST'）：注解 path → 注解余段 [^)]* → 方法签名
// 可见性修饰符。m[2]=方法子路径；m[0] 尾部止于可见性修饰符后（签名区起点 = m.index+m[0].length）
const PROBE8_METHOD_MAPPING_RE = /@(Get|Post|Put|Delete|Patch|Request)Mapping\(\s*(?:value\s*=\s*)?["']([^"']+)["'][^)]*\)\s*(?:public|protected|private)\s+/g
// 方法参数三注解（Grill B-3 修正——捕获组 2=参数名：可选注解参数串 + 可选 final + 泛型/数组
// 类型（Grill F-6——String[]/List<String> 方括号泛型边界不误捕）+ 最后一个标识符；@RequestParam
// 注解参数串含 required=false → 该参数非必填）
const PROBE8_REQUEST_PARAM_RE = /@RequestParam\s*(?:\(([^)]*)\))?\s+(?:final\s+)?(?:\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)/g
// @RequestParam 注解显式 value 名命中时参数名取它（括号紧邻裸串或 value= 形态；defaultValue=
// 等其他键不命中——括号紧邻约束保证）
const PROBE8_REQUEST_PARAM_VALUE_RE = /@RequestParam\(\s*(?:value\s*=\s*)?["'](\w+)["']/
const PROBE8_REQUIRED_FALSE_RE = /required\s*=\s*false/
const PROBE8_PATH_VARIABLE_RE = /@PathVariable\s+(?:final\s+)?(?:\w+\s+)?(\w+)/g
const PROBE8_REQUEST_BODY_RE = /@RequestBody\s+(?:final\s+)?(\w+)/g
// 必填形态①（D-003）：校验注解行起向下 5 行窗口内首个 private 字段声明
const PROBE8_NOT_NULL_RE = /@(?:NotNull|NotBlank|NotEmpty)\b/
const PROBE8_PRIVATE_FIELD_RE = /private\s+\w+(?:<[^>]+>)?(?:\[\])?\s+(\w+)\s*;/
// 必填形态③：方法体前 30 行校验调用三模式（StringBlankValidator 首参 / Valid.valid 同行或
// 上一行字段名 / if 判空字段名）
const PROBE8_SBV_RE = /StringBlankValidator\s*\(\s*["'](\w+)["']/
const PROBE8_VALID_LINE_RE = /\bValid\.valid/
const PROBE8_VALID_ARG_RE = /\bValid\.valid\w*\(\s*(\w+)/
// 上一行标识符宽收（形态③「上一行字段名」落点）：小写起始 + 不紧邻 `(`（排调用名）+ 停用词集
const PROBE8_VALID_IDENT_RE = /\b([a-z][A-Za-z0-9]*)\b(?!\s*\()/g
const PROBE8_VALID_IDENT_STOP = new Set([
  'valid', 'final', 'new', 'return', 'if', 'else', 'while', 'for', 'switch', 'case', 'catch',
  'null', 'true', 'false', 'this', 'super', 'static', 'public', 'private', 'protected',
  'string', 'integer', 'int', 'long', 'double', 'float', 'boolean', 'date', 'object',
])
const PROBE8_IF_NULL_RE = /if\s*\(\s*(\w+)\s*==\s*null/
// 实体/dto 文件形（diff 面直接解析不依赖 @RequestBody 引用链）
const PROBE8_ENTITY_CLASS_RE = /class\s+\w+\s*(?:extends|implements|\{)/

/** 端点 path 拼接：prefix × 方法子路径，去重复 /（"/api/" + "/add" → "/api/add"） */
function joinProbe8Path(prefix, methodPath) {
  const p = String(prefix || '')
  const m = String(methodPath || '')
  if (!p) return m
  if (!m) return p
  return (p.endsWith('/') ? p.slice(0, -1) : p) + (m.startsWith('/') ? m : '/' + m)
}

/** private 字段声明名集（二趟 DTO / diff 面实体共用；g 正则局部化 matchAll，无共享 lastIndex 风险） */
function probe8PrivateFieldNames(content) {
  const out = new Set()
  for (const m of String(content || '').matchAll(/private\s+\w+(?:<[^>]+>)?(?:\[\])?\s+(\w+)\s*;/g)) out.add(m[1])
  return out
}

/** 必填形态①（D-003）：@(NotNull|NotBlank|NotEmpty) 行起向下 5 行窗口内首个 private 字段声明名集 */
function probe8NotNullFields(content) {
  const lines = String(content || '').split('\n')
  const out = new Set()
  for (let i = 0; i < lines.length; i++) {
    if (!PROBE8_NOT_NULL_RE.test(lines[i])) continue
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      const fm = lines[j].match(PROBE8_PRIVATE_FIELD_RE)
      if (fm) { out.add(fm[1]); break }
    }
  }
  return out
}

/**
 * 必填形态③（D-003）：方法体前 30 行校验调用三模式字段名集——
 * StringBlankValidator("x") 首参 / Valid.valid 同行首参 + 上一行标识符宽收（R-02 宁多勿漏）/
 * if (x == null) 判空字段。
 */
function probe8BodyCheckFields(winLines) {
  const out = new Set()
  for (let k = 0; k < winLines.length; k++) {
    const line = winLines[k]
    const sbv = line.match(PROBE8_SBV_RE)
    if (sbv) out.add(sbv[1])
    const ifn = line.match(PROBE8_IF_NULL_RE)
    if (ifn) out.add(ifn[1])
    if (PROBE8_VALID_LINE_RE.test(line)) {
      const arg = line.match(PROBE8_VALID_ARG_RE)
      if (arg) out.add(arg[1])
      if (k > 0) {
        for (const idm of winLines[k - 1].matchAll(PROBE8_VALID_IDENT_RE)) {
          if (!PROBE8_VALID_IDENT_STOP.has(idm[1])) out.add(idm[1])
        }
      }
    }
  }
  return out
}

/**
 * extractBackendFields——后端面两趟提取（task-03，D-003@v1）。
 *   - 逃生门：文件前 5 行任意一行含 probe8-skip → escapeHatchCount++ 整文件跳过（与前端
 *     task-02 同门，不限定注释形态；优先于非 Java 判定——hatch 是整文件主动退出）；
 *   - 非 Java：分类面 backend 但非 .java（目录启发式命中的 .ts 等）→ nonJavaSkipCount++；
 *   - 一趟 Controller（含六个 mapping 注解任一）：类级 @RequestMapping 前缀 × 方法级动词注解
 *     path 拼接完整端点（去重复 /）；方法级 @RequestMapping → method='REQUEST'；prefix 存在
 *     但零方法级端点 → 类级通配 {prefix, 'REQUEST'}；方法签名区（注解尾至方法体首 `{`）提取
 *     @RequestParam（三态：正常参数名 / required=false 非必填 / value 注解显式名）/ @PathVariable
 *     （URL 段参数，非载荷字段只进参数集）/ @RequestBody（类型名收二趟待解析集）；
 *   - 必填三形态（D-003）：①校验注解 5 行窗口（二趟类型内容上扫，命中归引用该类型的端点）；
 *     ②@RequestParam 排除 required=false 后全必填（Spring 缺省 true）；③方法体前 30 行校验
 *     调用三模式；
 *   - 二趟：@RequestBody 类型名经 resolveTypeContent(typeName) 全仓回调解析（返 null / 抛错
 *     均 fail-soft 不炸）→ private 字段集 = 端点 bodyFields（并入 entityFields）+ ①必填扫描；
 *     diff 面非 Controller 实体文件（class 声明形）直接解析（不依赖 @RequestBody 引用链）；
 *   - backendAllFields = 二趟类型字段 ∪ 一趟 Controller 方法参数名 ∪ diff 面实体字段
 *     （全仓并集非仅 diff 面，Grill B-7）。
 * @param {Array<{path: string, content: string}>} files 分类面 backend 文件集
 * @param {(typeName: string) => string|null} [resolveTypeContent] 二趟全仓类型定义查找回调
 * @returns {{ entityFields: string[], endpoints: Array<{path: string, method: string,
 *   requiredFields: string[], bodyFields: string[]}>, backendAllFields: string[],
 *   escapeHatchCount: number, nonJavaSkipCount: number }}
 */
export function extractBackendFields(files, resolveTypeContent) {
  const resolve = typeof resolveTypeContent === 'function' ? resolveTypeContent : () => null
  const entityFields = new Set() // 二趟类型字段 ∪ diff 面实体字段
  const controllerParams = new Set() // 一趟全部 Controller 方法参数名
  const endpoints = [] // {path, method, required:Set, bodyFields:Set, bodyTypes:string[]}
  let escapeHatchCount = 0
  let nonJavaSkipCount = 0

  for (const f of Array.isArray(files) ? files : []) {
    const path = String((f && f.path) || '').split('\\').join('/')
    const text = String((f && f.content) || '')
    if (text.split('\n').slice(0, 5).some(l => l.includes('probe8-skip'))) { escapeHatchCount++; continue }
    if (!path.toLowerCase().endsWith('.java')) { nonJavaSkipCount++; continue }

    if (!PROBE8_CONTROLLER_RE.test(text)) {
      // 非 Controller：diff 面实体/dto 直接解析（class 声明形，不依赖 @RequestBody 引用链）
      if (PROBE8_ENTITY_CLASS_RE.test(text)) {
        for (const name of probe8PrivateFieldNames(text)) entityFields.add(name)
      }
      continue
    }

    // ── 一趟：类级前缀 + 方法级端点 ──
    const lines = text.split('\n')
    const classDecl = text.match(PROBE8_CLASS_DECL_RE)
    const classIdx = classDecl ? classDecl.index : -1
    let prefix = ''
    const pm = text.match(PROBE8_CLASS_PREFIX_RE)
    if (pm && (classIdx < 0 || pm.index < classIdx)) prefix = pm[1]

    let fileEndpointCount = 0
    for (const m of text.matchAll(PROBE8_METHOD_MAPPING_RE)) {
      if (classIdx >= 0 && m.index < classIdx) continue // 类级 @RequestMapping 非方法端点
      const method = m[1] === 'Request' ? 'REQUEST' : m[1].toUpperCase()
      // 方法签名区：注解尾（m[0] 止于可见性修饰符）至方法体首 `{`；无 `{`（抽象/接口）取到文末
      const sigStart = m.index + m[0].length
      const braceIdx = text.indexOf('{', sigStart)
      const sigText = text.slice(sigStart, braceIdx < 0 ? text.length : braceIdx)
      const ep = {
        path: joinProbe8Path(prefix, m[2]),
        method,
        required: new Set(),
        bodyFields: new Set(),
        bodyTypes: [],
      }
      // @RequestParam 三态（数组/泛型边界不误捕；value 注解显式名优先于声明参数名）
      for (const rp of sigText.matchAll(PROBE8_REQUEST_PARAM_RE)) {
        const annoSeg = rp[1] === undefined ? '' : `@RequestParam(${rp[1]})`
        const vm = annoSeg ? annoSeg.match(PROBE8_REQUEST_PARAM_VALUE_RE) : null
        const name = vm ? vm[1] : rp[2]
        controllerParams.add(name)
        if (!(rp[1] && PROBE8_REQUIRED_FALSE_RE.test(rp[1]))) ep.required.add(name) // ② Spring 缺省必填
      }
      // @PathVariable 参数名进一趟参数集（URL 段非载荷字段，不计端点必填）
      for (const pv of sigText.matchAll(PROBE8_PATH_VARIABLE_RE)) controllerParams.add(pv[1])
      // @RequestBody 类型名收二趟待解析集
      for (const rb of sigText.matchAll(PROBE8_REQUEST_BODY_RE)) ep.bodyTypes.push(rb[1])
      // ③ 方法体前 30 行校验调用三模式 → 端点必填
      if (braceIdx >= 0) {
        const braceLine = text.slice(0, braceIdx).split('\n').length // `{` 所在行（1-based）
        const win = lines.slice(braceLine - 1, braceLine - 1 + 30)
        for (const name of probe8BodyCheckFields(win)) ep.required.add(name)
      }
      endpoints.push(ep)
      fileEndpointCount++
    }
    // prefix 存在但零方法级端点 → 类级通配（无动词可判，method='REQUEST'）
    if (prefix && fileEndpointCount === 0) {
      endpoints.push({ path: prefix, method: 'REQUEST', required: new Set(), bodyFields: new Set(), bodyTypes: [] })
    }
  }

  // ── 二趟：@RequestBody 类型名经全仓回调解析（typeCache 去重同名类型重复解析）──
  const typeCache = new Map()
  for (const ep of endpoints) {
    for (const tn of ep.bodyTypes) {
      if (!typeCache.has(tn)) {
        let c = null
        try { c = resolve(tn) } catch { c = null } // 回调抛错 fail-soft 视为 null
        typeCache.set(tn, typeof c === 'string' ? c : null)
      }
      const content = typeCache.get(tn)
      if (!content) continue // 类型不可解析（null）不炸——bodyFields 留空
      for (const name of probe8PrivateFieldNames(content)) { ep.bodyFields.add(name); entityFields.add(name) }
      // ① 校验注解 5 行窗口必填 → 归引用该类型的端点
      for (const name of probe8NotNullFields(content)) ep.required.add(name)
    }
  }

  const backendAllFields = new Set([...entityFields, ...controllerParams])
  return {
    entityFields: [...entityFields].sort(),
    endpoints: endpoints.map(e => ({
      path: e.path,
      method: e.method,
      requiredFields: [...e.required].sort(),
      bodyFields: [...e.bodyFields].sort(),
    })),
    backendAllFields: [...backendAllFields].sort(),
    escapeHatchCount,
    nonJavaSkipCount,
  }
}

// 二趟全仓检索的 .java 文件大小上限（Grill F-6——超大生成文件不进类型表）
const PROBE8_JAVA_FILE_CAP = 500 * 1024

/**
 * createTypeResolver——二趟全仓类型解析回调工厂（task-05 调用侧组装）。readdirSync 递归扫
 * srcRoot 下 .java（statSync 大小 cap 500KB，超限跳过），内容首个 class/interface/enum 声明名
 * （缺失退文件名 stem）→ Map<className, content>；同名类先见先留（不覆写不炸）。srcRoot 不可
 * 读/不存在 → 空表闭包（恒返 null，fail-soft）。做 IO 的是本工厂非 extractBackendFields 本体
 * （纯函数约束）。
 * @param {string} srcRoot 扫描根（仓根的 src/ 或 src/main/java 等——由调用侧定）
 * @returns {(typeName: string) => string|null}
 */
export function createTypeResolver(srcRoot) {
  const typeMap = new Map()
  const walk = (dir) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = join(dir, e.name)
      try {
        if (e.isDirectory()) { walk(full); continue }
        if (!e.isFile() || !e.name.toLowerCase().endsWith('.java')) continue
        if (statSync(full).size > PROBE8_JAVA_FILE_CAP) continue
        const content = readFileSync(full, 'utf8')
        const decl = content.match(/\b(?:class|interface|enum)\s+([A-Za-z_]\w*)/)
        const name = (decl && decl[1]) || e.name.replace(/\.java$/, '')
        if (!typeMap.has(name)) typeMap.set(name, content)
      } catch { /* 单文件不可读——跳过 */ }
    }
  }
  walk(String(srcRoot || ''))
  return (typeName) => typeMap.get(typeName) || null
}

// ── probe8 direct-compare 对账+渲染（task-04，2026-09-18-probe8-direct-compare / D-002@v1·D-004@v1）──
// 消费 task-02 前端提取面（fields/fieldLines/urlsByCall）× task-03 后端提取面（endpoints/
// backendAllFields）做代码级字段直比，两嫌疑面（Grill B-7——backendAllFields 全仓并集防全量假阳）：
//   - 漂移嫌疑：前端发送字段 ∉ backendAllFields（Jackson 静默丢弃风险面）；
//   - 必填漏发嫌疑：端点 requiredFields ∉ 该端点关联前端文件发送集（EHS 缺发 reportOrgId 同族）。
// 纯函数零 IO、advisory 档（D-004——不进 errors/warnings，独立渲染子段，命中统计供后续批次
// 评估升格）。

/**
 * comparePayloadFields——前端×后端字段直比对账（task-04，纯函数零 IO）。
 *   - 漂移嫌疑：非 escapeHatch 前端文件的每个 field ∉ backendAllFields → driftWarnings 逐条
 *     {file, line（fieldLines 首命中行号，缺失 null）, field}；
 *   - 必填漏发嫌疑：端点 requiredFields ∉ 该端点关联前端文件发送集 → missingRequiredWarnings
 *     逐条 {endpoint, method, field, frontendFiles}。关联判定 = 端点 path 与文件 urlsByCall 的
 *     normalizedUrl 满足 isSegmentSuffix（段边界后缀，Grill B-8——/orders 命中 /api/v1/orders
 *     不误命中 /rporders；全等分支容忍无 /api 前缀可剥的归一原值如 /rporders）。无 URL 文件归
 *     「未关联端点」面——仅漂移参与、漏发不参与（design §2 口径）；端点零关联文件 → 跳过漏发
 *     判定（无发送集可比，「端点无人调用」属覆盖面非载荷面）；
 *   - escapeHatchCount = 前端面 escapeHatch 文件聚合 + backendStats.escapeHatchCount（后端 hatch
 *     自两提取面透传）；nonJavaSkipCount 自 backendStats 透传（后端提取面计数，三主参无承载点
 *     → 第四可选参，缺省零）。
 * @param {Array<{filePath: string, extract: {escapeHatch: boolean, fields: string[],
 *   fieldLines: Map<string, number>, urlsByCall: Array<{url: string, normalizedUrl: string, line: number}>}}>} frontendByFile
 *   逐前端文件提取面（task-02 产物按文件包装）
 * @param {Array<{path: string, method: string, requiredFields: string[], bodyFields: string[]}>} backendEndpoints
 *   后端端点集（task-03 产物 endpoints）
 * @param {string[]} backendAllFields 后端全字段并集（task-03 产物 backendAllFields）
 * @param {{escapeHatchCount?: number, nonJavaSkipCount?: number}} [backendStats]
 *   后端提取面计数透传（缺省 {escapeHatchCount: 0, nonJavaSkipCount: 0}）
 * @returns {{ driftWarnings: Array<{file: string, line: number|null, field: string}>,
 *   missingRequiredWarnings: Array<{endpoint: string, method: string, field: string, frontendFiles: string[]}>,
 *   escapeHatchCount: number, nonJavaSkipCount: number }}
 */
export function comparePayloadFields(frontendByFile, backendEndpoints, backendAllFields, backendStats) {
  const feFiles = Array.isArray(frontendByFile) ? frontendByFile : []
  const eps = Array.isArray(backendEndpoints) ? backendEndpoints : []
  const beFields = new Set(Array.isArray(backendAllFields) ? backendAllFields : [])
  const stats = backendStats && typeof backendStats === 'object' ? backendStats : {}
  const statCount = (v) => (Number.isInteger(v) && v > 0 ? v : 0)

  const driftWarnings = []
  let feEscapeCount = 0
  const urlLinkedFiles = [] // 有 URL 调用的文件 {filePath, fieldSet, urls}——漏发关联面
  for (const fe of feFiles) {
    const filePath = String((fe && fe.filePath) || '')
    const ex = (fe && fe.extract) || {}
    if (ex.escapeHatch) { feEscapeCount++; continue }
    const fields = Array.isArray(ex.fields) ? ex.fields : []
    for (const f of fields) {
      if (!beFields.has(f)) {
        const line = ex.fieldLines instanceof Map ? ex.fieldLines.get(f) : undefined
        driftWarnings.push({ file: filePath, line: typeof line === 'number' ? line : null, field: f })
      }
    }
    const urlsByCall = Array.isArray(ex.urlsByCall) ? ex.urlsByCall : []
    if (urlsByCall.length === 0) continue // 无 URL 文件：未关联端点面——仅上方漂移参与
    urlLinkedFiles.push({
      filePath,
      fieldSet: new Set(fields),
      urls: urlsByCall.map(u => u && u.normalizedUrl).filter(Boolean),
    })
  }

  const missingRequiredWarnings = []
  for (const ep of eps) {
    const path = String((ep && ep.path) || '')
    const method = String((ep && ep.method) || '')
    const required = Array.isArray(ep && ep.requiredFields) ? ep.requiredFields : []
    if (required.length === 0) continue
    const linked = urlLinkedFiles.filter(f => f.urls.some(u => isSegmentSuffix(u, path)))
    if (linked.length === 0) continue // 零关联文件：无发送集可比，漏发不判（覆盖面归 API 矩阵）
    const sentUnion = new Set()
    for (const f of linked) for (const x of f.fieldSet) sentUnion.add(x)
    for (const field of required) {
      if (!sentUnion.has(field)) {
        missingRequiredWarnings.push({ endpoint: path, method, field, frontendFiles: linked.map(f => f.filePath) })
      }
    }
  }

  return {
    driftWarnings,
    missingRequiredWarnings,
    escapeHatchCount: feEscapeCount + statCount(stats.escapeHatchCount),
    nonJavaSkipCount: statCount(stats.nonJavaSkipCount),
  }
}

/** direct-compare 子段标题前缀（renderProbe8Lines 尾部子段调用锚） */
const PROBE8_DIRECT_COMPARE_PREFIX = '- direct-compare:'

/**
 * renderDirectCompareSection——direct-compare 子段渲染（task-04，advisory 独立面）。
 * 命中统计行 + 逐条明细行（漂移/漏发各一节）；全零态输出「无命中」行。防撞约束（task 卡
 * acceptance）：明细行以 `` - ⚠️ ` `` 反引号开头，行首字面与 verify-postcheck.js 的
 * PROBE8_CONTRACT_ORPHANS_LINE_RE / PROBE8_MISSING_REQUIRED_LINE_RE（`- ⚠️ 契约外载荷键 N 条`/
 * `- ⚠️ 契约必填漏发 N 条` 字面前缀）严格不同——渲染行永不进两锚点的 N 求和（负例断言归
 * task-06）；PROBE1_HIT_LINE_RE 虽同形但按探针子节定界只统计 s1，本子段落 s8 不进其计数。
 * @param {{ driftWarnings?: Array<{file: string, line: number|null, field: string}>,
 *   missingRequiredWarnings?: Array<{endpoint: string, method: string, field: string, frontendFiles: string[]}>,
 *   escapeHatchCount?: number, nonJavaSkipCount?: number }} compareResult
 * @returns {string[]} 行数组（不含段标题——拼进探针 8 段尾部）
 */
export function renderDirectCompareSection(compareResult) {
  const r = compareResult && typeof compareResult === 'object' ? compareResult : {}
  const drift = Array.isArray(r.driftWarnings) ? r.driftWarnings : []
  const missing = Array.isArray(r.missingRequiredWarnings) ? r.missingRequiredWarnings : []
  const esc = r.escapeHatchCount ?? 0
  const nonJava = r.nonJavaSkipCount ?? 0
  const L = []
  if (drift.length === 0 && missing.length === 0) {
    L.push(`${PROBE8_DIRECT_COMPARE_PREFIX} 无命中（漂移 0 / 漏发 0）`)
    // 全零态仍保全跳过面计数（advisory 信息不丢——hatch/非 Java 跳过与命中数是独立维度）
    if (esc > 0 || nonJava > 0) {
      L.push(`- ℹ️ direct-compare: escape hatch ${esc} 文件 / 非 Java 后端跳过 ${nonJava} 文件`)
    }
    return L
  }
  L.push(`${PROBE8_DIRECT_COMPARE_PREFIX} 漂移嫌疑 ${drift.length} 条 / 必填漏发嫌疑 ${missing.length} 条 / escape hatch ${esc} 文件 / 非 Java 后端跳过 ${nonJava} 文件`)
  for (const d of drift) {
    L.push(`- ⚠️ \`${d.file}:${d.line ?? '?'}\` ${d.field} —— 不在后端字段集（漂移嫌疑）`)
  }
  for (const m of missing) {
    L.push(`- ⚠️ \`${m.endpoint} ${m.method} ${m.field}\` —— 后端必填但前端未发送（必填漏发嫌疑，关联面：${(m.frontendFiles || []).join('、') || '?'}）`)
  }
  return L
}


// ── 探针 8 契约维度（task-01，2026-09-16 跨层契约探针扩展）──
// design.md 的契约类章节（接口定义/数据模型等）字段表是「文档契约面」——既有三面（Java 字段/
// SQL NOT NULL/前端载荷键）对不上「文档 vs 实现」漂移：契约改了代码没跟上（orphan）、契约必填
// 前端根本没送（EHS 实证小程序缺发 reportOrgId 必填被拒同族）。纯 advisory 不升硬门。
const PROBE8_CONTRACT_SECTION_RE = /接口定义|数据模型|接口契约|字段/
const PROBE8_FIELD_HEADER_RE = /字段|field/i
const PROBE8_REQUIRED_CELL_RE = /必填|required|※/i
const PROBE8_FIELD_IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** markdown 切章节（##/### 标题行；# 是题名、#### 归正文，均不切），返回 [{heading, lines}] */
function splitMdSections(text) {
  const sections = []
  let cur = null
  for (const line of String(text || '').split('\n')) {
    const h = line.match(/^#{2,3}\s+(.*?)\s*#*\s*$/)
    if (h) {
      cur = { heading: h[1].trim(), lines: [] }
      sections.push(cur)
    } else if (cur) cur.lines.push(line)
  }
  return sections
}

/** 表格行切列（剥首尾竖线与空白） */
const splitMdRow = (line) => String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

/** markdown 表格分隔行（|---|---| 形态：剥竖线后仅剩 :/-/空白即认定） */
const isMdDividerRow = (line) => {
  const s = String(line || '').replace(/\|/g, '').trim()
  return s !== '' && /^[:\s-]+$/.test(s)
}

/**
 * 契约字段首列清洗：剥反引号与类型注记尾缀——`` `fieldName` `` / `fieldName（String）` /
 * `fieldName int` 等形态统一取标识符部分（类型混进字段名会破坏归一化比对）。
 */
const stripContractFieldName = (cell) => {
  const s = String(cell || '').replace(/`/g, '').trim()
  const paren = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[（(]/)
  if (paren) return paren[1]
  const tail = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(?:String|Integer|Int|Long|Double|Float|Boolean|Date|BigDecimal|varchar|char|int|bigint|decimal|datetime|timestamp|text)\b/i)
  if (tail) return tail[1]
  return s
}

/**
 * design.md 契约面解析（task-01）：契约类章节（标题含 接口定义/数据模型/接口契约/字段 之一）内
 * 表头首个数据列含「字段/Field」的表格 → {name=章节名, fields, required}。防误判：文件清单表
 * （首列「操作」）/风险表（首列「#」）不入面；数据行不足 2 行的噪声表跳过；章节含
 * `<!-- probe8-skip -->` 整章跳过计 skippedSections（非契约字段表的逃生门）。
 * @param {string} designPath
 * @returns {{contracts: Array<{name: string, fields: Set<string>, required: Set<string>}>, skippedSections: number}|null}
 */
export function parseDesignContracts(designPath) {
  if (!existsSync(designPath)) return null
  let text
  try { text = readFileSync(designPath, 'utf8') } catch { return null }
  const contracts = []
  let skippedSections = 0
  for (const sec of splitMdSections(text)) {
    if (!PROBE8_CONTRACT_SECTION_RE.test(sec.heading)) continue
    if (sec.lines.some(l => l.includes('<!-- probe8-skip -->'))) { skippedSections++; continue }
    let i = 0
    while (i < sec.lines.length) {
      const line = sec.lines[i]
      if (!line.includes('|') || !isMdDividerRow(sec.lines[i + 1] || '')) { i++; continue }
      // 表头首个数据列（首个非空列，剥反引号/空白）含 字段/Field 才入面；「操作」/「#」首列
      // （文件清单表/风险表）显式排除——防表头措辞漂移误收。
      const headerFirst = (splitMdRow(line).find(c => c !== '') || '').replace(/`/g, '').trim()
      let j = i + 2
      const dataRows = []
      while (j < sec.lines.length && sec.lines[j].includes('|') && sec.lines[j].trim() !== '') { dataRows.push(sec.lines[j]); j++ }
      if (PROBE8_FIELD_HEADER_RE.test(headerFirst) && headerFirst !== '操作' && headerFirst !== '#'
        && dataRows.length >= 2) {
        const fields = new Set()
        const required = new Set()
        for (const row of dataRows) {
          const cells = splitMdRow(row)
          const fname = stripContractFieldName(cells[0])
          if (!fname || !PROBE8_FIELD_IDENT_RE.test(fname)) continue // 非标识符首列（子说明行）不收
          fields.add(fname)
          // required=该行任一列含 必填|required|※
          if (cells.some(c => PROBE8_REQUIRED_CELL_RE.test(c))) required.add(fname)
        }
        if (fields.size > 0) contracts.push({ name: sec.heading, fields, required })
      }
      i = j
    }
  }
  return { contracts, skippedSections }
}

/** design 是否声明提交端点：「接口定义」章节内含 POST/PUT 行（纯查询契约不苛求前端送全必填） */
function designHasSubmitEndpoint(text) {
  for (const sec of splitMdSections(text)) {
    if (!/接口定义/.test(sec.heading)) continue
    if (sec.lines.some(l => /\b(POST|PUT)\b/.test(l))) return true
  }
  return false
}

// ── 接口面解析 + 消费端归类（2026-09-17-api-coverage-smoke task-04 / FR-05 / D-005~D-007）──
// parseDesignApiTable：design.md 接口段 tolerant 解析（D-005：不做 normative 接口表格式硬
// 契约）。双重防线：段头宽收（含 接口/端点/API/REST 子串、不区分大小写的 ##/### 段——宁多
// 勿漏，R-01：漏端点→漏覆盖假绿比多端点更糟）+ 行级双条件紧守（R-02 误报防护）：HTTP 方法
// token 词边界（GETTING/BUCKET 内嵌词形不误认）× 路径样式 token（/xxx 类路径或 {xxx}/:xxx
// 模板段，取行内首个类路径串；?query 尾自然截断——端点身份是 path）。非接口段（非目标/
// 先例引用段）内的表格/示例行靠段头过滤不计（「示例行跳过」的机制即此）。产物三面：
//   endpoints [{method, path, rowIdx}]（rowIdx = 命中段内端点产出序号，1-based）；
//   declared（「本变更接口面：N 端点」声明行提取的 N，全文首个命中，缺席 null——声明与
//     解析并存以解析为准并注记，渲染侧体现）；
//   sectionHint（命中的接口段头列表，审计注记）。
// 落盘面（数据通道=落盘即消费，stage-contract 零 import 纪律）：backfillFactsFromMdAndTests
// 主路径写 facts.apiFace / facts.consumerHints，task-05 validator 经 facts 消费不经函数调用。
const API_FACE_SECTION_RE = /接口|端点|api|rest/i
const API_FACE_METHOD_RE = /(?:^|[^A-Za-z])(GET|POST|PUT|DELETE|PATCH)(?![A-Za-z])/
// 路径样式 token：/ 起始、前邻非字母数字（日期 2026/09/17 的 /09 前是数字段不认），
// 首字符字母数字/_/-/{，后续段字符含 {}/: 模板形态（/orders/{id}、/orders/:id 全串命中）
const API_FACE_PATH_RE = /(?:^|[^A-Za-z0-9])(\/[A-Za-z0-9_\-{}][\w\-./{}:]*)/
const API_FACE_DECLARED_RE = /本变更接口面[：:]\s*(\d+)\s*端点/

/**
 * design.md 接口段 tolerant 解析（task-04 / D-005）。纯函数、本地正则零新依赖；输入统一
 * CRLF→LF 归一（parseRuntimeEndpointExcluded 同款，Windows/Linux/macOS 兼容）。
 * @param {string} designMd design.md 全文
 * @returns {{ endpoints: Array<{method: string, path: string, rowIdx: number}>,
 *   declared: number|null, sectionHint: string[] }}
 */
export function parseDesignApiTable(designMd) {
  const text = String(designMd || '').replace(/\r\n/g, '\n')
  const dm = text.match(API_FACE_DECLARED_RE)
  const declared = dm ? parseInt(dm[1], 10) : null
  const endpoints = []
  const sectionHint = []
  for (const sec of splitMdSections(text)) {
    if (!API_FACE_SECTION_RE.test(sec.heading)) continue
    sectionHint.push(sec.heading)
    let rowIdx = 0
    for (const line of sec.lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const mm = t.match(API_FACE_METHOD_RE)
      if (!mm) continue // 缺方法列（有路径无方法 token）不认——双条件缺一不可
      const pm = t.match(API_FACE_PATH_RE)
      if (!pm) continue // 有方法无路径样式 token（说明行/纯文档行）不认
      rowIdx++
      endpoints.push({ method: mm[1], path: pm[1], rowIdx })
    }
  }
  return { endpoints, declared, sectionHint }
}

// ── 消费端归类启发式（task-04 / D-006 / FR-05，仅 advisory 提示面）──
// design 清单文件面路径段归类 web/mp/script：routes/pages/model 目录词 → web；mp/miniapp →
// mp；scripts/test → script。归类只用于 task-05 的「有消费端未填子行」warning 提示（R-05：
// 启发式假提示无害）——不做语义判定。路径段级匹配非裸子串（'homepages.js' 文件名不命中
// pages 段）；mp 检查先于 web（mp/pages/index 小程序页归 mp 不归 web）；NEW: 前缀剥除
// （probe1-new-prefix-miss 同款）。
const CONSUMER_WEB_SEGMENTS = new Set(['routes', 'pages', 'model'])
const CONSUMER_MP_SEGMENT_RE = /^(?:mp|miniapp|miniprogram|weapp)$/i
const CONSUMER_SCRIPT_SEGMENTS = new Set(['scripts', 'script', 'test', 'tests'])
const CONSUMER_HINT_FILE_CAP = 20
/**
 * 清单路径 → 消费端归类（task-04，导出供 task-05 经落盘/传参双通道消费）。
 * @param {string[]} paths design 清单文件路径（NEW: 前缀/CRLF 容忍）
 * @returns {Record<string, string[]>} 命中类别的支撑文件（键 ∈ web/mp/script，零命中 {}）
 */
export function classifyConsumerHints(paths) {
  const hints = {}
  const push = (kind, p) => {
    if (!hints[kind]) hints[kind] = []
    if (hints[kind].length < CONSUMER_HINT_FILE_CAP && !hints[kind].includes(p)) hints[kind].push(p)
  }
  for (const raw of paths || []) {
    const p = String(raw || '').replace(/^NEW:\s*/, '').split('\\').join('/')
    if (!p || p.startsWith('.sillyspec/')) continue
    const segs = p.toLowerCase().split('/')
    if (segs.some(s => CONSUMER_MP_SEGMENT_RE.test(s))) push('mp', p)
    else if (segs.some(s => CONSUMER_WEB_SEGMENTS.has(s))) push('web', p)
    else if (segs.some(s => CONSUMER_SCRIPT_SEGMENTS.has(s))) push('script', p)
  }
  return hints
}

/**
 * 探针 8 主体：design 清单三面文件（Java/SQL/前端）→ 双根（主仓 ∪ worktree）∪ 跨仓注册仓根
 * 读取 → 归一化比对。advisory：所有输出是「候选」不是结论（UI 本地态键/服务端填充列会自然
 * 出现在差异里，agent 逐条复核——口径注记随渲染输出）。
 * @param {{ specBase: string, cwd: string, wtRoot?: string|null, changeName: string,
 *   diffFiles?: {frontend?: string[], backend?: string[]}|null }} args
 *   diffFiles（task-04 参数化预留，task-05 已接线）：显式传入时优先（测试注入口）直接组装
 *   direct-compare；缺省 null → 内部 collectProbe8DiffFiles 三态采集（worktree diff /
 *   in-place diff / design-list 兜底）喂同一组装块，并落模式注记（design-list 态含
 *   「direct-compare 面可能不全」）与 designOnlyPaths advisory 行（详见函数尾接线块）。
 * @returns {{applicable, backendFieldCount, feKeyCount, notNullCount, javaFileCount, sqlFileCount, feFileCount,
 *   mispairs: Array<{fe,be}>, feOnly: string[], missingNotNull: Array<{col}>, notes: string[],
 *   contractCount: number, contractOrphans: Array<{fe, hint?}>, missingRequired: Array<{field, contract}>,
 *   directCompare?: {driftWarnings: Array<{file, line: number|null, field}>,
 *     missingRequiredWarnings: Array<{endpoint, method, field, frontendFiles: string[]}>,
 *     escapeHatchCount: number, nonJavaSkipCount: number}}}
 */
export function runProbe8PayloadParity({ specBase, cwd, wtRoot = null, changeName, diffFiles = null }) {
  const out = {
    applicable: false, backendFieldCount: 0, feKeyCount: 0, notNullCount: 0,
    javaFileCount: 0, sqlFileCount: 0, feFileCount: 0,
    mispairs: [], feOnly: [], missingNotNull: [], notes: [],
    contractCount: 0, contractOrphans: [], missingRequired: [],
  }
  if (!specBase || !changeName) return out
  const designPath = join(specBase, 'changes', changeName, 'design.md')
  if (!existsSync(designPath)) return out
  let registry = new Map()
  try {
    const yamlPath = join(specBase, 'local.yaml')
    if (existsSync(yamlPath)) registry = parseRepoRegistry(readFileSync(yamlPath, 'utf8'))
  } catch { /* 注册表不可读 → 跨仓条目落未注册注记 */ }
  const detailed = parseFileChangeListDetailed(designPath, { repoKeys: [...registry.keys()] })

  const readEntry = (e) => {
    // NEW: 待建前缀剥离（坑 probe1-new-prefix-miss 同款）：design 清单的 NEW: 是新建意图标记，
    // 文件系统实体无前缀——按目标路径读。
    const probePath = String(e.path).replace(/^NEW:\s*/, '')
    // 未注册跨仓前缀兜底识别（change-list 只对注册 key 落 e.repo；未注册 key 整条 path 保留
    // cross-repo: 前缀原样）——现身「未注册」注记而非静默不可读。
    const crPrefix = probePath.match(/^cross-repo:([A-Za-z0-9_.\-]+):(.*)$/)
    if (e.repo || crPrefix) {
      const key = e.repo || (crPrefix && crPrefix[1])
      const relPath = e.repo ? probePath : crPrefix[2]
      const raw = registry.get(key)
      if (!raw) { out.notes.push(`repo「${key}」未在 local.yaml repos 注册——该仓前端文件未进探针 8 比对`); return null }
      const root = isAbsolute(raw) ? raw : resolve(cwd, raw)
      try { return readFileSync(join(root, relPath), 'utf8') } catch { out.notes.push(`跨仓文件不可读：${key}:${relPath}`); return null }
    }
    // 主仓 ∪ worktree 双根（与探针 1 同款回退）
    for (const base of [cwd, wtRoot].filter(Boolean)) {
      try { return readFileSync(join(base, probePath), 'utf8') } catch { /* 试下一根 */ }
    }
    return null
  }

  const backendFields = new Set()
  const notNullCols = new Set()
  const feKeys = new Set()
  for (const e of detailed) {
    if (!e.path || e.path.startsWith('.sillyspec/')) continue
    const text = readEntry(e)
    if (text == null) continue
    if (e.path.endsWith('.java')) {
      out.javaFileCount++
      for (const f of extractJavaFields(text)) backendFields.add(f)
    } else if (e.path.endsWith('.sql')) {
      out.sqlFileCount++
      for (const c of extractSqlNotNullColumns(text)) notNullCols.add(c)
    } else if (/\.(js|jsx|ts|tsx)$/.test(e.path)) {
      out.feFileCount++
      for (const k of extractPayloadKeys(text)) feKeys.add(k)
    }
  }
  // 后端零面（无 Java 无 SQL）→ 不适用（纯前端/文档变更不打扰）
  if (out.javaFileCount === 0 && out.sqlFileCount === 0) return out
  out.applicable = true

  const backendNorm = new Map() // norm → 原名
  for (const f of backendFields) backendNorm.set(normFieldKey(f), f)
  const feNorm = new Map()
  for (const k of feKeys) feNorm.set(normFieldKey(k), k)
  // 配对 token（camelCase/snake 切词；单字符段只保留 id）——子串关系抓 leaderUserId⊂rpLeaderUserId，
  // token 重叠（Jaccard≥0.6）抓语义近形 punishedDutyUserId↔punishedLeaderUserId（EHS 二次复核
  // 两类实证形态）。并列取长度差最小者（leaderUserId 优先配 rpLeaderUserId 而非更长的
  // punishedLeaderUserId）。
  const fieldTokens = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/)
    .map(t => t.toLowerCase()).filter(t => t.length > 1 || t === 'id')

  for (const [nk, original] of feNorm) {
    if (backendNorm.has(nk)) continue // 归一化覆盖（rpCategory ↔ rp_category）
    const feToks = fieldTokens(original)
    let best = null
    let bestScore = 0
    let bestLenPenalty = Infinity
    for (const [bn, beOrig] of backendNorm) {
      let score = 0
      if ((bn.includes(nk) || nk.includes(bn)) && Math.min(bn.length, nk.length) >= 4) score = 1
      else if (feToks.length >= 2) {
        const bt = fieldTokens(beOrig)
        if (bt.length >= 2) {
          const inter = feToks.filter(t => bt.includes(t)).length
          const union = new Set([...feToks, ...bt]).size
          if (union > 0) score = inter / union
        }
      }
      if (score <= 0) continue
      const lenPenalty = Math.abs(bn.length - nk.length)
      if (score > bestScore || (score === bestScore && lenPenalty < bestLenPenalty)) {
        bestScore = score
        bestLenPenalty = lenPenalty
        best = beOrig
      }
    }
    if (best && bestScore >= 0.6) out.mispairs.push({ fe: original, be: best })
    else out.feOnly.push(original)
  }
  for (const col of notNullCols) {
    const nc = normFieldKey(col)
    if (!feNorm.has(nc) && !backendNorm.has(nc)) out.missingNotNull.push({ col })
  }

  // ── 契约维度（task-01，advisory 不升硬门）：design.md 契约面（接口定义/数据模型章节字段表）
  // × 前端载荷键第四面对账——文档 vs 实现漂移：契约外载荷键（候选契约滞后/跨层私加）+ 契约必填
  // 漏发（EHS 小程序缺发 reportOrgId 被拒同族）。无契约面仅注记，既有三维度输出不动。──
  const contractRes = parseDesignContracts(designPath)
  const contracts = (contractRes && contractRes.contracts) || []
  if (contracts.length > 0) {
    out.contractCount = contracts.length
    const contractUnion = new Map() // norm → 契约字段原名（hint 对账用原名）
    for (const c of contracts) {
      for (const f of c.fields) {
        const nf = normFieldKey(f)
        if (!contractUnion.has(nf)) contractUnion.set(nf, f)
      }
    }
    // 契约外载荷键：已落 feOnly/mispairs 疑似面的 fe 键（归一正名键不扰）且契约面归一化未见。
    // hint 用 fieldTokens token-Jaccard 对契约字段原名单独跑一遍，≥0.4 取最高分者（并列取长度
    // 差最小——同 mispairs 择优口径），仅提示性可缺省。
    const suspected = new Set(out.feOnly)
    for (const p of out.mispairs) suspected.add(p.fe)
    for (const [nk, original] of feNorm) {
      if (contractUnion.has(nk) || !suspected.has(original)) continue
      const feToks = fieldTokens(original)
      let hint = null
      let bestScore = 0
      let bestLenPenalty = Infinity
      if (feToks.length >= 2) {
        for (const [cn, cOrig] of contractUnion) {
          const ct = fieldTokens(cOrig)
          if (ct.length < 2) continue
          const inter = feToks.filter(t => ct.includes(t)).length
          const union = new Set([...feToks, ...ct]).size
          const score = union > 0 ? inter / union : 0
          if (score <= 0) continue
          const lenPenalty = Math.abs(cn.length - nk.length)
          if (score > bestScore || (score === bestScore && lenPenalty < bestLenPenalty)) {
            bestScore = score
            bestLenPenalty = lenPenalty
            hint = cOrig
          }
        }
      }
      if (hint && bestScore >= 0.4) out.contractOrphans.push({ fe: original, hint })
      else out.contractOrphans.push({ fe: original })
    }
    // 必填漏发：仅 design「接口定义」章节声明提交端点（POST/PUT 行）时启用——查询型契约的
    // required 不苛求前端送全（GET 无 body）。契约 required 归一化后 ∉ feNorm 全集即列。
    let designText = ''
    try { designText = readFileSync(designPath, 'utf8') } catch { /* 不可读 → 不启用 */ }
    if (designHasSubmitEndpoint(designText)) {
      for (const c of contracts) {
        for (const f of c.required) {
          if (!feNorm.has(normFieldKey(f))) out.missingRequired.push({ field: f, contract: c.name })
        }
      }
    }
  } else {
    out.notes.push('design 无契约面——契约维度 skipped')
  }
  out.backendFieldCount = backendFields.size
  out.feKeyCount = feKeys.size
  out.notNullCount = notNullCols.size

  // ── probe8 diff 源接线（task-05，D-001@v1）：direct-compare 维度的文件面从 design 清单
  // 切换为 collectProbe8DiffFiles 三态采集（worktree diff / in-place diff / design-list 兜底），
  // 分类面（frontend/backend）喂 task-04 组装块；上文 design 清单三面/契约面对账（readEntry
  // 消费 detailed 的既有逻辑 + contractOrphans/missingRequired）零改动——diff 源只替换
  // direct-compare 维度文件面，不替换契约面文件面。外部 diffFiles 显式传入时优先（测试注
  // 入口，跳过采集零注记）。采集器 notes 全量转发（三态模式注记/跨仓失败注记 fail-visible）；
  // design-list 态补「direct-compare 面可能不全」风险注记；designOnlyPaths 非空落 advisory
  // 行（design 声明但 diff 面无——不参与对账不阻断，供人工复核）。跨仓 diff 面产物是仓根相对
  // 路径且无 repo 标记，readEntry 按主仓双根读不到即跳过（fail-soft，直比面跨仓缺位是已知
  // 边界；主仓恰有同名路径时读主仓文件，advisory 面可接受）。──
  let diffFace = diffFiles
  if (!diffFace) {
    const collected = collectProbe8DiffFiles({ cwd, changeName, specBase, repoKeys: [...registry.keys()] })
    for (const n of collected.notes) out.notes.push(n)
    if (collected.source === 'design-list') {
      out.notes.push('文件源=design 清单（diff 不可用）——direct-compare 面可能不全')
    }
    if (collected.designOnlyPaths.length > 0) {
      out.notes.push(`design 声明但 diff 无的路径（advisory，不阻断）：${collected.designOnlyPaths.join('、')}`)
    }
    diffFace = { frontend: collected.frontend, backend: collected.backend }
  }

  // ── direct-compare 组装（task-04 参数化，task-05 接线）：diffFace（外部注入或内部采集，
  // collectProbe8DiffFiles 产物形态 {frontend, backend} 路径数组）时组装代码级直比面挂
  // out.directCompare（渲染经 renderProbe8Lines 尾部子段消费）；两数组全缺 → 键恒缺省。
  // 读取复用 readEntry（主仓∪worktree 双根 + 跨仓注册，fail-visible 注记）；二趟类型解析
  // wtRoot/src→cwd/src 串行 miss-chain（createTypeResolver 各自 fail-soft，零新增 IO 边）。──
  if (diffFace && (Array.isArray(diffFace.frontend) || Array.isArray(diffFace.backend))) {
    const frontendByFile = []
    for (const p of Array.isArray(diffFace.frontend) ? diffFace.frontend : []) {
      const content = readEntry({ path: p })
      if (content == null) continue
      frontendByFile.push({ filePath: p, extract: extractFrontendPayloadFields(p, content) })
    }
    const backendFiles = []
    for (const p of Array.isArray(diffFace.backend) ? diffFace.backend : []) {
      const content = readEntry({ path: p })
      if (content == null) continue
      backendFiles.push({ path: p, content })
    }
    const resolvers = [wtRoot, cwd].filter(Boolean).map(b => createTypeResolver(join(b, 'src')))
    const be = extractBackendFields(backendFiles, (tn) => {
      for (const r of resolvers) { const c = r(tn); if (c) return c }
      return null
    })
    out.directCompare = comparePayloadFields(frontendByFile, be.endpoints, be.backendAllFields, {
      escapeHatchCount: be.escapeHatchCount, nonJavaSkipCount: be.nonJavaSkipCount,
    })
  }
  return out
}

// ── 探针 9（守卫一致性，2026-09-15 EHS doSubmit 越权 P1 同族驱动）常量与纯函数 ──
// 背景：同实体 CRUD 守卫不一致（deleteOrder/withdraw 有开立人校验、doSubmit 全链无操作人
// 校验→任何登录用户可提交他人开立单）是编码式权限的典型漏洞形态——探针 5 只对账 URL 存在性、
// 探针 8 只对账字段契约，权限守卫面零机器覆盖，全靠 verify 人工走查（EHS 恰是走查盲区）。
// 本探针（advisory，⚠️ 不阻断）：同文件同实体变更方法组内有守卫/无守卫并存 → 定向复核提示。
// 宁漏勿误（R-01/R-02）：≥2 方法才成组、纯标识符弱信号不计、只扫 design 清单 .java 文件。
const PROBE9_HEADING = '#### 探针 9：守卫一致性（advisory）'
// 变更动词前缀集（design §1 定稿）——方法名剥可选引导词后以前缀动词开头即变更方法
const PROBE9_MUTATION_VERBS = new Set(['submit', 'delete', 'remove', 'withdraw', 'update', 'handle', 'confirm', 'reject', 'audit', 'save', 'cancel', 'approve'])
// 引导前缀词（doSubmit/trySubmit 形态——EHS 真实方法名 doSubmit 的动词在第二词段）
const PROBE9_LEAD_WORDS = new Set(['do', 'try'])
// 方法签名行正则（design §1 定稿）：访问修饰符 + 类型段（泛型/数组/逗号空格）+ 方法名 + (
// （构造器无「类型 空格 名」形态天然不命中；无访问修饰符的接口默认方法不收——宁漏勿误）
const PROBE9_METHOD_SIG_RE = /(?:public|private|protected)\s+[\w<>\[\],. ]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/
// 类名剥常见后缀（「实体取全类名」路径用：OrderController → Order）
const PROBE9_CLASS_SUFFIX_RE = /(?:Controller|RestController|Service|ServiceImpl|Mapper|Repository|Api|Manager|Handler)$/

/**
 * Java 注释等长掩码（参照 endpoint-extractor.js stripCommentsKeepLength 思路在探针内自实现，
 * 不跨模块 import——行注释/块注释替换为空格保留换行，字符串/char 字面量内容原样不动）。
 * FR-02：注释里的守卫文档示例（// userId.equals(...) 之类）掩码后不再误报。
 */
function probe9MaskCommentsKeepLength(text) {
  const src = String(text || '')
  const out = src.split('')
  let st = 'normal' // normal | block | dq | sq
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    const n = src[i + 1]
    if (st === 'normal') {
      if (c === '/' && n === '/') {
        // 行注释：掩到行尾（换行符本身保留）
        let j = i
        while (j < src.length && src[j] !== '\n') { out[j] = ' '; j++ }
        i = j - 1
      } else if (c === '/' && n === '*') {
        out[i] = ' '; out[i + 1] = ' '
        st = 'block'; i++
      } else if (c === '"') st = 'dq'
      else if (c === "'") st = 'sq'
    } else if (st === 'block') {
      if (c === '*' && n === '/') { out[i] = ' '; out[i + 1] = ' '; st = 'normal'; i++ }
      else if (c !== '\n') out[i] = ' '
    } else {
      // 字符串/char 内：转义跳过；闭合引号回 normal（内容原样保留——字符串不动）
      if (c === '\\') i++
      else if ((st === 'dq' && c === '"') || (st === 'sq' && c === "'")) st = 'normal'
    }
  }
  return out.join('')
}

/** 驼峰切词（doSubmit → [do, Submit]；submitOrder → [submit, Order]；snake/连字符一并切段） */
const probe9SplitHumps = (s) => String(s || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean)

/**
 * 类实体名词（「实体取全类名」路径）：首个 class/interface 声明名剥 Controller/Service 等
 * 常见后缀后取尾段驼峰名词（PolluteRpOrderController → order、OrderController → order）——
 * 纯动词方法名（submit/withdraw/handle/doSubmit）剥词后无从判实体，以类实体兜底归组（EHS
 * 真实形态：deleteOrder 与 doSubmit 同在 PolluteRpOrderController，正是要聚上的一组）。
 * @returns {{key: string, display: string}|null} key=小写归一键；类名不可解析 → null
 */
function probe9ClassEntity(sourceText) {
  const m = String(sourceText || '').match(/\b(?:class|interface)\s+([A-Za-z_][A-Za-z0-9_]*)/)
  if (!m) return null
  const bare = m[1].replace(PROBE9_CLASS_SUFFIX_RE, '') || m[1]
  const words = probe9SplitHumps(bare)
  return words.length > 0 ? { key: words[words.length - 1].toLowerCase(), display: words[words.length - 1] } : null
}

/**
 * 方法名 → 实体键：驼峰切词后从头部剥引导词（do/try）与变更动词词段。
 * - 首个有效词段既非引导词也非动词（getOrder 的 get）→ null（非变更方法，查询面不收）
 * - 剥词后剩余词段非空 → 尾段驼峰名词为实体（submitOrder/deleteOrder → Order）
 * - 剥词后空/纯动词（submit/doSubmit/handle）→ 类实体兜底（类名无从判 → null 跳过）
 * @returns {{key: string, display: string}|null}
 */
function probe9EntityOfMethodName(name, classEntity) {
  const words = probe9SplitHumps(name)
  let i = 0
  let sawVerb = false
  while (i < words.length) {
    const w = words[i].toLowerCase()
    if (PROBE9_LEAD_WORDS.has(w)) { i++; continue }
    if (PROBE9_MUTATION_VERBS.has(w)) { sawVerb = true; i++; continue }
    break
  }
  if (!sawVerb) return null
  if (i >= words.length) return classEntity || null
  const tail = words[words.length - 1]
  return { key: tail.toLowerCase(), display: tail }
}

/**
 * 内部聚类（含单方法实体组与行数组——runProbe9 统计「单方法组 skipped」注记、构造签名前
 * 3 行上下文用；导出面 clusterMutationMethods 只回 ≥2 方法组）。
 * @returns {{lines: string[], groups: Array<{entity, methods}>, singletonCount: number}}
 */
function probe9ClusterInternal(sourceText) {
  const normalized = String(sourceText || '').replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const sigs = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(PROBE9_METHOD_SIG_RE)
    if (m) sigs.push({ name: m[1], sigLine: i })
  }
  const cls = probe9ClassEntity(normalized)
  const byKey = new Map() // 实体键(小写归一) → {entity(首见原形), methods}
  sigs.forEach((s, i) => {
    const ent = probe9EntityOfMethodName(s.name, cls)
    if (!ent) return
    // 方法体 = 签名行到下一签名行前（含签名行；文件尾方法到 EOF，类尾近似）。下一签名前的
    // 注解块（@PreAuthorize 等）归属下一方法——从体尾回收，防注解内 hasRole( 等字样误判
    // 上一方法有守卫（冒烟实证：@PreAuthorize("hasRole('admin')") 划进上一方法体误中角色判定）。
    let endIdx = i + 1 < sigs.length ? sigs[i + 1].sigLine : lines.length
    while (endIdx > s.sigLine && /^\s*@/.test(lines[endIdx - 1] || '')) endIdx--
    if (!byKey.has(ent.key)) byKey.set(ent.key, { entity: ent.display, methods: [] })
    byKey.get(ent.key).methods.push({
      name: s.name,
      startLine: s.sigLine + 1,
      endLine: endIdx,
      body: lines.slice(s.sigLine, endIdx).join('\n'),
    })
  })
  const all = [...byKey.values()]
  return { lines, groups: all.filter(g => g.methods.length >= 2), singletonCount: all.filter(g => g.methods.length === 1).length }
}

/**
 * 聚类变更方法（探针 9 纯函数核心，design §1）：方法签名行定位 → 变更方法实体归组 →
 * 同文件同实体（大小写归一）≥2 方法才成组（单方法不成组，R-01 宁漏勿误）。
 * @param {string} sourceText 单个 .java 文件全文
 * @returns {Array<{entity: string, methods: Array<{name: string, startLine: number, endLine: number, body: string}>}>}
 */
export function clusterMutationMethods(sourceText) {
  return probe9ClusterInternal(sourceText).groups
}

// ── 四类守卫信号正则（design §2 / R-02：调用/比较形态优先，纯标识符弱信号不计）──
// ① 当前用户比对：当前用户获取调用形态（词后随 ( 或 . 链式起点——SecurityContext.getContext()
//   的 Holder 形态由 \w* 覆盖），或 createBy/create_by/openBy/userId 邻接 .equals( / == / !=
const PROBE9_CURRENT_USER_CALL_RE = /\b(?:getCurrent\w*|currentUser|getUserId|getLoginUser\w*|SecurityContext\w*|ThreadLocal\w*Util)\s*[.(]/
const PROBE9_OWNER_EQUALS_RE = /\b(?:createBy|create_by|openBy|userId)\s*\.\s*equals\s*\(/
const PROBE9_OWNER_EQ_RE = /\b(?:createBy|create_by|openBy|userId)\s*(?:==|!=)/
const PROBE9_OWNER_EQ_BACK_RE = /(?:==|!=)\s*[\w.\s()]{0,40}?\b(?:createBy|create_by|openBy|userId)\b/
// ② 角色判定：hasRole/isCompany*/checkRole 调用形态，或签名里 boolean manager/isManager/isAdmin 布尔参数
const PROBE9_ROLE_CALL_RE = /\b(?:hasRole\w*|isCompany\w*|checkRole\w*)\s*\(/
const PROBE9_ROLE_PARAM_RE = /\bboolean\s+(?:is)?(?:[Mm]anager|[Aa]dmin)\b/
// ③ 能力类调用：canHandle/checkPerm*/assert*Perm|Auth|Owner|User/validate*User 调用形态
const PROBE9_CAPABILITY_CALL_RE = /\b(?:canHandle|checkPerm\w*|assert\w*(?:Perm|Auth|Owner|User)\w*|validate\w*User\w*)\s*\(/
// ④ 注解式：签名上下文内权限注解（强信号，出现即中）
const PROBE9_ANNOTATION_RE = /@(?:PreAuthorize|RolesAllowed|SaCheckPermission|RequiresPermissions)\b/

/**
 * 守卫信号检测（探针 9 纯函数，design §2）：方法体先做等长注释掩码（注释里的文档示例不
 * 误报），再测四类信号——命中任一即该方法「有守卫」；返回空数组 = 无守卫。
 * @param {string} methodBody 方法体文本（含签名行）
 * @param {string} [signatureContext] 签名前 3 行 + 签名行（④注解式与②布尔参数的检测面）
 * @returns {string[]} 命中信号类别列表（'当前用户比对' | '角色判定' | '能力类调用' | '注解式'）
 */
export function detectGuardSignals(methodBody, signatureContext = '') {
  const body = probe9MaskCommentsKeepLength(methodBody)
  const ctx = probe9MaskCommentsKeepLength(signatureContext)
  const signals = []
  if (PROBE9_CURRENT_USER_CALL_RE.test(body) || PROBE9_OWNER_EQUALS_RE.test(body)
    || PROBE9_OWNER_EQ_RE.test(body) || PROBE9_OWNER_EQ_BACK_RE.test(body)) signals.push('当前用户比对')
  if (PROBE9_ROLE_CALL_RE.test(body) || PROBE9_ROLE_PARAM_RE.test(ctx)) signals.push('角色判定')
  if (PROBE9_CAPABILITY_CALL_RE.test(body)) signals.push('能力类调用')
  if (PROBE9_ANNOTATION_RE.test(ctx)) signals.push('注解式')
  return signals
}

/**
 * 探针 9 主体：design 清单 .java 文件（主仓 ∪ worktree 双根 + 跨仓注册仓根回退，对齐探针 8
 * readEntry 写法）逐文件聚类 + 信号比对——同实体组内有守卫与无守卫并存才进 inconsistentGroups
 * （全有/全无不报，宁漏勿误；advisory：输出是定向复核提示不是结论）。无 .java → applicable=false
 * + 不适用注记；.java 首行 `// probe9-skip` 整文件跳过；单文件解析异常 fail-soft 跳过不炸整体。
 * @param {{ specBase: string, cwd: string, wtRoot?: string|null, changeName: string }} args
 * @returns {{applicable: boolean, javaFileCount: number, groupCount: number,
 *   inconsistentGroups: Array<{entity: string, guarded: string[], unguarded: string[], signals: Record<string, string[]>}>,
 *   notes: string[]}}
 */
export function runProbe9GuardConsistency({ specBase, cwd, wtRoot = null, changeName }) {
  const out = { applicable: false, javaFileCount: 0, groupCount: 0, inconsistentGroups: [], notes: [] }
  if (!specBase || !changeName) return out
  const designPath = join(specBase, 'changes', changeName, 'design.md')
  if (!existsSync(designPath)) return out
  let registry = new Map()
  try {
    const yamlPath = join(specBase, 'local.yaml')
    if (existsSync(yamlPath)) registry = parseRepoRegistry(readFileSync(yamlPath, 'utf8'))
  } catch { /* 注册表不可读 → 跨仓条目落未注册注记 */ }
  const detailed = parseFileChangeListDetailed(designPath, { repoKeys: [...registry.keys()] })

  // 双根读取（对齐探针 8 readEntry：NEW: 前缀剥离、未注册跨仓前缀兜底、主仓 ∪ worktree 回退）
  const readEntry = (e) => {
    const probePath = String(e.path).replace(/^NEW:\s*/, '')
    const crPrefix = probePath.match(/^cross-repo:([A-Za-z0-9_.\-]+):(.*)$/)
    if (e.repo || crPrefix) {
      const key = e.repo || (crPrefix && crPrefix[1])
      const relPath = e.repo ? probePath : crPrefix[2]
      const raw = registry.get(key)
      if (!raw) { out.notes.push(`repo「${key}」未在 local.yaml repos 注册——该仓 Java 文件未进探针 9 比对`); return null }
      const root = isAbsolute(raw) ? raw : resolve(cwd, raw)
      try { return readFileSync(join(root, relPath), 'utf8') } catch { out.notes.push(`跨仓文件不可读：${key}:${relPath}`); return null }
    }
    for (const base of [cwd, wtRoot].filter(Boolean)) {
      try { return readFileSync(join(base, probePath), 'utf8') } catch { /* 试下一根 */ }
    }
    return null
  }

  let nonJavaCount = 0
  let singletonCount = 0
  for (const e of detailed) {
    if (!e.path || e.path.startsWith('.sillyspec/')) continue
    if (!e.path.endsWith('.java')) { nonJavaCount++; continue }
    const text = readEntry(e)
    if (text == null) continue
    // 文件级豁免：首行 // probe9-skip 整文件跳过（守卫由上游统一拦截等形态的逃生门）
    if (/^\s*\/\/\s*probe9-skip\b/.test(text)) {
      out.notes.push(`${e.path}：首行 // probe9-skip 豁免——整文件跳过探针 9`)
      continue
    }
    let clustered
    try {
      clustered = probe9ClusterInternal(text)
    } catch (err) {
      out.notes.push(`${e.path}：解析异常 fail-soft 跳过（${err && err.message ? err.message : err}）`)
      continue
    }
    out.javaFileCount++
    singletonCount += clustered.singletonCount
    for (const g of clustered.groups) {
      out.groupCount++
      const signals = {}
      const guarded = []
      const unguarded = []
      for (const m of g.methods) {
        // signatureContext = 签名前 3 行 + 签名行（④注解式/②布尔参数的检测面）；窗口不跨
        // 上一方法签名行——紧凑单行方法下上一方法的 @PreAuthorize 会串扰进本方法检测面
        // （冒烟实证：相邻单行方法时无注解方法被注解行误判有守卫，用例 4 全守卫假象）。
        const win = clustered.lines.slice(Math.max(0, m.startLine - 4), m.startLine)
        // 只在除本方法签名行（窗口末行）外的行里找上一方法签名行（findIndex 会命中自身签名行）
        const cut = win.slice(0, -1).findIndex((l) => PROBE9_METHOD_SIG_RE.test(l))
        const ctx = (cut >= 0 ? win.slice(cut + 1) : win).join('\n')
        const sig = detectGuardSignals(m.body, ctx)
        signals[m.name] = sig
        if (sig.length > 0) guarded.push(m.name)
        else unguarded.push(m.name)
      }
      if (guarded.length > 0 && unguarded.length > 0) {
        out.inconsistentGroups.push({ entity: g.entity, guarded, unguarded, signals })
      }
    }
  }
  if (out.javaFileCount === 0) {
    out.notes.push(nonJavaCount > 0
      ? `清单无 .java 文件（另有 ${nonJavaCount} 个非 Java 清单文件不在探针 9 扫描面）`
      : '清单无 .java 文件')
    return out
  }
  out.applicable = true
  if (nonJavaCount > 0) out.notes.push(`${nonJavaCount} 个非 Java 清单文件不在探针 9 扫描面（v1 只扫 .java，design 非目标）`)
  if (singletonCount > 0) out.notes.push(`单方法实体 ${singletonCount} 个不成组（≥2 方法才比对，宁漏勿误）`)
  return out
}


// ── 探针 10（预填注清零，2026-09-18-artifact-prefill task-03 / FR-03 / D-003@v1 门禁梯度·error 档）──
// 背景：三槽预填（src/prefill.js，task-01）的确认动作是「删注」——注在场 = 白名单槽未确认
// （预填≠结论）。brainstorm/plan --done 是 advisory（忘删=提示，gates.js 轻档），本探针是梯度
// 收口的 error 档：--init 预填进 verify-result.md 探针段（agent 在 verify 阶段看到 ❌ 面），
// gates.js verify 收尾复跑本函数同源阻断（verify 完成是 archive 前置——「归档前注清零」的落点）。
// 检测复用 task-01 的 hasUnconfirmedPrefill（PREFILL_NOTE 字面包含即未确认）；已知误报面：
// 散文引用注字面量（如设计文档描述注协议本身）会命中——不追求语义区分，❌ 面向 agent 核对
// （真未确认 → 删注；纯散文 → 改写措辞），gate 侧文案同口径。
const PROBE10_HEADING = '#### 探针 10：预填注清零（error 门）'

/**
 * 探针 10 主体：changeDir 的 design.md + tasks/task-*.md（预填白名单槽宿主文件集——与
 * gates.js advisory 门 / verify 收尾 error 门同一检测面）逐文件 hasUnconfirmedPrefill。
 *   - applicable：至少一个在检文件存在（变更目录缺失 / 全缺席 → false + 注记，纯骨架零红门禁）；
 *   - unclearedFiles：含未删预填注的文件（changeDir 相对、正斜杠，design.md 在前、task 卡按名序）；
 *   - 只读不写、无 git 依赖（与 probe8/9 的 design 清单解析面独立——design.md 缺失仍可查
 *     task 卡，反之亦然）。
 * @param {{ specBase: string, changeName: string }} args
 * @returns {{applicable: boolean, checkedFiles: number, unclearedFiles: string[], notes: string[]}}
 */
export function runProbe10PrefillNoteClearance({ specBase, changeName }) {
  const out = { applicable: false, checkedFiles: 0, unclearedFiles: [], notes: [] }
  if (!specBase || !changeName) {
    out.notes.push('入参缺失（specBase/changeName）——检测面空')
    return out
  }
  const changeDir = join(specBase, 'changes', changeName)
  if (!existsSync(changeDir)) {
    out.notes.push(`变更目录不存在（${changeDir}）`)
    return out
  }
  const candidates = [join(changeDir, 'design.md')]
  try {
    const tasksDir = join(changeDir, 'tasks')
    if (existsSync(tasksDir)) {
      candidates.push(...readdirSync(tasksDir).filter(n => /^task-.+\.md$/.test(n)).sort().map(n => join(tasksDir, n)))
    }
  } catch { /* tasks 目录不可读 → 只检 design.md */ }
  for (const p of candidates) {
    if (!existsSync(p)) continue
    out.checkedFiles++
    if (hasUnconfirmedPrefill(p)) out.unclearedFiles.push(relative(changeDir, p).split('\\').join('/'))
  }
  if (out.checkedFiles === 0) {
    out.notes.push('无在检文件（design.md 与 tasks/task-*.md 均缺席——纯骨架/中间态）')
    return out
  }
  out.applicable = true
  return out
}


const PROBE7_HEADING = '#### 探针 7：验收×测试覆盖矩阵'
// execute run id 格式（与 task-review.js isValidExecuteRunId 同口径锚定，防提示词注入/路径穿越）
const PROBE7_EXEC_RUN_ID_RE = /^exec-\d{4}-\d{2}-\d{2}-\d{6}(?:-[a-z0-9]{1,8}){0,2}$/
// 关键词提取：≥3 字符标识符（[A-Za-z_][A-Za-z0-9_]{2,}）∪ ≥2 字连续 CJK 片段，按出现顺序交错
const PROBE7_TERM_RE = /[A-Za-z_][A-Za-z0-9_]{2,}|[\u4e00-\u9fff]{2,}/g
const PROBE7_TERM_CAP = 5
// 坑 probe7-prefill-evidence（ql-20260915-004）：无归属时的 non-testable 判别词（机械保守：
// acceptance 文本命中即预填 non-testable，agent 复核可改写）
const PROBE7_NONTESTABLE_RE = /文档|部署|doc|deploy|manual|config/i

/**
 * 解析 task-NN.md frontmatter 的 acceptance（string/array 双形态归一为数组）。
 * 解析归一 taskcard-frontmatter.js 单一源（2026-09-20-taskcard-yaml-hardgate：此前坏 YAML
 * catch 返回 [] 冒充「无 acceptance」，探针 7 渲染假防御文案）——status 三态让调用方区分
 * 「真无 acceptance」与「frontmatter 非法 YAML」。口径锚 src/stages/plan-postcheck.js
 * acceptance best-effort 段（string → 原文单条、array → 逐条）。
 * @param {string} content task 卡全文
 * @returns {{ status: 'no-frontmatter'|'invalid-yaml'|'ok', acceptance: string[],
 *   error: {message: string, line: number, column: number}|null }}
 *   no-frontmatter = 无 frontmatter（调用方跳过该卡）；invalid-yaml = frontmatter 非法 YAML
 *   （acceptance 不可读，error 带文件 1 基行:列）；ok = 合法解析，acceptance 归一数组
 *   （frontmatter 在场但无 acceptance → []，此时防御行为真——plan-postcheck 已拦缺失）
 */
export function parseTaskAcceptance(content) {
  const parsed = parseTaskFrontmatter(content)
  if (!parsed.hasFrontmatter) return { status: 'no-frontmatter', acceptance: [], error: null }
  if (!parsed.ok) return { status: 'invalid-yaml', acceptance: [], error: parsed.error }
  const fmObj = parsed.fm || {}
  if (typeof fmObj.acceptance === 'string') {
    const t = fmObj.acceptance.trim()
    return { status: 'ok', acceptance: t ? [t] : [], error: null }
  }
  if (Array.isArray(fmObj.acceptance)) {
    return {
      status: 'ok',
      acceptance: fmObj.acceptance.filter(x => typeof x === 'string' && x.trim() !== '').map(x => x.trim()),
      error: null,
    }
  }
  return { status: 'ok', acceptance: [], error: null }
}

/**
 * allowed_paths 条目是否测试形态（结构归属面）：test/ 前缀，或文件名含 .test. / _test. / spec
 * 惯例（(?:^|[._-])test(?:[._-]|$) 覆盖 foo.test.mjs / foo_test.js / test-foo.js 三形）。
 * 比探针 3 的存在性面（isTestFileName 文件名形态判定，宽松存在性提示）严格——这是 3/7 口径差异的落点。
 */
function isProbe7TestPath(p) {
  const posix = String(p).split('\\').join('/')
  if (/^test\//.test(posix)) return true
  const name = basename(posix)
  return /(?:^|[._-])test(?:[._-]|$)/i.test(name) || /spec/i.test(name)
}

/**
 * 内联解析当前 execute runId（探针 7 专用——禁静态 import task-review：
 * task-review→verify-postcheck→verify-probes 三步环，先例见 backfillFactsFromMdAndTests
 * 对 stage-contract 的分层注释）。优先读 marker current-execute-run-id-<change>；
 * 读不到/非法则扫描 execute-runs/ 下 mtime 最新的 exec-* 目录兜底；两路皆空 → null
 * （review 源归空集，不报错）。
 * @param {string} runtimeRoot
 * @param {string} changeName
 * @returns {string|null}
 */
function resolveExecuteRunIdInline(runtimeRoot, changeName) {
  try {
    const marker = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    if (existsSync(marker)) {
      const c = readFileSync(marker, 'utf8').trim()
      if (c && PROBE7_EXEC_RUN_ID_RE.test(c)) return c
    }
  } catch { /* marker 读取失败 → 目录扫描兜底 */ }
  try {
    const runsDir = join(runtimeRoot, 'execute-runs')
    if (!existsSync(runsDir)) return null
    const cands = readdirSync(runsDir)
      .filter(n => PROBE7_EXEC_RUN_ID_RE.test(n))
      .map(n => ({ n, p: join(runsDir, n) }))
      .filter(x => { try { return statSync(x.p).isDirectory() } catch { return false } })
      .map(x => { try { return { n: x.n, m: statSync(x.p).mtimeMs } } catch { return { n: x.n, m: 0 } } })
      .sort((a, b) => b.m - a.m)
    return cands.length > 0 ? cands[0].n : null
  } catch {
    return null
  }
}

/**
 * 读当前 runId 下某 task 的 review.json changedFiles 中 test/ 前缀路径（归属第二源）。
 * review.json 读不到 / JSON 非法 / changedFiles 非数组 → 空集不报错（提示面，宁缺毋噪）。
 */
function readReviewChangedTestFiles(runtimeRoot, runId, taskId) {
  try {
    const review = JSON.parse(readFileSync(join(runtimeRoot, 'execute-runs', runId, 'tasks', taskId, 'review.json'), 'utf8'))
    if (!review || !Array.isArray(review.changedFiles)) return []
    return review.changedFiles
      .filter(f => typeof f === 'string')
      .map(f => f.split('\\').join('/'))
      .filter(f => f.startsWith('test/'))
  } catch {
    return []
  }
}

/** acceptance 行关键词提取（标识符 ∪ CJK 片段，去重、按出现顺序，上限 5 词防膨胀） */
function extractAcceptanceTerms(text) {
  const terms = []
  const seen = new Set()
  const re = new RegExp(PROBE7_TERM_RE.source, 'g') // 共享 g 正则有 lastIndex 状态坑，每次新建
  let m
  while ((m = re.exec(String(text || ''))) !== null) {
    if (!seen.has(m[0])) { seen.add(m[0]); terms.push(m[0]) }
    if (terms.length >= PROBE7_TERM_CAP) break
  }
  return terms
}

/**
 * 关键词命中提示：逐 acceptance 条目提取词，在归属测试文件内容里 grep（大小写敏感子串）。
 * 命中≠判定（R-03，不参与门禁）——只有存在命中的条目才进 hints（键 = acceptance 条目下标）。
 * 测试文件读取双根回退（cwd → worktree 根，坑 probe1-worktree-path-blind / probe3 双根同族：
 * apply 前新测试只在 worktree）。读不到的文件计 null 跳过。
 * task-05 / FR-09：双根扩多根——并入 local.yaml repos 注册的跨仓仓根（调用方解析传入，
 * probe8 :314-316 同款读法），跨仓仓根下的新测试文件可读、命中不再恒空（矩阵不因跨仓恒
 * 预填 partial）；根列表去重保序（主仓根优先命中），无跨仓注册的单仓调用行为零变化。
 * 坑 probe7-prefill-evidence（ql-20260915-004）：anchors 逐词记录首命中 file:line（grep -n
 * 语义——首个包含该词的测试文件内的首行号），供证据列机械预填；terms/files 键维持旧形态
 * （既有消费方/测试零回归）。
 * @param {Array<string>} testFiles 归属测试文件（仓根相对路径）
 * @param {string} cwd 主仓 cwd
 * @param {string|null} wtRoot worktree 根
 * @param {string[]} [crossRoots] 跨仓仓根（local.yaml repos 注册根，绝对路径）
 * @returns {Record<number, {terms: string[], files: string[], anchors: Array<{term: string, file: string, line: number}>}>}
 *   普通对象，可 JSON 序列化
 */
function buildAcceptanceHints(acceptanceItems, testFiles, cwd, wtRoot, crossRoots = []) {
  const hints = {}
  if (!testFiles || testFiles.length === 0) return hints
  const cache = new Map()
  const readTest = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    let content = null
    const posix = String(rel).split('\\').join('/')
    for (const root of [...new Set([cwd, wtRoot, ...crossRoots].filter(Boolean))]) {
      try { content = readFileSync(join(root, posix), 'utf8'); break } catch { /* 换根重试 */ }
    }
    cache.set(rel, content)
    return content
  }
  // 首命中行号（1-based）：indexOf 前缀行计数，CRLF 不影响（按 \n 切）
  const firstHitLine = (content, term) => {
    const idx = content.indexOf(term)
    return idx === -1 ? null : content.slice(0, idx).split('\n').length
  }
  acceptanceItems.forEach((item, idx) => {
    const hitTerms = []
    const hitFiles = new Set()
    const anchors = []
    for (const term of extractAcceptanceTerms(item)) {
      const hits = testFiles.filter(f => { const c = readTest(f); return !!c && c.includes(term) })
      if (hits.length > 0) {
        hitTerms.push(term)
        for (const f of hits) hitFiles.add(f)
        // 首命中文件内的首命中行（单文件 grep -n 首命中即可，机械保守）
        const firstFile = hits[0]
        const line = firstHitLine(readTest(firstFile) || '', term)
        if (line !== null) anchors.push({ term, file: firstFile, line })
      }
    }
    if (hitTerms.length > 0) hints[idx] = { terms: hitTerms, files: [...hitFiles], anchors }
  })
  return hints
}

/** 表格单元格转义：管道转 \|（GFM 行内字面量）、连续空白折叠、超长截断（纯展示层） */
function mdEscapeCell(text, cap = 200) {
  let s = String(text).replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|')
  if (s.length > cap) s = s.slice(0, cap) + '…'
  return s
}

/**
 * 探针 7 判定/证据两列机械预填（坑 probe7-prefill-evidence，ql-20260915-004）。
 *
 * 背景：此前骨架判定列 `<待填：四选一>` + 证据列 `<TODO>` 全占位，24 格矩阵 agent 全量 probe1-noqa
 * 手填——CLI 已算出归属/关键词命中却弃之不用。预填规则（机械保守，agent 逐格复核改写）：
 *   - 无归属 → uncovered；acceptance 文本含 文档/部署/doc/deploy/manual/config 类词且无归属
 *     → non-testable
 *   - 有归属且命中 ≥1 → covered，证据 = 首命中 `file:line`（term）锚点（≤3 条防膨胀）
 *   - 有归属零命中 → partial，证据 = 无机械命中提示 + 反引号归属文件（满足门禁测试锚点口径）
 *
 * 门禁兼容（stage-contract.js extractAcceptanceMatrixSlots / MATRIX_VERDICT_WHITELIST）：判定列
 * 须为纯枚举（精确 trim 匹配白名单）——行内尾注「（预填，复核后可改）」会破坏枚举解析，故
 * 尾注改置矩阵段头注记；covered/partial 证据须含测试锚点（file:line / 反引号 / .test.），
 * non-testable 证据须非空——预填值均按此口径构造（预填即可过门，复核责任在段头注记明示）。
 * @param {string} item acceptance 条目文本
 * @param {string[]|undefined} testFiles 归属测试文件
 * @param {{terms: string[], files: string[], anchors?: Array<{term: string, file: string, line: number}>}|null} hint
 * @returns {{verdict: string, evidence: string}}
 */
function prefillMatrixCells(item, testFiles, hint) {
  const hasAttribution = Array.isArray(testFiles) && testFiles.length > 0
  if (!hasAttribution) {
    return {
      verdict: PROBE7_NONTESTABLE_RE.test(String(item || '')) ? 'non-testable' : 'uncovered',
      evidence: '（无归属测试）',
    }
  }
  const anchors = (hint && Array.isArray(hint.anchors)) ? hint.anchors : []
  if (anchors.length > 0) {
    const evidence = anchors.slice(0, 3)
      .map(a => `\`${mdEscapeCell(a.file, 120)}:${a.line}\`（${mdEscapeCell(a.term, 40)}）`)
      .join('、')
    return { verdict: 'covered', evidence }
  }
  return {
    verdict: 'partial',
    evidence: `（无机械命中——人工核验 \`${mdEscapeCell(testFiles[0], 120)}\`）`,
  }
}

/**
 * 渲染探针 7 段（骨架与幂等补段共用单一实现）。
 * 坑 probe7-prefill-evidence（ql-20260915-004）：判定/证据两列由 prefillMatrixCells 机械预填
 * （原 `<待填：四选一>` / `<TODO>` 占位淘汰）——幂等保障沿用补段口径：段已在场（agent 已填/ probe1-noqa
 * 未填）一律不触碰（ensureAcceptanceMatrixSection 段在场即 no-op），预填只在骨架生成与缺段补齐
 * 两条新写路径生效，agent 已填内容永不被覆盖。
 * @param {{ applicable: boolean, tasks: Array<{task: string, acceptance: string[], testFiles: string[], hints: Record<number, {terms: string[], files: string[], anchors?: Array<{term: string, file: string, line: number}>}>}> }} p7
 * @returns {string[]} 行数组（含段标题；调用方自理前后空行）
 */
function renderProbe7Lines(p7) {
  const L = [PROBE7_HEADING]
  if (!p7 || !p7.applicable) {
    L.push('- 不适用（无 TaskCard）')
    return L
  }
  L.push('<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->')
  L.push('<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->')
  // 零自动化承接计数（坑 review-zero-coverage-unwalked，2026-09-16 EHS 二次复核实证：execute
  // 期 review 走查面事实上跟着测试覆盖走——「新增-部门支线测试充分，编辑路径与相关方支线
  // 零覆盖」恰是 5 个 P1 的藏身处。矩阵渲染时顺带计数零承接条目，verify 复核强制显式走查
  // 这些路径并在「代码审查」节登记走查结论——把二次复核「提前兑现移交项」的打法固化）。
  let zeroCoverage = 0
  for (const t of (p7.tasks || [])) {
    L.push('')
    L.push(`**${t.task}**`)
    if (t.fmError) {
      // 坏 YAML 如实陈述（2026-09-20-taskcard-yaml-hardgate）：非「无 acceptance」防御——
      // plan 门禁 0b 硬校验应已拦截；已过 plan 门仍见此行 = 门禁失效信号（可反馈工具缺陷）
      L.push(`- ⚠️ frontmatter 非法 YAML（${t.task}.md:${t.fmError.line}:${t.fmError.column} ${mdEscapeCell(t.fmError.message, 160)}）——acceptance 不可读，本行非「无 acceptance」防御；plan 门禁 frontmatter 硬校验应已拦截，若已过 plan 门仍见此行即门禁失效信号`)
      continue
    }
    if (!Array.isArray(t.acceptance) || t.acceptance.length === 0) {
      L.push('- （卡无 acceptance——防御，plan-postcheck 已拦）')
      continue
    }
    L.push('| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |')
    L.push('|---|---|---|---|---|')
    t.acceptance.forEach((item, i) => {
      const attribCell = (t.testFiles && t.testFiles.length > 0)
        ? t.testFiles.map(f => `\`${f}\``).join('<br>')
        : '无归属测试——判定大概率 uncovered'
      const h = (t.hints && t.hints[i]) || null
      const hintCell = h
        ? `${h.terms.map(x => mdEscapeCell(x)).join('、')}（${(h.files || []).map(f => `\`${f}\``).join('、')}）`
        : '—'
      const pre = prefillMatrixCells(item, t.testFiles, h)
      if (pre.verdict === 'uncovered' || pre.verdict === 'partial') zeroCoverage++
      L.push(`| ${mdEscapeCell(item)} | ${attribCell} | ${hintCell} | ${pre.verdict} | ${pre.evidence} |`)
    })
  }
  if (zeroCoverage > 0) {
    L.push('')
    L.push(`- ⚠️ 零/半自动化承接条目 ${zeroCoverage} 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节`)
  }
  return L
}

/**
 * 跑四个机械探针 + 探针 7 验收×测试覆盖矩阵。
 * @param {{ cwd: string, changeName: string, specDir?: string|null }} opts
 * @returns {{ probe1: object, probe3: object, probe5: object, probe6: object, probe7: object }}
 */
export function runVerifyProbes({ cwd, changeName, specDir = null }) {
  const specBase = resolveVerifyProbesSpecBase(cwd, specDir)
  const changeDir = join(specBase, 'changes', changeName)
  const designPath = join(changeDir, 'design.md')
  const detailed = existsSync(designPath) ? parseFileChangeListDetailed(designPath) : []
  const designOps = new Map(detailed.map(e => [e.path, e.operation]))

  // ── 探针 1：未实现标记扫描（design 清单具体文件；glob 项列出让 agent 展开）──
  // worktree 路径回退（坑 probe1-worktree-path-blind，2026-08-24 用户实证：verify 从主仓跑、
  // apply 前 design 清单新文件只在 worktree → 6 个新文件被报「不存在」跳过不扫）。主仓路径
  // 缺失且存在真实 worktree（gitDir≠cwd，与探针 5 的 _readWorktreeMeta 同源解析）→ 读 worktree
  // 版本并计数；两处皆缺才进 skippedFiles。in-place meta（gitDir==cwd）零行为变化。
  const wtInfo = _readWorktreeMeta(specBase, cwd, changeName)
  const wtRoot = (wtInfo && wtInfo.gitDir && wtInfo.gitDir !== cwd) ? wtInfo.gitDir : null
  const probe1 = { matches: [], globEntries: [], skippedFiles: [], worktreeHits: 0 }
  for (const e of detailed) {
    if (e.path.startsWith('.sillyspec/')) continue
    if (/[*?[\]]/.test(e.path)) {
      probe1.globEntries.push(e.path)
      continue
    }
    // NEW: 待建前缀剥离（坑 probe1-new-prefix-miss，2026-09-12 驾驭第十七批③，用户实证
    // 「NEW: 前缀文件已合入主仓」时 existsSync(join(cwd,'NEW:src/x')) 恒 miss 落 skippedFiles
    // 留 ⚠️ 噪声）：design 清单的 NEW: 是「新建意图」标记，文件 apply 后已是无前缀实体——
    // 探针按目标文件扫（与 pathMatches 比对侧剥除同源）。
    const probePath = String(e.path).replace(/^NEW:\s*/, '')
    let abs = join(cwd, probePath)
    if (!existsSync(abs)) {
      const wtAbs = wtRoot ? join(wtRoot, probePath) : null
      if (wtAbs && existsSync(wtAbs)) {
        abs = wtAbs
        probe1.worktreeHits++
      } else {
        probe1.skippedFiles.push(e.path)
        continue
      }
    }
    try {
      const lines = readFileSync(abs, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (probe1.matches.length >= PROBE1_MAX_MATCHES) return
        // probe1-noqa 行级豁免（坑 probe1-self-referential-noise，2026-09-16 EHS 变更 verify 实证：
        // 探针基础设施自身源码被扫描时 26 处命中全是匹配器定义/骨架模板字符串/修复注释引文——
        // 逐条人工裁定纯耗损。行内含 `probe1-noqa` 即跳过（注释行加 `// probe1-noqa`、
        // 字符串模板行在语句闭合后加 `/* probe1-noqa */` 不污染输出内容））。
        if (line.includes('probe1-noqa')) return
        if (isUnimplementedMarkerLine(line)) probe1.matches.push({ file: probePath, line: i + 1, content: line.trim().slice(0, 160) })
      })
    } catch {
      probe1.skippedFiles.push(e.path)
    }
  }

  // ── 探针 3：验收标准测试覆盖（task 卡 allowed_paths → 模块目录递归找测试文件）──
  const tasksPath = join(changeDir, 'tasks.md')
  const probe3 = { tasks: [], note: '集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️' }
  for (const taskId of listTaskIds(tasksPath)) {
    const cardPath = join(changeDir, 'tasks', `${taskId}.md`)
    let allowed = []
    if (existsSync(cardPath)) allowed = parseAllowedPaths(readFileSync(cardPath, 'utf8'))
    const moduleDirs = [...new Set(allowed.map(p => dirname(p.split('\\').join('/'))).filter(d => d && d !== '.'))]
    // JVM 镜像测试根（坑 probe3-java-mirror-blind，2026-09-15 EHS 生产实证 task-02~06 五连
    // 假⚠️）：Maven/Gradle 布局测试在 src/test/<lang> 同包镜像树，与 src/main 侧永不
    // co-located——只递归 allowed_paths 目录（全在 main 侧）必然落空。对命中 src/main/<lang>
    // 的目录补推镜像目录进扫描集（主仓或 worktree 任一侧存在才列/才扫——不存在的镜像根=
    // 该包真无测试，保持 ⚠️ 真信号）。
    const mirrorDirs = []
    for (const d of moduleDirs) {
      const m = d.match(/^(.*\/src\/)main(\/(?:java|kotlin|scala|groovy)(?:\/.*)?)$/)
      if (!m) continue
      const mirror = `${m[1]}test${m[2]}`
      if (mirrorDirs.includes(mirror) || moduleDirs.includes(mirror)) continue
      if (existsSync(join(cwd, mirror)) || (wtRoot && wtRoot !== cwd && existsSync(join(wtRoot, mirror)))) {
        mirrorDirs.push(mirror)
      }
    }
    const testFiles = []
    for (const d of [...moduleDirs, ...mirrorDirs]) {
      // 双根并集扫描（坑 probe3-worktree-test-false-negative，2026-09-10 驾驭小结第五批②，
      // 用户实证 5 条假 warning）：apply 前新测试文件只在 worktree（untracked），而模块目录在
      // 主仓**已存在**——旧「主仓目录缺失才回退 worktree」条件不触发，探针 3 报「未找到测试
      // 文件」假阴。改为无条件双根并集（主仓 ∪ worktree，各自存在才扫，路径相对各自根呈现，
      // 按 rel 去重主仓优先——与探针 5 的三根并集同族）。主仓 in-place（wtRoot=null）零变化。
      const roots = []
      if (existsSync(join(cwd, d))) roots.push({ root: join(cwd, d), base: cwd })
      if (wtRoot && wtRoot !== cwd && existsSync(join(wtRoot, d))) roots.push({ root: join(wtRoot, d), base: wtRoot })
      for (const s of roots) {
        for (const f of findTestFiles(s.root, s.base)) {
          if (!testFiles.includes(f)) testFiles.push(f)
        }
      }
    }
    probe3.tasks.push({
      task: taskId,
      moduleDirs,
      mirrorDirs,
      testFiles: testFiles.slice(0, 10),
      testFileCount: testFiles.length,
      hasTest: testFiles.length > 0,
      located: moduleDirs.length > 0,
    })
  }

  // ── 探针 5：API 契约对账（复用 verifyApiParity：endpoints.json × 前端调用）──
  const runtimeRoot = resolveRuntimeRoot({ specRoot: specDir }, specBase)
  const probe5 = verifyApiParity(specBase, cwd, runtimeRoot, changeName)
  // 跨仓 task 卡计数（坑 probe5-cross-repo-scope-blindness，2026-09-15 复盘：跨仓仓的前端
  // 调用不在 parity 扫描根内，「frontend 0 调用」会被误读为漏配——渲染侧显式注记扫描面
  // 边界。计数失败按 0（不渲染注记，零新增失败面）。
  try {
    const tasksDir = join(changeDir, 'tasks')
    if (changeName && existsSync(tasksDir)) {
      let crossRepoCardCount = 0
      for (const f of readdirSync(tasksDir).filter(n => /^task-\d+\.md$/.test(n))) {
        if (parseRepo(readFileSync(join(tasksDir, f), 'utf8'))) crossRepoCardCount++
      }
      if (crossRepoCardCount > 0) probe5.crossRepoCardCount = crossRepoCardCount
    }
  } catch { /* tasks 目录不可读 → 不注记 */ }

  // ── 探针 6：代码删除对账（git diff --name-status HEAD 的 D/R × design 声明三态）──
  const probe6 = { deletions: [], unavailable: false, note: '以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定' }
  // 他者声明归属过滤（坑 verify-reconcile-foreign-wip）：并行会话在途删除/改动不进本变更对账
  // gitQuiet 失败（非仓库/git 缺失/报错）返回 null ≠ 空结果：null 必须显式标记不可用，
  // 否则半截对账被渲染成「✅ 无删除」的错误全清信号（对照 verify-postcheck runVerifyDeletionCheck 的 skipped 口径）
  const nsOut = gitQuiet(cwd, ['diff', '--name-status', 'HEAD'])
  if (nsOut === null) probe6.unavailable = true
  let nsRows = (nsOut || '').split('\n').filter(Boolean)
  {
    const rawTargets = nsRows.map(row => ((row.split('\t')[1]) || ''))
      .filter(Boolean).map(t => t.split('\\').join('/'))
    const { foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, rawTargets, { specBase, runtimeRoot })
    if (foreign.length > 0) {
      const foreignSet = new Set(foreign.map(x => x.file))
      nsRows = nsRows.filter(row => !foreignSet.has((row.split('\t')[1] || '').split('\\').join('/')))
      console.warn(`⚠️ 探针6 已排除 ${foreign.length} 个并行会话声明的删除/改动（${foreign.slice(0, 5).map(x => x.file).join(', ')}${foreign.length > 5 ? ' 等' : ''}）`)
    }
  }
  for (const row of nsRows) {
    const [status, ...paths] = row.split('\t')
    const st = (status || '').trim().toUpperCase()
    if (!/^[DRC]/.test(st)) continue
    // R/C 的旧路径等价删除（paths[0]）；D 的唯一路径——两者都取 paths[0]
    const target = paths[0] || ''
    const posix = target.split('\\').join('/')
    if (!posix || posix.startsWith('.sillyspec/') || posix === 'meta.json' || basename(posix) === 'meta.json') continue
    const op = designOps.get(posix)
    let verdict
    if (op && /删除|delete|del/i.test(op)) verdict = '✅ 合规（design 声明删除）'
    else if (op) verdict = `❌ 高风险（design 声明「${op}」却整文件删除）`
    else verdict = '⚠️ 未声明删除（design 清单未列出）'
    probe6.deletions.push({ path: posix, status: st, designOp: op || null, verdict })
  }

  // ── 探针 7：验收×测试覆盖矩阵（acceptance 自解析 + 双源结构归属 + 关键词提示）──
  // applicable 顶层键：tasks/ 目录不存在或全无 frontmatter = false（quick 会话/旧变更零行为
  // 变化——不渲染矩阵、不产生待填槽）。归属双源 = 卡 allowed_paths 测试模式 ∪ 当前 runId
  // review.json changedFiles 的 test/ 前缀（runId 由 resolveExecuteRunIdInline 内联解析——
  // 禁静态 import task-review，三步环见该函数注释）。
  const probe7 = { applicable: false, tasks: [] }
  {
    const tasksDir = join(changeDir, 'tasks')
    if (existsSync(tasksDir)) {
      const runId = resolveExecuteRunIdInline(runtimeRoot, changeName)
      const cards = []
      try {
        for (const f of readdirSync(tasksDir).filter(n => /^task-\d+\.md$/.test(n)).sort()) {
          const raw = readFileSync(join(tasksDir, f), 'utf8')
          // 三态分流（2026-09-20-taskcard-yaml-hardgate）：no-frontmatter 跳卡（原 null 语义）；
          // invalid-yaml 挂 fmError 进条目——渲染层区分「坏 YAML」与「真无 acceptance」防御行
          const parsed = parseTaskAcceptance(raw)
          if (parsed.status === 'no-frontmatter') continue // 无 frontmatter → 跳过（plan-postcheck 已拦）
          const fmId = (raw.match(/^id:\s*(\S+)/m) || [])[1]
          cards.push({
            task: fmId || f.replace(/\.md$/, ''),
            acceptance: parsed.acceptance,
            fmError: parsed.status === 'invalid-yaml' ? parsed.error : null,
            raw,
          })
        }
      } catch { /* tasks 目录不可读 → applicable 维持 false */ }
      probe7.applicable = cards.length > 0
      // 跨仓仓根解析（task-05 / FR-09）：测试文件内容读取双根扩多根——跨仓卡（repo: <key>）
      // 的 allowed_paths/review changedFiles 相对其仓根，cwd/wtRoot 双根读不到 → 关键词命中
      // 恒空、矩阵恒预填 partial。读法同探针 8 先例：join(specBase, 'local.yaml') +
      // parseRepoRegistry，相对路径按 cwd resolve；注册表不可读 fail-open 空表（单仓双根
      // 行为零变化）。
      const probe7CrossRoots = []
      try {
        const localYamlPath = join(specBase, 'local.yaml')
        if (existsSync(localYamlPath)) {
          const registry = parseRepoRegistry(readFileSync(localYamlPath, 'utf8'))
          if (registry) {
            for (const raw of registry.values()) {
              if (!raw) continue
              const root = isAbsolute(raw) ? raw : resolve(cwd, raw)
              if (root && existsSync(root) && !probe7CrossRoots.includes(root)) probe7CrossRoots.push(root)
            }
          }
        }
      } catch { /* 注册表不可读 → 无跨仓根（fail-open） */ }
      // 跨卡归属（坑 probe7-provider-tests-in-consumer-card，2026-09-16 E 变更 verify 实证：8 格
      // 被机械预填 uncovered——task-03（测试卡）的用例测的是 task-01（provider）的导出函数，但归属
      // 只看本卡 allowed_paths ∪ review changedFiles，provider 卡的 acceptance 永远连不上消费卡的
      // 测试。修法：归属集扩为「本卡 ∪ 直接依赖本卡的卡」的测试文件——M depends_on N 则 M 的测试
      // 可承接 N 的 acceptance（下游消费卡天然测上游产物）。只扩直接依赖（v1，传递闭包易把无关
      // 测试卷进来放大 partial 噪音）。
      const dependsOnOf = new Map()
      for (const c of cards) {
        const dm = String(c.raw).match(/^depends_on:\s*\[?([^\]\n]*)\]?/m)
        const deps = (dm ? dm[1] : '').split(/[,\s]+/).map(s => s.trim()).filter(s => /^task-\d+$/.test(s))
        dependsOnOf.set(c.task, deps)
      }
      for (const card of cards) {
        const fromAllowed = parseAllowedPaths(card.raw)
          .map(p => String(p).replace(/^NEW:\s*/, '').trim())
          .filter(p => p && isProbe7TestPath(p))
        const fromReview = runId ? readReviewChangedTestFiles(runtimeRoot, runId, card.task) : []
        // 直接下游卡的归属测试并入（provider acceptance 由消费卡测试承接）
        const fromDependents = []
        for (const other of cards) {
          if (other.task === card.task) continue
          const deps = dependsOnOf.get(other.task) || []
          if (!deps.includes(card.task)) continue
          for (const p of parseAllowedPaths(other.raw)) {
            const t = String(p).replace(/^NEW:\s*/, '').trim()
            if (t && isProbe7TestPath(t) && !fromDependents.includes(t)) fromDependents.push(t)
          }
        }
        const testFiles = [...new Set([...fromAllowed, ...fromReview, ...fromDependents])]
        probe7.tasks.push({
          task: card.task,
          acceptance: card.acceptance,
          fmError: card.fmError || null,
          testFiles,
          hints: buildAcceptanceHints(card.acceptance, testFiles, cwd, wtRoot, probe7CrossRoots),
        })
      }
    }
  }

  // ── 探针 8：载荷字段契约对账（advisory；2026-09-16 EHS 二次复核驱动——字段错位族 4 处
  // P1 是 URL 级 parity 的真空带）。fail-soft：内部全兜，异常降级 not-applicable 不炸整体。──
  let probe8 = { applicable: false, mispairs: [], feOnly: [], missingNotNull: [], notes: [] }
  try {
    probe8 = runProbe8PayloadParity({ specBase, cwd, wtRoot, changeName })
  } catch (e) {
    probe8.notes = [`探针 8 执行失败（fail-soft 跳过）：${e && e.message ? e.message : e}`]
  }

  // ── 探针 9：守卫一致性（advisory；2026-09-15 EHS doSubmit 越权 P1 驱动——同实体 CRUD
  // 守卫不一致是编码式权限典型漏洞形态，探针 5/8 均零覆盖）。fail-soft 同探针 8：异常降级
  // not-applicable 注记不炸整体。──
  let probe9 = { applicable: false, javaFileCount: 0, groupCount: 0, inconsistentGroups: [], notes: [] }
  try {
    probe9 = runProbe9GuardConsistency({ specBase, cwd, wtRoot, changeName })
  } catch (e) {
    probe9.notes = [`探针 9 执行失败（fail-soft 跳过）：${e && e.message ? e.message : e}`]
  }

  // ── 探针 10：预填注清零（error 门；2026-09-18-artifact-prefill task-03——门禁梯度 error 档
  // 的检测单点：--init 预填本段 + gates.js verify 收尾 error 门 / brainstorm·plan advisory 复跑
  // 同一实现，不二算。fail-soft 同探针 8/9：异常降级 not-applicable 注记不炸整体。──
  let probe10 = { applicable: false, checkedFiles: 0, unclearedFiles: [], notes: [] }
  try {
    probe10 = runProbe10PrefillNoteClearance({ specBase, changeName })
  } catch (e) {
    probe10.notes = [`探针 10 执行失败（fail-soft 跳过）：${e && e.message ? e.message : e}`]
  }

  // ── 探针 11：红线一致性（advisory；2026-09-20-redline-machine-check——对撞实验核心
  // 教训转化：语义红线活在散文里无机器可查形态）。消费者仓自持 .sillyspec/redlines.yaml
  // （缺=不适用零打扰，D-002）；forbid 命中 ❌/⚠️（severity 驱动）、require 缺失 ⚠️，渲染进
  // 骨架供裁定；不进 PASS 封顶（D-003：攒误报率后另案升硬门）。fail-soft 同 8/9/10。──
  let probe11 = { applicable: false, entryCount: 0, findings: [], warnings: [] }
  try {
    probe11 = runRedlineConsistencyProbe({ specBase, cwd, wtRoot, changeName })
  } catch (e) {
    probe11.warnings = [`探针 11 执行失败（fail-soft 跳过）：${e && e.message ? e.message : e}`]
  }

  // ── 接口面 + 消费端归类（task-04 / FR-05 / D-005~D-007）：design.md 接口段 tolerant
  // 解析 + 清单消费端归类——骨架「## 接口验证覆盖矩阵」段预填与 facts 落盘
  // （backfillFactsFromMdAndTests）共用同一解析器（单一产物源，不各读各的）。fail-soft：
  // design 缺失/解析异常 → 空面（骨架渲染「无接口面」注记，validator 判 N=0 走零行为注记）。──
  let apiFace = { endpoints: [], declared: null, sectionHint: [] }
  let consumerHints = {}
  try {
    if (existsSync(designPath)) {
      apiFace = parseDesignApiTable(readFileSync(designPath, 'utf8'))
      consumerHints = classifyConsumerHints(detailed.map(e => String(e.path)))
    }
  } catch { /* design 读/解析异常 → 空面（fail-soft） */ }

  return { probe1, probe3, probe5, probe6, probe7, probe8, probe9, probe10, apiFace, consumerHints }
}

/**
 * 渲染探针结果为 markdown（可直接粘进 verify-result.md「探针结果」章节）。
 */
export function renderVerifyProbesReport(result) {
  const L = []
  const { probe1, probe3, probe5, probe6 } = result

  L.push('#### 探针 1：未实现标记扫描（design 清单文件）')
  if (probe1.matches.length === 0) {
    L.push('- ✅ 无 TODO/FIXME/尚未实现 标记命中') /* probe1-noqa */
  } else {
    for (const m of probe1.matches) L.push(`- ⚠️ \`${m.file}:${m.line}\` ${m.content}`)
  }
  if (probe1.globEntries.length > 0) L.push(`- ℹ️ glob 项未展开（agent 手动展开扫描）：${probe1.globEntries.join('、')}`)
  if (probe1.worktreeHits > 0) L.push(`- ℹ️ ${probe1.worktreeHits} 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）`)
  if (probe1.skippedFiles.length > 0) L.push(`- ℹ️ 清单文件不存在（跳过）：${probe1.skippedFiles.join('、')}`)
  L.push('')

  L.push('#### 探针 2：设计关键词覆盖')
  L.push('<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->') /* probe1-noqa */
  L.push('')

  L.push('#### 探针 3：验收标准测试覆盖')
  if (probe3.tasks.length === 0) {
    L.push('- ℹ️ tasks.md 无 checkbox 任务')
  } else {
    for (const t of probe3.tasks) {
      if (!t.located) {
        L.push(`- ⚠️ ${t.task}: 无 task 卡/allowed_paths，无法定位模块目录（agent 手查）`)
      } else if (t.hasTest) {
        const mirrorNote = (t.mirrorDirs && t.mirrorDirs.length > 0)
          ? `；JVM 镜像测试根（${t.mirrorDirs.join('、')}）` : ''
        L.push(`- ✅ ${t.task}: 模块目录（${t.moduleDirs.join('、')}）${mirrorNote}找到 ${t.testFileCount} 个测试文件（${t.testFiles.slice(0, 5).join('、')}${t.testFileCount > 5 ? ' …' : ''}）`)
      } else {
        const mirrorNote = (t.mirrorDirs && t.mirrorDirs.length > 0)
          ? '（含 co-located tests/ 与 JVM src/test 镜像根）' : '（含 co-located tests/）'
        L.push(`- ⚠️ ${t.task}: 模块目录（${t.moduleDirs.join('、')}）递归未找到测试文件${mirrorNote}`)
      }
    }
  }
  L.push(`- ℹ️ ${probe3.note}`)
  L.push('')

  // 探针 7 紧随探针 3（3.5 已被断言有效性抽查占用，编号顺延取 7 兼容锚定正则 /#### 探针 (\d+)/）；
  // 骨架序 3 → 7 → 4，ensureAcceptanceMatrixSection 补段同序。result 无 probe7 键（存量调用方/
  // 合成 result）→ applicable=false 渲染「不适用」行，零回归。
  L.push(...renderProbe7Lines(result.probe7 || { applicable: false, tasks: [] }))
  L.push('')

  L.push('#### 探针 4：决策追踪覆盖')
  L.push('<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->') /* probe1-noqa */
  L.push('')

  L.push('#### 探针 5：API Contract Parity')
  L.push(`- ${probe5.summary || `backend ${probe5.backendCount ?? 0} 端点 / frontend ${probe5.frontendCount ?? 0} 调用`}`)
  if (probe5.crossRepoCardCount > 0) {
    L.push(`- ℹ️ parity 扫描面只含主仓——另有 ${probe5.crossRepoCardCount} 张跨仓 task 卡的仓不在扫描根内，跨仓前端调用/端点请到对应仓核对（D-004 跨仓对账不在本变更范围）`)
  }
  if ((probe5.scanRoots || []).length > 1) {
    L.push(`- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 ${probe5.scanRoots.length} 个根`)
  }
  if (probe5.prefixAlignedCount > 0) {
    L.push(`- ℹ️ ${probe5.prefixAlignedCount} 处前端调用经挂载前缀对齐匹配（endpoints 提取不含 include_router/app.use 挂载点前缀，比对时剥除对齐——非契约缺口）`)
  }
  if ((probe5.missingBackend || []).length > 0) {
    L.push('')
    L.push('| 状态 | 前端调用 | 后端端点 | 文件 |')
    L.push('|---|---|---|---|')
    for (const m of probe5.missingBackend) {
      L.push(`| ❌ missing | ${m.method} ${m.path} | — | ${m.consumerFile || '?'}${m.consumerLine ? ':' + m.consumerLine : ''} |`)
    }
    L.push('')
    L.push('- ❌ contract gap 是真实集成缺陷——诚实判 FAIL 并回 execute 补端点（CLI 仅 advisory 不硬阻断）')
  }
  if ((probe5.unusedBackend || []).length > 0) {
    // unused 分层展示（probe5-unused-stock-noise）：本变更相关（artifact 端点集内）逐条列出，
    // 存量其余折叠计数——EHS 实证 490 个存量端点刷屏淹没了真信号。旧字段形态（无分层）零回归全列。
    const relevant = Array.isArray(probe5.unusedChangeRelevant) && probe5.unusedChangeRelevant.length >= 0
      ? probe5.unusedChangeRelevant : probe5.unusedBackend
    const stock = typeof probe5.unusedStockCount === 'number' ? probe5.unusedStockCount : 0
    L.push(`- ⚠️ ${relevant.length} 个本变更端点前端未调用（warning 不阻断）：${relevant.slice(0, 5).map(u => `${u.method} ${u.path}`).join('、')}${relevant.length > 5 ? ' …' : ''}`)
    if (stock > 0) L.push(`- ℹ️ 另有 ${stock} 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）`)
  }
  if ((probe5.crossRepoNotes || []).length > 0) {
    for (const n of probe5.crossRepoNotes.slice(0, 5)) L.push(`- ℹ️ ${n}`)
  }
  L.push('')

  L.push('#### 探针 6：代码删除对账')
  if (probe6.unavailable) {
    L.push('- ⚠️ git 不可用或非仓库，删除对账无法执行（不能视为「无删除」，agent 需人工核对）')
  } else if (probe6.deletions.length === 0) {
    L.push('- ✅ git diff 无整文件删除（D/R/C）记录')
  } else {
    for (const d of probe6.deletions) {
      L.push(`- ${d.verdict} \`${d.path}\`（git 状态 ${d.status}）`)
    }
  }
  L.push(`- ℹ️ ${probe6.note}`)
  L.push('')
  L.push(...(renderProbe8Lines(result.probe8 || { applicable: false, mispairs: [], feOnly: [], missingNotNull: [], notes: [] })))
  // 探针 9 紧随探针 8；旧 result 无 probe9 键（存量调用方/合成 result）→ applicable=false
  // 渲染「不适用」行 + notes，零回归（探针 7 兜底口径同款）。
  L.push(...(renderProbe9Lines(result.probe9 || { applicable: false, javaFileCount: 0, groupCount: 0, inconsistentGroups: [], notes: [] })))
  // 探针 10 紧随探针 9；旧 result 无 probe10 键（存量调用方/合成 result）→ applicable=false
  // 渲染「不适用」行 + notes，零回归（探针 8/9 兜底口径同款）。
  L.push(...(renderProbe10Lines(result.probe10 || { applicable: false, checkedFiles: 0, unclearedFiles: [], notes: [] })))
  // 探针 11 紧随 10；旧 result 无 probe11 键 → 不适用兜底（8/9/10 同款零回归口径）。
  L.push(...(renderProbe11Lines(result.probe11 || { applicable: false, entryCount: 0, findings: [], warnings: [] })))
  return L.join('\n')
}

/**
 * 渲染探针 8 段（advisory 口径注记随段输出——命中≠结论，agent 逐条复核）。
 * @param {{applicable: boolean, backendFieldCount?: number, feKeyCount?: number, notNullCount?: number,
 *   javaFileCount?: number, sqlFileCount?: number, feFileCount?: number,
 *   mispairs: Array<{fe,be}>, feOnly: string[], missingNotNull: Array<{col}>, notes: string[],
 *   contractCount?: number, contractOrphans?: Array<{fe, hint?}>, missingRequired?: Array<{field, contract}>,
 *   directCompare?: {driftWarnings: Array<{file, line: number|null, field}>,
 *     missingRequiredWarnings: Array<{endpoint, method, field, frontendFiles: string[]}>,
 *     escapeHatchCount: number, nonJavaSkipCount: number}}} p8
 *   directCompare（task-04）：runProbe8PayloadParity 在外部传入 diffFiles 时组装的代码级直比
 *   面——缺失（存量调用/兜底形态）时子段 if 块静默跳过，零回归。
 * @returns {string[]} 行数组（含段标题）
 */
function renderProbe8Lines(p8) {
  const L = [PROBE8_HEADING]
  if (!p8 || !p8.applicable) {
    L.push('- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）')
    for (const n of (p8 && p8.notes) || []) L.push(`- ℹ️ ${n}`)
    return L
  }
  L.push('<!-- 口径注记：静态启发式对账——前端请求载荷键（apiFetch/request/axios/fetch 调用邻近对象键）× 后端 Java private 字段（归一化覆盖）∪ 疑似错位配对 ∪ SQL NOT NULL 列缺送。命中≠结论：UI 本地态键/服务端填充列会自然出现在差异里，agent 逐条复核（2026-09-16 EHS 二次复核实证：leaderUserId↔rpLeaderUserId 字段错位致相关方支线三端不可用、缺发 reportOrgId 致小程序开立被拒——URL 级 parity 抓不住载荷级错位）。 -->')
  L.push(`- ℹ️ 比对面：前端载荷键 ${p8.feKeyCount ?? 0}（${p8.feFileCount ?? 0} 前端文件）× 后端字段 ${p8.backendFieldCount ?? 0}（${p8.javaFileCount ?? 0} Java 文件）+ NOT NULL 列 ${p8.notNullCount ?? 0}（${p8.sqlFileCount ?? 0} SQL 文件）`)
  if ((p8.mispairs || []).length > 0) {
    L.push(`- ⚠️ 疑似字段错位配对（前后端名近形，人工核实一对一映射）：${p8.mispairs.slice(0, 8).map(p => `${p.fe} ↔ ${p.be}`).join('、')}${p8.mispairs.length > 8 ? ` …共 ${p8.mispairs.length} 对` : ''}`)
  }
  if ((p8.feOnly || []).length > 0) {
    L.push(`- ℹ️ 前端独有键（候选 UI 本地态/字段错位/跨层无关）：${p8.feOnly.slice(0, 10).join('、')}${p8.feOnly.length > 10 ? ` …共 ${p8.feOnly.length} 个` : ''}`)
  }
  if ((p8.missingNotNull || []).length > 0) {
    L.push(`- ⚠️ NOT NULL 列前端未见（候选必填缺送/服务端填充）：${p8.missingNotNull.slice(0, 8).map(c => c.col).join('、')}${p8.missingNotNull.length > 8 ? ` …共 ${p8.missingNotNull.length} 个` : ''}`)
  }
  // 契约维度两行（task-01，advisory）：契约外载荷键（design 契约面未见）/ 必填漏发（契约
  // required 前端载荷未见）。无契约面时 notes 已有 skipped 注记（下方循环渲染），不空段。
  if ((p8.contractOrphans || []).length > 0) {
    L.push(`- ⚠️ 契约外载荷键 ${p8.contractOrphans.length} 条（design 契约面未见，候选契约滞后/跨层私加）：${p8.contractOrphans.slice(0, 8).map(o => o.hint ? `${o.fe}（疑似对应 ${o.hint}）` : o.fe).join('、')}${p8.contractOrphans.length > 8 ? ` …共 ${p8.contractOrphans.length} 条` : ''}`)
  }
  if ((p8.missingRequired || []).length > 0) {
    L.push(`- ⚠️ 契约必填漏发 ${p8.missingRequired.length} 条（契约 required 前端载荷未见，人工核实提交链路）：${p8.missingRequired.slice(0, 8).map(r => `${r.field}←${r.contract}`).join('、')}${p8.missingRequired.length > 8 ? ` …共 ${p8.missingRequired.length} 条` : ''}`)
  }
  if ((p8.mispairs || []).length === 0 && (p8.missingNotNull || []).length === 0
    && (p8.contractOrphans || []).length === 0 && (p8.missingRequired || []).length === 0) {
    L.push('- ✅ 载荷字段面零疑似差异（归一化覆盖 + NOT NULL 全见）')
  }
  for (const n of p8.notes || []) L.push(`- ℹ️ ${n}`)
  // direct-compare 子段（task-04）：代码级直比面（漂移嫌疑/必填漏发嫌疑，advisory 独立面——
  // 不进 errors/warnings）。独立 if 块，删除即整体回退；p8.directCompare 缺失（存量调用/兜底
  // 形态）时静默跳过零回归。明细行防撞 verify-postcheck PROBE8 锚点（行首字面前缀不同）。
  if (p8.directCompare) L.push(...renderDirectCompareSection(p8.directCompare))
  return L
}

/**
 * 渲染探针 9 段（renderProbe8Lines 同构；advisory 口径注记随段输出——存在性检查非语义审计，
 * 聚类启发式由 agent 裁定）。汇总行「守卫不一致实体组 N 个」的 N 供 verify-postcheck 一致性
 * 抽查锚点（对齐探针 8 先例，本卡只出 producer 侧）。
 * @param {{applicable: boolean, javaFileCount?: number, groupCount?: number,
 *   inconsistentGroups: Array<{entity: string, guarded: string[], unguarded: string[], signals: Record<string, string[]>}>,
 *   notes: string[]}} p9
 * @returns {string[]} 行数组（含段标题）
 */
function renderProbe9Lines(p9) {
  const L = [PROBE9_HEADING]
  if (!p9 || !p9.applicable) {
    L.push('- 不适用（清单无 .java 改动文件，或 design.md 缺失）')
    for (const n of (p9 && p9.notes) || []) L.push(`- ℹ️ ${n}`)
    return L
  }
  L.push('<!-- 口径注记：存在性检查非语义审计——只查「守卫调用/注解模式存在」不查校验逻辑对错；聚类启发式由 agent 裁定（方法名前缀动词+尾段实体名词聚类，同文件同实体 ≥2 变更方法才比对，误组/漏组都可能——⚠️ 是定向复核提示不是结论）。 -->')
  L.push(`- ℹ️ 比对面：${p9.javaFileCount ?? 0} Java 文件 × 同实体变更方法组 ${p9.groupCount ?? 0}（组内 ≥2 方法才比对）`)
  if ((p9.inconsistentGroups || []).length > 0) {
    L.push(`- ⚠️ 守卫不一致实体组 ${p9.inconsistentGroups.length} 个（同实体有守卫/无守卫并存——越权风险面，2026-09-15 EHS doSubmit 越权同族，agent 逐组裁定）`)
    for (const g of p9.inconsistentGroups) {
      const guardedPart = (g.guarded || []).map(m => `${m}（${((g.signals && g.signals[m]) || []).join('、') || '?'}）`).join('、')
      const unguardedPart = (g.unguarded || []).join('、')
      L.push(`- ⚠️ 实体 ${g.entity}：有守卫 [${guardedPart}] / 无守卫 [${unguardedPart}]`)
    }
  } else {
    L.push('- ✅ 同实体守卫信号一致（无有守卫/无守卫并存的实体组）')
  }
  for (const n of p9.notes || []) L.push(`- ℹ️ ${n}`)
  return L
}

/**
 * 渲染探针 10 段（renderProbe9Lines 同构；error 门口径注记随段输出——❌ 面是 verify 完成
 * 前须清零的死信，不是 advisory 复核面）。汇总行「预填注未清 N 处」的 N 为后续一致性抽查
 * 锚点扩展留位（verify-postcheck 锚点面归后续任务，本卡只出 producer 侧——probe9 先例同款）。
 * @param {{applicable: boolean, checkedFiles?: number, unclearedFiles: string[], notes: string[]}} p10
 * @returns {string[]} 行数组（含段标题）
 */
function renderProbe10Lines(p10) {
  const L = [PROBE10_HEADING]
  if (!p10 || !p10.applicable) {
    L.push('- 不适用（design.md 与 tasks/task-*.md 均缺席——纯骨架/中间态，预填注无从在场）')
    for (const n of (p10 && p10.notes) || []) L.push(`- ℹ️ ${n}`)
    return L
  }
  L.push('<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->')
  if ((p10.unclearedFiles || []).length > 0) {
    L.push(`- ❌ 预填注未清 ${p10.unclearedFiles.length} 处（error 门——verify 完成前须逐槽核对后删注）：`)
    for (const f of p10.unclearedFiles) L.push(`- ❌ \`${mdEscapeCell(f, 120)}\` 仍含未删预填注`)
  } else {
    L.push(`- ✅ 预填注清零（${p10.checkedFiles ?? 0} 个在检文件无未确认预填）`)
  }
  for (const n of p10.notes || []) L.push(`- ℹ️ ${n}`)
  return L
}

// ── 探针 11：红线一致性（2026-09-20-redline-machine-check，advisory）──────────────

const PROBE11_HEADING = '#### 探针 11：红线一致性（advisory）'

/**
 * 红线一致性探针（advisory / fail-open 全链，D-003/D-004）：
 * 读 <specBase>/redlines.yaml（消费者仓自持，缺=不适用零打扰），调 redlines.js
 * 评估器（纯函数，root=wtRoot||cwd 定位 scope 文件）。坏 yaml → 不适用 + 注记；
 * 不进 PASS 封顶（D-003：攒误报率后另案升硬门）。
 */
export function runRedlineConsistencyProbe({ specBase, cwd, wtRoot = null }) {
  const yamlPath = join(specBase, 'redlines.yaml')
  if (!existsSync(yamlPath)) {
    return { applicable: false, entryCount: 0, findings: [], warnings: [] }
  }
  let yamlText
  try {
    yamlText = readFileSync(yamlPath, 'utf8')
  } catch (e) {
    return { applicable: false, entryCount: 0, findings: [], warnings: [`redlines.yaml 读取失败（不适用）：${e && e.code ? e.code : 'error'}`] }
  }
  let parsed
  try {
    parsed = parseRedlines(yamlText)
  } catch (e) {
    return { applicable: false, entryCount: 0, findings: [], warnings: [`redlines.yaml 解析失败（不适用）：${e && e.message ? e.message : e}`] }
  }
  const root = wtRoot || cwd
  const result = evaluateRedlines({ entries: parsed.entries, root })
  return {
    applicable: true,
    entryCount: result.entryCount,
    findings: result.findings,
    warnings: [...(parsed.warnings || []), ...(result.warnings || [])],
  }
}

/** renderProbe11Lines：不适用 / 命中逐条（severity 驱动 ❌/⚠️ + statement + origin）/ ✅ 计数。 */
function renderProbe11Lines(p11) {
  const L = [PROBE11_HEADING]
  if (!p11 || !p11.applicable) {
    L.push('- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）')
    for (const w of (p11 && p11.warnings) || []) L.push(`- ℹ️ ${w}`)
    return L
  }
  L.push('<!-- 口径注记：模式级断言（正则×scope，人写人负责）非语义审计——命中是「定向复核提示」；advisory 不阻断（D-003：误报率数据攒够后另案升硬门）。命中处置：真违规则修代码或升红线版本；正则过宽则收窄条目。 -->')
  const findings = p11.findings || []
  if (findings.length === 0) {
    L.push(`- ✅ 红线全过（${p11.entryCount ?? 0} 条断言，0 命中 0 缺失）`)
  } else {
    for (const f of findings) {
      const marker = f.kind === 'forbid' && f.severity === 'error' ? '❌' : '⚠️'
      const where = f.file ? `\`${f.file}:${f.line}\`` : 'scope 全集'
      L.push(`- ${marker} ${f.id}（${f.kind === 'forbid' ? '禁式命中' : '要求缺失'}）@ ${where}${f.snippet ? `：\`${mdEscapeCell(f.snippet, 100)}\`` : f.detail ? `：${f.detail}` : ''}`)
      if (f.statement) L.push(`  - 红线：${f.statement}${f.origin ? `（溯源：${f.origin}）` : ''}`)
    }
  }
  for (const w of p11.warnings || []) L.push(`- ℹ️ ${w}`)
  return L
}

// ── 接口验证覆盖矩阵段渲染（task-04 / FR-05 / D-005~D-007）──
// 骨架新写路径（generateVerifyResultSkeleton）与缺段补齐（ensureApiCoverageMatrixSection）
// 共用单一实现——renderProbe7Lines 先例。不动 probe7 既有矩阵（独立 ## 章节并行存在，口径
// 注记互指区分，D-009 非目标 / R-07）。预填口径同 probe7：CLI 机械预填、agent 逐格复核改写。
const API_MATRIX_HEADING = '## 接口验证覆盖矩阵'
// 写端点集合（D-007/FR-06 表间完备性 advisory 数据面）：method ∈ 此集的端点须在 design
// 权限矩阵段有对应行或显式豁免（「无权限约束」）——warning 计算归 task-05，此处只定集合。
const API_MATRIX_WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

/**
 * 渲染「## 接口验证覆盖矩阵」段（task-04）。
 * 三态：解析有端点 → 逐端点预填行（判定列 `<待填：五选一>` 占位，同 probe7 预填口径供 agent
 * 复核）；解析零行有声明 → 声明占位行「本变更接口面：<N> 端点（agent 声明）」（D-005 零解析
 * 降级，对账分母=声明数）；零解析零声明 → 「无接口面」注记行（非判级 critical 变更零行为
 * 注记即可——判级 critical 的 error 拦截归 task-05 validator）。段尾 advisory 占位注记
 * （消费面/表间完备性，warning 计算归 task-05，本段只留位）。
 * @param {{endpoints?: Array<{method: string, path: string, rowIdx: number}>, declared?: number|null}|null} apiFace
 * @returns {string[]} 行数组（含段标题；调用方自理前后空行）
 */
function renderApiCoverageMatrixLines(apiFace) {
  const face = apiFace && typeof apiFace === 'object' ? apiFace : null
  const endpoints = face && Array.isArray(face.endpoints) ? face.endpoints : []
  const declared = face && typeof face.declared === 'number' ? face.declared : null
  const L = [`${API_MATRIX_HEADING} [层：人工判断——CLI 预填复核]`]
  L.push('<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->')
  L.push('<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->')
  L.push('<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->')
  if (endpoints.length === 0 && declared === null) {
    L.push('- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator')
    return L
  }
  if (endpoints.length > 0 && declared !== null && declared !== endpoints.length) {
    L.push(`<!-- 声明与解析并存（声明 ${declared} 端点 / 解析 ${endpoints.length} 端点）——以解析为准，差异需复核（design 接口段与声明行不同步的漂移信号） -->`)
  }
  L.push('| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |')
  L.push('|---|---|---|---|---|')
  if (endpoints.length > 0) {
    for (const ep of endpoints) {
      L.push(`| ${mdEscapeCell(`${ep.method} ${ep.path}`, 160)} | <待填：五选一> | <待填：用例 ID> | <待填> | <待填：锚点> |`)
    }
  } else {
    L.push(`| 本变更接口面：${declared} 端点（agent 声明） | <待填：五选一> | <待填：用例 ID> | <待填> | <待填：锚点> |`)
    L.push('<!-- 解析零行降级（D-005）：接口面以 agent 声明为准（对账分母=声明数）；声明与实际不符时补 design 接口段表格后重跑 --init 刷新本段 -->')
  }
  L.push('<!-- advisory 尾注（warning 计算归 validator，本段只留位）：有消费端未填子行的端点将列于此（advisory——消费端归类=design 清单启发式，数据面 facts.consumerHints）；写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段声明的将列于此（advisory——补行或显式豁免「无权限约束」，数据面 facts.apiFace.writeEndpoints；表缺行会让派生框架继承你的洞） -->')
  return L
}

/**
 * 从 runVerifyProbes 结果构造 verify-facts.json 机器底稿对象（P3b 可复跑审计底稿）。
 * 命令行统一 `sillyspec verify-probes --change <name>`；指标 fail-soft——字段不可得时少列
 * 该键而非报错（probe5 形态随 verifyApiParity 演进，宁可少列不可失真）。
 * @param {{ probe1?: object, probe3?: object, probe5?: object, probe6?: object }} result
 * @param {{ changeName?: string, now?: string }} [opts] now 缺省取当前时刻（ISO）
 * @returns {{ schemaVersion: number, change: string, generatedAt: string, probes: object }}
 */
export function buildVerifyFacts(result, { changeName, now } = {}) {
  const command = `sillyspec verify-probes --change ${changeName}`
  // undefined 值键不进 metrics（「取不到的字段宁可少列」）
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
  const len = (a) => (Array.isArray(a) ? a.length : undefined)
  const num = (v) => (typeof v === 'number' ? v : undefined)
  const p1 = (result && result.probe1) || {}
  const p3 = (result && result.probe3) || {}
  const p5 = (result && result.probe5) || {}
  const p6 = (result && result.probe6) || {}
  const p8 = (result && result.probe8) || {}
  const p9 = (result && result.probe9) || {}
  const p10 = (result && result.probe10) || {}
  // v2（2026-09-08-ir-verify-facts）：probes 机器段原样；conclusion/tests/requiredEvidence/
  // runtimeEvidence/factsConsistency 五段是 slot-backfill/实测回填段（D-001@v2），--init 快照
  // 不落键（writeVerifyFacts 分段合并时保留既有固化段），由 backfillFactsFromMdAndTests 填。
  return {
    schemaVersion: 2,
    change: changeName,
    generatedAt: now || new Date().toISOString(),
    probes: {
      probe1: {
        command,
        metrics: defined({
          matches: len(p1.matches),
          skippedFiles: len(p1.skippedFiles),
          worktreeHits: num(p1.worktreeHits),
          globEntries: len(p1.globEntries),
        }),
      },
      probe3: {
        command,
        metrics: defined({
          tasks: len(p3.tasks),
          hasTest: Array.isArray(p3.tasks) ? p3.tasks.filter(t => t && t.hasTest).length : undefined,
        }),
      },
      probe5: {
        command,
        metrics: defined({
          backendEndpoints: num(p5.backendCount),
          frontendCalls: num(p5.frontendCount),
        }),
      },
      probe6: {
        command,
        metrics: defined({
          deletions: len(p6.deletions),
          unavailable: typeof p6.unavailable === 'boolean' ? p6.unavailable : undefined,
        }),
      },
      probe8: {
        command,
        metrics: defined({
          mispairs: len(p8.mispairs),
          feOnly: len(p8.feOnly),
          missingNotNull: len(p8.missingNotNull),
          contractCount: num(p8.contractCount),
          contractOrphans: len(p8.contractOrphans),
          missingRequired: len(p8.missingRequired),
          feKeys: num(p8.feKeyCount),
          backendFields: num(p8.backendFieldCount),
        }),
      },
      probe9: {
        command,
        metrics: defined({
          javaFileCount: num(p9.javaFileCount),
          groupCount: num(p9.groupCount),
          inconsistentGroups: len(p9.inconsistentGroups),
        }),
      },
      probe10: {
        command,
        metrics: defined({
          checkedFiles: num(p10.checkedFiles),
          unclearedFiles: len(p10.unclearedFiles),
        }),
      },
    },
  }
}

/**
 * 平台模式产物路径回显注记（2026-09-10 驾驭小结②，用户实锤「显示混乱」）：
 * verify-probes --init 在平台模式（.sillyspec-platform.json pointer 存在）下 spec 根解析为
 * hub 镜像目录——回显的物理路径（骨架生成/已存在/facts 刷新）都在镜像根下，而产物经
 * daemon spec-sync 落主仓 .sillyspec/changes/<change>/。agent/人工核对以主仓路径为准，
 * 回显行尾追加本注记消歧义（本地模式返回空串，回显零变化）。
 * @param {string|null} platformBase 平台镜像根（null/undefined = 非平台模式）
 * @param {string} changeName 变更名
 * @param {string} file 产物文件名（verify-result.md / verify-facts.json）
 * @returns {string} 注记文本（非平台模式为 ''）
 */
export function formatPlatformPathNote(platformBase, changeName, file) {
  if (!platformBase) return ''
  return `（平台模式：物理写盘在 hub 镜像根 ${platformBase}；主仓同步位置 .sillyspec/changes/${changeName}/${file}，核对以主仓路径为准）`
}

/**
 * verify-probes --init 落盘 verify-facts.json（CLI 全权写）。v2（2026-09-08-ir-verify-facts）改
 * 分段合并：re-init 刷新机器段（probes/generatedAt），保留既有 slot-backfill/实测固化段
 * （conclusion/tests/requiredEvidence/runtimeEvidence）——旧「无条件覆盖」会抹掉 --done 回填数据
 * （设计审查 P1-5）。agent 勿手改：复跑审计的对照快照，防篡改基准是 verify-result.md 正文。
 * @param {string} changeDir 变更目录（spec 根下 changes/<name>）
 * @param {object} result runVerifyProbes 返回值
 * @param {string} changeName 变更名（统一命令行呈现）
 * @param {{ platformNote?: string }} [opts] platformNote 回显行尾追加（平台模式路径消歧，纯回显层不进落盘）
 * @returns {{ facts: object, path: string }}
 */
export function writeVerifyFacts(changeDir, result, changeName, opts = {}) {
  const fresh = buildVerifyFacts(result, { changeName })
  const factsPath = join(changeDir, 'verify-facts.json')
  let facts = fresh
  try {
    const prev = JSON.parse(readFileSync(factsPath, 'utf8'))
    if (prev && prev.schemaVersion === FACTS_SCHEMA_VERSION) {
      facts = {
        ...fresh,
        conclusion: prev.conclusion,
        tests: prev.tests,
        requiredEvidence: prev.requiredEvidence,
        runtimeEvidence: prev.runtimeEvidence,
        factsConsistency: prev.factsConsistency, // 保留至上次对比结论（下次 --done 重算覆盖）
      }
    }
  } catch { /* 首次落盘/v1/损坏 → 全新快照（v1 无固化段，直接升 v2） */ }
  writeFileSync(factsPath, JSON.stringify(facts, null, 2) + '\n')
  console.log(`📝 已刷新 verify-facts.json 机器底稿: ${factsPath}（v2 分段合并，固化段保留；CLI 全权写，勿手改）${opts.platformNote || ''}`)
  return { facts, path: factsPath }
}

/**
 * --done 回填（D-001@v2 slot-backfill）：结论枚举槽 + 证据/回执槽解析固化进 facts；
 * testCheckResult 提供时回填 tests 段（实测在 runValidators 之后 → gates 二次回填，FR-03 次序）。
 * 机器段（probes/factsConsistency）不经本函数（writeVerifyFacts / checkProbeConsistency 所有）。
 * fail-soft：facts 缺失时原地升 v2（probes 保留或空）；落盘失败 warn 不抛。
 * @param {string} factsPath verify-facts.json 路径
 * @param {{ verifyMd: string, testCheckResult?: object|null }} opts
 * @returns {{ facts: object, conclusion: string|null, evidenceCount: number, receiptCount: number, testsBackfilled: boolean }}
 */
// 移交项结构化（坑 handover-only-in-prose，2026-09-15/16 EHS 生产实证）：verify 结论
// PASS WITH NOTES 的移交条目（环境阻断复跑/人工验收/待执行脚本）此前只活在结论槽正文
// 叙述——后续独立复核发现被环境阻断 deferred 的集成测试里正藏着 5 个 P1；「移交项没有
// 结构化清单 = 没人兜」。骨架新增「## 移交项（结构化）」章节（三列表格 + 类型枚举注释），
// 本函数解析其表行为机器可读 items（facts.handover 回填 + advisory 判定用）。
// 容错：占位行（<待填…）跳过；类型归一小写连字符（ENV-BLOCKED→env-blocked）；未知类型
// 保留原值（advisory 面向 agent 复核，不静默丢弃）；非表格行（prose/注释）忽略。
const HANDOVER_HEADING_RE = /^## 移交项（结构化）[^\n]*$/m
// severity 第 4 列（2026-09-17-pass-cap-semantics task-01 / D-005@v2 / FR-06）：三列正则扩
// 四列，存量三列表格行零迁移兼容（四列/三列正则互斥命中——四列行 5 管道段、三列行 4 管道段，
// [^|] 组不含管道无回溯交叠）。缺省按类型映射：db-script/env-blocked→blocking（X-07：集成
// 复跑与 fix.sql 恒 blocking，分层不削弱封顶）；manual-acceptance/other→advisory；未知类型
// 保守取 blocking（fail-closed 侧——severity 低标会漏封顶，宁可多拦；未知类型本就该 agent
// 复核，advisory 面向复核但封顶语义优先）。
const HANDOVER_ROW4_RE = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$/
const HANDOVER_ROW3_RE = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$/
const HANDOVER_DEFAULT_SEVERITY = (type) =>
  (type === 'manual-acceptance' || type === 'other') ? 'advisory' : 'blocking'
// 降级理由文法（X-02）：（降级：<理由>，依据 <file:line 或 D-xxx>）——全角括号/冒号/逗号，
// 依据锚点 D-xxx 或 file:line。JS 正则不转义全角括号（知识库坑）。blocking→advisory 降级
// 未命中本文法 → 仍按 blocking（fail-closed，防「全标 advisory」钻空——D-005@v2）。
const HANDOVER_DOWNGRADE_REASON_RE = /（降级：.+?，依据\s*(?:D-\d+(?:@\d+)?|[^\s，）:]+:\d+)）/
// severity 解析：显式 blocking 优先（混写保守）；显式 advisory 对 blocking 缺省类型构成降级，
// 理由文法在第 4 列或条件列任一命中即认（骨架第 4 列定型前 producer 宽收两侧；抽查面归
// checkProbeConsistency 消费侧后续任务）；两枚举都不含 → 缺省映射。
function resolveHandoverSeverity(type, severityCol, condition) {
  const col = String(severityCol || '')
  if (/blocking/i.test(col)) return 'blocking'
  if (/advisory/i.test(col)) {
    if (HANDOVER_DEFAULT_SEVERITY(type) !== 'blocking') return 'advisory'
    return (HANDOVER_DOWNGRADE_REASON_RE.test(col) || HANDOVER_DOWNGRADE_REASON_RE.test(String(condition || '')))
      ? 'advisory' : 'blocking'
  }
  return HANDOVER_DEFAULT_SEVERITY(type)
}
export function parseHandoverRows(md) {
  const text = String(md || '').replace(/\r\n/g, '\n')
  const m = text.match(HANDOVER_HEADING_RE)
  if (!m) return []
  const after = text.slice(m.index + m[0].length)
  const nextSection = after.match(/\n## /)
  const section = nextSection ? after.slice(0, nextSection.index) : after
  const items = []
  for (const line of section.split('\n')) {
    const row = line.match(HANDOVER_ROW4_RE) || line.match(HANDOVER_ROW3_RE)
    if (!row) continue
    const type = row[1].trim()
    const item = row[2].trim()
    const condition = row[3].trim()
    if (type === '类型' || /^-{2,}$/.test(type.replace(/\|/g, ''))) continue // 表头/分隔行
    if (type.startsWith('<') || item.startsWith('<')) continue // 骨架占位行
    if (type === '无' || item === '无') continue // 裸「无」行=骨架指引的空表占位（结论=PASS/FAIL 写「无」）——
    // 真「无可移交」的合法表达是矩阵干净+零有效行，不是一行无；精确相等防误杀「无明确去向」类真条目
    if (!type || !item) continue
    const normalizedType = type.toLowerCase().replace(/[\s_]+/g, '-')
    items.push({
      type: normalizedType,
      item,
      condition,
      severity: resolveHandoverSeverity(normalizedType, row[4], condition),
    })
  }
  return items
}

// ── stage-contract 动态绑定（D-011 producer 侧取数；分层单向——全局硬约束 3）──
// extractAcceptanceMatrixSlots 经顶层 await 动态 import 绑定（非静态 import-from 语句，
// 不造 import 环：stage-contract 静态闭包不含 verify-probes，加载序任一方向均无环）。
// conclusion 先例是调用侧传参形态；此处选零 gates 改动形态——首次（gates.js 收尾前置）与
// 二次（testCheckResult 后）两调用点自动覆盖，主路径无条件产出（X-08）不依赖调用方传参。
// 加载失败降级 null：matrixPartialRows 计 0 + fail-soft 注记（additive 字段缺省不炸）。
let extractAcceptanceMatrixSlotsFn = null
try {
  ;({ extractAcceptanceMatrixSlots: extractAcceptanceMatrixSlotsFn } = await import('./stage-contract.js'))
} catch { extractAcceptanceMatrixSlotsFn = null }

/**
 * db/<file>.sql 执行声明解析（X-03 文法，2026-09-17-pass-cap-semantics task-01 / D-007 声明面）：
 * 两类来源——①回执槽（## 集成验证回执）条目 command 含 db/<file>.sql（复用 parseEvidenceSlots
 * 现成解析，不自造第二套）；②声明行「已对目标库执行：db/<file>.sql」（全/半角冒号均认）。
 * @param {string} md verify-result.md 全文
 * @returns {string[]} 去重排序后的 db/<file>.sql 路径（posix 形态，与 apply 文件集直接可比）
 */
const DB_SCRIPT_REF_RE = /(?:^|[^\w/])(db\/[\w./-]+\.sql)/g
const DB_SCRIPT_DECLARE_RE = /已对目标库执行[：:]\s*`?(db\/[\w./-]+\.sql)/g
export function parseDbScriptDeclarations(md) {
  const text = String(md || '').replace(/\r\n/g, '\n')
  const found = new Set()
  const slots = parseEvidenceSlots(text)
  for (const receipt of slots.runtimeEvidence || []) {
    for (const m of String((receipt && receipt.command) || '').matchAll(DB_SCRIPT_REF_RE)) found.add(m[1])
  }
  for (const m of text.matchAll(DB_SCRIPT_DECLARE_RE)) found.add(m[1])
  return [...found].sort()
}

// 回执 command 来源分类（X-10 / D-006：只认命令来源声明、不解析日志内容；枚举
// cross-layer|build|unit，未定类默认 build——fail-closed 侧：build 不构成「集成实测已跑」，
// 宁可触发封顶要求 handover）。对齐目标：change-risk-profile.js classifyReceiptSourceTag
// （RECEIPT_SOURCE_CROSS_LAYER_RE/RECEIPT_SOURCE_UNIT_RE）——两侧正则族逐词保持同步演进
// （打标单点归 change-risk-profile 侧，本函数是 producer 判定侧；G-3 收口：producer 侧
// 曾漏 smoke 一词致 facts.integrationRan 偏 not-ran 误触封顶，已对齐，后续任一侧增词必须
// 双侧同步）。cross-layer=起服务/HTTP/进程对进程；smoke 冒烟命令族计 cross-layer（D-006
// 退役判据：批次 C commands.smoke 落地后由 smoke 回执一票判定「集成实测已跑」——起服务冒烟
// 即跨层实测，不得默认 build 误拦金路径）；unit=单测 runner 直跑（JUnitCore/node --test/
// mocha/jest/vitest/pytest 等）；其余（compile/lint/构建/mvn test 等混合形态）一律 build。
//
// 来源标记直判（2026-09-17-api-coverage-smoke task-02 / Grill B-1 修正，FR-03）：条目 source
// 标记 'cli-noai-smoke'（parseEvidenceSlots additive 第五字段——本文件 ensureSmokeReceiptSection
// 注入的机器段行尾注回填）→ 直判 cross-layer，**优先于命令词正则分类**——修正点在标记识别
// 而非命令词增补：node scripts/smoke.mjs / bash smoke.sh / python smoke.py 等脚本形态在既有
// 正则下全判 build 会误拦金路径，且脚本形态词表不可枚举（RECEIPT_CROSS_LAYER_RE 正则族
// 零词变动）。对齐目标：change-risk-profile.js classifyReceiptSourceTag(sourceMark 参数与
// CLI_SMOKE_SOURCE_MARK 常量)——**任一侧增改标记族必须双侧同步**（G-3 铁律）。
// （正则族单点收敛 ql-20260918-001：RECEIPT_CROSS_LAYER_RE/SMOKE_RECEIPT_SOURCE_MARK
// 从 change-risk-profile.js 导入（RECEIPT_SOURCE_CROSS_LAYER_RE/CLI_SMOKE_SOURCE_MARK 别名）——
// 消灭双文件逐词同步的口径漂移面（G-3 根因）。
/** CLI 机器段来源标记（与 change-risk-profile.js CLI_SMOKE_SOURCE_MARK / task-01 记录 source 同值，双侧同步） */
function classifyReceiptCommandSource(command, sourceMark) {
  if (sourceMark === SMOKE_RECEIPT_SOURCE_MARK) return 'cross-layer'
  const cmd = String(command || '')
  if (RECEIPT_CROSS_LAYER_RE.test(cmd)) return 'cross-layer'
  if (RECEIPT_UNIT_RE.test(cmd)) return 'unit'
  return 'build'
}

/**
 * facts.integrationRan 判定（D-006 判定表，2026-09-17-pass-cap-semantics task-01）：
 * 已跑 = ①quality-scan 实测记录在场（路径规则同 run/verify-quality-scan.js:36
 * qualityScanRecordPath：specBase/.runtime/verify-quality-scan-<changeName>.json，specBase/
 * changeName 自 factsPath 目录上推，不依赖调用方传参）且 commands.test 实跑（status 非
 * skipped）且 test_strategy ∈ {full, module, evidence-auto}（evidence-auto 降级 module 已跑
 * 子集按 module 档算已跑；local.yaml 未配置默认 full）；或 ②回执槽存在命令来源含跨层调用的
 * 条目。未跑 = test_strategy=skip / 无记录 / 回执仅 compile·lint·纯单测来源。记录缺失
 * （X-01：--done 亲测替代扫描场景时序不可得）→ not-ran + fail-open 注记（不阻断）。
 * @param {string} factsPath verify-facts.json 路径（<specBase>/changes/<name>/verify-facts.json）
 * @param {Array<{command: string}>} runtimeEvidence 回执槽解析结果（parseEvidenceSlots 产出）
 * @returns {{ ran: 'ran'|'not-ran', notes: string[] }}
 */
function judgeIntegrationRan(factsPath, runtimeEvidence) {
  const changeDir = dirname(factsPath)
  const changeName = basename(changeDir)
  const specBase = dirname(dirname(changeDir))
  let record = null
  try {
    const rec = JSON.parse(readFileSync(join(specBase, '.runtime', `verify-quality-scan-${changeName}.json`), 'utf8'))
    if (rec && rec.schemaVersion === 1 && rec.source === 'cli-noai') record = rec
  } catch { record = null }
  let strategy = 'full' // 未配置 test_strategy 默认全量（verify-postcheck resolveTestStrategy 同口径）
  try {
    const yamlText = readFileSync(join(specBase, 'local.yaml'), 'utf8').replace(/\r\n?/g, '\n')
    const sm = yamlText.match(/^\s*test_strategy:\s*([A-Za-z_-]+)\s*(?:#.*)?$/m)
    if (sm) strategy = sm[1]
  } catch { /* local.yaml 不可读 → 按 full 缺省 */ }
  const scanRan = Boolean(record && record.testResult && record.testResult.status && record.testResult.status !== 'skipped')
  if (scanRan && ['full', 'module', 'evidence-auto'].includes(strategy)) return { ran: 'ran', notes: [] }
  const receipts = Array.isArray(runtimeEvidence) ? runtimeEvidence : []
  // 条目 source 标记透传（task-02 Grill B-1）：source='cli-noai-smoke' 直判 cross-layer——
  // 机器段命令（node scripts/smoke.mjs 等脚本形态）不再落 build 误拦金路径。
  if (receipts.some(r => classifyReceiptCommandSource(r && r.command, r && r.source) === 'cross-layer')) {
    return { ran: 'ran', notes: [] }
  }
  const notes = []
  if (!record) {
    notes.push(`ℹ️ quality-scan 实测记录缺失（${join(specBase, '.runtime', `verify-quality-scan-${changeName}.json`)}）——facts.integrationRan 按 not-ran 判定（X-01 fail-open 注记，不阻断；--done 亲测替代扫描的场景记录时序不可得，出路=重跑质量扫描步或降级 NOTES）`)
  }
  return { ran: 'not-ran', notes }
}

/**
 * Runtime Evidence「不涉及」行识别（X-18 文法，2026-09-17-pass-cap-semantics task-01 / D-004）：
 * 「## Runtime Evidence」节内匹配「行含 端点|请求-响应|服务端点 关键词且以 不涉及 收尾」的
 * 表格行——收尾判定剥行尾管道（含全角｜）后 endswith（表格行末格「不涉及」）；至少一行命中
 * → true；无节/无命中 → false。骨架注释渲染归 task-03，本函数只做解析。
 * @param {string} md verify-result.md 全文
 * @returns {boolean}
 */
function parseRuntimeEndpointExcluded(md) {
  const text = String(md || '').replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  const start = lines.findIndex(l => l.startsWith('## Runtime Evidence'))
  if (start === -1) return false
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) break // 同 parseEvidenceSlots sectionOf 口径：到下一 #/## 级标题止
    const t = lines[i].trim()
    if (!t.startsWith('|')) continue // 只认表格行（X-18 文法）
    const stripped = t.replace(/[|｜]\s*$/, '').trim()
    if (/端点|请求-响应|服务端点/.test(t) && stripped.endsWith('不涉及')) return true
  }
  return false
}

/** facts.matrixPartialRows：探针 7 矩阵 verdict∈{partial, uncovered} 行数（无段 → 0） */
function countMatrixPartialRows(md) {
  if (!extractAcceptanceMatrixSlotsFn) {
    console.warn('⚠️ extractAcceptanceMatrixSlots 动态绑定不可用（stage-contract 加载失败，fail-soft）——facts.matrixPartialRows 本次计 0')
    return 0
  }
  const matrix = extractAcceptanceMatrixSlotsFn(md)
  return matrix.rows.filter(r => r && (r.verdict === 'partial' || r.verdict === 'uncovered')).length
}

export function backfillFactsFromMdAndTests(factsPath, { verifyMd, testCheckResult = null, conclusion = null }) {
  // smoke 机器段 ensure（2026-09-17-api-coverage-smoke task-02，挂 backfill 合并时点——
  // quality-scan step 6 noAI 亲跑落记录先于本步，读得到实录）：read-modify-write 盘上 md
  // 最新态（不基于 verifyMd 快照写回，防覆盖多 agent 并发改动）；注入/态更新成功后解析源
  // 切盘上最新内容——机器段行立即参与 slots 解析，judgeIntegrationRan 同轮即吃到
  // source 标记直判 cross-layer。ensure 落盘失败/无记录 fail-soft，不阻断 facts 回填。
  let verifyMdText = verifyMd
  try {
    const ensureDir = dirname(factsPath)
    const ensured = ensureSmokeReceiptSection(join(ensureDir, 'verify-result.md'), {
      specBase: dirname(dirname(ensureDir)),
      changeName: basename(ensureDir),
    })
    if (ensured.changed) {
      verifyMdText = readFileSync(join(ensureDir, 'verify-result.md'), 'utf8')
    }
  } catch { /* ensure 异常 fail-soft，按传入快照继续回填 */ }
  let facts = null
  try { facts = JSON.parse(readFileSync(factsPath, 'utf8')) } catch { /* 缺失见下 */ }
  // 只固化既有底稿，不无中生有（2026-09-08-ir-verify-facts 接线实证）：无 facts 的存量变更
  // （未跑过 --init）若被回填凭空建出 facts.json，checkProbeConsistency 的「有 facts 无探针
  // 子节 → error」判别会把存量兼容 skip 误升 error（run-complete-step-verify e2e 抓出）。
  // 底稿创建唯一入口是 verify-probes --init。
  if (!facts) {
    return { facts: null, skipped: true, conclusion: null, evidenceCount: 0, receiptCount: 0, testsBackfilled: false, reason: '无 verify-facts.json（未跑 --init），回填跳过——底稿创建唯一入口是 --init' }
  }
  if (facts.schemaVersion !== FACTS_SCHEMA_VERSION) {
    facts = { ...facts, schemaVersion: FACTS_SCHEMA_VERSION, probes: (facts && facts.probes) || {} }
  }
  const slots = parseEvidenceSlots(verifyMdText || '')
  // conclusion 由调用方传 stage-contract.extractVerifyConclusionSlot(verifyMd) 的结果
  // （避免 verify-probes → stage-contract 静态 import 的潜在环，分层单向）
  const conclusionSlot = conclusion || null
  if (conclusionSlot) facts.conclusion = conclusionSlot
  if (slots.hasEvidenceSlot && slots.requiredEvidence.length > 0) {
    facts.requiredEvidence = slots.requiredEvidence.map(e => ({
      task: e.task, status: e.status, verifiedFiles: e.verifiedFiles,
      ...(e.exempt ? { exempt: true, exemptionReason: e.exemptionReason } : {}),
    }))
  }
  if (slots.hasReceiptSlot && slots.runtimeEvidence.length > 0) {
    facts.runtimeEvidence = slots.runtimeEvidence
  }
  // 移交项结构化回填（handover-only-in-prose）：facts.handover **恒落盘**（零行= {count:0, items:[]}——
  // 2026-09-18-fr-index-l1 verify 期实证死锁修复：原「有行才写」使 零移交+结论 PASS 被
  // evaluatePassEligibility 条件② handoverFieldMissing fail-closed 拦死（PASS+真零移交结构性不可能）；
  // eligibility 测试的 CLEAN_FACTS 本就是 count:0 形态——字段在场零行=净，本行只是对齐既有契约）；
  // PASS WITH NOTES 零有效行 → advisory 警告（不阻断——存量 PASS WITH NOTES 无此章节是常态，
  // 渐进采纳）。EHS 实证：被环境阻断 deferred 的集成测试里藏着 5 个 P1，清单化才有
  // 「谁兜、怎么复跑」的可追溯面。
  const handoverItems = parseHandoverRows(verifyMdText || '')
  facts.handover = { count: handoverItems.length, items: handoverItems }
  if (conclusionSlot === 'PASS WITH NOTES' && handoverItems.length === 0) {
    console.warn('⚠️ 结论=PASS WITH NOTES 但「移交项（结构化）」章节零有效行——正文叙述的移交项（环境阻断复跑条件/人工验收步骤/待执行脚本）请结构化进 ## 移交项（结构化） 表格（类型枚举 env-blocked/manual-acceptance/db-script/other），避免移交项只活在 prose 里没人兜（2026-09-15 EHS 实证：被环境阻断 deferred 的集成测试里藏着 5 个 P1）。')
  }
  // ── PASS 封顶事实面四字段（2026-09-17-pass-cap-semantics task-01 / D-011 producer 侧）──
  // X-08 时序纪律：全部在函数主路径无条件产出——首次 backfill = gates.js 收尾前置调用、无
  // testCheckResult 时点（task-02 validator 在 runValidators 时点消费，已就位）；误挂二次
  // 回填的 testCheckResult 分支则消费时点读不到、恒误拦。判定输入自推导自读（quality-scan
  // 记录按 specBase 推导 / 矩阵经动态绑定），不依赖调用方传参。
  facts.dbScriptDeclarations = parseDbScriptDeclarations(verifyMdText || '')
  facts.runtimeEndpointExcluded = parseRuntimeEndpointExcluded(verifyMdText || '')
  const integration = judgeIntegrationRan(factsPath, slots.runtimeEvidence)
  facts.integrationRan = integration.ran
  for (const note of integration.notes) console.warn(note)
  facts.matrixPartialRows = countMatrixPartialRows(verifyMdText || '')
  // ── facts.apiFace / facts.consumerHints（2026-09-17-api-coverage-smoke task-04 / FR-05 /
  // D-005~D-007 producer 侧）──X-08 主路径无条件产出（同上口径，不依赖 testCheckResult
  // 时点）：apiFace = design 接口段 tolerant 解析面（endpoints/declared + writeEndpoints
  // 子集=表间完备性数据面），consumerHints = 清单消费端归类启发式（web/mp/script，仅
  // warning 提示面）。数据通道=落盘即消费（stage-contract 零 import 纪律，分层单向）——
  // task-05 validator 经 facts 读，不经函数调用。design.md 缺失 → 空面落盘（判定面稳定，
  // validator 判 N=0 走零行为注记）；与 runVerifyProbes 同一解析器（单一产物源）。
  {
    const changeDir = dirname(factsPath)
    const designPath = join(changeDir, 'design.md')
    let designText = null
    if (existsSync(designPath)) {
      try { designText = readFileSync(designPath, 'utf8') } catch { designText = null }
    }
    const face = parseDesignApiTable(designText || '')
    facts.apiFace = {
      endpoints: face.endpoints,
      declared: face.declared,
      writeEndpoints: face.endpoints.filter(e => e && API_MATRIX_WRITE_METHODS.has(e.method)),
    }
    let designPaths = []
    if (designText !== null) {
      try { designPaths = parseFileChangeListDetailed(designPath).map(e => String(e.path)) } catch { designPaths = [] }
    }
    facts.consumerHints = classifyConsumerHints(designPaths)
  }
  // ── facts.smokeRan（2026-09-17-api-coverage-smoke task-03 / FR-02 / D-002@v1 producer 侧）──
  // X-08 主路径无条件产出（同上四字段口径，不依赖 testCheckResult 时点）：唯一事实源 =
  // quality-scan 记录 smokeResult 段（judgeSmokeRan 五边界态封闭），不受 verify-result.md
  // 篡改影响（R-06 双源兜底）。消费方 = evaluatePassEligibility 第五条件（smoke-not-run）。
  const smokeRanJudge = judgeSmokeRan(factsPath)
  facts.smokeRan = smokeRanJudge.value
  for (const note of smokeRanJudge.notes) console.warn(note)
  let testsBackfilled = false
  if (testCheckResult && testCheckResult.status && testCheckResult.status !== 'skipped') {
    facts.tests = {
      command: testCheckResult.command || null,
      exitCode: typeof testCheckResult.exitCode === 'number' ? testCheckResult.exitCode : null,
      strategy: testCheckResult.mode || testCheckResult.strategy || null,
      failedRemaining: testCheckResult.failureNames || testCheckResult.failedTests || [],
      passedAt: new Date().toISOString(),
    }
    testsBackfilled = true
  }
  try {
    writeFileSync(factsPath, JSON.stringify(facts, null, 2) + '\n')
  } catch (e) {
    console.warn(`⚠️ facts 回填落盘失败（fail-soft，不阻断）: ${e && e.message ? e.message : e}`)
  }
  return { facts, conclusion: conclusionSlot, evidenceCount: slots.requiredEvidence.length, receiptCount: slots.runtimeEvidence.length, testsBackfilled }
}

/**
 * md 槽段缺失补齐（--init 段落级补齐，2026-09-08-ir-verify-facts R-02）：已存在的
 * verify-result.md 缺「证据账/集成验证回执」槽段时仅追加骨架（不触碰既有正文），幂等二跑零改动。
 * @param {string} mdPath verify-result.md 路径
 * @param {Array<{task:string,evidence:string[]}>} [requiredEvidenceItems] verify-required-evidence.json items（预填 task 行）
 * @returns {{ added: string[] }} 追加的槽段标题列表
 */
export function backfillMissingEvidenceSlots(mdPath, requiredEvidenceItems = []) {
  let text = ''
  try { text = readFileSync(mdPath, 'utf8') } catch { return { added: [] } }
  const normalized = text.replace(/\r\n/g, '\n')
  const added = []
  const blocks = []
  if (!normalized.includes(EVIDENCE_SLOT_HEADING)) {
    const lines = [EVIDENCE_SLOT_HEADING, '[层：人工判断——CLI 核验]', '', '<!-- 无 cannot_verify 任务时本节写「无」 -->']
    if (requiredEvidenceItems.length > 0) {
      for (const it of requiredEvidenceItems) {
        lines.push(`- ${it.task}: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）`)
      }
    } else {
      lines.push('无（本次变更无 cannot_verify 任务）')
    }
    lines.push('')
    blocks.push(lines.join('\n'))
    added.push(EVIDENCE_SLOT_HEADING)
  }
  if (!normalized.includes(RECEIPT_SLOT_HEADING)) {
    blocks.push([
      RECEIPT_SLOT_HEADING, '[层：自述声明——CLI 一致性校验]', '',
      '<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->',
      '<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；',
      '     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->',
      '- claim: <待填：一句话>',
      '  command: <待填：命令>',
      '  exit: <待填：0 或非 0>',
      '  log: <待填：日志路径>',
      '',
    ].join('\n'))
    added.push(RECEIPT_SLOT_HEADING)
  }
  if (added.length > 0) {
    writeFileSync(mdPath, normalized.replace(/\n?$/, '\n') + blocks.join('\n') + '\n')
  }
  return { added }
}

/**
 * 探针 7 矩阵段幂等补齐（--init 段落级，2026-09-14-acceptance-test-matrix FR-01；学
 * backfillMissingEvidenceSlots 形态）：verify-result.md 已存在但缺「#### 探针 7」段且
 * applicable=true（有 TaskCard）时补矩阵骨架段——不触碰既有正文；二跑零改动（幂等）。
 * 插入位置：文件内有「#### 探针 3」小节时插在该小节之后（保持骨架序 3 → 7 → 4），否则
 * 文末追加（旧格式/手写正文）。段已在场（冒号全/半角均认，防走样标题绕过检测）或
 * applicable=false → no-op。本变更自举通道：verify-result.md 先于特性存在的存量走此补段。
 * @param {string} mdPath verify-result.md 路径
 * @param {{ applicable: boolean, tasks: Array }} probe7 runVerifyProbes 返回的 probe7
 * @returns {{ added: boolean, reason?: string }}
 */
export function ensureAcceptanceMatrixSection(mdPath, probe7) {
  let text
  try { text = readFileSync(mdPath, 'utf8') } catch { return { added: false, reason: 'verify-result.md 不存在或不可读' } }
  const normalized = text.replace(/\r\n/g, '\n')
  if (/^#### 探针 7[：:]/m.test(normalized)) return { added: false, reason: '探针 7 段已在场' }
  const p7 = probe7 && typeof probe7 === 'object' ? probe7 : { applicable: false, tasks: [] }
  if (!p7.applicable) return { added: false, reason: '不适用（无 TaskCard）' }
  const blockLines = [...renderProbe7Lines(p7), '']
  try {
    const lines = normalized.split('\n')
    const p3Idx = lines.findIndex(l => /^#### 探针 3[：:]/.test(l))
    if (p3Idx === -1) {
      writeFileSync(mdPath, normalized.replace(/\n?$/, '\n') + '\n' + blockLines.join('\n'))
    } else {
      // 探针 3 小节终点 = 下一个任意级别标题行（与 verify-postcheck extractProbeSubsections 同口径）
      let end = lines.length
      for (let i = p3Idx + 1; i < lines.length; i++) {
        if (/^#{1,6}\s/.test(lines[i])) { end = i; break }
      }
      lines.splice(end, 0, ...blockLines)
      writeFileSync(mdPath, lines.join('\n'))
    }
  } catch (e) {
    console.warn(`⚠️ 探针 7 矩阵段补齐落盘失败（fail-soft，不阻断）: ${e && e.message ? e.message : e}`)
    return { added: false, reason: '落盘失败' }
  }
  return { added: true }
}

/**
 * 接口验证覆盖矩阵段幂等补齐（task-04；ensureAcceptanceMatrixSection 先例形态）：verify-
 * result.md 已存在但缺「## 接口验证覆盖矩阵」段时补骨架段。幂等口径（renderProbe7Lines
 * 补段同款）：段已在场（agent 已填/未填）一律不触碰——预填只在骨架生成与缺段补齐两条新写
 * 路径生效，agent 已填内容永不被覆盖；二跑零改动。插入位置：「## 探针结果」章节之后（下一
 * ## 标题前，保持骨架章节序），无探针章则文末追加（旧格式/手写正文）。
 * @param {string} mdPath verify-result.md 路径
 * @param {{endpoints?: Array<{method: string, path: string, rowIdx: number}>, declared?: number|null}|null} apiFace
 * @returns {{ added: boolean, reason?: string }}
 */
export function ensureApiCoverageMatrixSection(mdPath, apiFace) {
  let text
  try { text = readFileSync(mdPath, 'utf8') } catch { return { added: false, reason: 'verify-result.md 不存在或不可读' } }
  const normalized = text.replace(/\r\n/g, '\n')
  if (/^## 接口验证覆盖矩阵/m.test(normalized)) return { added: false, reason: '接口验证覆盖矩阵段已在场' }
  const blockLines = [...renderApiCoverageMatrixLines(apiFace), '']
  try {
    const lines = normalized.split('\n')
    const probeIdx = lines.findIndex(l => /^## 探针结果/.test(l))
    if (probeIdx === -1) {
      writeFileSync(mdPath, normalized.replace(/\n?$/, '\n') + '\n' + blockLines.join('\n'))
    } else {
      // 探针结果章终点 = 下一个 ## 级标题行（矩阵段紧随其后，与骨架章节序一致）
      let end = lines.length
      for (let i = probeIdx + 1; i < lines.length; i++) {
        if (/^## /.test(lines[i])) { end = i; break }
      }
      lines.splice(end, 0, ...blockLines)
      writeFileSync(mdPath, lines.join('\n'))
    }
  } catch (e) {
    console.warn(`⚠️ 接口验证覆盖矩阵段补齐落盘失败（fail-soft，不阻断）: ${e && e.message ? e.message : e}`)
    return { added: false, reason: '落盘失败' }
  }
  return { added: true }
}

// ============ smoke 回执槽机器段（2026-09-17-api-coverage-smoke task-02 / FR-03，design §3） ============
//
// 唯一事实源 = .runtime/verify-quality-scan-<change>.json 的 smokeResult 段（task-01 契约，
// R-06 双源兜底——md 被篡改不影响 facts 推导）；本组函数把该记录 ensure 式渲染成
// verify-result.md「## 集成验证回执」槽内 CLI 拥有的机器段行（source: cli-noai-smoke 标注
// 识别），agent 只可追加段、不可改写机器段（改写/删除由 verify-postcheck
// checkProbeConsistency 回执槽一致性对比打回，Grill #6 / R-06）。
/** 机器段行首锚（ensure 幂等识别——claim 钦定文案；单行管道与多行 YAML 双形态首行均命中。
 *  注意不可用 \b 锚中文词尾：CJK 不属 \w，「亲跑」后与「 |」之间无 word 边界恒 false（实证
 *  幂等失效重复注入）——改前瞻断言（后随管道分隔或行尾）。 */
const SMOKE_MACHINE_CLAIM_RE = /^- claim: commands\.smoke CLI 亲跑(?=\s*[|｜]|$)/
/** 缺态注释行（态捕获 m[1]，not-configured / not-ran 两态——非回执行形态，parseEvidenceSlots 不收取） */
const SMOKE_ABSENT_LINE_RE = /^<!--\s*smoke 机器段缺态：(not-configured|not-ran)\b[^>]*source: cli-noai-smoke[^>]*-->$/

/**
 * 读 quality-scan 记录的 smokeResult 段（路径规则同 judgeIntegrationRan：specBase/
 * .runtime/verify-quality-scan-<changeName>.json）。共享读取点——ensure 注入与 postcheck
 * 一致性对比同源取数，不各读各的。记录缺失/损坏/无 smokeResult 段 → null。
 */
export function readSmokeResultRecord(specBase, changeName) {
  try {
    const rec = JSON.parse(readFileSync(join(specBase, '.runtime', `verify-quality-scan-${changeName}.json`), 'utf8'))
    if (rec && rec.schemaVersion === 1 && rec.source === 'cli-noai'
      && rec.smokeResult && typeof rec.smokeResult === 'object') {
      return rec.smokeResult
    }
  } catch { /* 记录缺失/损坏 → null */ }
  return null
}

/**
 * 由 smokeResult 记录推导机器段目标态（ensure 与 postcheck 共享口径，不二算）：
 * 'passed'（configured 且亲跑绿）| 'not-configured'（未配置）| 'not-ran'（配置但
 * failed/超时——task-01 契约 timeout 归 status='failed'）。
 */
export function deriveSmokeSectionState(smoke) {
  if (!smoke || typeof smoke !== 'object') return null
  if (smoke.configured === false) return 'not-configured'
  return smoke.status === 'passed' ? 'passed' : 'not-ran'
}

/**
 * facts.smokeRan 判定（2026-09-17-api-coverage-smoke task-03 / FR-02 / D-002@v1）：
 * 唯一事实源 = quality-scan 记录 smokeResult 段（readSmokeResultRecord 共享读取点，R-06
 * 双源兜底——不受 verify-result.md 篡改影响；judgeIntegrationRan 同款自读先例：specBase/
 * changeName 自 factsPath 目录上推，不依赖调用方传参）。五边界态封闭：
 *   configured=false（未配置键 / commands.smoke: unavailable / local.yaml 不可读）→
 *     not-configured；status='passed'（exit 0）→ ran；status='failed'（exit 非 0/超时——
 *     task-01 契约 timeout 归 failed，失败也是未通过）→ not-ran；记录在场但无 smokeResult
 *     段（升级过渡期存量记录）→ not-ran + fail-open 注记；记录缺失/损坏 → not-ran +
 *     fail-open 注记（X-01 口径，不阻断——出路=重跑质量扫描步或降级 NOTES）。
 * @param {string} factsPath verify-facts.json 路径（<specBase>/changes/<name>/verify-facts.json）
 * @returns {{ value: 'ran'|'not-ran'|'not-configured', notes: string[] }}
 */
function judgeSmokeRan(factsPath) {
  const changeDir = dirname(factsPath)
  const changeName = basename(changeDir)
  const specBase = dirname(dirname(changeDir))
  const recordPath = join(specBase, '.runtime', `verify-quality-scan-${changeName}.json`)
  const smoke = readSmokeResultRecord(specBase, changeName)
  if (smoke) {
    if (smoke.configured === false) return { value: 'not-configured', notes: [] }
    return { value: smoke.status === 'passed' ? 'ran' : 'not-ran', notes: [] }
  }
  // readSmokeResultRecord null 两缺因区分注记：记录在场但无 smokeResult 段（升级过渡期
  // 存量记录）vs 记录缺失/损坏——同判 not-ran，注记各自点名（X-01 fail-open，不阻断）。
  let recordPresent = false
  try {
    const rec = JSON.parse(readFileSync(recordPath, 'utf8'))
    if (rec && rec.schemaVersion === 1 && rec.source === 'cli-noai') recordPresent = true
  } catch { recordPresent = false }
  return {
    value: 'not-ran',
    notes: [recordPresent
      ? `ℹ️ quality-scan 记录在场但无 smokeResult 段（${recordPath}，升级过渡期存量记录）——facts.smokeRan 按 not-ran 判定（X-01 fail-open 注记，不阻断；出路=重跑质量扫描步或降级 NOTES）`
      : `ℹ️ quality-scan 实测记录缺失（${recordPath}）——facts.smokeRan 按 not-ran 判定（X-01 fail-open 注记，不阻断；--done 亲测替代扫描的场景记录时序不可得，出路=重跑质量扫描步或降级 NOTES）`],
  }
}

/**
 * 扫描 verify-result.md 回执槽内 CLI 拥有的 smoke 机器段标记（ensure 幂等判定与
 * verify-postcheck 一致性对比共享解析点）：①机器段回执条目 = parseEvidenceSlots 收取且
 * source='cli-noai-smoke' 的条目（含 agent 冒充行——冒充也是打回面）；②缺态注释行态。
 * @param {string} mdText verify-result.md 全文（CRLF 归一内部处理）
 * @returns {{ machineEntries: Array<{claim,command,exitCode,logPath,source}>, absentState: 'not-configured'|'not-ran'|null }}
 */
export function scanSmokeReceiptSection(mdText) {
  const text = String(mdText || '').replace(/\r\n/g, '\n')
  let machineEntries = []
  try {
    machineEntries = (parseEvidenceSlots(text).runtimeEvidence || [])
      .filter(e => e && e.source === SMOKE_RECEIPT_SOURCE_MARK)
  } catch { machineEntries = [] }
  let absentState = null
  for (const line of text.split('\n')) {
    const am = line.match(SMOKE_ABSENT_LINE_RE)
    if (am) { absentState = am[1]; break }
  }
  return { machineEntries, absentState }
}

/**
 * 回执槽 smoke 机器段 ensure 式注入（ensureAcceptanceMatrixSection 先例形态，task-02）：
 * 挂 backfill 合并时点（backfillFactsFromMdAndTests——quality-scan step 6 noAI 亲跑落记录
 * 先于 verify 门禁，读得到实录）。行为：记录态 passed → 段内注入机器段行（单行管道形态，
 * command 含 ｜/| 时降多行 YAML 防字段截断）+ 说明注释行；not-configured / not-ran →
 * 注缺态注释行；无记录 → no-op（不注入，task-03 判 not-ran）。幂等——段内已有同态 CLI 行
 * 零改动；态迁移（如配置后亲跑：not-configured → passed）时替换 CLI 拥有行为新态。
 * read-modify-write 基于盘上 md 最新态（不基于调用方快照写回，防覆盖多 agent 并发改动）。
 * @param {string} mdPath verify-result.md 路径
 * @param {{ specBase?: string, changeName?: string }} [opts] 缺省自 mdPath 目录上推（judgeIntegrationRan 同款）
 * @returns {{ changed: boolean, state?: string, reason?: string }}
 */
export function ensureSmokeReceiptSection(mdPath, opts = {}) {
  const changeDir = dirname(String(mdPath || ''))
  const changeName = opts.changeName || basename(changeDir)
  const specBase = opts.specBase || dirname(dirname(changeDir))
  let text
  try { text = readFileSync(mdPath, 'utf8') } catch { return { changed: false, reason: 'verify-result.md 不存在或不可读' } }
  const smoke = readSmokeResultRecord(specBase, changeName)
  const state = deriveSmokeSectionState(smoke)
  if (!state) return { changed: false, reason: '无 quality-scan smokeResult 记录（未跑质量扫描）——不注入机器段' }
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const hIdx = lines.findIndex(l => l.startsWith(RECEIPT_SLOT_HEADING))
  if (hIdx === -1) return { changed: false, reason: `回执槽段（${RECEIPT_SLOT_HEADING}）不在场——backfillMissingEvidenceSlots 先补段，下次 ensure 注入` }
  // 段终点（parseEvidenceSlots sectionOf 同口径：下一 #/## 级标题或文末）
  let end = lines.length
  for (let i = hIdx + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) { end = i; break }
  }
  let machineIdx = -1 // 机器段行（单行形态行或多行形态首行）
  let absentIdx = -1 // 缺态注释行
  for (let i = hIdx + 1; i < end; i++) {
    if (machineIdx === -1 && SMOKE_MACHINE_CLAIM_RE.test(lines[i])) machineIdx = i
    if (absentIdx === -1 && SMOKE_ABSENT_LINE_RE.test(lines[i])) absentIdx = i
  }
  // 目标行渲染（passed 双形态：command 含 ｜/| 时单行管道形态会字段截断 → 降多行 YAML 形态；
  // exitCode/logPath 非法空值如实渲染——收取侧 fail-closed 不收，postcheck 对比兜底）
  let targetLines
  if (state === 'passed') {
    const command = String(smoke.command || '')
    const exitVal = typeof smoke.exitCode === 'number' ? smoke.exitCode : ''
    const noteLine = `<!-- smoke 机器段（CLI ensure 注入，source: ${SMOKE_RECEIPT_SOURCE_MARK}）——唯一事实源是 .runtime/verify-quality-scan-${changeName}.json 的 smokeResult，agent 不可改写/删除（verify 一致性抽查会打回）；ranAt 实录：${smoke.ranAt || '未知'}，durationMs：${typeof smoke.durationMs === 'number' ? smoke.durationMs : '未知'} -->`
    targetLines = /[|｜]/.test(command)
      ? [
        noteLine,
        '- claim: commands.smoke CLI 亲跑',
        `  command: ${command}`,
        `  exit: ${exitVal}`,
        `  log: ${smoke.logPath || ''}`,
        `  source: ${SMOKE_RECEIPT_SOURCE_MARK}`,
      ]
      : [
        noteLine,
        `- claim: commands.smoke CLI 亲跑 | command: ${command} | exit: ${exitVal} | log: ${smoke.logPath || ''} | source: ${SMOKE_RECEIPT_SOURCE_MARK}`,
      ]
  } else {
    const absentNote = state === 'not-configured'
      ? 'commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段'
      : `commands.smoke 已配置但未绿跑（${smoke.reason || '失败/超时'}）——修复后重跑 verify 亲测自动更新本段`
    targetLines = [`<!-- smoke 机器段缺态：${state}（${absentNote}）source: ${SMOKE_RECEIPT_SOURCE_MARK} -->`]
  }
  // 幂等/态迁移：同态 CLI 行在场 → no-op；异态（含旧缺态行 / 机器段行）→ 原位替换；缺 → 段内末尾注入
  const inPlaceIdx = machineIdx !== -1 ? machineIdx : absentIdx
  if (state === 'passed' && machineIdx !== -1) return { changed: false, state, reason: '机器段已在场（幂等跳过）' }
  if (state !== 'passed' && absentIdx !== -1) {
    const am = lines[absentIdx].match(SMOKE_ABSENT_LINE_RE)
    if (am && am[1] === state) return { changed: false, state, reason: `缺态标注已在场（${state}，幂等跳过）` }
  }
  try {
    if (inPlaceIdx !== -1) {
      // 原位替换（CLI 拥有行的态迁移；机器段行 1 行 ↔ 缺态行 1 行，多行 YAML 形态首行替换为整块）
      let replaceEnd = inPlaceIdx + 1
      if (SMOKE_MACHINE_CLAIM_RE.test(lines[inPlaceIdx]) && state !== 'passed') {
        // 旧机器段是多行 YAML 形态时连带其缩进续行一并替换
        while (replaceEnd < end && /^[ \t]+\w/.test(lines[replaceEnd])) replaceEnd++
      }
      lines.splice(inPlaceIdx, replaceEnd - inPlaceIdx, ...targetLines)
    } else {
      // 段内末尾注入（最后一个非空行之后）
      let last = end - 1
      while (last > hIdx && lines[last].trim() === '') last--
      lines.splice(last + 1, 0, ...targetLines)
    }
    writeFileSync(mdPath, lines.join('\n'))
  } catch (e) {
    console.warn(`⚠️ smoke 机器段 ensure 落盘失败（fail-soft，不阻断）: ${e && e.message ? e.message : e}`)
    return { changed: false, state, reason: '落盘失败' }
  }
  return { changed: true, state }
}

/**
 * 结论草稿槽行预填（P0-1 前置三，noai-ir-roadmap §3）：机械事实全绿时把骨架「结论枚举：」
 * 待填槽替换为 PASS 草稿——显式「草稿待确认」内联标注（非默认值语义），agent 复核后可改写；
 * gate 对槽行的独立复核逻辑不经本函数（判定链不动，预填只省打字成本）。纯文本变换三态：
 * 槽行未填（仍含「待填」）→ 改写；已填（任何枚举值）→ 原样返回；无槽行（legacy 存量）→
 * 原样返回。改写后槽行满足 extractVerifyConclusionSlot 行首锚定枚举解析（返回 PASS）。
 */
export function applyConclusionDraftToText(text, draft = 'PASS') {
  const normalized = String(text).replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (/^结论枚举：/.test(lines[i]) && lines[i].includes('待填')) {
      lines[i] = `结论枚举：${draft}（🤖 CLI 草稿待确认——机械事实全绿自动预填：noAI 实测通过 + 探针 1/3/5/6 干净 + 风险门非 integration/deployment；复核后不同意即改写本行枚举值，gate 独立复核不受预填影响）`
      return lines.join('\n')
    }
  }
  return text
}

/**
 * 决策追踪矩阵机械半边（P0-1，noai-ir-roadmap §3）：D→FR→task 链自结构化字段构建——
 * decisions.md 条目（parseDecisions 双格式解析，与 distill 同源单一实现）× tasks/task-NN.md
 * frontmatter 的 decision_ids / requirement_ids（taskcard 9 硬校验字段，CLI 骨架写入——比
 * tasks.md 行内注解可靠）。Evidence / 状态两列是人工判断置 <待填>；D 无 task 回指 →
 * ⚠️ 未闭环显式列出（这正是矩阵要暴露的风险，不静默）。
 * @returns {{ rows: string[], decisionCount: number, taskCount: number }|null}
 *   null = 无 decisions.md / 解析 0 条（矩阵段留 TODO 不注入） probe1-noqa
 */
export function buildDecisionChainMatrix(changeDir) {
  let decisions
  try {
    decisions = parseDecisions(changeDir)
  } catch {
    return null
  }
  if (!decisions || decisions.missing || (decisions.entries || []).length === 0) return null
  // task 卡 frontmatter 结构化字段反查（列表 [a, b] 形态；frontmatter 由 plan-postcheck 硬校验）
  const taskRefs = []
  const tasksDir = join(changeDir, 'tasks')
  try {
    if (existsSync(tasksDir)) {
      for (const f of readdirSync(tasksDir).filter((f) => /^task-\d+\.md$/.test(f)).sort()) {
        const raw = readFileSync(join(tasksDir, f), 'utf8')
        const id = (raw.match(/^id:\s*(\S+)/m) || [])[1] || f.replace(/\.md$/, '')
        const decLine = (raw.match(/^decision_ids:\s*\[([^\]]*)\]/m) || [])[1] || ''
        const reqLine = (raw.match(/^requirement_ids:\s*\[([^\]]*)\]/m) || [])[1] || ''
        // token 剥首尾成对引号：流式数组的引号写法（['D-001@v1']）是合法 YAML 且 agent Edit 填值
        // 主流形态，只 trim 不剥会让引号卡与 decisions.md 裸 id 永不相等（矩阵静默全量 ⚠️）
        const stripQuotes = (s) => s.trim().replace(/^['"](.*)['"]$/, '$1').trim()
        taskRefs.push({
          task: id,
          decisions: new Set(decLine.split(',').map(stripQuotes).filter(Boolean)),
          reqs: new Set(reqLine.split(',').map(stripQuotes).filter(Boolean)),
        })
      }
    }
  } catch { /* tasks 目录不可读 → 矩阵 task 列全标未闭环（信息仍在） */ }
  const rows = []
  for (const d of decisions.entries) {
    // task 卡 decision_ids 可能写 D-001（无 @vN）——id 与 number 双匹配同源
    const hitTasks = taskRefs.filter((t) => t.decisions.has(d.id) || t.decisions.has(d.number))
    const frs = [...new Set(hitTasks.flatMap((t) => [...t.reqs]))].sort()
    const taskCell = hitTasks.length > 0 ? hitTasks.map((t) => t.task).join('、') : '⚠️ 未闭环（无 task 回指）'
    const frCell = frs.length > 0 ? frs.join('、') : '⚠️ 未映射'
    rows.push(`| ${d.id} | ${frCell} | ${taskCell} | <待填：证据回指> | <待填> |`)
  }
  return { rows, decisionCount: decisions.entries.length, taskCount: taskRefs.length }
}

/**
 * 矩阵机械半边注入 verify-result.md（--init 接线）：只在「决策追踪矩阵」段内仍是骨架
 * TODO 行（含 D-xxx 形态）且段内无既有表格时替换注入——幂等（agent 已写/前次注入零改动）， probe1-noqa
 * 不触碰正文其余部分。落盘失败 fail-soft 返回 null。
 * @returns {{ decisions: number, tasks: number }|null} null = 无 decisions/无可替换 TODO/已注入 probe1-noqa
 */
export function injectDecisionChainDraft(mdPath, changeDir) {
  let text
  try { text = readFileSync(mdPath, 'utf8') } catch { return null }
  const headingIdx = text.indexOf('## 决策追踪矩阵')
  if (headingIdx === -1) return null
  const nextHeading = text.indexOf('\n## ', headingIdx + 1)
  const sectionEnd = nextHeading === -1 ? text.length : nextHeading
  const section = text.slice(headingIdx, sectionEnd)
  if (/^\|/m.test(section)) return null // 已有表格 → 尊重既有内容
  const todoRe = /<!--TODO:[^\n]*D-xxx[^\n]*-->/ /* probe1-noqa */
  if (!todoRe.test(section)) return null // 无骨架 TODO（手写正文）→ 不动 /* probe1-noqa */
  const matrix = buildDecisionChainMatrix(changeDir)
  if (!matrix || matrix.rows.length === 0) return null
  const block = [
    '<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；',
    '     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->',
    '| 决策 ID | FR | Task | Evidence | 状态 |',
    '|---|---|---|---|---|',
    ...matrix.rows,
  ].join('\n')
  const next = text.slice(0, headingIdx) + section.replace(todoRe, block) + text.slice(sectionEnd)
  try {
    writeFileSync(mdPath, next)
  } catch (e) {
    console.warn(`⚠️ 决策追踪矩阵预填落盘失败（fail-soft）: ${e && e.message ? e.message : e}`)
    return null
  }
  return { decisions: matrix.decisionCount, tasks: matrix.taskCount }
}

/**
 * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。 probe1-noqa
 * 结论走「结论枚举：」固定槽行（刀③，2026-09-08）——占位符不含枚举词（<待填：三选一>），
 * 槽未填 → extractVerifyConclusionSlot 返回 '' → gate 判不过（fail-closed；旧占位符
 * `<待填：PASS 或 FAIL>` 含 PASS 字样会被窗口正则误读成已填 PASS，已修）。
 * 章节标题行末尾带 claims 层标注（P3b）：探针结果=可复跑探针 / 测试结果=确定性检查 / 其余=
 * 人工判断——纯渲染层后缀，不新增行；结论解析槽优先于标题关键词窗口（存量兼容）。
 * @returns {string|null} 骨架全文；无 design.md/tasks.md（非完整流程变更）→ null
 */
export function generateVerifyResultSkeleton(result) {
  const L = [
    '# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）',
    '',
    '> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。',
    '',
    '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——', /* probe1-noqa */
    '> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。',
    '>',
    '> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、',
    '> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。',
    '',
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`<待填：三选一>`（把尖括号占位整体替换为 PASS / PASS WITH NOTES / FAIL 之一；一句话理由写在枚举后同行或下一行）',
    '',
    '## 移交项（结构化） [层：人工判断——CLI 清单核验]',
    '<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->',
    '<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->',
    '| 类型 | 条目 | 复跑/验收条件 |',
    '|---|---|---|',
    '| <待填：env-blocked / manual-acceptance / db-script / other> | <待填：移交条目> | <待填：复跑/验收条件> |',
    '',
    '## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]',
    '<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->',
    '- task-NN: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）',
    '',
    '## 集成验证回执 [层：自述声明——CLI 一致性校验]',
    '<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->',
    '<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；',
    '     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->',
    '- claim: <待填：一句话>',
    '  command: <待填：命令>',
    '  exit: <待填：0 或非 0>',
    '  log: <待填：日志路径>',
    '',
    '## 任务完成度 [层：人工判断]',
    '<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->', /* probe1-noqa */
    '',
    '## 设计一致性 [层：人工判断]',
    '<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->', /* probe1-noqa */
    '',
    '## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]',
    renderVerifyProbesReport(result),
    '',
    // 接口验证覆盖矩阵段（task-04 / FR-05）：紧随探针结果章（probe7 矩阵渲染面之后的独立
    // ## 章节）；result 无 apiFace 键（存量调用方/合成 result）→ 空面渲染「无接口面」注记，零回归。
    ...renderApiCoverageMatrixLines(result.apiFace),
    '',
    '## 测试结果 [层：确定性检查——CLI 实测对账]',
    '<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->', /* probe1-noqa */
    '',
    '## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]',
    '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->', /* probe1-noqa */
    '',
    '## 技术债务 [层：人工判断]',
    '<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->', /* probe1-noqa */
    '',
    '## 变更风险等级 [层：人工判断]',
    '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」+ 理由；若有命中被同句否定语境抑制（如「不新增 daemon 协议」），写明被抑制关键词与理由（抑制可审计，不许用来静默降级）-->', /* probe1-noqa */
    '',
    '## Runtime Evidence [层：人工判断]',
    '<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->', /* probe1-noqa */
    '<!-- 降级路径（design §3.2，D-004 收口）：服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及 -->',
    '',
    '## 代码审查 [层：人工判断]',
    '<!--TODO: 问题列表 + 总体评价。走查清单（零覆盖路径必查——探针 7 ⚠️ 条目即定向面）：', /* probe1-noqa */
    '     ① 编辑/更新链路（回显、字段映射、残留态）——非新增主链路，实证盲区；',
    '     ② 非主分支流（相关方/旁路支线等未走查路径）；',
    '     ③ 守卫一致性：同资源端点的操作人/权限校验模式对比（实证 doSubmit 无操作人校验而 delete/withdraw 有——越权）；',
    '     ④ 载荷字段契约（探针 8 ⚠️ 配对逐条核实）；',
    '     ⑤ 分页/并发/事务原子性（无测试基建端的纯逻辑面）-->',
    '',
    '## 独立复核（可选回流槽） [层：人工判断——复核后追加]',
    '<!-- verify 完成后的深度复核（独立子代理/二次审查）结论回流至此：缺陷分级（P1 功能不可用 / P2 需求子项 / P3 建议修）+ 修复证据链 + 对「结论枚举」的影响改写。无复核时本节写「无」或删除。复核结论不再只活在聊天记录（2026-09-16 EHS 二次复核实证：5 个 P1 只有聊天可查，变更档案仍写 PASS WITH NOTES）。 -->',
    '',
  ]
  return L.join('\n')
}
