// SillySpec Doctor — 项目自检阶段
// 检查项通过 prompt 中的 bash 命令执行，此文件仅定义步骤结构


export const definition = {
  name: 'doctor',
  title: '项目自检',
  description: '检查 SillySpec 配置、构建环境和外部依赖',
  auxiliary: true,
  steps: [
    {
      name: 'SillySpec 内部检查',
      prompt: `运行 SillySpec 内部检查。逐项执行以下命令并汇总结果：

> ✅ Windows 兼容（SS-1，2026-08-20）：db 查询已全部改走 node:sqlite（node≥22.13 内置），不再依赖外部 sqlite3 CLI。若 node 脚本失败，改用 sillyspec 自身命令替代——sillyspec progress show 查看当前变更与各阶段状态，sillyspec doctor --json 查看 db 健康与活跃变更列表。

### 1. 目录结构完整性
\`\`\`bash
# 检查 .sillyspec/ 及子目录
for d in .sillyspec .sillyspec/projects .sillyspec/docs .sillyspec/changes .sillyspec/.runtime; do
  [ -d "$d" ] && echo "✅ $d" || echo "❌ $d"
done
# 检查 sillyspec.db（SQLite 权威状态源）
DB_FILE='.sillyspec/.runtime/sillyspec.db'
[ -f "$DB_FILE" ] && echo "✅ sillyspec.db 存在" || echo "❌ sillyspec.db 不存在"
# 用 sillyspec 自身命令验证 db 可读（fallback 不依赖外部 sqlite3 CLI，兼容 Windows）
sqlite3 "$DB_FILE" "SELECT count(*) FROM project" 2>/dev/null && echo "✅ sillyspec.db 可查询" || (sillyspec progress show >/dev/null 2>&1 && echo "✅ sillyspec.db 可查询（经 sillyspec 命令）" || echo "⚠️ sillyspec.db 不可查询")
\`\`\`

### 2. 项目配置检查
\`\`\`bash
ls .sillyspec/projects/*.yaml 2>/dev/null
# 对每个 yaml 文件，检查 name 和 path 字段，验证 path 存在
for f in .sillyspec/projects/*.yaml; do
  [ -f "$f" ] || continue
  name=$(grep '^name:' "$f" | head -1 | sed 's/^name:[[:space:]]*//')
  p=$(grep '^path:' "$f" | head -1 | sed 's/^path:[[:space:]]*//')
  [ -z "$name" ] && echo "⚠️ $(basename $f) — 缺少 name"
  [ -z "$p" ] && echo "⚠️ $(basename $f) — 缺少 path"
  [ -n "$p" ] && [ ! -d "$p" ] && echo "❌ $(basename $f) — path 不存在: $p"
  [ -n "$name" ] && [ -n "$p" ] && [ -d "$p" ] && echo "✅ $(basename $f) — $name ($p)"
done
\`\`\`

### 3. 进度数据一致性
\`\`\`bash
# 从 sillyspec.db 读取活跃变更并检查目录存在性（node:sqlite 主路径，Windows 无 sqlite3 CLI）
DB_FILE='.sillyspec/.runtime/sillyspec.db'
if [ ! -f "$DB_FILE" ]; then echo "⚠️ sillyspec.db 不存在"; exit 0; fi
node --input-type=module -e "
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
const db = new DatabaseSync(process.argv[1], { readOnly: true });
const row = db.prepare(\\"SELECT name FROM changes WHERE status='active' ORDER BY last_active DESC LIMIT 1\\").get();
if (!row) { console.log('ℹ️ 无当前变更'); process.exit(0); }
console.log('当前变更: ' + row.name);
const dir = '.sillyspec/changes/' + row.name;
console.log(existsSync(dir) ? '✅ 变更目录存在: ' + row.name : '❌ 变更目录不存在: ' + row.name);
const stages = db.prepare('SELECT s.stage AS stage, s.status AS status FROM stages s JOIN changes c ON s.change_id=c.id WHERE c.name=? ORDER BY s.stage').all(row.name);
if (stages.length === 0) console.log('⚠️ 无阶段数据'); else for (const s of stages) console.log('  ' + s.stage + ': ' + s.status);
db.close();
" "$DB_FILE" 2>/dev/null || echo "⚠️ 无法查询阶段数据"
\`\`\`

### 4. 孤儿文件检查
\`\`\`bash
DB_FILE='.sillyspec/.runtime/sillyspec.db'
if [ ! -f "$DB_FILE" ]; then echo "⚠️ sillyspec.db 不存在"; exit 0; fi
node -e "
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const dir = '.sillyspec/changes';
const subs = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => { try { return fs.statSync(dir+'/'+f).isDirectory() && f !== 'archive'; } catch { return false; } }) : [];
let known;
try { const db = new DatabaseSync('.sillyspec/.runtime/sillyspec.db', { readOnly: true }); known = new Set(db.prepare(\"SELECT name FROM changes WHERE status='active'\").all().map(r => r.name)); db.close(); } catch (e) { console.log('⚠️ db 读取失败: ' + e.message + '（跳过孤儿判定，不做任何清理建议）'); known = null; }
// known 为 null（db 不可读）时只列目录不判定孤儿，后续僵尸检查同样跳过——不守卫会 TypeError 半途崩
if (known) subs.forEach(s => {
  console.log(known.has(s) ? '✅ ' + s + ' — 已关联' : '⚠️ ' + s + ' — 孤儿目录（先 dump 取证再手工归位，勿直接 rm）');
});
// 反向检查（multi-agent-review Q1）：DB active 且匹配 quick-<hex> 但无目录 → 僵尸 quick 会话
// （quick 收尾未注销，active 行累积污染 listChanges/doctor）。新代码已修收尾，此项清理历史残留。
const QUICK_RE = /^quick-[0-9a-f]{8}$/;
const zombieQuick = known ? [...known].filter(n => QUICK_RE.test(n) && !subs.includes(n)) : [];
if (zombieQuick.length > 0) {
  console.log('⚠️ 检测到 ' + zombieQuick.length + ' 个僵尸 quick 会话（DB active 但无目录）:');
  zombieQuick.forEach(n => console.log('   - ' + n));
}
"
\`\`\`

### 5. 配置文件检查
\`\`\`bash
# 检查 local.yaml 和 scan 总览文档
for f in .sillyspec/projects/*.yaml; do
  [ -f "$f" ] || continue
  name=$(grep '^name:' "$f" | head -1 | sed 's/^name:[[:space:]]*//')
  p=$(grep '^path:' "$f" | head -1 | sed 's/^path:[[:space:]]*//')
  [ -z "$p" ] && continue
  local_yaml="$p/.sillyspec/local.yaml"
  arch_md=".sillyspec/docs/$name/scan/ARCHITECTURE.md"
  [ -f "$local_yaml" ] && echo "✅ local.yaml ($name)" || echo "⚠️ local.yaml ($name) — 不存在"
  if [ -f "$local_yaml" ]; then
    grep -q 'test:' "$local_yaml" && echo "  ✅ test 命令已配置" || echo "  ⚠️ 缺少 test 命令"
  fi
  [ -f "$arch_md" ] && echo "✅ scan/ARCHITECTURE.md ($name)" || echo "⚠️ scan/ARCHITECTURE.md ($name) — 不存在（运行 sillyspec run scan）"
done
\`\`\`

### 6. Worktree 隔离环境检查
\`\`\`bash
# 检测当前目录是否在 submodule 中
SUPERPROJECT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
if [ -n "$SUPERPROJECT" ]; then
  echo "⚠️ 当前目录在 git submodule 内，worktree 隔离不可用"
else
  echo "✅ 不在 submodule 中"
fi

# 检测是否已在 linked worktree 中
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
if [ "$GIT_DIR" != "$GIT_COMMON" ] && [ -z "$SUPERPROJECT" ]; then
  echo "✅ 已在 linked worktree 中"
else
  echo "ℹ️ 在主仓库中（非 worktree）"
fi

# 检查 worktree 存储目录是否被 .gitignore 忽略
WT_DIR='.sillyspec/.runtime/worktrees'
if git check-ignore -q "$WT_DIR" 2>/dev/null; then
  echo "✅ worktree 目录已被 .gitignore 忽略 ($WT_DIR)"
else
  echo "❌ worktree 目录未被 .gitignore 忽略 ($WT_DIR) — worktree 创建将被阻断"
  echo "   修复: 在 .gitignore 中添加 $WT_DIR/"
fi

# 检查 DB 中的 isolation 状态
DB_FILE='.sillyspec/.runtime/sillyspec.db'
if [ -f "$DB_FILE" ]; then
  echo ""
  echo "isolation 状态（来自 sillyspec.db）:"
  node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(process.argv[1], { readOnly: true });
const rows = db.prepare(\"SELECT name, isolation_status AS status, isolation_mode AS mode, isolation_reason AS reason FROM changes WHERE status='active'\").all();
for (const r of rows) console.log('  ' + r.name + ' | ' + r.status + ' | ' + r.mode + ' | ' + (r.reason || ''));
db.close();
" "$DB_FILE" 2>/dev/null || echo "⚠️ 查询 isolation 失败"
else
  echo ""
  echo "ℹ️ sillyspec.db 不存在（尚未初始化）"
fi
\`\`\`\n
### 输出
汇总所有检查结果，按以下格式：
\`\`\`
## SillySpec 内部
✅/⚠️/❌ 各项状态
\`\`\`

### 注意
- 不要编造路径或结果，严格基于命令输出
- 如果 .sillyspec/ 不存在，直接输出 ❌ 并跳过后续检查`,
      outputHint: 'SillySpec 内部检查结果',
      optional: false
    },
    {
      name: '构建环境检查',
      prompt: `检查项目构建环境。先探测项目使用的构建工具，再逐项检查可用性。

### 1. 探测构建工具
\`\`\`bash
# 确定项目路径（使用 sillyspec.db 中的项目路径或当前目录）
PROJECT_DIR=$(sqlite3 -json '.sillyspec/.runtime/sillyspec.db' "SELECT name FROM project WHERE id=1" 2>/dev/null | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.length>0&&r[0].name?r[0].name:'.')" 2>/dev/null || node -e "
const fs=require('fs');
try{const files=fs.readdirSync('.sillyspec/projects').filter(f=>f.endsWith('.yaml'));
if(files.length>0){const c=fs.readFileSync('.sillyspec/projects/'+files[0],'utf8');const m=c.match(/^path:\\s*(.+)/m);console.log(m?m[1].trim():'.')}else console.log('.')
}catch{console.log('.')}
" 2>/dev/null)
echo "项目目录: $PROJECT_DIR"

# 探测构建工具
for f in pom.xml build.gradle package.json requirements.txt pyproject.toml go.mod Cargo.toml; do
  [ -f "$PROJECT_DIR/$f" ] && echo "检测到: $f"
done
cat .sillyspec/docs/*/scan/ARCHITECTURE.md 2>/dev/null | head -30 || echo "（无 scan/ARCHITECTURE.md）"
\`\`\`

### 2. 构建工具可用性
根据上面检测到的工具，运行对应检查（未检测到的跳过）：

**Maven 项目：**
\`\`\`bash
timeout 10 mvn -v 2>/dev/null | head -1 && echo "✅ Maven 可用" || echo "❌ Maven 不可用"
[ -f ~/.m2/settings.xml ] && echo "✅ Maven settings.xml 存在" || echo "⚠️ Maven settings.xml 不存在"
timeout 10 java -version 2>&1 | head -1
\`\`\`

**Gradle 项目：**
\`\`\`bash
timeout 10 gradle -v 2>/dev/null | head -1 && echo "✅ Gradle 可用" || echo "❌ Gradle 不可用"
\`\`\`

**Node.js 项目：**
\`\`\`bash
timeout 5 node -v 2>/dev/null && echo "✅ Node.js 可用" || echo "❌ Node.js 不可用"
timeout 5 npm -v 2>/dev/null && echo "✅ npm 可用" || echo "❌ npm 不可用"
timeout 5 pnpm -v 2>/dev/null && echo "✅ pnpm 可用" || echo "ℹ️ pnpm 未安装"
# 检查 registry
npm config get registry 2>/dev/null
\`\`\`

**Python 项目：**
\`\`\`bash
timeout 5 python3 --version 2>/dev/null && echo "✅ Python3 可用" || echo "❌ Python3 不可用"
timeout 5 pip3 --version 2>/dev/null && echo "✅ pip3 可用" || echo "❌ pip3 不可用"
\`\`\`

### 3. Maven 私服检查（仅 Maven 项目）
\`\`\`bash
# 从 settings.xml 提取仓库地址
if [ -f ~/.m2/settings.xml ]; then
  grep -oP 'https?://[^<"]+:[0-9]+' ~/.m2/settings.xml 2>/dev/null | sort -u | while read url; do
    timeout 5 curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null
    echo " — $url"
  done
fi
# 从 pom.xml 提取
if [ -f "$PROJECT_DIR/pom.xml" ]; then
  grep -oP 'https?://[^<"]+:[0-9]+' "$PROJECT_DIR/pom.xml" 2>/dev/null | sort -u | while read url; do
    code=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    [ "$code" = "000" ] && echo "❌ 私服不可达: $url（超时）" || echo "✅ 私服可达 ($code): $url"
  done
fi
\`\`\`

### 4. 运行时环境
\`\`\`bash
timeout 5 node -v 2>/dev/null && echo "Node.js: $(node -v)" || echo "❌ Node.js 未安装"
timeout 5 git --version 2>/dev/null && echo "Git: $(git --version)" || echo "❌ Git 未安装"
timeout 10 git remote -v 2>/dev/null | head -2
timeout 5 git ls-remote --heads origin 2>/dev/null >/dev/null && echo "✅ Git remote 可达" || echo "⚠️ Git remote 不可达"
timeout 5 java -version 2>&1 | head -1
timeout 5 python3 --version 2>/dev/null
\`\`\`

### 输出
汇总所有检查结果：
\`\`\`
## 构建环境
✅/⚠️/❌ 各项状态
\`\`\`

### 注意
- 未检测到的构建工具直接跳过，不要报错
- timeout 超时的命令视为不可用
- 不编造结果`,
      outputHint: '构建环境检查结果',
      optional: false
    },
    {
      name: '外部依赖检查',
      prompt: `检查外部依赖工具是否可用。

### 1. Context7 MCP
\`\`\`bash
# 检查 MCP 配置
for f in ~/.config/claude/claude_desktop_config.json ~/.cursor/mcp.json ~/.openclaw/mcp.json; do
  [ -f "$f" ] && echo "MCP 配置文件: $f" && grep -i context7 "$f" 2>/dev/null && echo "✅ Context7 已配置" || true
done
# 也检查 sillyspec 自身的 setup
node -e "
try{const m=require(require('path').join(require('os').homedir(),'.sillyspec','config.json'));console.log('✅ sillyspec config 存在')}catch{console.log('ℹ️ 无 sillyspec 全局配置')}
" 2>/dev/null
\`\`\`

### 2. grep.app
\`\`\`bash
timeout 5 curl -s -o /dev/null -w "%{http_code}" https://grep.app 2>/dev/null | grep -q "200" && echo "✅ grep.app 可达" || echo "⚠️ grep.app 不可达"
\`\`\`

### 3. 其他 AI 工具（可选）
\`\`\`bash
# 检查常用 AI/开发工具
timeout 5 which gh 2>/dev/null && echo "✅ GitHub CLI 可用" || echo "ℹ️ GitHub CLI 未安装"
timeout 5 which docker 2>/dev/null && echo "✅ Docker 可用" || echo "ℹ️ Docker 未安装"
\`\`\`

### 输出
\`\`\`
## 外部依赖
✅/⚠️/❌ 各项状态
\`\`\`

### 注意
- 不编造结果
- 工具未安装用 ℹ️ 标记（非错误），不可达用 ⚠️`,
      outputHint: '外部依赖检查结果',
      optional: false
    },
    {
      name: '模块文档健康检查',
      prompt: `检查模块索引和卡片文档的健康状态。

### 操作
1. 运行 \`sillyspec modules status\` 查看模块索引概览
2. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`
3. 对每个模块，检查：
   - module_id 是否有对应的卡片文件（modules/<module-id>.md）
   - 卡片文件是否有有效的 frontmatter（schema_version, doc_type, module_id）
   - 人工备注标记是否配对（MANUAL_NOTES_START 和 MANUAL_NOTES_END 必须成对出现）
   - needs_review 为 true 的模块列表
4. 汇总结果

### 输出格式
\`\`\`
📋 模块文档健康检查
✅ _module-map.yaml — 存在，N 个模块
⚠️  auth-service — needs_review=true，原因：...
❌ payment-service — 卡片文件缺失
✅ 所有模块人工备注标记配对正常
\`\`\`

### 注意
- 如果 _module-map.yaml 不存在，输出"模块索引未生成，建议运行 scan"
`,
      outputHint: '模块文档健康状态',
      optional: false
    },
    {
      name: '决策待复核检查',
      prompt: `检查决策知识库（knowledge/decisions/）的待复核状态（advisory，不阻断）。

### 操作
运行 docs-check 决策规则族（锚点存在性 + behind 阈值复核，task: 2026-08-23-adopt-harness-practices）：

\`\`\`bash
# 定位 sillyspec 源码根：sillyspec 本仓 dogfood 优先用仓内源码（全局安装版本可能落后于本检查项）；
# 其余场景经 bin 符号链接解析到安装包根；均不可得时降级跳过
SRC_ROOT=""
if grep -q '"name": *"sillyspec"' package.json 2>/dev/null && [ -f "src/docs-check.js" ]; then
  SRC_ROOT="$PWD"
else
  BIN=$(command -v sillyspec)
  if [ -n "$BIN" ]; then
    SRC_ROOT=$(node -e 'const fs=require("fs");const p=fs.realpathSync(process.argv[1]).replace(/\\\\/g,"/");const i=p.lastIndexOf("/bin/sillyspec.js");console.log(i===-1?"":p.slice(0,i));' "$BIN")
  fi
fi
if [ -z "$SRC_ROOT" ]; then
  echo "ℹ️ 无法定位 sillyspec 源码（非 sillyspec 仓且未安装 sillyspec 命令），跳过决策待复核检查"
else
  node --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
let specBase = process.argv[2];
if (existsSync(".sillyspec-platform.json")) {
  try { const p = JSON.parse(readFileSync(".sillyspec-platform.json", "utf8")); if (p.specRoot) specBase = p.specRoot; } catch {}
}
const mod = await import(pathToFileURL(process.argv[1] + "/docs-check.js"));
const r = await mod.runDecisionRules({ projectRoot: process.cwd(), specBase: specBase });
if (r.empty) {
  console.log("ℹ️ 决策库未初始化（" + specBase + "/knowledge/decisions/ 不存在）——冷启动空库，变更归档时 decision-distill 自动积累（R-02）");
} else if (r.findings.length === 0) {
  console.log("✅ 决策待复核：无信号（" + r.implemented + "/" + r.entries + " 条 implemented，behind 阈值 " + r.threshold + "）");
} else {
  console.log("⚠️ 决策待复核清单（" + r.findings.length + " 条，advisory 不阻断——D-003）:");
  for (const f of r.findings) console.log("   - " + f.message);
}
if (r.exempted.length > 0) console.log("ℹ️ 另有 " + r.exempted.length + " 条经 known_failures decisions.* 键豁免: " + r.exempted.map(e => e.key).join(", "));
' "$SRC_ROOT/src" "$PWD/.sillyspec" || echo "⚠️ 决策规则执行失败（降级跳过，不影响其他检查项）"
fi
\`\`\`

同步骤追加 CLI 版本漂移检测（D-002 并入既有检查段不新增步骤；D-004 git/version 双轨；advisory 不阻断）——检测全局安装的 sillyspec 流程引擎与当前仓源码是否脱节：

\`\`\`bash
# 安装根独立解析：command -v sillyspec → realpath → 向上找 name=sillyspec 的 package.json
# 勿复用上方 SRC_ROOT——sillyspec 仓场景它被 dogfood 分支强制指向当前仓，比较恒等（Grill 实证陷阱）
node --input-type=module -e '
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";

const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: "utf8", timeout: 8000, stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch { return ""; } };
const pkgOf = (dir) => { try { return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")); } catch { return null; } };
const short = (h) => h.slice(0, 7);

try {
  const cur = pkgOf(process.cwd());
  if (!cur || cur.name !== "sillyspec") process.exit(0); // 当前仓非 sillyspec（消费项目）→ 静默跳过
  const bin = run("sh", ["-c", "command -v sillyspec"]);
  if (!bin) process.exit(0); // 无全局安装 → 静默跳过
  let installRoot = "";
  try {
    let dir = dirname(realpathSync(bin));
    for (;;) {
      const p = pkgOf(dir);
      if (p && p.name === "sillyspec") { installRoot = dir; break; }
      const up = dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  } catch {}
  if (!installRoot) { console.log("⚠️ CLI 版本漂移检测降级：sillyspec 命令存在但未定位到安装根（" + bin + "），跳过比较，不阻断其余检查项"); process.exit(0); }
  if (installRoot === process.cwd()) process.exit(0); // 安装根=当前仓（npm link 自身）→ 恒等不误报

  // 双轨比较（D-004）：
  // git 轨——安装根有 .git（开发态：npm link / file: 链接）→ rev-parse HEAD 双仓 + remote origin 归一化同源判定
  // version 兜底轨——安装根无 .git（安装态：registry 安装 / npm i -g . 拷贝，npm 恒排除 .git）→ 比较双仓 package.json version
  // 盲区声明（R-04）：同 version 不同 commit 的源码热改不检测——version 轨只在版本号变更时感知；
  // git 轨管开发态、version 轨管安装态，两轨并集覆盖主流形态
  const inst = pkgOf(installRoot) || {};
  const curVer = cur.version || "?";
  const instVer = inst.version || "?";
  const warn = (detail) => console.log("⚠️ CLI 版本漂移：" + detail + "——全局安装的流程引擎与当前仓源码脱节，归档等流程行为可能滞后（2026-08-23 归档实证踩坑：五步版 archive 驱动六步定义，旧引擎驱动新定义），建议同步（安装根 git pull 或在 sillyspec 仓 npm i -g .）后重跑流程（advisory，不阻断）");

  if (existsSync(join(installRoot, ".git"))) {
    // remote 归一化：https/ssh 归一、.git 后缀剥离、host 小写——同源才可比较（异源 fork 无从判定 → 静默）
    const normRemote = (u) => {
      if (!u) return "";
      let s = u.trim();
      if (s.indexOf("://") === -1) {
        const scp = s.match(/^([^@\\/]+@)([^:\\/]+):(.+)$/); // scp 形态 git@host:owner/repo.git
        if (scp) s = "https://" + scp[2] + "/" + scp[3];
      }
      s = s.replace(/^ssh:\\/\\//, "https://").replace(/^git:\\/\\//, "https://");
      const m = s.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\\/\\/(.*)$/);
      const rest = m ? m[1] : s;
      const slash = rest.indexOf("/");
      let host = slash === -1 ? rest : rest.slice(0, slash);
      const tail = slash === -1 ? "" : rest.slice(slash);
      const at = host.indexOf("@");
      if (at !== -1) host = host.slice(at + 1); // 剥 userinfo（ssh://git@… / https://token@…）
      let out = "https://" + host.toLowerCase() + tail;
      out = out.replace(/\\/+$/, "");
      if (out.endsWith(".git")) out = out.slice(0, -4);
      return out;
    };
    const curHead = run("git", ["-C", process.cwd(), "rev-parse", "HEAD"]);
    const instHead = run("git", ["-C", installRoot, "rev-parse", "HEAD"]);
    if (!curHead || !instHead) { console.log("⚠️ CLI 版本漂移检测降级：git 轨 rev-parse 失败（当前仓=" + (curHead ? "ok" : "fail") + " 安装根=" + (instHead ? "ok" : "fail") + "），跳过比较，不阻断其余检查项"); process.exit(0); }
    const curRemote = normRemote(run("git", ["-C", process.cwd(), "remote", "get-url", "origin"]));
    const instRemote = normRemote(run("git", ["-C", installRoot, "remote", "get-url", "origin"]));
    if (curRemote && instRemote && curRemote !== instRemote) process.exit(0); // 非同源 → 静默
    if (curHead !== instHead) warn("全局安装 " + installRoot + "（version " + instVer + " / commit " + short(instHead) + "）与当前仓（version " + curVer + " / HEAD " + short(curHead) + "）不一致");
    // 同 commit → 一致静默
  } else if (instVer !== curVer) {
    warn("全局安装 " + installRoot + "（version " + instVer + "）与当前仓（version " + curVer + "）不一致（安装根无 .git，走 version 兜底轨）");
    // 同 version → 一致静默（同 version 不同 commit 热改盲区见上方 R-04 注释）
  }
} catch (e) {
  console.log("⚠️ CLI 版本漂移检测降级：" + (e && e.message ? e.message : String(e)) + "（不阻断其余检查项）");
}
' || echo "⚠️ CLI 版本漂移检测降级：脚本执行失败（不阻断其余检查项）"
\`\`\`

### 输出格式
\`\`\`
📋 决策待复核
✅ 决策待复核：无信号（3/5 条 implemented，behind 阈值 10）
⚠️ 决策待复核清单（1 条，advisory 不阻断——D-003）:
   - 「D-012@v1」决策待复核：锚定模块 docs-consistency 在最近确认 a1b2c3d 后源码已前进 15 commit，超阈值 10
ℹ️ 决策库未初始化 —— 冷启动空库（R-02）

⚠️ CLI 版本漂移：全局安装 /path/to/sillyspec（version 3.26.0 / commit a1b2c3d）与当前仓（version 3.27.3 / HEAD e4f5a6b）不一致——全局安装的流程引擎与当前仓源码脱节，建议同步后重跑流程（仅漂移时输出；一致/非 sillyspec 仓/无全局安装/安装根=当前仓均静默）
\`\`\`

### 注意
- 本检查项为 advisory（只 ⚠️ 不 ❌），不作为修复阻断项
- 待复核的复核再确认由用户完成：确认决策仍成立后，把条目「最近确认」更新为当前 HEAD——不要自动改写
- 全程只读，不修改 knowledge/decisions/ 下任何文件
- CLI 版本漂移检测（同步骤追加段，D-002/D-004）同为 advisory：漂移时一行警告；一致、非 sillyspec 仓消费场景、无全局安装、安装根=当前仓（npm link 自身）均静默；探测失败降级单行，不阻断其余检查项`,
      outputHint: '决策待复核清单',
      optional: false
    },
    {
      name: '汇总报告',
      prompt: `汇总前面各步的所有检查结果，生成最终的自检报告。

### 输出格式
\`\`\`
🔍 SillySpec Doctor — 项目自检报告

## SillySpec 内部
✅ .sillyspec/ 目录结构 — 正常
✅ projects/*.yaml — N 个项目已注册
⚠️  local.yaml (xxx) — 缺少 test 命令
❌ sillyspec.db 阶段状态 — brainstorm 标记完成但 design.md 不存在

## 构建环境
✅ Node.js v23.4.0 — 可用
✅ npm 10.x — 可用
✅ Java 17.0.2 — 可用
❌ Maven 私服 (10.0.0.1:8081) — 不可达（超时）

## 外部依赖
✅ Context7 MCP — 已配置
⚠️  grep.app — 不可达

## 决策待复核（advisory）
⚠️ 「D-012@v1」— 锚定模块源码 behind 15 超阈值 10（复核后更新「最近确认」）

## CLI 版本漂移（advisory）
⚠️ 全局安装 sillyspec（version 3.26.0 / commit a1b2c3d）与当前仓（version 3.27.3 / HEAD e4f5a6b）不一致 — 同步后重跑流程
\`\`\`

### 要求
- 基于前 3 步的实际输出汇总，不要编造
- 每类问题归入对应分区
- 全部通过给出 🎉
- 如果有 ❌ 或 ⚠️，在末尾逐项给出修复建议

### 修复建议模板
根据问题类型给出具体可操作的修复命令：

**常见问题及修复：**
- CLI 未安装 → \`npm install -g sillyspec\`
- 缺少 local.yaml → \`sillyspec local detect\` 重新生成，或手动创建
- local.yaml 缺少 test 命令 → 补充对应命令
- 缺少 scan 文档（ARCHITECTURE.md 等）→ \`sillyspec run scan\` 重新扫描
- sillyspec.db 状态不一致 → \`sillyspec run <阶段> --reset\` 重置对应阶段
- 孤儿目录 → 确认后 \`rm -rf .sillyspec/changes/<目录名>\`
- Maven 私服不可达 → 检查 VPN、settings.xml 配置、私服状态
- Git remote 不可达 → 检查网络、SSH key 或凭证
- CLI 版本漂移（全局安装落后于当前仓）→ 在 sillyspec 仓执行 \`npm i -g .\` 重新全局安装（或安装根 git pull），同步后重跑流程
- 工具未安装 → 给出安装命令（如 \`brew install maven\`）

**状态错乱补 postmortem（advisory，不强制）：**
若本次自检检出状态错乱或不一致（sillyspec.db 阶段状态与实际产出不符、孤儿目录、僵尸 quick 会话等）并已修复，建议补一条轻量 postmortem 记录进 QUICKLOG（走 quick 流程或既有条目正文核对），根因块内按列表行写四子字段：\`- 现象：\`（错乱表现）、\`- 根因：\`（深层原因）、\`- 护栏：\`（防再犯措施）、\`- 证据：\`（可追溯路径——\`sillyspec agent-log --json\` 输出的本地会话日志 jsonl 路径、相关变更 review.json、verify-result.md）。护栏结论经人工确认后归入 \`.sillyspec/knowledge/known-issues.md\`——走既有 knowledge 追加链路（先入 knowledge/uncategorized.md，经知识整理确认后归类），不新建链路不新建命令。

每条建议格式：
\`\`\`
💡 修复：<问题描述>
   <具体命令或操作>
\`\`\``,
      outputHint: '完整自检报告',
      optional: false
    }
  ]
}
