---
id: task-03
title: 'L0 pure function detectFakeCheckCompletion'
title_zh: 'L0 纯函数三态判定（收口拒收下批接线）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:36:34
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-002@v1]
allowed_paths:
  - src/sentinel-assertions.js
target_files:
  - NEW:src/sentinel-assertions.js
provides:
  - contract: detectFakeCheckCompletion
    fields: [changeDir, tasksMd, commits, opts]
goal: >
  L0 升级通道：导出纯函数 detectFakeCheckCompletion({changeDir, tasksMd, commits,
  opts={}})，三态返回 {status:'complete'|'fake'|'none', claimTotal, checked,
  missing:[]}——供 --done 收口侧拒收假勾选（本批只交付函数+单测，调用点下批，避免与
  并行会话改同文件）。
implementation:
  - NEW src/sentinel-assertions.js：判集=行首 /^[-*] \[( |x|X)\] (task-\d+)/ 的 id 行（无 id 勾选行不入判——不可验证不拒收）
  - commits 归一：string[] | {message|subject}[] → 字符串组；证据=subject 词边界匹配 task-NN（RegExp(id+'(?!\\\\d)')，与 R1 同口径）
  - review 证据：specBase=dirname(changeDir) 上推一级，遍历 join(specBase,'.runtime','execute-runs',*,'tasks',task-NN,'review.json') 在场即证据；opts.listReviewsImpl 可注入（缺省真 fs readdir）；探测 try/catch 异常按无 review 证据（commit 证据照判）
  - 三态：none=判集空或未全勾；complete=全勾且 missing 空；fake=全勾且 missing 非空（missing 列零证据 id）
  - 文件头注释：本批无调用方（接线在 --done 收口侧），纯度=无副作用、输出由参数+只读盘面决定
acceptance:
  - 三态单测：真完成（全勾+每 id 有 commit 证据）/假勾选（全勾+某 id 零证据，missing 含该 id）/无勾选（未全勾或判集空）
  - token 边界钉：subject 含 task-010 不构成 task-01 证据
  - 无 id 勾选行不入判（全无 id 行 → none）
  - review.json 在场构成证据（注入 listReviewsImpl 断言）
verify:
  - node --test test/sentinel-rules.test.mjs
  - npm run lint
constraints:
  - 本批不接线：不 import 进 watcher/verify 收口任何文件（单测是唯一消费方）
  - 不读不写 progress db；无副作用（只读探测）
  - tasksMd 为 null/空串 → none（判集空）
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
