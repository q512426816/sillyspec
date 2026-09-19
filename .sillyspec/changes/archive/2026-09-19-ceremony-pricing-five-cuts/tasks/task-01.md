---
id: task-01
title: 'Blast declaration surface mechanism: NEW src/blast-surface.js (resolveBlastSurfaces/loadBlastDeclarations) + _module-map.yaml blast bootstrap + local.yaml blast_surfaces raise-only merge + modules.js --force top-level reinsertion + NEW test/blast-surface.test.mjs + NEW test/modules-rebuild-preserve.test.mjs'
title_zh: '声明面机制——NEW:src/blast-surface.js（resolveBlastSurfaces/loadBlastDeclarations）+ _module-map.yaml 自举 blast 段 + local.yaml blast_surfaces 只升 + modules.js --force 顶层段文本回插 + NEW:test/blast-surface.test.mjs + NEW:test/modules-rebuild-preserve.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 08:26:56
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: ['D-008@v1→v2', 'D-010@v1']
allowed_paths:
  - NEW:src/blast-surface.js
  - src/modules.js
  - src/config-schema.js
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - NEW:test/blast-surface.test.mjs
  - NEW:test/modules-rebuild-preserve.test.mjs
target_files:
  - NEW:src/blast-surface.js
  - src/modules.js
  - src/config-schema.js
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - NEW:test/blast-surface.test.mjs
  - NEW:test/modules-rebuild-preserve.test.mjs
provides:
  - contract: blast-surface-loader
    fields: [resolveBlastSurfaces, loadBlastDeclarations]
    desc: 'resolveBlastSurfaces(files, declarations) 返回 { tier, evidence, hitPrefixes }（纯函数，无命中 tier=S1）；loadBlastDeclarations({ specBase, project, localCeremonyConfig }) 返回 BlastDeclaration[]（map blast 段 + local 只升合并）——src/blast-surface.js 导出，task-03 八消费点与 resolveChangeRisk 复用其前缀匹配文法'
goal: >
  落地 blast 轴项目化的声明面机制（FR-01 / D-008@v1→v2 / D-010@v1）：新建 src/blast-surface.js
  （resolveBlastSurfaces 前缀匹配纯函数 + loadBlastDeclarations：_module-map.yaml 顶层 blast 段 ×
  local.yaml ceremony.blast_surfaces 只升合并），本仓 map 自举 blast 声明段（S3+evidence 真运行时域 /
  S2 门禁判定），modules rebuild --force 写盘时未知顶层段文本回插防丢，配齐声明面解析与 rebuild
  保留两组新测试——为 task-03 八消费点接线提供正确的 blast 输入源，替换撞词≠危险的硬编码词表判级。
implementation:
  - '新建 src/blast-surface.js：导出 resolveBlastSurfaces(files, declarations) 纯函数——files POSIX 归一后对声明条目做前缀匹配（字面量或目录前缀，matchModuleForFile 同款语义，参照 src/ceremony-tier.js:113 / src/quick-gate-profile.js:112；零新正则族、不发明第二套文法），返回 { tier, evidence, hitPrefixes }：tier = 命中条目最高档（无命中 → S1），evidence = 任一命中条目带 evidence: true'
  - 'src/blast-surface.js：导出 loadBlastDeclarations({ specBase, project, localCeremonyConfig })——解析 _module-map.yaml 顶层 blast: 段（条目 { prefixes: string[], tier: S0~S3, evidence?: boolean }）+ local.yaml ceremony.blast_surfaces（仅 { prefixes, tier }）；合并语义逐文件取 max(map 命中档, local 命中档)、local 永不压低、不承载 evidence；map 段缺失/坏形态 → 空表（不缺省不拦截，与 moduleIndex 同立场）'
  - 'src/config-schema.js:229-237 ceremony 段新增键 ceremony.blast_surfaces（元素 { prefixes: [...], tier: S0~S3 }），键注记明示「只升不降、不承载 evidence（证据语义属共享 map）」；同段 note（src/config-schema.js:232）「agent 自报只可升不可降」表述改「无摩擦随声明重定价、有摩擦地板不退」；:448-452 底部 YAML 模板注释面同步两处口径（blast_surfaces 示例行 + 只升不降表述）——config-schema 全部改动归本 task（协调裁定：task-04 不再触该文件）'
  - 'src/modules.js rebuildModuleMap（:65-195）：--force 写盘（src/modules.js:187 writeFileSync）前从 existingMap 原文本提取顶层 blast: 段原样回插进重发射 yaml——未知顶层段通用回插、不为 blast 特判（现发射面 src/modules.js:119-125 只产 schema_version/generated_at/generator/source_commit/modules，per-module 字段白名单 src/modules.js:166 不含任何顶层段）；map 头注警告同步提及 blast 段；非 force dry-run 分支（src/modules.js:181-185）零改动'
  - '.sillyspec/docs/sillyspec/modules/_module-map.yaml 增自举顶层 blast: 段（D-010 口径）——tier S3 + evidence: true：src/agent-session-log.js、src/friction-ledger.js、src/friction-tally.js、src/semantic-guard.js、src/workspace.js、src/runtime-hygiene.js、src/progress/、src/db.js、src/db-engine.js、src/worktree.js、src/worktree-apply.js、src/worktree-cross.js、src/worktree-deps.js、src/wt-commit.js、src/git-helper.js、src/review-dispatch.js、src/dispatch/；tier S2（无 evidence）：src/stage-contract.js、src/stage-contract-engine.js、src/stage-contract-spec.js、src/verify-postcheck.js、src/verify-probes.js、src/ceremony-tier.js、src/review-tier.js、src/change-risk-profile.js、src/blast-surface.js、src/quick-gate-profile.js、src/probe7-anchor-check.js、src/run/gates.js、src/run/complete.js；其余路径零声明（S1 起步）。执行期清单微调允许、口径不变：S3 只钉真运行时域、门禁判定 ≤S2、core-engine 不整模块标价'
  - '新建 test/blast-surface.test.mjs（声明面组）：前缀匹配形态（字面量/目录前缀/POSIX 归一跨平台）/无命中 S1/local 只升不压低/map 段缺失空表/evidence 位传递'
  - '新建 test/modules-rebuild-preserve.test.mjs（rebuild 保留组）：--force 写盘后 blast 段在场且字节不变；非 force 不写盘双面断言（禁「非 force 保留 blast 段」单面断言——dry-run 本就不写盘、无保护力）'
acceptance:
  - 声明面解析（plan 全局验收 1）：前缀命中取最高档、未命中 S1、local 只升不压低、map 段缺失空表、evidence 位传递——test/blast-surface.test.mjs 全绿
  - rebuild 保留（plan 全局验收 2）：--force rebuild 写盘后 blast 段原样在场（字节级）；非 force 依旧不写盘——test/modules-rebuild-preserve.test.mjs 双面断言全绿
  - 本仓 _module-map.yaml 自举 blast 段按 D-010 口径落盘：S3+evidence 只挂真会话/租约/worktree/dispatch 域、门禁判定文件 ≤S2、core-engine 不整模块标价、其余路径零声明
verify:
  - node --test test/blast-surface.test.mjs test/modules-rebuild-preserve.test.mjs
  - npm run lint
constraints:
  - rebuild：--force 写盘时从 existingMap 文本提取顶层 blast 段原样回插（未知顶层段通用回插）；回归钉断言写盘后在场且字节不变；非 force 是 dry-run 不写盘（无保护力断言禁止）。
  - local.yaml blast_surfaces 只升不降、不承载 evidence。
  - 未命中声明面 → blast S1；未配置项目禁止回退旧词表；map 段缺失/坏形态 → 空表不缺省不拦截。
  - 零新正则族；路径匹配复用 matchModuleForFile 语义。
  - 价目表零改动：档位集合 S0~S3、三轴 max 公式、SPAN_FILES_THRESHOLD=8、FRICTION_ESCALATION_THRESHOLD=2、force_tier 只升不降。
  - 多 agent 铁律：stage-contract.js/gates.js 等共享文件 Edit 前重读最新态、锚点漂移核对（_module-map.yaml 为共享已提交文件，同适用）。
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
