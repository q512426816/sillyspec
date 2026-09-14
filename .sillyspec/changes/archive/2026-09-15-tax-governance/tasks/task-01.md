---
id: task-01
title: '字段链——brainstorm.js 三处模板 + decision-distill.js 双触点解析/携带渲染 + stage-contract.js 软警告 + NEW:test/tax-governance-fields.test.mjs'
title_zh: '字段链——brainstorm.js 三处模板 + decision-distill.js 双触点解析/携带渲染 + stage-contract.js 软警告 + NEW:test/tax-governance-fields.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-15 01:20:32
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/stages/brainstorm.js
  - src/decision-distill.js
  - src/stage-contract.js
  - test/tax-governance-fields.test.mjs
target_files:
  - src/stages/brainstorm.js
  - src/decision-distill.js
  - src/stage-contract.js
  - NEW:test/tax-governance-fields.test.mjs
goal: >
  打通「故障面/退役判据」决策字段链——brainstorm 三处模板示例引导新 architecture 决策
  自然写入两字段，distill 双触点解析并携带渲染进 knowledge/decisions 长期可读，gate 侧
  对 architecture+accepted 缺字段条目打软警告不阻断——让机制落地时被迫留痕「它引入
  什么失败模式、什么信号出现就该简化它」（自维护税治理决策侧，FR-01）。
implementation:
  - 测试先行（AGENTS 规则 5）落 test/tax-governance-fields.test.mjs——fixture 覆盖双 case 解析（故障面/退役判据进 entry）、FIELD_LABEL_RE 白名单命中（白名单内字段不留 raw）、fixture 端到端携带渲染（含字段条目蒸馏后输出含「故障面：」「退役判据：」行——AC-2 机器验收）、缺字段容错（存量条目渲染零变形不添空行）、软警告三分支（architecture+accepted 缺字段只 warning 不 error、非 architecture 不警告、definition 类不警告）
  - src/stages/brainstorm.js 三处模板追加可选行——基础字段格式块（约 :165-176）与版本规则示例块（约 :425-437）的条目示例内各加两行可选字段（标签为故障面/退役判据，同既有字段行半角标签格式，值为「本决策引入的新失败模式」「出现什么信号时简化或删除本机制」提示语），生成规范文件步可选字段段（约 :570-596）在锚点/模块域等可选字段说明中补两字段语义——提示性示例非强制，旧格式决策缺字段不受影响
  - src/decision-distill.js 触点一（applyField :73-90）——加 case '故障面'/case '退役判据' 分别存 entry.failureMode/entry.retireWhen（case 写法先例 :82 文件字段行；parseDecisions 的 JSDoc 条目类型同步补两可选属性）
  - src/decision-distill.js 触点二（FIELD_LABEL_RE :170）——白名单正则扩「故障面|退役判据」两标签（缺白名单的字段永远留 raw 静默丢弃，双触点缺一不可）
  - renderBlockLines（:293-308）条目有值时追加「故障面：」「退役判据：」两行——仅非空渲染（先例 :298-299 文件行）；插入位置不得落在「锚点：」行与「文件：」行之间、不得改变既有行相对顺序（test/decision-file-field.test.mjs 行序断言不可扰动，新行落在 rejected 专属行之前）
  - src/stage-contract.js validateBrainstormOutputs/validatePlanOutputs warnings 加软警告——复用两处既有 decisions.md 解析先例（validateBrainstormOutputs 内 :341-357、validatePlanOutputs 内 :393-399），扫描 type=architecture 且 status=accepted 条目缺任一字段则 warnings.push，文案含条目 ID 与「存量可忽略，新决策建议补齐」修复指引；走 warnings 通道非 errors 不阻断（gates :620-625 打印，gates.js 零改动）
  - 编辑前 git log -1 + git diff 核对三个 src 文件最新态（多 agent 并行，AGENTS 规则 16）
acceptance:
  - 含「故障面/退役判据」字段的 decisions.md 条目经解析后 entry.failureMode/entry.retireWhen 有值且 FIELD_LABEL_RE 白名单命中（不落 raw）
  - 端到端（AC-2 机器验收）——fixture 条目归档蒸馏后 knowledge/decisions 渲染输出含「故障面：」「退役判据：」精确行，两行均仅非空渲染
  - 存量条目（无两字段）渲染输出与改动前字节级一致——零迁移、幂等重归档不添空行
  - 「锚点：」行与「文件：」行相对顺序不变，test/decision-file-field.test.mjs 既有断言保持绿
  - 软警告——architecture+accepted 缺字段条目产生含条目 ID 的 warning 且不产生 error；非 architecture 条目与 definition 类条目不产生该警告；「存量可忽略，新决策建议补齐」文案在场
verify:
  - node test/tax-governance-fields.test.mjs
  - npm run lint
constraints:
  - 只改 allowed_paths 四文件；gates.js 零改动（软警告经 stage-contract warnings 通道天然打印）
  - 不做字段硬必填——软警告不升 error 不阻断（一个观测周期后再评估棘轮升级，D-001 退役判据锚定）
  - renderBlockLines 新行不得插在「锚点：」与「文件：」行之间、不得扰动既有行序（decision-file-field.test 行序断言红线）
  - 不触 task-02 边界（friction-tally/台账/doctor 侧零改动）；存量 decisions 条目零改写
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
