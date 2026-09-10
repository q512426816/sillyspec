---
id: task-07
title: 'scope-audit-fixture-tests-and-npm-test-regression'
title_zh: '夹具测试 scope-audit 三态归属行数降级并行五组场景 + npm test 全量回归'
author: 'qinyi'
created_at: 2026-09-10 10:45:46
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05', 'task-06']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-002@v1, D-006@v1]
allowed_paths:
  - NEW:test/scope-audit.test.mjs
  - src/scope-audit.js
  - src/verify-postcheck.js
target_files:
  - NEW:test/scope-audit.test.mjs
goal: >
  新建 test/scope-audit.test.mjs 以临时 git 仓库夹具覆盖三态判定/归属分档/行数三档/降级路径/并行会话排除五组场景，并跑 npm test 确认新测试与既有套件全绿零回归。
implementation:
  - node:test + node:assert 风格新建测试文件（对齐既有 *.test.mjs），git 夹具用 mkdtempSync 临时目录 + git init + git config user.name/user.email 构造场景，try/finally rmSync 测后清理
  - 三态场景（FR-01）——临时仓写含文件清单的 design.md，清单内文件实改断言 verdict=planned，清单外文件实改断言 verdict=unplanned，清单文件零改动断言 verdict=untouched
  - 行数三档（D-002）——tracked 改动与手跑 git diff --numstat 同基点对拍断言一致；untracked 新文件断言行数等于文件总行数（wc -l 语义）；写入二进制内容断言显 BIN 且行数为 null
  - 并行会话场景（R-02/R-04）——构造他者会话已声明同文件的 guard 夹具，断言该文件不进 rows 而单列进 excluded.foreignDeclared
  - 降级场景——形态 B 构造无 merge-base 使 baseAnchor=null，断言文件清单仍出但不出伪行数且 degradedReason 非空；design 清单解析失败断言降级实际侧 only 不误判三态
  - quick 场景（FR-04）——构造 guard.json 夹具（baselineFiles/allowedFiles + 未提交改动），断言归属分档 declared/soft/undeclared 正确且 baseAnchor 记 quick-window 前缀
acceptance:
  - 五组场景断言全过——三态 verdict 分档 / 行数三档真值（numstat 对拍、wc-l 全加行、BIN）/ 他者声明文件排除进 foreignDeclared / baseAnchor=null 与清单解析失败双降级 / quick 归属分档
  - npm test 全量绿，既有测试零回归（run-tests.mjs 递归自动收集新 *.test.mjs）
verify:
  - npm test
constraints:
  - 不改 auditQuickCompletion 与 resolveReconcileActualFiles 判定语义——只消费其结果；断言暴露被测代码缺陷时按 allowed_paths 授权微修 src/scope-audit.js 与 src/verify-postcheck.js，判定语义变更须回上游卡
  - git 夹具一律 mkdtemp 临时目录并在 finally 清理，禁止在仓库工作区造 commit 或脏文件污染本仓
  - Windows 兼容——路径用 node:path 的 join 拼接并正斜杠归一后比对，numstat 解析不依赖 GNU awk
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
