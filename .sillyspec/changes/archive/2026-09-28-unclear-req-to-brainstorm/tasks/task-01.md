---
id: task-01
title: 'route-hindsight 模块（指标计算/阈值/落库/读取）＋单测'
title_zh: 'route-hindsight 模块（指标计算/阈值/落库/读取）＋单测'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-09-28 18:02:57
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-001@v1, D-003@v1, D-005@v1]
allowed_paths:
  - src/route-hindsight.js
  - test/route-hindsight.test.mjs
target_files:
  - NEW:src/route-hindsight.js
  - NEW:test/route-hindsight.test.mjs
provides: 'route-hindsight 三导出：computeHindsightMetrics({changeDir, reviewJson, flowState})→{designRewriteRatio, tasksRewriteRatio, blindDims, testFailures, raw}；markHindsight({cwd, specBase, change, metrics})→{marked, reasons}；readHindsightHint({specBase})→string|null'
goal: >
  新建 src/route-hindsight.js：flow done 收口后用封闭面指标判「疑似该走预段未走」并落库，
  供 flow start 下次点名提示（FR-02 后门）。指标全部为 diff 比例与计数，零语义判定（D-003 禁区）。
implementation:
  - 'computeHindsightMetrics：design.md/tasks.md 终稿 vs 机器稿首版行级 diff 比例（首版锚定机器稿起草时点——start/adopt 机器稿即快照源，快照存 .sillyspec/.runtime/route-hindsight-baseline-<change>.json，实现取最简可靠）；blindDims 数 review.json 盲维计数；testFailures 读 flow-state substeps 实测失败记录'
  - '超阈判定常量：designRewriteRatio > 0.5 / tasksRewriteRatio > 0.6 / blindDims >= 2 / testFailures >= 2（模块内常量可调，注释写明单位与口径）'
  - 'markHindsight：任一超阈 → 整文件覆盖写 .sillyspec/.runtime/route-hindsight.json（{change, marked_at, metrics, reasons}，per-repo 单条）'
  - 'readHindsightHint：文件缺失/无标记返回 null；有标记返回点名提示文案（含变更名与形态计数，措辞「疑似」）'
  - '跨平台：路径 join、CRLF/LF 归一（复用仓内 fs-atomic.js 原子写惯例）'
  - '单测 test/route-hindsight.test.mjs：指标计算正反例（真实归档输入回放 FP=0）、阈值边界、落库幂等、readHint null 分支'
acceptance:
  - 四指标均为数字/计数输出，模块内无任何关键词匹配逻辑（D-003）
  - 指标超阈 → hindsight.json 落库字段齐全；无超阈 → 不落库（marked:false）
  - readHindsightHint 无文件返回 null
  - test/route-hindsight.test.mjs 全绿（node --test）
verify:
  - node --test test/route-hindsight.test.mjs
  - npm run lint
constraints:
  - 禁止引入任何词表/关键词语义判定（D-003 rejected 禁区）
  - 不动 src/flow-draft.js 与 src/flow.js（接线归 task-03）
  - 不新增第三方依赖
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
