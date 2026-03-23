#!/bin/bash
# SillySpec 扫描预处理脚本
# 用途：在 AI 介入前完成机械性工作，节省 token + 防止上下文爆炸
# 输出：.sillyspec/codebase/SCAN-RAW.md
#
# 用法：
#   bash scripts/scan-preprocess.sh [目录]
#   bash scripts/scan-preprocess.sh api      # 只扫 api 目录

set -euo pipefail

TARGET_DIR="${1:-.}"
OUTPUT_DIR=".sillyspec/codebase"
OUTPUT_FILE="$OUTPUT_DIR/SCAN-RAW.md"

# ── 排除目录 ──

EXCLUDE_DIRS=(
  "node_modules" "dist" ".git" "vendor" "build"
  "__pycache__" ".next" "coverage" ".nuxt" "target"
  ".idea" ".vscode" ".DS_Store" "bin" "obj"
  "tmp" "temp" "logs" ".cache" "out"
)

build_exclude_args() {
  local args=()
  for d in "${EXCLUDE_DIRS[@]}"; do
    args+=(-not -path "*/$d/*" -not -path "*/$d")
  done
  echo "${args[@]}"
}

EXCLUDE_ARGS=$(build_exclude_args)

# ── 统计源文件 ──

echo "🔍 SillySpec 扫描预处理"
echo "   目标目录: $TARGET_DIR"
echo ""

# 文件类型分类
count_files() {
  local ext="$1" label="$2"
  local cmd="find \"$TARGET_DIR\" -type f -name \"*.$ext\" $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' '"
  local n=$(eval "$cmd")
  if [ "$n" -gt 0 ]; then
    echo "  $label: $n 个文件"
  fi
}

echo "📊 文件统计："
FILE_COUNT=0
TOTAL_SIZE=0

# 按语言统计
JAVA_COUNT=$(find "$TARGET_DIR" -type f -name "*.java" $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
PY_COUNT=$(find "$TARGET_DIR" -type f -name "*.py" $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
TS_COUNT=$(find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
JS_COUNT=$(find "$TARGET_DIR" -type f \( -name "*.js" -o -name "*.jsx" \) $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
GO_COUNT=$(find "$TARGET_DIR" -type f -name "*.go" $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
RB_COUNT=$(find "$TARGET_DIR" -type f -name "*.rb" $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
PHP_COUNT=$(find "$TARGET_DIR" -type f -name "*.php" $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
RS_COUNT=$(find "$TARGET_DIR" -type f -name "*.rs" $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
VUE_COUNT=$(find "$TARGET_DIR" -type f -name "*.vue" $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
SQL_COUNT=$(find "$TARGET_DIR" -type f \( -name "*.sql" -o -name "*.prisma" \) $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
YAML_COUNT=$(find "$TARGET_DIR" -type f \( -name "*.yaml" -o -name "*.yml" \) $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')
XML_COUNT=$(find "$TARGET_DIR" -type f \( -name "*.xml" \) $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')

# 配置文件
CONFIG_COUNT=$(find "$TARGET_DIR" -maxdepth 3 -type f \( -name "package.json" -o -name "pom.xml" -o -name "build.gradle" -o -name "go.mod" -o -name "requirements.txt" -o -name "Cargo.toml" -o -name "composer.json" -o -name "Gemfile" -o -name "*.csproj" \) $EXCLUDE_ARGS 2>/dev/null | wc -l | tr -d ' ')

[ "$JAVA_COUNT" -gt 0 ] && echo "  Java: $JAVA_COUNT"
[ "$PY_COUNT" -gt 0 ] && echo "  Python: $PY_COUNT"
[ "$TS_COUNT" -gt 0 ] && echo "  TypeScript: $TS_COUNT"
[ "$JS_COUNT" -gt 0 ] && echo "  JavaScript: $JS_COUNT"
[ "$GO_COUNT" -gt 0 ] && echo "  Go: $GO_COUNT"
[ "$RB_COUNT" -gt 0 ] && echo "  Ruby: $RB_COUNT"
[ "$PHP_COUNT" -gt 0 ] && echo "  PHP: $PHP_COUNT"
[ "$RS_COUNT" -gt 0 ] && echo "  Rust: $RS_COUNT"
[ "$VUE_COUNT" -gt 0 ] && echo "  Vue: $VUE_COUNT"
[ "$SQL_COUNT" -gt 0 ] && echo "  SQL/Schema: $SQL_COUNT"
[ "$XML_COUNT" -gt 0 ] && echo "  XML: $XML_COUNT"
[ "$YAML_COUNT" -gt 0 ] && echo "  YAML: $YAML_COUNT"
[ "$CONFIG_COUNT" -gt 0 ] && echo "  配置文件: $CONFIG_COUNT"

# 总计
ALL_SOURCE=$(find "$TARGET_DIR" -type f \( -name "*.java" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.go" -o -name "*.rb" -o -name "*.php" -o -name "*.rs" -o -name "*.vue" \) $EXCLUDE_ARGS 2>/dev/null)
FILE_COUNT=$(echo "$ALL_SOURCE" | wc -l | tr -d ' ')
[ -z "$FILE_COUNT" ] && FILE_COUNT=0
TOTAL_SIZE=$(echo "$ALL_SOURCE" | xargs cat 2>/dev/null | wc -c | tr -d ' ')
[ -z "$TOTAL_SIZE" ] && TOTAL_SIZE=0

TOTAL_SIZE_KB=$((TOTAL_SIZE / 1024))

echo ""
echo "  ────────────────"
echo "  源文件总计: $FILE_COUNT 个"
echo "  源码总大小: ${TOTAL_SIZE_KB}KB"

# 时间估算
if [ "$FILE_COUNT" -lt 50 ]; then
  EST_TIME="约 30 秒"
  RISK="低"
elif [ "$FILE_COUNT" -lt 150 ]; then
  EST_TIME="约 1-2 分钟"
  RISK="低"
elif [ "$FILE_COUNT" -lt 300 ]; then
  EST_TIME="约 3-5 分钟"
  RISK="中"
elif [ "$FILE_COUNT" -lt 500 ]; then
  EST_TIME="约 5-8 分钟"
  RISK="中"
else
  EST_TIME="约 8-15 分钟"
  RISK="⚠️ 高（建议指定扫描区域）"
fi

echo "  预计耗时: $EST_TIME"
echo "  上下文风险: $RISK"

# ── 目录分布 ──

echo ""
echo "📁 目录分布（源文件最多的目录）："
find "$TARGET_DIR" -type f \( -name "*.java" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.go" -o -name "*.vue" \) $EXCLUDE_ARGS 2>/dev/null \
  | sed 's|/[^/]*$||' \
  | sort | uniq -c | sort -rn | head -10 \
  | while read count dir; do
    echo "  $count 个文件  $dir"
  done

# ── 提取结构化信息 ──

mkdir -p "$OUTPUT_DIR"

echo ""
echo "🔧 提取结构化信息..."

{
  echo "# SCAN-RAW.md — 扫描预处理结果"
  echo ""
  echo "> 由 scripts/scan-preprocess.sh 自动生成，AI 深度扫描时读取此文件。"
  echo "> 生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "## 项目概况"
  echo "- 扫描目录: $TARGET_DIR"
  echo "- 源文件数: $FILE_COUNT"
  echo "- 源码大小: ${TOTAL_SIZE_KB}KB"
  echo "- 预计耗时: $EST_TIME"
  echo ""

  # ── 配置文件内容 ──
  echo "## 配置文件"
  echo ""
  
  for f in $(find "$TARGET_DIR" -maxdepth 3 -type f \( -name "package.json" -o -name "pom.xml" -o -name "build.gradle" -o -name "build.gradle.kts" -o -name "settings.gradle" -o -name "go.mod" -o -name "requirements.txt" -o -name "pyproject.toml" -o -name "Cargo.toml" -o -name "composer.json" -o -name "Gemfile" -o -name "*.csproj" -o -name "application.yml" -o -name "application.yaml" -o -name "application.properties" \) $EXCLUDE_ARGS 2>/dev/null | head -20); do
    echo "### $f"
    echo '```'
    cat "$f" 2>/dev/null | head -50
    echo '```'
    echo ""
  done

  # ── 目录结构树 ──
  echo "## 目录结构"
  echo ""
  echo '```'
  find "$TARGET_DIR" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/vendor/*" -not -path "*/build/*" -not -path "*/__pycache__/*" -not -path "*/.next/*" -not -path "*/target/*" -not -path "*/.idea/*" -not -path "*/.vscode/*" -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/tmp/*" | head -300 | sed "s|$TARGET_DIR/||" | sort
  echo '```'
  echo ""

  # ── import/依赖关系 ──
  echo "## 依赖关系（import 分析）"
  echo ""

  # Java imports
  if [ "$JAVA_COUNT" -gt 0 ]; then
    echo "### Java imports（出现频率 Top 30）"
    echo '```'
    find "$TARGET_DIR" -name "*.java" $EXCLUDE_ARGS 2>/dev/null | xargs grep -h "^import " 2>/dev/null | sed 's/import static //' | sort | uniq -c | sort -rn | head -30
    echo '```'
    echo ""
  fi

  # Python imports
  if [ "$PY_COUNT" -gt 0 ]; then
    echo "### Python imports（出现频率 Top 30）"
    echo '```'
    find "$TARGET_DIR" -name "*.py" $EXCLUDE_ARGS 2>/dev/null | xargs grep -h "^import \|^from " 2>/dev/null | sort | uniq -c | sort -rn | head -30
    echo '```'
    echo ""
  fi

  # TypeScript/JavaScript imports
  if [ "$TS_COUNT" -gt 0 ] || [ "$JS_COUNT" -gt 0 ]; then
    echo "### JS/TS imports（出现频率 Top 30）"
    echo '```'
    find "$TARGET_DIR" \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.vue" \) $EXCLUDE_ARGS 2>/dev/null | xargs grep -hE "^\s*(import |require\(|from ['\"])" 2>/dev/null | sed "s/.*from ['\"]//;s/.*require(['\"]//;s/['\").*//" | grep -v "^\." | grep -v "^@" | sort | uniq -c | sort -rn | head -30
    echo '```'
    echo ""
  fi

  # Go imports
  if [ "$GO_COUNT" -gt 0 ]; then
    echo "### Go imports（出现频率 Top 30）"
    echo '```'
    find "$TARGET_DIR" -name "*.go" $EXCLUDE_ARGS 2>/dev/null | xargs grep -hE '^\s*"[a-zA-Z]' 2>/dev/null | sort | uniq -c | sort -rn | head -30
    echo '```'
    echo ""
  fi

  # ── 类名/函数名提取 ──
  echo "## 代码结构（类名/函数名）"
  echo ""

  # Java classes
  if [ "$JAVA_COUNT" -gt 0 ]; then
    echo "### Java 类和接口"
    echo '```'
    find "$TARGET_DIR" -name "*.java" $EXCLUDE_ARGS 2>/dev/null | xargs grep -hE "^\s*(public|protected|private|)?" | grep -E "(class |interface |enum |@Entity|@Table|@Controller|@Service|@Repository|@RestController|@Mapper|@Component)" | head -50
    echo '```'
    echo ""
  fi

  # Python classes/functions
  if [ "$PY_COUNT" -gt 0 ]; then
    echo "### Python 类和函数（Top 50）"
    echo '```'
    find "$TARGET_DIR" -name "*.py" $EXCLUDE_ARGS 2>/dev/null | xargs grep -hE "^(class |def |async def )" 2>/dev/null | head -50
    echo '```'
    echo ""
  fi

  # Go structs
  if [ "$GO_COUNT" -gt 0 ]; then
    echo "### Go 结构体和接口"
    echo '```'
    find "$TARGET_DIR" -name "*.go" -not -path "*/vendor/*" 2>/dev/null | xargs grep -hE "^(type .+ struct|type .+ interface)" 2>/dev/null | head -30
    echo '```'
    echo ""
  fi

  # ── 数据库 Schema 文件位置 ──
  echo "## 数据库 Schema 文件"
  echo ""

  SCHEMA_FILES=""
  # Prisma
  SCHEMA_FILES+="$(find "$TARGET_DIR" -name "schema.prisma" $EXCLUDE_ARGS 2>/dev/null) "
  # MyBatis Mapper XML
  SCHEMA_FILES+="$(find "$TARGET_DIR" -name "*Mapper.xml" $EXCLUDE_ARGS 2>/dev/null) "
  # SQLAlchemy / Django models
  SCHEMA_FILES+="$(find "$TARGET_DIR" -name "models.py" $EXCLUDE_ARGS 2>/dev/null) "
  # TypeORM entities
  SCHEMA_FILES+="$(find "$TARGET_DIR" -name "*.entity.ts" $EXCLUDE_ARGS 2>/dev/null) "
  # Mongoose models
  SCHEMA_FILES+="$(find "$TARGET_DIR" -name "*.model.ts" $EXCLUDE_ARGS 2>/dev/null) "
  # SQL migrations
  SCHEMA_FILES+="$(find "$TARGET_DIR" \( -name "*.sql" -o -name "*migration*" \) $EXCLUDE_ARGS 2>/dev/null) "
  # Java entities
  SCHEMA_FILES+="$(find "$TARGET_DIR" \( -path "*/entity/*" -o -path "*/model/*" \) -name "*.java" $EXCLUDE_ARGS 2>/dev/null) "
  # Drizzle schema
  SCHEMA_FILES+="$(find "$TARGET_DIR" -name "schema.ts" $EXCLUDE_ARGS 2>/dev/null) "
  # Go GORM models
  SCHEMA_FILES+="$(find "$TARGET_DIR" -name "models.go" -o -name "model.go" $EXCLUDE_ARGS 2>/dev/null) "

  if [ -n "$SCHEMA_FILES" ]; then
    echo "$SCHEMA_FILES" | tr ' ' '\n' | grep -v "^$" | while read -r f; do
      if [ -n "$f" ] && [ -f "$f" ]; then
        echo "- \`$f\`"
      fi
    done
    echo ""
  else
    echo "未检测到数据库 schema 文件。"
    echo ""
  fi

  # ── 框架检测 ──
  echo "## 框架检测"
  echo ""

  # 检测 Web 框架
  if find "$TARGET_DIR" -name "*.java" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "@RestController\|@Controller\|@RequestMapping\|@GetMapping\|@PostMapping" 2>/dev/null | head -1 | grep -q .; then
    echo "- **Java Web**: Spring Boot (Spring MVC annotations detected)"
  fi
  if find "$TARGET_DIR" -name "*.java" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "mybatis\|MyBatis\|@Mapper\|@Select" 2>/dev/null | head -1 | grep -q .; then
    echo "- **ORM**: MyBatis / MyBatis-Plus"
  fi
  if find "$TARGET_DIR" -name "*.java" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "@Entity\|@Table\|@Column\|JPA\|javax.persistence\|jakarta.persistence" 2>/dev/null | head -1 | grep -q .; then
    echo "- **ORM**: JPA / Hibernate"
  fi
  if find "$TARGET_DIR" -name "pom.xml" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "mybatis-plus\|mybatis\|MybatisPlus" 2>/dev/null | head -1 | grep -q .; then
    echo "- **增强**: MyBatis-Plus"
  fi

  if find "$TARGET_DIR" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "flask\|Flask" 2>/dev/null | head -1 | grep -q .; then
    echo "- **Python Web**: Flask"
  fi
  if find "$TARGET_DIR" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "django\|Django" 2>/dev/null | head -1 | grep -q .; then
    echo "- **Python Web**: Django"
  fi
  if find "$TARGET_DIR" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "fastapi\|FastAPI" 2>/dev/null | head -1 | grep -q .; then
    echo "- **Python Web**: FastAPI"
  fi
  if find "$TARGET_DIR" -name "*.py" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "sqlalchemy\|SQLAlchemy" 2>/dev/null | head -1 | grep -q .; then
    echo "- **ORM**: SQLAlchemy"
  fi

  if [ -f "$TARGET_DIR/package.json" ]; then
    if grep -q "vue" "$TARGET_DIR/package.json" 2>/dev/null; then
      echo "- **Frontend**: Vue.js"
    fi
    if grep -q "react\|next" "$TARGET_DIR/package.json" 2>/dev/null; then
      echo "- **Frontend**: React / Next.js"
    fi
    if grep -q "express" "$TARGET_DIR/package.json" 2>/dev/null; then
      echo "- **Backend**: Express.js"
    fi
    if grep -q "nestjs\|NestJS" "$TARGET_DIR/package.json" 2>/dev/null; then
      echo "- **Backend**: NestJS"
    fi
    if grep -q "prisma" "$TARGET_DIR/package.json" 2>/dev/null; then
      echo "- **ORM**: Prisma"
    fi
    if grep -q "typeorm\|TypeORM" "$TARGET_DIR/package.json" 2>/dev/null; then
      echo "- **ORM**: TypeORM"
    fi
  fi

  if [ "$GO_COUNT" -gt 0 ] && find "$TARGET_DIR" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "gorm.io\|GORM\|gorm.Model" 2>/dev/null | head -1 | grep -q .; then
    echo "- **ORM**: GORM"
  fi
  if [ "$GO_COUNT" -gt 0 ] && find "$TARGET_DIR" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "gin\|Gin\|gin.Context" 2>/dev/null | head -1 | grep -q .; then
    echo "- **Web**: Gin"
  fi
  if [ "$GO_COUNT" -gt 0 ] && find "$TARGET_DIR" $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "echo\|Echo\|labstack/echo" 2>/dev/null | head -1 | grep -q .; then
    echo "- **Web**: Echo"
  fi

  echo ""

  # ── 框架隐形规则相关文件 ──
  echo "## 框架配置文件（隐形规则扫描参考）"
  echo ""

  FRAMEWORK_FILES=""
  FRAMEWORK_FILES+="$(find "$TARGET_DIR" \( -name "*Interceptor*.java" -o -name "*Plugin*.java" -o -name "mybatis-config.xml" \) $EXCLUDE_ARGS 2>/dev/null) "
  FRAMEWORK_FILES+="$(find "$TARGET_DIR" \( -name "*Auditor*.java" -o -name "*EventListener*.java" \) $EXCLUDE_ARGS 2>/dev/null) "
  FRAMEWORK_FILES+="$(find "$TARGET_DIR" -name "settings.py" -maxdepth 3 $EXCLUDE_ARGS 2>/dev/null) "
  FRAMEWORK_FILES+="$(find "$TARGET_DIR" \( -name "*event*.py" -o -name "*listener*.py" -o -name "*mixin*.py" \) $EXCLUDE_ARGS 2>/dev/null) "
  FRAMEWORK_FILES+="$(find "$TARGET_DIR" \( -name "Base*.java" -o -name "Abstract*.java" \) \( -path "*/entity/*" -o -path "*/model/*" -o -path "*/po/*" \) $EXCLUDE_ARGS 2>/dev/null) "
  FRAMEWORK_FILES+="$(find "$TARGET_DIR" \( -name "*.rb" \) $EXCLUDE_ARGS 2>/dev/null | xargs grep -l "acts_as_paranoid\|acts_as_tenant" 2>/dev/null) "

  if [ -n "$FRAMEWORK_FILES" ]; then
    echo "$FRAMEWORK_FILES" | tr ' ' '\n' | grep -v "^$" | while read -r f; do
      if [ -n "$f" ] && [ -f "$f" ]; then
        echo "- \`$f\`"
      fi
    done
    echo ""
  else
    echo "未检测到框架配置文件。"
    echo ""
  fi

  echo "---"
  echo "预处理完成。AI 深度扫描时读取此文件，不需要再遍历原始源码。"

} > "$OUTPUT_FILE"

echo ""
echo "✅ 预处理完成"
echo "   输出文件: $OUTPUT_FILE"
echo "   文件大小: $(wc -c < "$OUTPUT_FILE" | tr -d ' ') bytes"
echo ""
echo "   下一步: /sillyspec:scan --deep"
echo "   AI 会读取 SCAN-RAW.md 而不是原始源码，大幅节省上下文。"
