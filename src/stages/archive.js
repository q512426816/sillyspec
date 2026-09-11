export const definition = {
  name: 'archive',
  title: '归档变更',
  description: '规范沉淀，可追溯',
  steps: [
    {
      name: 'decision-distill 决策提炼',
      // noAI 化（P0-4 安全变体，noai-ir-roadmap §3）：旧 prompt 本身就是「调用 CLI 纯函数
      // distillIntoKnowledge 并转述返回」——全流程最纯的中继步，LLM 零判断增量。提炼本体
      // 改由 _cliAction（run/archive-distill.js）机械执行：written 逐条打印 / skipped 零输出
      // 注记 / needsWait（rejected 缺字段）打印裁决指引——人工裁决从本步 conditionalWait
      // 三段式收敛到「确认归档 --confirm」的用户确认点（归档用户裁决本就归那里）。全路径
      // 不抛（裁决是确认步输入，非本步阻断条件）；异常降级跳过不阻断归档（旧步第 4 点
      // best-effort 语义）。步骤名不变（存量进度库按名匹配零漂移）。
      noAI: true,
      _cliAction: 'archiveDistill',
      prompt: '',
      outputHint: '决策提炼结果（CLI 机械执行输出）',
      optional: false
    },
    {
      name: 'extract-module-impact 与归档语义收尾',
      // P0-4 全量并步（noai-ir-roadmap §3，含 §2 砍步取证）：吸收旧「任务完成度检查 /
      // extract-module-impact / sync-module-docs / 更新路线图和提交」四步——取证结论：
      // 三处注视点（完成度暂停判定 / 模块文档同步异常裁决 / 确认归档 diff 注视）全部保留，
      // 合并只砍仪式性 --done 往返（6 步 6 次 → 3 步 2 次人工 --done + 1 次 noAI）。
      // 步骤名保留「extract-module-impact」子串：complete-handlers 的 workflow post_check
      // 按名内含匹配本步，零改动。conditionalWait 合并 sync-module-docs 先例（坑
      // archive-subconfirm-redundant）：常规直接写入 + --done，异常才 --wait。
      migratedFrom: ['任务完成度检查', 'extract-module-impact', 'sync-module-docs', '更新路线图和提交'],
      conditionalWait: true,
      repeatableWait: true,
      maxWaitRounds: 3,
      waitReason: '等待用户裁决归档语义收尾异常（模块文档同步/完成度存疑）',
      waitOptions: ['确认继续', '跳过该项'],
      prompt: `归档语义收尾：完成度判定 → module-impact 终审 → 模块文档同步 → 路线图更新，一次完成。

### ① 任务完成度判定（真相源 = review.json）
#### 客观完成度报告（CLI 已注入，勿自行数 checkbox）
{TASK_COMPLETION_REPORT}
- tasks.md 的 - [x] checkbox 仅作显示态参考（自动回填可能停在未勾态，与客观 verdict 不一致时以报告为准）。
- 报告「未通过 / 缺失」= 0 且 source 为 review.json → 完成度合格，继续 ②。
- 「cannot_verify 草稿（未真正复核）」计数 > 0 → 先确认 verify 阶段已兑现其 requiredEvidence；缺证据的派独立子代理对照 task brief + git diff 补真实复核（升级 pass/fail），勿静默放行。
- source 为 plan-checkbox-fallback（客观源不可用）或存在未完成任务 → --wait 请用户裁决，勿自行放行。

### ② module-impact 终审（机械核对已由 CLI 代算——不要重跑 git diff 手工比对，直接消费报告）
{ARCHIVE_IMPACT_AUDIT}
- 报告标「不一致」的项才需裁决修正 module-impact.md（以 git diff 为准——真实 > 记录）；「一致 ✓」跳过。
- module-impact.md 缺失时先跑 \`sillyspec module-impact --change <change-name>\` 生成骨架（含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」三章节——workflow contains_sections 契约同源，勿删章节；归属列 CLI 预填），逐行填「影响类型」与 review 标记，未命中文件归「未匹配文件」章节；首行标题用中文 \`# 模块影响分析（Module Impact）— <变更简述>\`。

### ③ 模块文档同步（结构化事实改 _module-map.yaml，语义解释改模块卡片，一个信息只维护一次）
- 按 module-impact 影响类型更新 _module-map.yaml（paths/depends_on/used_by/entrypoints/status/needs_review）与受影响模块卡片（契约摘要/关键逻辑/定位/注意事项；内部实现变化通常不更新卡片）。
- 人工备注（MANUAL_NOTES 标记区间）永远保护回填；标记缺失/重复 → needs_review: true。
- 新建卡片用骨架模板（frontmatter \`author: <git-user>\` / \`created_at: <now-datetime>\` 占位符由 CLI 每步替换真值，照抄即过元数据校验）；一级标题 \`# <中文名>（<module-id>）\`。
- 常规（无 needs_review 影响/无 unmapped/人工备注标记齐全）→ 直接写入 + --done；异常（needs_review/unmapped/备注标记缺失/覆盖丢手动字段）→ --wait 请用户裁决。
- 回填 module-impact.md「更新结果」表（目标列 \`_module-map.yaml: <module-id>\` 或 \`modules/<module-id>.md\`，区分 done/skipped）——verify 已硬校验无 pending 死信，此处保持清零。
- 如需 rebuild 索引：\`sillyspec modules rebuild --force\` 会清空手动维护字段，仅当可接受时用（优先手动更新）。

### ④ 路线图更新
- \`.sillyspec/ROADMAP.md\` 存在 → 标记对应 Phase 为已完成。
- DB 注销由「确认归档」--confirm 时 CLI 完成（unregisterChange），无需手动。

### 输出
完成度判定结论 + module-impact 修正摘要 + 已同步文件列表 + 路线图更新（异常时附裁决结果）`,
      outputHint: '归档语义收尾结果',
      optional: false
    },
    {
      name: '确认归档',
      prompt: `确认归档内容，由 CLI 执行目录移动。

### 操作
1. 展示：变更目录名、包含的文件列表（含 module-impact.md）、生成总结
2. 展示变更范围对账表（计划改动 × 实际改动三态全表 + 行数——CLI 机械注入如下，勿手算勿手改；⚠️ 计划外文件补 design.md 声明或 --output 注明原因，计划未动文件确认是否遗漏；advisory 对账不阻断归档，注入异常时该区置换单行降级指引，回退手跑 \`sillyspec scope-audit --change <变更名>\`）：

{SCOPE_AUDIT_TABLE}

3. 确保任务清单（tasks.md）所有 task checkbox 都已勾选；对照下方完成度快照做归档前最后注视（未完成/存疑 → 停下勿确认）：
{TASK_COMPLETION_REPORT}
4. 若上一步机械决策提炼输出「⚠️ rejected 决策缺否决理由/复潮条件（needsWait）」：先按其指引处理——补录 decisions.md 缺失字段后重跑提炼命令（幂等），或经用户裁决跳过该条；处理结果写进本步 --output
5. **git 暂存已由 CLI 自动完成**（归档完成时自动 add：\`.sillyspec/changes/archive/\`、本次同步的模块文档、\`.sillyspec/knowledge/decisions/\`——未提交，由用户通过统一提交工具处理）——你不需要也不应该手动 git add
6. 让用户确认后，用 \`--confirm\` 完成本步骤：
   \`sillyspec run archive --done --confirm --output "确认归档"\`
7. CLI 会创建 \`.sillyspec/changes/archive/\`，并将变更目录移动到 \`.sillyspec/changes/archive/<原变更名>/\`

### 输出
归档完成 + archive 目录路径`,
      outputHint: '归档确认',
      // 坑 archive-batch-31-tool-notes ②：完成本步必须带 --confirm（complete-handlers 门控），
      // 但 outputStep 机器生成的「完成后执行」提示原是通用 --done 模板不带 --confirm——agent
      // 照抄执行就撞「请添加 --confirm」。requiresConfirm 让提示行带上该 flag（数据驱动，其他
      // 阶段未来有确认步同样声明即可）。
      requiresConfirm: true,
      optional: false
    },
  ]
}
