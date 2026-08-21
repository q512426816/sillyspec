/**
 * sillyspec taskcard — 生成 Windows 安全的 TaskCard 骨架
 *
 * 背景：plan postcheck 任务卡被拒的根因集中在「LLM 子代理手写 frontmatter 不可靠」——
 * CRLF 行尾、漏闭合 ---、缺 constraints 等硬校验字段（校验侧已对 CRLF 容错，但闭合/字段
 * 缺失仍拦）。本命令从源头消灭这类格式错误：骨架由 CLI 用 writeFileSync 直写（字符串
 * 只含 \n，天然 LF），frontmatter 闭合与硬校验 9 字段由代码保证，子代理只需 Edit 填充
 * 占位符，不再手写整卡。
 *
 * 任务编号/标题从 plan.md checkbox 行自动带出（与 plan.js parseTaskNames 同源，
 * 保编号不跳号、名称与 plan.md 一致）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { git } from './git-helper.js'
import { assertSafeChangeName, resolveSpecDir } from './run/shared.js'
import { parseTaskNames, readTaskRegistryContent } from './stages/plan.js'
import { parseTaskRegistry } from './stages/execute.js'

/**
 * 任务号归一：接受 task-01 / task-1 / 01 / 1，统一为 task-NN（两位补零，与任务卡文件名一致）。
 * @param {string} raw
 * @returns {string} 形如 task-01
 */
export function normalizeTaskId(raw) {
  const s = String(raw || '').trim()
  const m = s.match(/^(?:task-)?(\d+)$/i)
  if (!m) {
    throw new Error(`任务号格式非法: "${s}"（应为 task-NN 或 NN，可逗号分隔多个）`)
  }
  return `task-${String(m[1]).padStart(2, '0')}`
}

/**
 * YAML 标量安全序列化（坑 taskcard-title-backtick-yaml，2026-08-20 实证）：plan checkbox 行名
 * 是自由文本，带反引号（如 "`-p` 参数支持"）时裸插值进 frontmatter——`` ` `` 与 @ 是 YAML 保留
 * 指示符，js-yaml 直接抛错，契约字段（allowed_paths/constraints 等）随整个 frontmatter 静默丢失，
 * 靠 plan postcheck 才兜住。统一单引号包裹 + 内部 ' 双写（YAML 标准转义），无边界字符要判。
 * @param {string} v
 * @returns {string}
 */
function yamlScalar(v) {
  const s = String(v ?? '')
  return `'${s.replace(/'/g, "''")}'`
}

/**
 * 生成 TaskCard 骨架字符串（纯函数）。
 *
 * 硬校验 9 字段（plan-postcheck feasibility）+ 规范字段全部就位，占位符由子代理 Edit 填充；
 * 可选字段（provides/expects_from/related_tests）默认不生成——缩小 YAML 出错面，何时加的
 * 判据写在文件尾注释（规则详情见 templates/prompts/taskcard-rules.md）。
 * 字符串只含 \n：writeFileSync 直写不经任何行尾转换，Windows 下天然 LF 安全。
 * title/title_zh/author 经 yamlScalar 转义（自由文本防 YAML 指示符炸解析）。
 *
 * @param {{ taskId: string, title: string, titleZh: string, author: string, now: string,
 *           dependsOn?: string[], sets?: Record<string,string> }} p
 *   dependsOn：tasks.md 行内注解反填（坑 taskcard-design-field-conflicts，2026-08-21 实证）——
 *     "(depends_on: task-01,02)" 注解由 CLI 解析进 frontmatter，省主代理逐卡裁决
 *   sets：--set key=value 覆盖（yamlScalar 转义；仅覆盖已存在的标量键，防注入任意结构）
 * @returns {string}
 */
export function buildTaskcardSkeleton({ taskId, title, titleZh, author, now, dependsOn = [], sets = {} }) {
  const fm = {
    id: taskId,
    title: yamlScalar(title),
    title_zh: yamlScalar(titleZh),
    author: yamlScalar(author),
    created_at: now,
    priority: 'P0',
    depends_on: (Array.isArray(dependsOn) && dependsOn.length > 0)
      ? `[${dependsOn.map(d => `'${d}'`).join(', ')}]`
      : '[]',
    blocks: '[]',
    requirement_ids: '[FR-XX]',
    decision_ids: '[D-XXX@vN]',
  }
  // --set 覆盖（白名单键 + yamlScalar 转义值；depends_on 数组形态单独拼不进标量 map，跳过）
  const SETTABLE_KEYS = new Set(['id', 'title', 'title_zh', 'author', 'priority', 'created_at', 'requirement_ids', 'decision_ids', 'blocks', 'goal'])
  for (const [k, v] of Object.entries(sets || {})) {
    if (SETTABLE_KEYS.has(k)) fm[k] = yamlScalar(v)
  }
  return `---
id: ${fm.id}
title: ${fm.title}
title_zh: ${fm.title_zh}
author: ${fm.author}
created_at: ${fm.created_at}
priority: ${fm.priority}
depends_on: ${fm.depends_on}
blocks: ${fm.blocks}
requirement_ids: ${fm.requirement_ids}
decision_ids: ${fm.decision_ids}
allowed_paths:
  - src/example/file.ts
goal: >
  一句话说明这个 task 要做什么、为什么。
implementation:
  - 具体步骤 1
  - 具体步骤 2
acceptance:
  - 可验证的验收条件 1
  - 可验证的验收条件 2
verify:
  - cd frontend && pnpm exec tsc --noEmit
constraints:
  - 边界约束 1（如：不加测试）
  - 边界约束 2（如：不修改传入参数）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
`
}

/**
 * taskcard 命令主逻辑：定位变更目录 → 解析任务清单（--task 显式列表 / 'all' 从 plan.md 取）→
 * 逐个写骨架。
 *
 * @param {string} changeName 变更名（.sillyspec/changes/ 下目录名）
 * @param {{ cwd: string, specDir?: string|null, taskIds: string[]|'all', title?: string|null,
 *           titleZh?: string|null, force?: boolean }} opts
 *   taskIds：normalizeTaskId 归一后的数组；或字面 'all' 表示从 plan.md 取全部 checkbox 任务
 * @returns {{ created: string[], skipped: string[], tasksDir: string }}
 */
export function cmdTaskcard(changeName, opts = {}) {
  const { cwd, specDir = null, taskIds, title = null, titleZh = null, force = false, sets = {} } = opts
  assertSafeChangeName(changeName, '变更名')

  const changeDir = join(resolveSpecDir(cwd, { specDir }), 'changes', changeName)
  if (!existsSync(changeDir)) {
    throw new Error(`变更目录不存在: ${changeDir}（先完成 plan 前置步骤，或检查 --change 名）`)
  }

  // 任务注册表 tasks.md（2026-08-20-task-truth-unify 唯一真相；CRLF 归一后解析，
  // --all 时强依赖）。tasks.md 缺失回退 plan.md（旧归档变更兼容读侧）。
  // parseTaskRegistry（坑 taskcard-design-field-conflicts，2026-08-21）：除编号/标题外还带出
  // 行内注解（[model:xxx] / (depends_on: task-01,02)）——depends_on 直接反填进骨架 frontmatter。
  let registry = []
  const tasksMdPath = join(changeDir, 'tasks.md')
  const planPath = join(changeDir, 'plan.md')
  const registryPath = existsSync(tasksMdPath) ? tasksMdPath : planPath
  if (existsSync(registryPath)) {
    const registryContent = readFileSync(registryPath, 'utf8').replace(/\r\n/g, '\n')
    registry = parseTaskRegistry(registryContent)
  }

  let ids
  if (taskIds === 'all') {
    if (registry.length === 0) {
      throw new Error(
        `--all 需要 tasks.md 中存在 checkbox 任务行（格式 "- [ ] task-XX: 任务名"）` +
        (existsSync(registryPath) ? '，当前任务清单未解析到任何任务行' : '，且变更目录下未找到 tasks.md/plan.md')
      )
    }
    ids = registry.map(t => t.id)
  } else if (Array.isArray(taskIds) && taskIds.length > 0) {
    ids = taskIds
  } else {
    throw new Error('缺少任务清单：需 --task task-01[,task-02...] 或 --all')
  }

  // 标题优先级：--title/--title-zh 参数 > plan.md checkbox 行名称 > 占位符。
  // 参数仅单任务时可用（多任务各卡标题不同，统一参数必错）。
  if ((title || titleZh) && ids.length > 1) {
    throw new Error('--title/--title-zh 仅在 --task 指定单个任务时可用（多任务标题自动取自 plan.md checkbox 行）')
  }

  const author = (() => {
    try {
      // QUAL-01 收口：原 execSync 字符串拼接（经 shell，违反自家注入规约）→ git-helper 数组形式
      return git(cwd, ['config', 'user.name']) || 'unknown'
    } catch {
      return 'unknown'
    }
  })()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const tasksDir = join(changeDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })

  const created = []
  const skipped = []
  for (const id of ids) {
    const reg = registry.find(t => t.id === id)
    const finalTitle = title || (reg ? reg.name : null) || `${id} fill-english-title`
    const finalTitleZh = titleZh || (reg ? reg.name : null) || finalTitle
    const filePath = join(tasksDir, `${id}.md`)
    if (existsSync(filePath) && !force) {
      skipped.push(filePath)
      continue
    }
    writeFileSync(filePath, buildTaskcardSkeleton({
      taskId: id, title: finalTitle, titleZh: finalTitleZh, author, now,
      // depends_on 从 tasks.md 行内注解反填（坑 taskcard-design-field-conflicts）：注册表
      // 注解与 plan/design 的依赖声明同源，骨架直接带上省主代理逐卡转录
      dependsOn: reg ? reg.dependsOn : [],
      sets,
    }), 'utf8')
    created.push(filePath)
  }
  return { created, skipped, tasksDir }
}
