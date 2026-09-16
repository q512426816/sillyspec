---
id: task-03
title: 'Five-case tests for probe9 guard consistency (NEW test file, EHS doSubmit mini fixture)'
title_zh: '测试——NEW:test/probe9-guard-consistency.test.mjs 五用例（EHS doSubmit 缩小版）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 20:16:18
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1]
allowed_paths:
  - test/probe9-guard-consistency.test.mjs
target_files:
  - NEW:test/probe9-guard-consistency.test.mjs
expects_from:
  - task-01: 三导出契约 clusterMutationMethods/detectGuardSignals/runProbe9GuardConsistency（design 接口定义）+ renderProbe9Lines 渲染形态
goal: >
  新增 test/probe9-guard-consistency.test.mjs 五用例（EHS doSubmit 越权案例缩小版 fixture），
  锁定探针9 聚类/信号/告警/边界/豁免全路径行为，防后续演进漂移。
implementation:
  - fixture 手法参照 test/probe8-contract-pivot.test.mjs（mkdtempSync 临时根注册清理 :26-28 + mkFixture 组装 :31 起）——临时仓写 .sillyspec/changes/<change>/design.md 文件变更清单（:62-69 同款表格形态）+ .java 源文件，直调三导出断言（不经 CLI）
  - 用例1 不一致命中——Order 实体 submit（无守卫）/deleteOrder（含 userId.equals(order.getCreateBy())）/withdrawOrder（含 canHandle 调用）同文件 → inconsistentGroups 含 Order 组、unguarded 含 submit、guarded 含两方法、signals 含命中信号类别（design 测试与验收 1）
  - 用例2 全守卫零告警——组内三方法全部含守卫信号 → inconsistentGroups 空（design 2）
  - 用例3 单方法组 skipped——同文件仅一个变更方法 → 不成组（groupCount=0）+ 注记（design 3）
  - 用例4 注解式命中——方法签名前 3 行带 @PreAuthorize 判有守卫，同组无注解方法 → 不一致命中且信号类别=注解式（design 4）
  - 用例5 非Java与豁免——清单仅 .js → 不适用注记（renderVerifyProbesReport 含「#### 探针 9」段且不空段）；.java 首行 // probe9-skip → 整文件跳过零产出（design 5）
  - 纯函数直调——clusterMutationMethods/detectGuardSignals 在用例1/3/4 内同步直调，锁定组形态与信号类别（R-01/R-02 回归锚）
acceptance:
  - 五用例全绿——node --test test/probe9-guard-consistency.test.mjs 逐条对应 design 测试与验收 1-5
  - 不一致命中断言含信号类别（当前用户比对/能力类/注解式逐类可见），非仅计数
  - 全守卫/单方法组/豁免三负例零告警零空段（宁漏勿误口径锁定）
  - 既有 probe8/postcheck 相关测试面零触碰（本卡不改 src、不改既有测试文件）
verify:
  - node --test test/probe9-guard-consistency.test.mjs
  - npm test
constraints:
  - 纯测试卡——不改 src/（实现缺陷回 task-01 修逻辑，不在测试卡改实现凑绿）
  - fixture 独立可重复——tmpdir 隔离 + test.after 清理（probe8 套件同款），不依赖仓内既有文件状态
  - Windows 兼容——路径 join、不硬编码 /tmp、断言行尾无关
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
