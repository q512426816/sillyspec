---
id: task-05
title: 'prompt 面与配置（stages/plan.js + stages/brainstorm.js + run/prompt.js + config-schema.js）——plan_level 编排标签语义+「仪式按 risk 计价」文案+强制轻仪留痕；Grill 档位化菜单渲染（S3 两轮/S2 一轮/S1 CLI清单+探针/S0 CLI清单）；ceremony.force_tier/shadow 键+example；docs/prompt 镜像三步流水线同步'
title_zh: 'prompt 面与配置（stages/plan.js + stages/brainstorm.js + run/prompt.js + config-schema.js）——plan_level 编排标签语义+「仪式按 risk 计价」文案+强制轻仪留痕；Grill 档位化菜单渲染（S3 两轮/S2 一轮/S1 CLI清单+探针/S0 CLI清单）；ceremony.force_tier/shadow 键+example；docs/prompt 镜像三步流水线同步'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 14:24:22
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1, D-005@v1]
allowed_paths:
  - src/stages/plan.js
  - src/stages/brainstorm.js
  - src/run/prompt.js
  - src/config-schema.js
  - docs/prompt/plan.md
  - docs/prompt/brainstorm.md
  - docs/prompt/_extracted.json
target_files:
  - src/stages/plan.js
  - src/stages/brainstorm.js
  - src/run/prompt.js
  - src/config-schema.js
  - docs/prompt/plan.md
  - docs/prompt/brainstorm.md
  - docs/prompt/_extracted.json
expects_from:
  - task-02: 'classifyReviewTier 返回 {tier, ceremonyTier} 双字段（并保留既有 reason/fileCount 字段）——本卡三处消费一律读 ceremonyTier 驱动仪式档，plan_level 仅作编排参考'
goal: >
  prompt 面与配置承接档位定价（FR-02 / D-002 / D-005）：plan_level 输出降级为编排标签
  （仪式按 risk 计价，agent 报 full 但档位 S1 时 CLI 强制轻仪留审计痕）、brainstorm Step7
  Grill 与 run/prompt 的 {REVIEW_TIER} 注入按 S 档渲染仪式菜单（S1 默认 CLI 清单核验+
  定向探针抽查，自审仅通道全不可用时降级兜底带 degraded 戳）、config-schema 登记
  ceremony.force_tier / ceremony.shadow，docs/prompt 镜像三步流水线同批次落盘。
implementation:
  - src/stages/plan.js：plan_level 编排标签语义改写——分类步（:57 起）/ 生成步（:133 起）/ 模板段（none/light/full，:150-219）文案统一改为「plan_level 只决定 wave 拆分 / 并行子代理 / plan 模板厚度（工作量轴），仪式档位一律由 ceremony_tier 决定（风险轴）」；加「仪式按 risk 计价，plan_level 仅编排」明示文案；agent 报 full 但档位 S0/S1 时 CLI 强制轻仪并留审计痕（判定读 ceremonyTier，审计痕为固定文案行输出，照既有降级戳先例）
  - src/stages/brainstorm.js Step7（Design Grill 交叉审查步，:375 起）：Grill 档位化菜单渲染——S3 两轮 Grill / S2 一轮独立评审 / S1 CLI 清单核验 + 定向探针抽查 / S0 CLI 清单核验（零 token 机械项）；agent 自审仅作评审通道全不可用时兜底且输出带 degraded 戳（沿用 self=降级态既有语义，D-005）；tier 读 classifyReviewTier 双字段的 ceremonyTier
  - src/run/prompt.js {REVIEW_TIER} 注入段（:1070-1088）随档位化改写：classifyReviewTier 第三消费面——注入不再以 plan_level 三分支驱动仪式档，改按 ceremonyTier 分档渲染（{REVIEW_TIER_REASON} 同步档位化理由文案；消费契约见 expects_from）
  - src/config-schema.js：LOCAL_YAML_SCHEMA 登记 ceremony.force_tier（S0|S1|S2|S3 枚举逃生阀）/ ceremony.shadow（影子期开关）两 live 键（readers/desc/example 齐）+ renderExample() 策展模板同步补 ceremony 段——「每个 live 键必现于 example 文本」既有耦合测试保不漏（加键忘 example 即测试红，design 文件清单 Grill 评审补遗）
  - docs/prompt 镜像三步流水线同批次落盘：改完 src/stages/*.js 的 prompt 后重跑 node docs/prompt/_extract.mjs 刷新 _extracted.json，再同步 docs/prompt/plan.md 与 docs/prompt/brainstorm.md（docs/prompt/README.md:199 流水线契约；R-03 镜像测试红防线）
  - 连带测试预告（定向回归，测试文件不在本卡 allowed_paths、不本卡修）：worktree-execute-spec-drift.test.mjs（{REVIEW_TIER} 断言）+ 约 20 个 plan_level 文案测试（计划评审发现②）——红了由 task-07 面统一收口或按对齐认领增量处理
acceptance:
  - plan 阶段 prompt 全文不再有「plan_level 决定评审 / 仪式强度」语义；「仪式按 risk 计价，plan_level 仅编排」文案在场
  - agent 报 plan_level=full 而档位 S1 的场景：CLI 强制轻仪执行且留审计痕（不因「计划写得完整」进入 independent×2——FR-02 任务②同款不再全价场景）
  - brainstorm Step7 按 ceremonyTier 渲染四档菜单：S3 两轮 / S2 一轮独立 / S1 CLI 清单+定向探针抽查 / S0 CLI 清单；通道全不可用兜底输出带 degraded 戳
  - run/prompt.js {REVIEW_TIER} 注入按 ceremonyTier 分档（plan_level 不再驱动仪式档），{REVIEW_TIER_REASON} 随档输出
  - config schema --json 可查 ceremony.force_tier / ceremony.shadow 且 status=live；renderExample() 文本含两键示例行
  - docs/prompt/plan.md、docs/prompt/brainstorm.md 与 _extracted.json 同批次一致（镜像流水线零漂移）
verify:
  - npm test（含 config-schema 耦合与 docs/prompt 镜像校验；worktree-execute-spec-drift 等预告面红了按 implementation 末条处置）
  - npm run lint
constraints:
  - 只动 allowed_paths 七文件；镜像三步流水线必须同批次落盘——改 md 不重跑 _extracted.json 即镜像校验红（R-03）
  - 不动 L1 机械门一行；不动 gates.js / review-tier.js（task-02/03 并行面，Wave 2/3 无共享文件）
  - 档位判定不重新实现：三处消费只认 classifyReviewTier 双字段契约（定价单点在 ceremony-tier.js，引擎归 task-01）
  - 仓内 .sillyspec/local.yaml.example 不手改——init 经 renderExample() 落盘且耦合测试已保同步面（该文件不在 allowed_paths）
  - 既有 plan.md frontmatter plan_level 字段与消费链保留（prompt.js:1084 等锚点读取不删），只改语义文案不做格式迁移
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
