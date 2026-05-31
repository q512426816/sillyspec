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

### 1. 目录结构完整性
\`\`\`bash
# 检查 .sillyspec/ 及子目录
for d in .sillyspec .sillyspec/projects .sillyspec/docs .sillyspec/changes .sillyspec/.runtime; do
  [ -d "$d" ] && echo "✅ $d" || echo "❌ $d"
done
# 检查 sillyspec.db（SQLite 权威状态源）
DB_FILE='.sillyspec/.runtime/sillyspec.db'
[ -f "$DB_FILE" ] && echo "✅ sillyspec.db 存在" || echo "❌ sillyspec.db 不存在"
sqlite3 "$DB_FILE" "SELECT count(*) FROM project" 2>/dev/null && echo "✅ sillyspec.db 可查询" || echo "⚠️ sillyspec.db 不可查询"
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
# 从 sillyspec.db 读取活跃变更并检查目录存在性
DB_FILE='.sillyspec/.runtime/sillyspec.db'
if [ ! -f "$DB_FILE" ]; then echo "⚠️ sillyspec.db 不存在"; exit 0; fi
ACTIVE_CHANGE=$(sqlite3 "$DB_FILE" "SELECT name FROM changes WHERE status='active' ORDER BY last_active DESC LIMIT 1" 2>/dev/null)
if [ -z "$ACTIVE_CHANGE" ]; then echo "ℹ️ 无当前变更"; exit 0; fi
echo "当前变更: $ACTIVE_CHANGE"
DIR=".sillyspec/changes/$ACTIVE_CHANGE"
[ -d "$DIR" ] && echo "✅ 变更目录存在: $ACTIVE_CHANGE" || echo "❌ 变更目录不存在: $ACTIVE_CHANGE"
# 检查各阶段状态
sqlite3 -header -column "$DB_FILE" "SELECT stage, status FROM stages s JOIN changes c ON s.change_id=c.id WHERE c.name='$ACTIVE_CHANGE' ORDER BY s.stage" 2>/dev/null || echo "⚠️ 无法查询阶段数据"
\`\`\`

### 4. 孤儿文件检查
\`\`\`bash
DB_FILE='.sillyspec/.runtime/sillyspec.db'
if [ ! -f "$DB_FILE" ]; then echo "⚠️ sillyspec.db 不存在"; exit 0; fi
node -e "
const fs = require('fs');
const dir = '.sillyspec/changes';
if (!fs.existsSync(dir)) { console.log('ℹ️ changes/ 目录不存在'); process.exit(0); }
const subs = fs.readdirSync(dir).filter(f => fs.statSync(dir+'/'+f).isDirectory());
if (subs.length === 0) { console.log('ℹ️ 无变更目录'); process.exit(0); }
const { execSync } = require('child_process');
let known;
try { const rows = execSync('sqlite3 -json \".sillyspec/.runtime/sillyspec.db\" \"SELECT name FROM changes WHERE status=\\\"active\\\"\"', {encoding:'utf8'}).trim(); known = new Set(JSON.parse(rows).map(r => r.name)); } catch { known = new Set(); }
subs.forEach(s => {
  console.log(known.has(s) ? '✅ ' + s + ' — 已关联' : '⚠️ ' + s + ' — 孤儿目录（可清理）');
});
"
\`\`\`

### 5. 配置文件检查
\`\`\`bash
# 检查 local.yaml 和 STACK.md
for f in .sillyspec/projects/*.yaml; do
  [ -f "$f" ] || continue
  name=$(grep '^name:' "$f" | head -1 | sed 's/^name:[[:space:]]*//')
  p=$(grep '^path:' "$f" | head -1 | sed 's/^path:[[:space:]]*//')
  [ -z "$p" ] && continue
  local_yaml="$p/.sillyspec/local.yaml"
  stack_md="$p/.sillyspec/STACK.md"
  [ -f "$local_yaml" ] && echo "✅ local.yaml ($name)" || echo "⚠️ local.yaml ($name) — 不存在"
  if [ -f "$local_yaml" ]; then
    grep -q 'build:' "$local_yaml" && echo "  ✅ build 命令已配置" || echo "  ⚠️ 缺少 build 命令"
    grep -q 'test:' "$local_yaml" && echo "  ✅ test 命令已配置" || echo "  ⚠️ 缺少 test 命令"
  fi
  [ -f "$stack_md" ] && echo "✅ STACK.md ($name)" || echo "⚠️ STACK.md ($name) — 不存在"
done
\`\`\`

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
[ -f "$PROJECT_DIR/.sillyspec/STACK.md" ] && cat "$PROJECT_DIR/.sillyspec/STACK.md" | head -30
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
      name: '汇总报告',
      prompt: `汇总前三步的所有检查结果，生成最终的自检报告。

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
- 缺少 local.yaml → \`sillyspec init\` 重新生成，或手动创建
- local.yaml 缺少 build/test → 补充对应命令
- 缺少 STACK.md → \`sillyspec run scan\` 重新扫描
- sillyspec.db 状态不一致 → \`sillyspec run <阶段> --reset\` 重置对应阶段
- 孤儿目录 → 确认后 \`rm -rf .sillyspec/changes/<目录名>\`
- Maven 私服不可达 → 检查 VPN、settings.xml 配置、私服状态
- Git remote 不可达 → 检查网络、SSH key 或凭证
- 工具未安装 → 给出安装命令（如 \`brew install maven\`）

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
