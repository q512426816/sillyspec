/**
 * config-validate.js — local.yaml 逐键校验器（2026-10-23-config-validate-skill）
 *
 * 用户配置哲学（2026-10-23 裁决原话）：「能不要配置的就别让用户配置，默认都集成好；实在
 * 不好配置的要生成一个技能去引导 agent 怎么填写，并且 agent 写完要 CLI 验证通过才行」。
 * 本模块是那句「CLI 验证」：sillyspec config validate 经 config-cat 权威路径链解析真实
 * local.yaml（worktree 感知），按 LOCAL_YAML_SCHEMA 单一源逐键校验——校验只消费不生产
 * （schema 注册面新增键照常跟随，无需改本模块）。
 *
 * 判级：错误（exit 1）=YAML 解析失败/顶层非映射/段非映射/枚举越界/结构性类型错（标量位
 * 收到映射或数组）/段内必填键缺失（凭据族两键齐全才生效）。警告（exit 0）=未知键（可能
 * 无效果）。info（exit 0）=deprecated 键在场/空文件。标量级宽容：YAML 标量弱型是事实
 * （fr_regress_cap: 24 解析为 number、24 引号形态为 string 同义），类型检查只拦结构性
 * 错配，标量间不再互拦（防自造摩擦——真实配置错误是嵌套错/键拼错/凭据缺半，不是 24 与
 * "24" 之别）。缺文件=零配置可用 info exit 0（69 键仅 4 凭据键真必填且仅平台用户——
 * 零配置契约锚）。
 */
import yaml from 'js-yaml'
import { readFileSync } from 'fs'
import { LOCAL_YAML_SCHEMA } from './config-schema.js'
import { resolveLocalYaml } from './config-cat.js'

/** schema 注册面索引：path→def、已知顶层键（段 id ∪ 无点 path）、含占位段的段（免未知键误报）。 */
function buildRegistry() {
  const byPath = new Map()
  const sectionIds = new Set()
  const rootScalars = new Set()
  const placeholderSections = new Set()
  for (const sec of LOCAL_YAML_SCHEMA.sections || []) {
    sectionIds.add(sec.id)
    for (const k of sec.keys || []) {
      byPath.set(k.path, k)
      if (!k.path.includes('.')) rootScalars.add(k.path)
      if (/<[^>]+>/.test(k.path)) placeholderSections.add(sec.id)
    }
  }
  return { byPath, sectionIds, knownTop: new Set([...sectionIds, ...rootScalars]), placeholderSections }
}

const kindOf = (v) => (v === null || v === undefined ? 'null' : Array.isArray(v) ? 'array' : typeof v)

/** 结构级类型检查：标量位收映射/数组=错；枚举越界=错；其余标量形态宽容（见模块头）。 */
function checkType(def, v, path, errors) {
  const kind = kindOf(v)
  if (kind === 'null') return
  const scalarSpot = ['string', 'number', 'integer', 'enum', 'boolean', 'json'].includes(def.type)
  if (scalarSpot && (kind === 'object' || kind === 'array')) {
    errors.push(`「${path}」期望${def.type === 'enum' ? `枚举（${(def.values || []).join('|')}）` : def.type}标量，实得 ${kind}——嵌套层级写错（该键是叶子值不是段）`)
    return
  }
  if (def.type === 'object' && kind !== 'object') {
    errors.push(`「${path}」期望键值映射，实得 ${kind}`)
    return
  }
  if (def.type === 'array' && kind !== 'array') {
    errors.push(`「${path}」期望列表，实得 ${kind}`)
    return
  }
  if (def.type === 'enum' && !(def.values || []).map(String).includes(String(v))) {
    errors.push(`「${path}」取值越界：${JSON.stringify(v)}（合法：${(def.values || []).join('|')}）`)
  }
}

/**
 * 校验 local.yaml 文本（纯函数）。@returns {{errors:string[], warnings:string[], infos:string[], keysChecked:number}}
 */
export function validateLocalYamlContent(text) {
  const { byPath, knownTop, placeholderSections } = buildRegistry()
  const errors = [], warnings = [], infos = []
  let doc
  try { doc = yaml.load(text) } catch (e) {
    return { errors: [`YAML 解析失败：${(e && e.message) || e}——agent 手改易犯缩进/Tab/编码错（doctor 的 local_yaml_integrity 维度查编码）`], warnings, infos, keysChecked: 0 }
  }
  if (doc == null) doc = {}
  const topKind = kindOf(doc)
  if (topKind !== 'object') {
    return { errors: [`local.yaml 顶层必须是键值映射（实得 ${topKind}）`], warnings, infos, keysChecked: 0 }
  }
  const sectionIds = new Set((LOCAL_YAML_SCHEMA.sections || []).map((s) => s.id))
  let checked = 0
  const checkDef = (def, v, path) => {
    checked++
    checkType(def, v, path, errors)
    if (def.status === 'deprecated') infos.push(`「${path}」已退役（${String(def.desc || '').slice(0, 80)}…）——新配置勿再写`)
  }
  for (const [k, v] of Object.entries(doc)) {
    if (!knownTop.has(k)) {
      warnings.push(`未知顶层键「${k}」——sillyspec config schema 可查全部已知键（未知键大概率无效果；确认拼写与层级）`)
      continue
    }
    if (sectionIds.has(k) && byPath.has(k) === false) {
      // 纯段（如 project/commands）：校验段内键。两种真实形态：键值映射（commands.lint）
      // 与列表-of-对象（review_probes 列表项字段建模为 sec.field 点路径——本仓 dogfood 实证）。
      if (v == null) continue
      const vKind = kindOf(v)
      if (vKind !== 'object' && vKind !== 'array') { errors.push(`段「${k}」必须是键值映射或列表（实得 ${vKind}）`); continue }
      const entries = vKind === 'array'
        ? (v.every((it) => kindOf(it) === 'object') ? v.flatMap((it) => Object.entries(it)) : Object.entries(v[0] || {}))
        : Object.entries(v)
      for (const [ik, iv] of entries) {
        const path = `${k}.${ik}`
        const def = byPath.get(path)
        if (!def) {
          // 占位段（modules.<name>.path 族）：子键名是用户自定义 id，注册面无法穷举——
          // 未知子键不警告（占位形态本身合法），具体叶子键校验交给占位 path 前缀匹配不到即跳过
          if (!placeholderSections.has(k)) warnings.push(`「${path}」不在注册键表（可能拼错/层级错，或新版键未同步 schema——sillyspec config schema 核对）`)
          continue
        }
        checkDef(def, iv, path)
      }
    } else {
      // 根级标量键（test_strategy/module_gate_ignore/…）
      const def = byPath.get(k)
      if (!def) { warnings.push(`键「${k}」不在注册键表`); continue }
      checkDef(def, v, k)
    }
  }
  // 段内必填闭合（required:true 键所在段在场则须齐全——mcp/platform 凭据族两键成对才生效）
  for (const sec of LOCAL_YAML_SCHEMA.sections || []) {
    if (!(sec.id in doc) || doc[sec.id] == null || kindOf(doc[sec.id]) !== 'object') continue
    for (const kd of sec.keys || []) {
      if (kd.required !== true || !kd.path.startsWith(`${sec.id}.`)) continue
      const leaf = kd.path.slice(sec.id.length + 1)
      if (!(leaf in doc[sec.id])) {
        errors.push(`段「${sec.id}」缺必填键「${leaf}」——${sec.id === 'mcp' || sec.id === 'platform' ? '凭据两键齐全才生效（缺半整段回退缺省/env）；补齐或整段删除' : '必填键'}`)
      }
    }
  }
  if (checked === 0 && errors.length === 0) infos.push('local.yaml 在场但无任何已注册键（空段/仅注释）——等于零配置形态')
  return { errors, warnings, infos, keysChecked: checked }
}

/**
 * config validate 子命令体：路径链解析（config-cat 同源，worktree 感知）→ 校验 → 人类/--json
 * 双态渲染。退出码：0=通过（可含警告/info），1=有错误；缺文件=零配置 info exit 0。
 */
export function cmdConfigValidate({ dir, specBase = null, json = false } = {}) {
  const r = resolveLocalYaml(dir, { specBase })
  if (!r.exists) {
    const payload = { file: null, exists: false, passed: true, errors: [], warnings: [], infos: ['local.yaml 不存在——零配置可用（全部键走缺省；仅平台/MCP 凭据族真必填）'], keysChecked: 0 }
    if (json) console.log(JSON.stringify(payload, null, 2))
    else console.log('✅ local.yaml 不存在——零配置可用（全部键走缺省；仅平台/MCP 凭据族真必填，需要时 sillyspec platform connect 一键写入）。\n   需要调优时：sillyspec config schema 查键 ＋ sillyspec-config 技能引导；写完跑 sillyspec config validate 验证。')
    return 0
  }
  const v = validateLocalYamlContent(readFileSync(r.path, 'utf8'))
  const passed = v.errors.length === 0
  if (json) {
    console.log(JSON.stringify({ file: r.path, exists: true, passed, ...v }, null, 2))
  } else {
    console.log(`${passed ? '✅' : '❌'} local.yaml 校验${passed ? '通过' : '未通过'}（${r.path}${r.source ? `，来源 ${r.source}` : ''}；已查 ${v.keysChecked} 个注册键）`)
    for (const e of v.errors) console.error(`   错误：${e}`)
    for (const w of v.warnings) console.warn(`   警告：${w}`)
    for (const i of v.infos) console.log(`   ℹ️ ${i}`)
    if (passed && v.warnings.length === 0 && v.errors.length === 0) console.log('   无警告无未知键。')
    if (!passed) console.error('   修复后重跑：sillyspec config validate（exit 0 才算配置完成——sillyspec-config 技能硬门）')
  }
  return passed ? 0 : 1
}

export default { validateLocalYamlContent, cmdConfigValidate }
