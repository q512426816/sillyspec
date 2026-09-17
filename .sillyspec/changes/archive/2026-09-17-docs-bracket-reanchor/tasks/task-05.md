---
id: task-05
title: '文档镜像同步——interface-contract.md §1.3b 自动重锚行为与守卫边界'
title_zh: '文档镜像同步——interface-contract.md §1.3b 自动重锚行为与守卫边界'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 09:19:45
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-002@v1]
allowed_paths:
  - docs/sillyspec/interface-contract.md
target_files:
  - docs/sillyspec/interface-contract.md
expects_from:
  task-02: { contract: docs-gate-reanchor, needs: [触发条件, 落盘+披露+reanchored 行为, 守卫边界] }
goal: >
  interface-contract.md §1.3b 是 docs gate 的对外契约镜像，task-02 新增的陈旧分支自动重锚行为需同步进契约（触发条件/行为/守卫边界/reanchored 字段），防文档与实现漂移（FR-03 文档镜像随行）。
implementation:
  - '§1.3b 增一条自动重锚条目（:85 首次立线条目之后就近插入）：触发条件 = 基线已存在 && current > baseline && 远端实测成功且 current ≤ 实测值 && 未显式传 --paths 等 checkOpts 覆盖（一次性异口径不写盘；local.yaml 持久口径不受限）；行为 = 自动落盘新基线（= 本次实测 current）+ 消息披露重锚前后值与依据 + 返回结构含 reanchored: true'
  - '同条目明确红线不变：首次立线仍 fail-closed（无基线必须显式 --init-baseline，不悄悄合法化存量）；快路径/真增量拦截语义不变'
  - '§1.3b 内 --json 输出字段行（:87）补 reanchored 字段（与 task-02 返回面一致，节内动作）'
  - '行文风格对齐 §1.3b 既有条目（短条目 + 加粗关键词）；不引入实现细节（临时 worktree 等内部机制不进契约）'
acceptance:
  - '条目覆盖四要素：触发条件、落盘+披露+reanchored 行为、守卫边界、首次立线 fail-closed 不变'
  - '§1.3b 的 --json 字段清单含 reanchored'
  - '其余节（含 §1.3、§2 envelope schema）零改动'
verify:
  - 'grep -nE "自动重锚|reanchored" docs/sillyspec/interface-contract.md（命中且仅落在 §1.3b 段内）'
constraints:
  - '只动 §1.3b（:80-90 范围），不越节'
  - '描述接口语义（触发/行为/守卫/返回面），不写实现细节（worktree 机制、代码行号不进契约）'
  - '与 task-02 落地实现对齐描述，不超前承诺'
  - '不改代码、不改测试'
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
