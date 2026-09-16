/**
 * gate-snapshot.js — quick --done test+lint 门禁的隔离快照执行（2026-09-10 驾驭小结第六批②，
 * 用户实证「lint 实测对账在主仓跑，被并行会话的脏文件拦门」）。
 *
 * 问题：门禁在主仓工作区跑 commands.test/lint——多会话共享仓里并行会话的未提交 src/test
 * 改动（语法错误/半成品/锚漂）会污染实测结果，把无辜会话的 --done 拦在门上（只能走
 * advisory 逃生口）。
 *
 * 修法：HEAD 干净快照 + 会话文件 overlay——`git worktree add --detach <tmp> HEAD` 取干净
 * 基线（并行脏文件天然不在），把本会话审计/声明的变更文件覆盖进快照，node_modules 经
 * junction 复用主仓依赖（零拷贝），local.yaml 从主仓复制（gitignore 不进 HEAD），在快照
 * cwd 跑对账。快照基建任何失败 → 返回 null，调用方回退主仓现行为（零回归兜底）。
 *
 * 快照生命周期：一次门禁一批（create → run → cleanup）；崩溃残留由 git worktree prune /
 * 临时目录自然回收（OS tmp 清理），不进主仓 .runtime。
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync, readdirSync, statSync, symlinkSync, readFileSync } from 'node:fs'
import { join, dirname, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }).trim()
}

/**
 * overlay import 冒烟多轮收敛（坑 verify-sandbox-overlay-partial-state-importerror）：
 * 单轮回退有两个盲点——①坏的是依赖文件（缺名/缺模块），报错的是 importer，回退 importer
 * 不解决问题；②一次回退后依赖关系变化。策略：最多 3 轮，每轮对未回退的 overlay .py 冒烟；
 * 失败时解析报错点名的模块名 → 若能映射到**另一个 overlay .py 文件**则回退那个依赖文件
 *（事故形态：crud.py 半成品缺名，importer 报错点名 crud → 回退 crud 的 HEAD 健版），
 * 否则回退报错文件自身（语法坏/自身缺依赖）；HEAD 无版的新文件回退不了 → warn 保留。
 */
function runOverlayImportSmoke(pythonBin, snapshotRoot, overlaidFiles) {
  const reverted = new Set()
  const byModule = new Map() // 末段模块名 → 文件（映射报错点名）
  for (const f of overlaidFiles) byModule.set(f.split('/').pop().replace(/\.py$/, ''), f)
  const revertToHead = (f, why) => {
    try {
      writeFileSync(join(snapshotRoot, f), git(snapshotRoot, ['show', `HEAD:${f}`]))
      reverted.add(f)
      console.warn(`⚠️ 快照 overlay 冒烟：${f} ${why}——已回退 HEAD 版（并行会话半成品部分态不进沙箱）`)
      return true
    } catch {
      console.warn(`⚠️ 快照 overlay 冒烟：${f} ${why}且 HEAD 无该文件（新增半成品）——保留原样，模块子集实测若红先查此文件`)
      return false
    }
  }
  for (let round = 0; round < 3; round++) {
    let acted = false
    for (const f of overlaidFiles) {
      if (reverted.has(f)) continue
      const bad = smokeImportPython(pythonBin, snapshotRoot, f)
      if (!bad) continue
      acted = true
      // 依赖归因：报错点名另一 overlay 文件 → 回退依赖（ importer 自身往往无恙）
      const named = bad.match(/(?:No module named|from)\s+['"]?([A-Za-z_][\w.]*)/i)
      const depFile = named ? byModule.get(named[1].split('.').pop()) : null
      if (depFile && depFile !== f && !reverted.has(depFile)) {
        if (revertToHead(depFile, `被 ${f} 的 import 报错点名（${bad.slice(0, 60)}）`)) continue
      }
      revertToHead(f, `import 失败（${bad.slice(0, 60)}）`)
    }
    if (!acted) return
  }
}

/**
 * 快照内寻找 python 解释器（overlay 冒烟用）：环境目录发现集里的 venv 族
 *（.venv/venv/env）在快照内已 junction——按平台拼 Scripts/bin 下的 python 路径。
 * @returns {string|null} 解释器绝对路径；找不到返回 null
 */
function findSnapshotPython(envRelDirs, snapshotRoot) {
  for (const rel of envRelDirs) {
    if (!/(^|\/)(\.?venv|env)(\/|$)/.test(rel)) continue
    const bin = process.platform === 'win32'
      ? join(snapshotRoot, rel, 'Scripts', 'python.exe')
      : join(snapshotRoot, rel, 'bin', 'python')
    if (existsSync(bin)) return bin
  }
  return null
}

/**
 * 单文件 import 冒烟：`python -c "import <mod>"`，cwd 取该文件所在包根（模块路径按
 * 目录结构推导：剥 .py、/→.、丢 __init__；相对包根 import）。非 0 退出且 stderr 命中
 * ImportError/ModuleNotFoundError/SyntaxError 才判坏（其余失败如缺第三方依赖是环境问题，
 * 不回退——回退语义只针对「部分态坏文件」）。超时 10s 防挂。
 * @returns {string|null} 失败原因（判坏时）；通过/环境性失败返回 null
 */
function smokeImportPython(pythonBin, snapshotRoot, relFile) {
  const noExt = relFile.replace(/\.py$/, '')
  const parts = noExt.split('/')
  while (parts.length > 0 && parts[parts.length - 1] === '__init__') parts.pop()
  if (parts.length === 0) return null
  // 包根推导：从深到浅尝试（backend/app/x/y.py → 先 app.x.y（cwd=backend）再 x.y（cwd=backend/app））
  for (let cut = 0; cut < parts.length; cut++) {
    const mod = parts.slice(cut).join('.')
    if (!mod || !/^[A-Za-z_][\w.]*$/.test(mod)) continue
    const pkgRoot = join(snapshotRoot, ...parts.slice(0, cut))
    const r = spawnSync(pythonBin, ['-c', `import ${mod}`], {
      cwd: pkgRoot, encoding: 'utf-8', timeout: 10_000,
    })
    if (r.status === 0) return null
    const err = String((r.stderr || '') + (r.stdout || ''))
    if (/ImportError|ModuleNotFoundError|SyntaxError|cannot import name/i.test(err)) {
      return (err.match(/(?:ImportError|ModuleNotFoundError|SyntaxError|cannot import name)[^\n]*/) || ['import 失败'])[0].slice(0, 120)
    }
    // 环境性失败（如缺第三方依赖、非模块入口冲突）→ 不判坏，继续试更浅包根
  }
  return null
}

/**
 * local.yaml `gate_snapshot:` 段 `copy:` 列表的轻量行扫描（与 verify-postcheck
 * extractLintCommand 同风格——单键定向取值，不引 js-yaml，本文件零新依赖）。
 *
 * 认块列表（缩进 `- <path>` 条目）与 inline flow（`copy: [a, b]`）两形态（对齐
 * worktree.supplyFiles 等既有数组键的「块列表或 inline flow 均可解析」约定）；空行/注释行
 * 跳过不破段；离开 gate_snapshot 段（缩进回收到段头及以下 / 新顶层键）即止。容错：值剥
 * 尾注（` #…`）与成对引号。
 * @param {string} yamlText local.yaml 原文
 * @returns {string[]} copy 条目原始值（未规整，交 applyGateSnapshotCopy 逐条规整）
 */
function _stripYamlValue(v) {
  let s = String(v).trim()
  const hash = s.indexOf(' #')
  if (hash >= 0) s = s.slice(0, hash).trim()
  if ((s.startsWith('"') && s.endsWith('"') && s.length >= 2) || (s.startsWith("'") && s.endsWith("'") && s.length >= 2)) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function parseGateSnapshotCopy(yamlText) {
  if (!yamlText) return []
  const out = []
  let inGate = false   // 位于 gate_snapshot: 段内
  let gateIndent = -1
  let inCopy = false   // 位于段内 copy: 列表内
  let copyIndent = -1
  for (const raw of String(yamlText).split(/\r?\n/)) {
    const content = raw.trim()
    if (!content || content.startsWith('#')) continue // 空行/注释行不破段
    const indent = raw.match(/^[ \t]*/)[0].length
    if (!inGate) {
      if (/^gate_snapshot:\s*(?:#.*)?$/.test(content)) { inGate = true; gateIndent = indent; inCopy = false }
      continue
    }
    if (indent <= gateIndent) { inGate = false; inCopy = false; continue } // 出段（新顶层键）
    if (!inCopy) {
      const flow = content.match(/^copy:\s*\[([^\]]*)\]/)
      if (flow) {
        for (const part of flow[1].split(',')) {
          const v = _stripYamlValue(part)
          if (v) out.push(v)
        }
        continue // inline flow 当行自洽，继续扫段内后续内容
      }
      if (/^copy:\s*(?:#.*)?$/.test(content)) { inCopy = true; copyIndent = indent }
      continue // 段内其它子键忽略
    }
    if (indent < copyIndent) { inCopy = false; continue } // 缩进回收出列表
    const item = content.match(/^-\s*(.+)$/)
    if (!item) { inCopy = false; continue } // 同层非列表行 = 列表结束
    const v = _stripYamlValue(item[1])
    if (v) out.push(v)
  }
  return out
}

/** 目录递归复制（copy 面 junction 不可用时的回退）。符号链接条目跳过（生成物目录内不追链）。 */
function copyDirRecursive(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true })
  for (const e of readdirSync(srcDir, { withFileTypes: true })) {
    const s = join(srcDir, e.name)
    const d = join(dstDir, e.name)
    if (e.isDirectory()) copyDirRecursive(s, d)
    else if (e.isFile()) copyFileSync(s, d)
  }
}

/**
 * gate_snapshot.copy 面（2026-09-16-friction5-hardening R4 / FR-04 / D-002@v1，坑
 * gate-snapshot-missing-generated-artifacts——用户 2026-09-16 驾驭小结④实证只能
 * SNAPSHOT_OFF 对照）：HEAD 快照缺 gitignored 生成物（api-types/generated 类不进 HEAD
 * 也不在会话文件集）→ 快照内 lint/test 环境性假败。按主仓 local.yaml 的 copy 清单把
 * 生成物从主仓 junction 链接进快照（失败回退复制），消除环境性假败。
 *
 * 调用契约：cwd=**主仓**根（local.yaml 从主仓读——快照内 local.yaml 是稍后复制的复制件，
 * copy 面必须先于复制生效）；在 overlay 之后调用（dst 已存在 = overlay 已覆盖本变更最新态，
 * 跳过不覆盖）。
 *
 * 逐条容错（fail-open，与本文件快照基建策略一致，任何失败不作废快照）：路径规整
 *（String、反斜杠→正斜杠、trim）；含 '..' 或绝对路径形态（POSIX / 与 Windows 盘符）拒绝
 * warn 跳过；主仓不存在 warn 跳过；junction 抛错回退递归 copy（目录）/ copyFileSync（文件）；
 * 再失败 warn 跳过。成功 ≥1 条 console.log 一行报备。未配置/空清单/读失败 → 全段空转
 * 零输出零行为（存量 local.yaml 逐字节不变）。
 *
 * ⚠️ junction 是活链接：快照内再跑生成命令会写穿到主仓该目录（constraints 明示，
 * config-schema desc 与 renderExample 注释同步警告）。
 *
 * 新增内部导出（symbol-impact：内部测试直测边界条目用；createGateSnapshot 唯一运行时消费方）。
 * @param {string} cwd 主仓根
 * @param {string} snapshotRoot 快照根
 * @returns {number} 成功链接/复制的条目数
 */
export function applyGateSnapshotCopy(cwd, snapshotRoot) {
  let entries = []
  try {
    const cfgPath = join(cwd, '.sillyspec', 'local.yaml')
    if (!existsSync(cfgPath)) return 0
    entries = parseGateSnapshotCopy(readFileSync(cfgPath, 'utf8'))
  } catch { return 0 } // 读侧容错：解析/读失败与未配置同兜底（空转，不连坐快照）
  if (!Array.isArray(entries) || entries.length === 0) return 0
  let linked = 0
  for (const raw of entries) {
    const p = String(raw).replace(/\\/g, '/').trim()
    if (!p) continue
    if (p.includes('..') || p.startsWith('/') || /^[A-Za-z]:\//.test(p)) {
      console.warn(`⚠️ gate_snapshot.copy 条目「${p}」含 .. 或绝对路径形态，拒绝（快照外写面）——跳过`)
      continue
    }
    let srcStat = null
    try { srcStat = statSync(join(cwd, p)) } catch { /* 主仓不存在，下方 warn 跳过 */ }
    if (!srcStat) {
      console.warn(`⚠️ gate_snapshot.copy 条目主仓不存在，跳过：${p}`)
      continue
    }
    const src = join(cwd, p)
    const dst = join(snapshotRoot, p)
    if (existsSync(dst)) continue // overlay 已覆盖（本变更最新态优先）
    try {
      mkdirSync(dirname(dst), { recursive: true })
      let viaLink = false
      try {
        symlinkSync(src, dst, 'junction')
        // Windows 文件 junction 可「建成但不解析」（重解析点指向非目录，symlinkSync 不抛、
        // existsSync 为假）——链接后验真，假成功回退复制（平台差异实测坑）
        viaLink = existsSync(dst)
      } catch { viaLink = false }
      if (!viaLink) {
        try { rmSync(dst, { recursive: true, force: true }) } catch { /* 假链接残留清不掉 → 下方复制报错走 warn */ }
        if (srcStat.isDirectory()) copyDirRecursive(src, dst)
        else copyFileSync(src, dst)
      }
      linked++
    } catch (e) {
      console.warn(`⚠️ gate_snapshot.copy 条目「${p}」junction/复制均失败：${e && e.message ? e.message : e}——跳过（不作废快照）`)
    }
  }
  if (linked > 0) {
    console.log(`🔬 门禁快照 copy 面：${linked} 个 gate_snapshot.copy 条目自主仓 junction/复制进快照（⚠️ junction 是活链接，快照内再跑生成命令会写穿到主仓该目录）`)
  }
  return linked
}

/**
 * 创建隔离快照：HEAD worktree + 会话文件 overlay + node_modules junction + local.yaml。
 * @param {{ cwd: string, files: string[] }} opts cwd=主仓根；files=本会话变更文件（仓库根相对 POSIX）
 * @returns {{ snapshotRoot: string, cleanup: () => void, reason?: string }|null} 失败返回 null（调用方回退主仓）
 */
export function createGateSnapshot({ cwd, files, sourceRoot = null, skipImportSmoke = false }) {
  let snapshotRoot = null
  try {
    // 前置：主仓须是 git 仓且有 HEAD（无 git 环境回退主仓现行为）
    git(cwd, ['rev-parse', 'HEAD'])

    // symlink-store 布局探测（坑 gate-snapshot-pnpm-store-break，2026-09-12 驾驭第十七批②，
    // 用户第三次踩「lint 沙箱临时目录跑 pnpm 必假败」）：pnpm/bun/lerna 的 node_modules 内部
    // 是指向 store 的符号链接网——junction 进临时目录后跨根解析失效，实测必假败。
    // 与其让沙箱报无关错误逼 advisory，不如布局命中即作废快照回退主仓（宁可主仓口径）。
    const layoutHit = detectSymlinkStoreLayout(cwd)
    if (layoutHit) {
      console.warn(`⚠️ 门禁快照对 ${layoutHit} 布局不可靠（node_modules 符号链接 store 经 junction 跨根失效，实测必假败）——跳过快照回退主仓实测；主仓失败再做污染归属鉴定`)
      return null
    }

    snapshotRoot = mkdtempSync(join(tmpdir(), 'sillyspec-gate-'))
    git(cwd, ['worktree', 'add', '--detach', '--quiet', snapshotRoot, 'HEAD'])

    // 会话文件 overlay：主仓工作区版本覆盖进快照（本会话的最新态；文件不存在=已删，跳过）。
    // sourceRoot（verify 门定向跑用，2026-09-10 驾驭小结第八批）：overlay 源切换为本变更
    // worktree 根——「--worktree 定向跑本变更分支内容」的快照实现（缺省仍是主仓 cwd）。
    // .sillyspec/ 跳过面收窄（P2-d 落地实证的快照盲区）：原一刀切跳过整个 .sillyspec/ ——
    // 会话声明的 tracked docs（module-map 补录/知识库/模块卡）进不了快照，门禁读到 HEAD
    // 旧版恒误报（src 未录 module-map 的修复在主仓生效、快照里仍然失败）。真正需要隔离的
    // 是共享运行时面：.runtime/（sqlite 锁/在途 marker）与 quicklog/（跨会话共享账本）；
    // local.yaml 由下方 cfg 段显式复制（单一来源，不经 overlay）。
    const overlayRoot = sourceRoot || cwd
    let overlaid = 0
    for (const f of files) {
      const isSillyspecRuntime = typeof f === 'string' && (f.startsWith('.sillyspec/.runtime/') || f.startsWith('.sillyspec/quicklog/') || f === '.sillyspec/local.yaml' || f === '.sillyspec/.sillyspec-platform.json')
      if (typeof f !== 'string' || f.includes('..') || f.startsWith('/') || isSillyspecRuntime) continue
      const src = join(overlayRoot, f)
      if (!existsSync(src)) continue
      const dst = join(snapshotRoot, f)
      mkdirSync(dirname(dst), { recursive: true })
      copyFileSync(src, dst)
      overlaid++
    }

    // 环境目录链接（坑 gate-snapshot-env-mismatch，2026-09-12 驾驭第十三批③，用户实证：
    // 沙箱实测 venv 不装 dev 依赖（xdist 缺失）+ node_modules 缺失——快照只链 node_modules 时
    // Python 项目的 commands.test 在快照内找不到 venv，误伤持续且难归因）。链接面扩 venv 族
    // （.venv/venv/env——链接后 dev 依赖与主仓同源，不缺 xdist）；链接失败/主仓本就没有时
    // ⚠️ 显式可见（环境不一致的门禁会持续误伤——宁可吵不可静默错）。
    // 递归依赖发现（坑 gate-snapshot-monorepo-layout，2026-09-12 驾驭第十五批①，用户实证
    // 「对 monorepo 依赖布局完全不可用，四次重试才定位」）：pnpm/nx/lerna workspace 的
    // packages/<pkg>/node_modules 子目录依赖不在根四目录——深度≤3 扫描发现集逐个 junction。
    const envRelDirs = discoverEnvDirs(cwd)
    for (const rel of envRelDirs) {
      const src = join(cwd, rel)
      const dst = join(snapshotRoot, rel)
      try {
        mkdirSync(dirname(dst), { recursive: true })
        symlinkSync(src, dst, 'junction')
      } catch (e) {
        console.warn(`⚠️ 门禁快照环境目录链接失败（${rel}）：${e && e.message ? e.message : e}——快照内实测可能因缺该目录误伤，失败时先核对快照环境`)
      }
    }
    if (envRelDirs.length === 0) {
      console.warn(`⚠️ 门禁快照：主仓未发现任何环境目录（node_modules / venv 族，含子包递归）——commands.test/lint 若依赖它们将快照/主仓都不可用（环境未安装？）`)
    }

    // 环境完整性预检（坑 gate-snapshot-env-mismatch 二阶，2026-09-12 驾驭第十四批①，用户
    // 实证「verify lint 沙箱必挂 node_modules 缺失只能 advisory」）：主仓存在某环境目录而
    // 快照内缺失（链接失败/布局差异）→ 快照对该仓 commands 是假环境，实测必挂——快照作废
    // 回退主仓现行为（主仓口径可能被并行脏文件污染，但环境真实；两害取轻 + 回退原因可见）。
    const envMissing = envDirsLinked(cwd, snapshotRoot)
    if (envMissing.length > 0) {
      console.warn(`⚠️ 门禁快照环境不完整（${envMissing.join('、')} 在主仓存在、快照内缺失）——快照作废回退主仓实测（宁可主仓口径不可假沙箱硬挂；回退后失败先做污染归属鉴定）`)
      try { git(cwd, ['worktree', 'remove', '--force', '--quiet', snapshotRoot]) } catch {}
      try { rmSync(snapshotRoot, { recursive: true, force: true }) } catch {}
      return null
    }

    // gate_snapshot.copy 面（R4 / D-002@v1，2026-09-16-friction5-hardening）：gitignored
    // 生成物从主仓 junction/复制进快照。位置=环境目录链接段之后（环境优先级最高）、
    // local.yaml 复制段之前（从主仓 cwd 读原文——快照内 local.yaml 是稍后才复制的复制件，
    // 且 copy 面必须先于复制生效）；overlay 已在上面完成（dst 已存在即跳过，本变更最新态优先）。
    // 未配置 gate_snapshot.copy → 全段空转零行为（见 applyGateSnapshotCopy jsdoc）。
    applyGateSnapshotCopy(cwd, snapshotRoot)

    // local.yaml（gitignore 不进 HEAD；门禁命令配置来源）+ package-lock 保持 HEAD 版（npm test 不装新依赖）
    for (const cfg of [join('.sillyspec', 'local.yaml')]) {
      const src = join(cwd, cfg)
      if (existsSync(src)) {
        mkdirSync(dirname(join(snapshotRoot, cfg)), { recursive: true })
        copyFileSync(src, join(snapshotRoot, cfg))
      }
    }

    // ── overlay import 闭合冒烟（坑 verify-sandbox-overlay-partial-state-importerror，
    // 2026-09-13 实证：in-place 变更的文件集含主仓未提交并行 WIP——「改了引用方没改被引用方」
    // 的部分态进快照，模块子集测试 197 ERROR 只能人工三步排查）──
    // 对 overlay 进快照的 .py 文件逐个 `python -c import`（用快照内链接的 venv 解释器）；
    // ImportError/SyntaxError → 该文件回退 HEAD 版（git show）+ warn——半成品坏文件不进沙箱，
    // HEAD 健版保证 import 图闭合。新增文件（HEAD 无版）无法回退 → 醒目 warn 保留。
    // 全链 fail-open：找不到解释器/基建异常只 warn 不作废快照（主场景是 Python 项目，
    // JS/TS 的 vitest load 冒烟成本高留后续）。
    const overlaidPyFiles = files.filter(f => typeof f === 'string' && f.endsWith('.py')
      && !f.startsWith('.sillyspec/')
      && existsSync(join(snapshotRoot, f)))
    if (overlaidPyFiles.length > 0 && !skipImportSmoke) {
      const pythonBin = findSnapshotPython(envRelDirs, snapshotRoot)
      if (pythonBin) {
        runOverlayImportSmoke(pythonBin, snapshotRoot, overlaidPyFiles)
      } else {
        console.warn(`⚠️ 快照 overlay 冒烟跳过：快照内未找到 python 解释器（venv 族未链接）——并行半成品部分态可能引发 ImportError 假红，实测红先 SNAPSHOT_OFF 对照`)
      }
    }

    const cleanup = () => {
      try { git(cwd, ['worktree', 'remove', '--force', '--quiet', snapshotRoot]) } catch {
        try { rmSync(snapshotRoot, { recursive: true, force: true }) } catch { /* 残留交 OS tmp 清理 */ }
      }
    }
    return { snapshotRoot, cleanup, overlaid }
  } catch (e) {
    // 基建失败（worktree add 拒绝/磁盘满/…）：尽力清理后回退主仓
    if (snapshotRoot) {
      try { git(cwd, ['worktree', 'remove', '--force', '--quiet', snapshotRoot]) } catch {}
      try { rmSync(snapshotRoot, { recursive: true, force: true }) } catch {}
    }
    return null
  }
}


/** symlink-store 包管理布局探测：命中即 junction 快照不可靠。返回布局名或 null。 */
export function detectSymlinkStoreLayout(cwd) {
  try {
    if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
    if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) return 'bun'
    if (existsSync(join(cwd, 'lerna.json'))) return 'lerna'
    try {
      const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
      const pm = pkg && pkg.packageManager ? String(pkg.packageManager) : ''
      if (/pnpm@/.test(pm)) return 'pnpm(packageManager)'
      if (/yarn@/.test(pm)) return 'yarn(packageManager)'
      if (/bun@/.test(pm)) return 'bun(packageManager)'
    } catch { /* 无 package.json/损坏 → 仅锁文件判据 */ }
    return null
  } catch { return null }
}

/** 环境目录名集（根与子包通用） */
const ENV_DIR_NAMES = new Set(['node_modules', '.venv', 'venv', 'env'])

/**
 * 递归依赖发现（坑 gate-snapshot-monorepo-layout）：深度 ≤3 扫描（跳过环境目录自身内部/
 * .git/dist/build/.sillyspec），返回所有环境目录的仓库根相对 POSIX 路径（含根级四目录）。
 * pnpm/nx/lerna workspace 的 packages/<pkg>/node_modules 覆盖。
 */
export function discoverEnvDirs(cwd, { maxDepth = 3 } = {}) {
  const out = []
  const skip = new Set(['.git', 'dist', 'build', '.sillyspec', 'out', 'target'])
  const walk = (dir, rel, depth) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (!e.isDirectory() || skip.has(e.name)) continue
      const childRel = rel ? rel + '/' + e.name : e.name
      if (ENV_DIR_NAMES.has(e.name)) {
        out.push(childRel)
        continue // 环境目录内部不再下钻（node_modules/node_modules 无意义且巨大）
      }
      if (depth < maxDepth) walk(join(dir, e.name), childRel, depth + 1)
    }
  }
  walk(cwd, '', 0)
  return out
}

/**
 * 环境完整性纯检（坑 gate-snapshot-env-mismatch 二阶，发现集口径）：主仓存在（递归发现）
 * 而快照缺失的环境目录清单。任一命中 = 快照对该仓 commands 是假环境，调用方作废回退主仓。
 * @returns {string[]} 缺失目录相对路径（空数组 = 完整/主仓本就无环境目录）
 */
export function envDirsLinked(cwd, snapshotRoot) {
  const missing = []
  for (const rel of discoverEnvDirs(cwd)) {
    try {
      if (existsSync(join(cwd, rel)) && !existsSync(join(snapshotRoot, rel))) missing.push(rel)
    } catch { missing.push(rel) /* 判定异常按缺失算（保守作废快照） */ }
  }
  return missing
}

/**
 * 快照内实测失败的归属提示（坑 gate-snapshot-monorepo-layout 配套：用户四次重试才从日志
 * 摸到 Temp\sillyspec-gate-* 路径——失败时路径/疑点/对照复跑出口必须直给）。
 * 调用方在「快照内执行且失败」的分支打印。
 */
export function printSnapshotFailureHint(snapInfo, { offEnv = 'SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF' } = {}) {
  if (!snapInfo || !snapInfo.snapshotRoot) return
  console.error(`   🔬 本次实测执行于隔离快照：${snapInfo.snapshotRoot}（HEAD + 本变更 ${snapInfo.changeFileCount ?? '?'} 个文件${snapInfo.sourceRoot ? '，overlay 自 worktree' : ''}）`)
  console.error(`   失败疑点排查顺序：① 本变更文件自身的真实失败（最常见）→ 修代码；② 快照环境差异（monorepo 依赖布局/环境目录链接缺失）→ 设 ${offEnv}=1 回退主仓复跑对照——主仓过而快照挂即环境问题；③ 并行污染已被快照隔离，不在疑点内。`)
}

/**
 * verify 门专用快照（2026-09-10 驾驭小结第八批，用户第二次真实阻塞：verify 实测门跑
 * main 工作区，多会话并发任何人的 WIP 都能弄红别人的门）。等价「--worktree 定向跑」：
 * overlay 文件集 = resolveVerifyChangedFiles（worktree-aware：含 merge-base 补齐与
 * working-tree），overlay 源 = 本变更 worktree 根（meta 感知；in-place 退主仓 cwd）——
 * 并行会话的在途文件物理不进快照。变更文档（changes/<name>/**，test_strategy 的
 * module-impact.md 等消费）从主仓 specBase 随快照复制。
 * @param {{ cwd: string, changeName: string, specBase: string, platformOpts?: object }} opts
 * @returns {Promise<{snapshotRoot: string, cleanup: () => void, overlaid: number, changeFileCount: number}|null>}
 */
export async function createVerifyGateSnapshot({ cwd, changeName, specBase, platformOpts = {} }) {
  try {
    const { resolveVerifyChangedFiles } = await import('../verify-postcheck.js')
    const { resolveRuntimeRoot } = await import('./shared.js')
    const { splitOwnVsForeignDiffFiles } = await import('../foreign-declared.js')
    let changeFiles = resolveVerifyChangedFiles(cwd, changeName, null, {
      specBase, includeWorkingTree: true,
    }) || []
    if (changeFiles.length === 0) return null // 无变更文件集 → 无从定向，回退主仓
    // 他者声明归属过滤（坑 verify-reconcile-foreign-wip 同款）：in-place 模式 working-tree
    // 并入后主仓全部在途文件进场——他者活跃变更显式声明的文件（quick --files / 他者 design
    // 清单）剔除，只留本变更相关面（无主文件保留，fail-closed 口径与 probe6 一致）。
    try {
      const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
      const { foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, changeFiles, { specBase, runtimeRoot })
      if (foreign.length > 0) {
        const foreignSet = new Set(foreign.map(x => x.file))
        changeFiles = changeFiles.filter(f => !foreignSet.has(f))
        if (changeFiles.length === 0) return null
      }
    } catch { /* 过滤失败退全量（fail-closed：宁可多 overlay 不漏本变更文件） */ }

    // overlay 源：worktree meta 感知（native worktree 在则从 worktree 根取「本变更分支内容」）
    let sourceRoot = null
    try {
      const { WorktreeManager } = await import('../worktree.js')
      const wm = new WorktreeManager({ cwd })
      const meta = wm.getMeta(changeName)
      if (meta && meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
        sourceRoot = meta.worktreePath
      }
    } catch { /* meta 读取失败 → 主仓 cwd 源（files 已含本变更 working-tree 改动） */ }

    const snap = createGateSnapshot({ cwd, files: changeFiles, sourceRoot })
    if (!snap) return null

    // 变更文档随快照：module-impact.md（test_strategy=evidence-auto 消费）/tasks.md 等
    // 在 .sillyspec（gitignore）不进 HEAD，从主仓 specBase 复制 changes/<name>/**
    try {
      const changeDir = join(specBase, 'changes', changeName)
      if (existsSync(changeDir)) {
        const copyDir = (srcDir, dstDir) => {
          for (const e of readdirSync(srcDir, { withFileTypes: true })) {
            const s = join(srcDir, e.name); const d = join(dstDir, e.name)
            if (e.isDirectory()) { mkdirSync(d, { recursive: true }); copyDir(s, d) }
            else { mkdirSync(dirname(d), { recursive: true }); copyFileSync(s, d) }
          }
        }
        copyDir(changeDir, join(snap.snapshotRoot, '.sillyspec', 'changes', changeName))
      }
    } catch { /* 文档复制失败不连坐快照（test_strategy 降级 module 集仍可跑） */ }

    return { ...snap, changeFileCount: changeFiles.length, sourceRoot }
  } catch {
    return null // 任一链路异常 → 回退主仓现行为
  }
}
