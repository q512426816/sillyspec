---
id: task-02
title: 'export-resolve-reconcile-actual-files-with-base-anchor'
title_zh: 'resolveReconcileActualFiles 补 export + 返回结构新增 baseAnchor 字段（src/verify-postcheck.js）'
author: 'qinyi'
created_at: 2026-09-10 10:45:46
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-002@v1]
allowed_paths:
  - src/verify-postcheck.js
target_files:
  - src/verify-postcheck.js
goal: resolveReconcileActualFiles 补 export 并在返回结构新增 baseAnchor 字段——为 scope-audit 行数采集外露与文件清单同源的 numstat 基点锚（R-02/B-1）。
provides:
  - contract: ReconcileActualFiles
    fields: [files, ok, degradedReason, baseAnchor]
implementation:
  - function resolveReconcileActualFiles（src/verify-postcheck.js:2289）声明前加 export，与文件内既有 export function 风格一致；同步在函数头 @returns 注释补 baseAnchor 说明
  - 形态 A（worktree 存活）——返回对象新增 baseAnchor，读 worktree meta.json 锚点，优先级 baselineCommit>actualBaseHash>baseHash（与 :2297 注释及 resolveMainChangedFiles:1145 同口径），三锚全缺为 null
  - 形态 B（post-apply）——返回对象新增 baseAnchor，复用 :2316 已有 mergeBase 变量取 trim 后 hash，分支不存在或 merge-base 不可得为 null
  - 三个 return 点（形态 A 降级/形态 B 降级/成功收尾）统一补 baseAnchor 字段，保持返回结构一致
acceptance:
  - 从 src/verify-postcheck.js 静态 import resolveReconcileActualFiles 成功（export 生效）
  - 既有调用方 reconcileTargetFiles（:2478 附近）行为零变化——不读新字段，npm test 既有回归零破
  - 返回结构多 baseAnchor 字段且取值正确——形态 A 为 meta 锚 commit、形态 B 为 merge-base hash 或 null
verify:
  - node --check src/verify-postcheck.js
  - npm test（既有回归零破）
constraints:
  - 纯增量——既有 ok/form/files/sources/foreignExcluded/degradedReason 字段语义零变化，不加 console 噪声
  - 本 task 不消费 baseAnchor（numstat 采集在 task-01）；只改 src/verify-postcheck.js
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
