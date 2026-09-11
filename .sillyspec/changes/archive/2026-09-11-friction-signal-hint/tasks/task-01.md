---
id: task-01
title: '新增 src/friction-tally.js（record/consume/render/配置读取 + 路由 + 静默降级）'
title_zh: '新增 src/friction-tally.js（record/consume/render/配置读取 + 路由 + 静默降级）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 10:19:06
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04]
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1]
provides:
  friction-api:
    recordFrictionEvent: '({ cwd, platformOpts, changeName, type, detail }) → 计数+1 落盘（静默降级，enabled=false 直通）'
    consumeFrictionHint: '({ cwd, platformOpts, changeName }) → { hint: string|null, counts: object }；非零即删计数文件'
allowed_paths:
  - src/friction-tally.js
target_files: [NEW:src/friction-tally.js]  # 可选：本 task 计划改动的文件（对账用精确路径清单，格式见下方注释；不填保留 []）
goal: >
  新增摩擦计数数据层模块：record/consume/render 三接口 + 配置读取 + quick 会话路由 + 全静默降级。所有埋点（task-02/03/04）都消费本模块。
implementation:
  - frictionTallyPath 路由：changeName 匹配 /^quick-[0-9a-f]{8}$/ → resolveQuickSessionsDir(platformOpts, specBase)/<changeName>/friction-tally.json；否则 resolveRuntimeRoot(platformOpts, specBase)/friction-tally-<changeName>.json；specBase 模块内部推导（platformOpts?.specRoot || platformOpts?.specDriftAnchor || join(cwd,'.sillyspec')，与 complete.js:125 同序，D-006 CC-04）
  - recordFrictionEvent：读旧计数（损坏按空）→ events[type].count+1/lastAt、history 追加 {at,type,detail} 截尾 20 → writeAtomicSync；类型枚举 gate_rollback/verify_run_failed/review_rejected，非法类型拒绝记录；全 try/catch 返回 null
  - consumeFrictionHint：读计数 → 全零 {hint:null}；非零 renderFrictionHintLine 一行 + 删文件；读失败/enabled=false → {hint:null}
  - readFrictionHintEnabled：解析 local.yaml 的 friction_hint.enabled（正则/行解析先例参照 docs-check 配置读取，不引 yaml 依赖）；缺键/解析异常 = true（R-05）
  - renderFrictionHintLine：counts → 『🩹 本次会话累计摩擦信号：gate 回滚 N 次、验证失败 M 次、审查打回 K 次——若其中有值得沉淀的坑，建议按 现象/根因/护栏/证据 补一条 postmortem（QUICKLOG 条目或正文核对）；护栏结论经人工确认后归入 knowledge/known-issues.md』
acceptance:
  - 两类 changeName 的落盘路径均位于 .runtime 树内（真实变更 runtimeRoot/friction-tally-<change>.json；quick 会话 sessionsDir/<id>/friction-tally.json）
  - 计数文件字段只含 count/lastAt/at/type/detail（detail 为预定义标签），无任何自由文本（D-005）
  - record 三次同类型 → count=3、history 长度 3；21 次 → history 截尾 20
  - consume 非零后文件不存在；再 consume → hint:null
  - enabled=false：record 后文件不存在、consume 恒 null
  - 读写异常（只读目录/损坏 JSON）不抛
verify:
  - npm test -- test/friction-tally.test.mjs
constraints:
  - 不引第三方依赖；不写 console（提示打印由调用方决定）
  - 不改 gates/quality-scan/complete*（那是 task-02/03/04）
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
