---
id: task-01
title: 'span-risk loader module (NEW src/span-risk-surface.js) + equivalence/robustness tests'
title_zh: '装载层——NEW:src/span-risk-surface.js 四导出 + NEW:test/span-risk-surface.test.mjs（编译等价性钉/装载容错/AllProjects 并集）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 16:44:50
priority: P0
depends_on: []
blocks: [task-02, task-03]
requirement_ids: [FR-01, FR-05]
decision_ids: [D-003@v1]
allowed_paths:
  - src/span-risk-surface.js
  - test/span-risk-surface.test.mjs
target_files:
  - NEW:src/span-risk-surface.js
  - NEW:test/span-risk-surface.test.mjs
provides:
  - consumer: task-02/task-03
    fields: [compileSpanRiskPatterns, matchSpanRiskPatterns, loadSpanRiskPatterns, loadSpanRiskPatternsAllProjects, pattern-re-shape]
    note: '四导出签名见 design.md 接口定义；pattern-re-shape=编译产物 { pattern: <token字面量>, re: RegExp }（边界锚定 /i，与旧 QUICK_RISK_PATH_PATTERNS 条目同形——两消费面现有循环零适配消费）'
goal: >
  新建 span 轴路径模式声明面装载模块（与 blast-surface.js 同构），把 token 编译为与现行
  QUICK_RISK_PATH_PATTERNS 逐字等价的边界锚定正则，并用独立测试文件钉死等价性与容错。
implementation:
  - NEW src/span-risk-surface.js：模块头注（口径真相源指向 knowledge/conventions.md「判级/定价/门禁输入必须项目声明」条 + D-003）；四导出——compileSpanRiskPatterns(tokens)（token String 化+trim、非字符串/空白跳过、去重首个保留；escapeRegExp 后编译 `(?:^|[/_-])<token>(?=[/._-]|$)` /i）、matchSpanRiskPatterns(files, patterns)（反斜杠归一 POSIX；`re instanceof RegExp` 防御 + global 正则 lastIndex 归零——两消费面现行写法同款；返回 [{pattern, file}] 扁平数组）、loadSpanRiskPatterns({specBase, project})（jsYaml 读 docs/<project>/modules/_module-map.yaml 顶层 span_risk 段；map 缺失/坏 YAML/段非数组/条目非字符串逐条跳过 → 空表；路径拼接与异常立场逐款对照 src/blast-surface.js:105-146）、loadSpanRiskPatternsAllProjects({specBase})（readdirSync docs/ 扫各项目并集，单项目异常按空表跳过——loadBlastDeclarationsAllProjects 同款形态）
  - NEW test/span-risk-surface.test.mjs：①编译等价性钉——旧表六条正则原文复制为测试内常量（本 task 时点表还在 src，task-03 删表后测试自带正则快照仍可对照），六域 21 token 展开集（auth/authorization/authentication/authenticator/oauth/oauth2/permission/permissions/billing/migration/migrations/migrate/lock/locks/mutex/mutexes/scheduler/scheduling/cron/job/jobs）编译后，对代表性路径集（src/auth/x.js、user-auth.js、author.js、booking.js、lockfile.js、db/migrations/001.sql、src/dispatch/a.js、src/job/queue.js、oauth2/token.js 等正反例 ≥20 条）逐文件逐 token 与旧正则断言同命中同不命中；②互斥性钉——同文件同域至多 1 token 命中（oauth vs oauth2、job vs jobs 等）；③compile 容错（非字符串/空白/重复 token）；④load 容错（无段/段非数组/条目脏值 → 空表或跳过）；⑤AllProjects 并集与单项目异常跳过（tmp 目录夹具）
acceptance:
  - node --test test/span-risk-surface.test.mjs 全绿；等价性钉覆盖六域全部 21 token × ≥20 代表路径正反例
  - loadSpanRiskPatterns 对无 span_risk 段的 map 返回 []（不抛错、不缺省内置表）
  - 模块零依赖除 fs/path/js-yaml（与 blast-surface 同栈），无 CLI/DB/锁副作用
verify:
  - node --test test/span-risk-surface.test.mjs
  - node --test test/blast-surface.test.mjs（同构先例回归不受牵连）
constraints:
  - 本 task 不改任何既有 src 文件（纯新增两个文件）；不删不引用 QUICK_RISK_PATH_PATTERNS（退役归 task-03）
  - token 只做字面量编译，不支持通配/正则语法（D-003：零新文法）
  - 等价性口径=命中面（触发判级的文件集与条数）；pattern 标签粒度 6 域→21 token 的差异已声明（Grill X-3），不算破坏等价性
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
