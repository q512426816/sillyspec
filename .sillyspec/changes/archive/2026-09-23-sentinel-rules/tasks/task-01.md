---
id: task-01
title: 'Extend buildSnapshot with four evidence sources'
title_zh: '快照四源扩展：commits/dirtyCode/scanStatus/reviews/checkedTasks'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:36:34
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04]
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/watcher.js
target_files:
  - src/watcher.js
provides:
  - contract: buildSnapshot 扩展字段
    fields: [commits, dirtyCode, scanStatus, reviews, checkedTasks]
goal: >
  哨兵规则引擎的判据面：buildSnapshot 在既有三源（产物签名/HEAD/scan stat）上扩展
  commits（git log -20 --format=%h|%s --name-only 单调用解析出 hash/subject/files）、
  dirtyCode（porcelain 剔 .sillyspec//docs//*.md 同 quality-scan isNonCodePath 口径）、
  scanStatus（verify-quality-scan json 的 testResult.status 内容读取，读取失败 null）、
  reviews（.runtime/execute-runs/*/tasks/*/review.json mtime 面，有界遍历）与 files
  条目 checkedTasks（/- \[x\] task-\d+/ 提取）——全部注入参数化（gitLogImpl/
  porcelainImpl/readdirSyncImpl/readFileSyncImpl/statSyncImpl），既有字段零变化。
implementation:
  - src/watcher.js buildSnapshot（src/watcher.js:129）加五字段：commits 数组元素 {hash, subject, files: string[]}；gitLogImpl 缺省走 gitQuiet(cwd, ['log','-20','--format=%h|%s','--name-only'])，输出解析段（hash|subject 行 + 后续缩进文件行聚合），失败 null 化
  - dirtyCode：porcelainImpl 缺省 gitQuiet(cwd,['status','--porcelain'])，剥引号/反斜杠转正斜杠（同 run/shared.js parsePorcelainPath 口径），isNonCodePath 剔除后排序
  - scanStatus：readFileSyncImpl 读 runtimeRoot 下 verify-quality-scan-<change>.json，JSON.parse 取 testResult.status/ranAt，try/catch null
  - reviews：readdirSyncImpl 两级遍历 execute-runs/*/tasks/*/review.json，statSyncImpl 取 Math.round(mtimeMs)；目录不存在 {}
  - countCheckboxes 旁加 extractCheckedTasks（含 X 大写容错），files 条目 additive 加 checkedTasks
  - 快照字段全部 JSON 可序列化（水位回补落盘依赖，task-04 消费）
acceptance:
  - 注入 gitLogImpl/porcelainImpl/readdirSyncImpl 时 buildSnapshot 零真 git/fs 依赖产出五新字段（fixture 直测）
  - git 调用失败（impl 返回 null/抛异常）时 commits/dirtyCode 为 null/[]，既有字段不受影响（fail-open）
  - 既有 test/watcher.test.mjs 的 buildSnapshot 用例零改动全绿（additive 不破坏）
verify:
  - node --test test/watcher.test.mjs
  - npm run lint
constraints:
  - 只加字段不改既有字段语义（scan mtime stat 保留，status 只增不替）
  - 单次 git log 调用同时取 subject 与触及文件（轮询新增 git 调用 ≤2 次/拍：log+status）
  - Windows 路径归一正斜杠；mtime Math.round 毫秒（既有口径）
  - 不在本卡做规则判定（引擎是 task-02）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/<file>.js:<行号>）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
