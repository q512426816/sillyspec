---
id: task-05
title: calibrate-thresholds-via-sillyhub-replay
title_zh: '阈值校准——sillyhub 真实图谱重放重算交叉表定稿 THRESHOLDS'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 10:02:07
priority: P1
depends_on: ['task-03']
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-006@v1]
allowed_paths:
  - src/quick-gate-profile.js
  - .sillyspec/changes/2026-09-14-quick-exit-tiered-gates/design.md
target_files:
  - NEW:src/quick-gate-profile.js
expects_from:
  task-03:
    - contract: ScopeAuditGateExit
      needs: [gateProfile-json]
provides:
  - contract: CalibratedThresholds
    fields: [thresholds-final, calibration-evidence]
goal: >
  用 scope-audit --json 对 sillyhub（multi-agent-platform 仓）历史 quick 会话按其真实
  _module-map.yaml 批量重放，重算「模块跨度×文件数×文档同步率」交叉表，对照初值校准
  定稿并回写 THRESHOLDS，校准依据落 design.md 校准记录段。
implementation:
  - 消费 task-03 的 ScopeAuditGateExit 契约（needs=gateProfile-json），对 sillyhub 仓 .sillyspec/quicklog/ 与 .sillyspec/changes/archive/ 历史 quick 会话用 scope-audit --json 批量重放
  - 按 sillyhub 真实 docs/sillyspec/modules/_module-map.yaml 前缀聚类重算「模块跨度×文件数×文档同步率」交叉表
  - 对照 THRESHOLDS 初值（L1_SPAN=2/L1_FILES=4/L2_SPAN=4/L2_FILES_DEGRADED=8）核对档位边界，定稿值回写 src/quick-gate-profile.js 的 THRESHOLDS（thresholds-final）
  - 校准依据（重放样本量 n、交叉表关键格子数字、定稿理由）写入 design.md 校准记录段（calibration-evidence）
acceptance:
  - 重放样本量 n 与交叉表关键格子数字记录在案（落 design.md 校准记录段）
  - THRESHOLDS 定稿值回写 src/quick-gate-profile.js 后 npm test 全绿，阈值边界单测随定稿值同步通过
  - design.md 校准记录段含校准依据（样本量、交叉表关键数字、定稿理由）
verify:
  - npm test
  - npm run lint
constraints:
  - 只改 src/quick-gate-profile.js 的 THRESHOLDS 常量与 design.md 校准记录段，不改 computeGateProfile 逻辑
  - 不动 .sillyspec/docs/ 模块卡（core-engine.md 唯一写者归 task-06，W4/W5 共写冲突已裁决）
  - 初值与重算交叉表显著冲突（档位边界移动）时不自行定稿，升级用户裁决
  - 定稿值回写的是代码内默认值（THRESHOLDS/local.yaml.example 同步更新）；用户 local.yaml 覆写键优先于默认值（D-009），校准不触碰用户配置
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
