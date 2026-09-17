---
id: task-04
title: 'docs-gate.test.mjs 自动重锚用例（落盘/披露/返回面/守卫不写盘/快路径/真增量/首次立线不变）'
title_zh: 'docs-gate.test.mjs 自动重锚用例（落盘/披露/返回面/守卫不写盘/快路径/真增量/首次立线不变）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 09:19:45
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: [D-002@v1]
allowed_paths:
  - test/docs-gate.test.mjs
target_files:
  - test/docs-gate.test.mjs
expects_from:
  task-02: { contract: docs-gate-reanchor, needs: [reanchored, baseline, writeBaseline 落盘, 披露消息, 守卫不写盘] }
goal: >
  task-02 落地的陈旧分支自动重锚（D-002@v1）需测试锁定：改写既有陈旧分支用例断言新契约（落盘/披露/reanchored/二次跑快路径），新增 checkOpts 守卫不写盘用例，并回归快路径/真增量/首次立线三分支不变——防「提示消失但落盘或守卫回归」的静默退化（FR-02/FR-03）。
implementation:
  - "改写 test/docs-gate.test.mjs:144-154 既有陈旧分支用例（:153 断言旧文案「--init-baseline 重锚」需随行改写）：断言 r.reanchored === true、readBaseline(join(repo, '.sillyspec')) === r.current（落盘 = current）、r.baseline === r.current（返新值）、消息含「已自动重锚」且含基线 X→current 与 origin/main 实测 N"
  - '同用例追加第二次跑断言：紧接同参再跑一次 runDocsGate → 走快路径（r2.originCount === null、r2.exitCode === 0）——陈旧提示与远端实测成本各只发生一次（FR-02 收尾语义）'
  - "新增守卫用例：同陈旧态构造下 runDocsGate({ projectRoot: repo, specBase: join(repo, '.sillyspec') }, { paths: ['docs/**/*.md'] }) 显式传 checkOpts.paths → 基线文件不变（readBaseline 仍为旧值）、r.reanchored === false、消息维持建议文案（含 --init-baseline）"
  - '回归确认三既有用例不破：快路径（:184-191 消息与纯判定逐字一致）、真增量（:156-164 双参考值拦截）、无基线（:62-67 exit 2 fail-closed）——evaluateRatchet/基线 IO 用例零触碰'
  - 'fixture 沿用真 git 临时仓形态（mkdtempSync + git init + update-ref 构造 refs/remotes/origin/main，无需 bare 远端），afterEach worktree prune 清理'
acceptance:
  - '改写后陈旧分支用例全绿：reanchored === true + 落盘 = current + 消息含「已自动重锚」+ 第二次跑 originCount === null（快路径）'
  - '守卫用例绿：checkOpts.paths 显式传入 → 基线文件不变、reanchored === false、维持建议文案（含 --init-baseline）'
  - '快路径/真增量/无基线三既有用例零改动零破坏（回归通过）'
  - '本文件全量（node --test）与 npm test 全绿'
verify:
  - 'node --test test/docs-gate.test.mjs'
  - 'npm test'
constraints:
  - '真 git 临时仓形态沿用（update-ref 构造 origin/main），不引入 bare 远端/mock git'
  - 'Windows 兼容：join 拼路径、无 shell 参与、沿用既有 fixture 风格（mkdtempSync tmp fixture 跑完清理）'
  - '不改 src/docs-gate.js（src 面归 task-02）；evaluateRatchet/基线 IO 既有用例不动'
  - '陈旧分支用例只改断言面与追加二次跑，不弱化既有 exitCode/originCount 断言'
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
