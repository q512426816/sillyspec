---
id: task-03
title: 'Reconcile interface-contract.md: 3 drifts, informational sweep, codes catalog + semantic-change record'
title_zh: 'interface-contract.md 对账——命令面新增 progress show 子节（编号顺延不撞 §1.3/§1.3b）、check 表补 design-file-list 行、transition §2.3 重写为参与 ok + :123/:135/:241 informational 残留全清 + 161-173 旧示例替换、新增诊断码目录节（与码表对账）与 v1 存续期语义变更记录节、frontmatter updated_at'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:25:55
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-001@v1, D-003@v1, D-005@v1]
allowed_paths:
  - docs/sillyspec/interface-contract.md
expects_from:
  task-01: 'DIAGNOSTIC_CODES 10 码清单（码目录节内容源）'
goal: >
  对账基准文档恢复「契约==实现」单一真相：三项漂移销账 + informational 全清 + 码目录与语义变更记录两新节。
implementation:
  - §1 命令面新增 progress show 子节（runStatusOverview：DB 缺失 exit 2 / ghost 与未决冲突升 warnings / data=overview 形状；编号顺延现有小节，不撞 §1.3/§1.3b docs check/gate）
  - §2 check 表补 design-file-list 行（brainstorm 条件性 check、fail-open 自身异常不误拦）+ transition 行从 informational 改为参与综合 ok
  - §2.3 重写：transition 参与综合 ok（与 completeStep 硬阻断一致，防 gate exit 0 而 --done 硬阻断的判定分裂）；161-173 行旧 informational 示例整段替换为参与 ok 语义新示例；:123「仅 transition 标 true」行、:135/:241 退出码表 informational 残留全清
  - 新增「诊断码目录」节：锚定标题（如 ## 诊断码目录（Diagnostic Codes））+ 每码一行 token（`code` | surface | exit 语义 | 触发条件），内容与 DIAGNOSTIC_CODES 逐码一致（parity 测试按锚定标题+token 解析）；节内说明 codes 聚合非 1:1、check.code 恒在场非失败标志
  - 新增「v1 存续期语义变更记录」节：transition 条目（变更日期 2026-09-17 / 旧语义 informational 不参与 ok / 新语义参与 ok exit 1 / 消费侧影响=SillyHub gate.py exit_code 三分支实证，旧语义非法转移会被判推进）
  - 信封 schema 段补 codes/checks[].code 两键的加法式说明（optional-once 约定内）；frontmatter updated_at
acceptance:
  - grep -c informational 正文（语义变更记录节外）=== 0
  - 码目录节 token 集合 === DIAGNOSTIC_CODES 键集（10 码，task-05 parity 将钉死）
  - check 表含 design-file-list 行；命令面含 progress show；§2.3 无「不参与综合 ok」表述
verify:
  - grep -n "informational" docs/sillyspec/interface-contract.md（仅语义变更记录节允许出现）
  - grep -c "design-file-list\|progress show" docs/sillyspec/interface-contract.md
constraints:
  - 纯文档改动，零代码
  - JSON 示例标注来源（真实 CLI 输出对样在 task-06 收口；本 task 允许标注「待 task-06 对样」的示例占位——但语义必须与 task-02 实现约定一致）
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
