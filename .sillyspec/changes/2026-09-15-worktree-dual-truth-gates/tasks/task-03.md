---
id: task-03
title: 'Supply gitignored generated files into worktree via worktree.supplyFiles config'
title_zh: 'supplyFiles 生成物供给（config-schema 键注册 + create 供给步 + meta.supplyFiles 记录）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-15 21:34:09
priority: P0
depends_on: [task-01]
blocks: [task-06]
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - src/config-schema.js
  - src/worktree.js
target_files:
  - src/config-schema.js
  - src/worktree.js
goal: >
  新增 local.yaml 配置键 worktree.supplyFiles（string[]，默认 []），worktree create 时把
  gitignore 生成物（如 src/build-id.ts）从主仓按 glob 展开复制供给进 worktree 并记录
  meta.supplyFiles 实供清单——修坑③「gitignored 生成物不随 worktree 供给、构建炸
  Failed to load url」，未配置时供给步空转零行为变化（FR-03 / D-003@v1）。
implementation:
  - 'src/config-schema.js：LOCAL_YAML_SCHEMA 新增 worktree 段（沿既有 section 形态 id/title/note/keys），注册键 path=worktree.supplyFiles、type=array、optional=true、status=live、readers 填 create 供给步 (src/worktree.js)，desc 说明精确路径与 glob 语义、example 给 ''src/build-id.ts'''
  - '同文件 renderExample() 策展模板追加 worktree.supplyFiles 注释段——「每个 live 键路径必出现于 example 文本」的耦合测试要求，漏加即测试红'
  - 'src/worktree.js create 流程 step 5.8 provisionDeps（~736-747）之后、step 6 meta 写入（~750-774）之前，新增 step 5.9 供给步：读主仓 .sillyspec/local.yaml 的 worktree.supplyFiles（沿 hooks/worktree-guard.js parseSimpleYaml 同款自读形态，本文件不引新 reader）'
  - 'glob 自实现 * / ** 转 RegExp（相对主仓根展开，零新依赖；js-yaml 已有但仅沿既有解析路径用）；展开超 200 文件 console.warn 并截断（R-04 上限帽）'
  - '逐文件复制：主仓存在则 mkdirSync(recursive) 建父目录 + copyFileSync（两 API 已在本文件 import 面）；目标已存在且内容不同则警告后覆盖；主仓缺失 console.warn 跳过，不阻断 create'
  - '实供清单写入 meta.supplyFiles（string[]；未配置或零供给写空数组或省略字段，存量 meta 无此字段按缺省兼容——doctor/审计可读）'
acceptance:
  - 'FR-03 GWT-1：local.yaml 配 supplyFiles 含 src/build-id.ts 且主仓该文件存在 → create 后 worktree 内该文件存在且内容与主仓一致，meta.supplyFiles 含该路径'
  - 'FR-03 GWT-2：supplyFiles 的 glob 在主仓无匹配 → console.warn 提示缺失，create 正常完成不阻断'
  - 'FR-03 GWT-3：local.yaml 未配置 supplyFiles（默认 []）→ 供给步空转，create 产物与现状一致（零回归）'
  - 'glob 展开命中超 200 文件 → 警告输出且只供给前 200（截断行为可断言观测）'
  - '单文件复制抛错 → warn 后继续，create 不失败（fail-open）'
  - 'sillyspec config schema 输出与 renderExample 文本均含 worktree.supplyFiles 键路径（config-schema example 耦合测试通过）'
verify:
  - '本卡新增用例由 task-06 统一收口（test/worktree-dual-truth-gates.test.mjs supplyFiles 组）'
  - 'node test/run-tests.mjs（全量回归零红）'
  - 'node test/check-syntax.mjs（lint 0 告警）'
constraints:
  - '单文件复制失败不阻断 create（warn 后继续，供给步整体 fail-open，不回滚已复制文件）'
  - '零新依赖：glob 转换自实现 * / ** → RegExp，不引入 minimatch/fast-glob 等库'
  - '供给物不进 assess/apply 面（gitignore 物天然被 ls-files --others --exclude-standard 排除，不加特殊处理）'
  - '与 task-01 同文件 src/worktree.js 串行——开工前确认 task-01 已 --done，Edit 前重读文件最新态（多 agent 并行）'
  - '不动 step 5.8 provisionDeps 依赖供给与既有 meta 字段语义，只新增步骤与 meta.supplyFiles 字段'
  - 'Windows/Linux/macOS 兼容：路径 join + 正斜杠归一，copyFileSync 跨盘符'
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
