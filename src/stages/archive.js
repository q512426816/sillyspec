export const definition = {
  name: 'archive',
  title: '归档变更',
  description: '规范沉淀，可追溯',
  steps: [
    {
      name: '任务完成度检查',
      prompt: `检查任务完成度，决定是否可归档。

### 客观完成度报告（CLI 已注入，勿自行数 checkbox）
{TASK_COMPLETION_REPORT}

### 判定规则
- **真相源 = review.json verdict**：上方报告由 CLI 从 .runtime/execute-runs/<runId>/tasks/task-NN/review.json 的 specVerdict + qualityVerdict 算出。
- tasks.md 的 - [x] checkbox **仅作显示态参考**：它依赖自动回填，runId marker / review 缺失时会停在未勾态，与客观 verdict 不一致时**以本报告为准**，不要被未勾 checkbox 误导。
- 报告「未通过 / 缺失」= 0 且 source 为 review.json → 完成度合格，进入下一步。
- 报告含「cannot_verify 草稿（未真正复核）」计数 > 0 → 这些 task 只有 cannot_verify 草稿兜底、未被真正复核：先确认 verify 阶段已兑现其 requiredEvidence（verify-result.md 有对应证据），缺证据的派独立子代理对照 task brief + git diff 补真实复核（升级为 pass/fail），勿静默放行。
- 报告 source 为 plan-checkbox-fallback（客观源不可用）→ 完成度无法客观确认，**必须暂停**让用户交叉核对，不要直接放行。
- 存在未完成任务 → **必须暂停等待用户决定**，不要自行判断"可以归档"。
   - 调用：sillyspec run archive --wait --reason "存在未完成任务，是否继续归档" --options "继续归档,回到execute完成剩余任务" --output "未完成任务列表"

### 输出
完成度报告（已通过/总数 + 数据源 + 未完成任务列表）`,
      outputHint: '完成度报告',
      optional: false
    },
    {
      name: 'extract-module-impact',
      prompt: `最终确认 changes/<change>/module-impact.md（本次变更的模块影响分析）。该文档由 plan review_plan 步生成首版、execute 各 Wave 更新、verify 核对——本步是归档前最后一次确认（module-impact 已非 archive 生成，改活文档终审）。

### 操作
1. 读取 changes/<change>/module-impact.md（应已存在；large 变更 plan 阶段产出首版）
2. 运行 git diff --name-only HEAD~1（或 git diff --name-only --cached）获取真实修改文件列表
3. 三重核对：module-impact.md 记录的受影响模块/文件 vs 真实 git diff 文件列表 vs .sillyspec/docs/<project>/modules/_module-map.yaml 模块映射（不存在则仅核 unmapped 部分）。以 git diff 为准（真实 > 记录）
4. 发现不一致（漏标受影响模块 / 影响类型错误 / 实际未触碰的模块被误标）→ 直接修正 module-impact.md，使其与实际变更一致
5. module-impact.md 第一行标题必须用中文：# 模块影响分析（Module Impact）— <变更简述>

### 降级（module-impact.md 不存在）
若缺失（如旧变更未经新 plan 流程，或 small 变更从未生成）：先跑 \`sillyspec module-impact --change <change-name>\`——CLI 按 _module-map.yaml paths 前缀匹配预填「模块影响矩阵」骨架（文件×模块归属 + 未匹配文件清单，机械部分全代算），你只需逐行填「影响类型」（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 needs_review 标记，补首行中文标题 \`# 模块影响分析（Module Impact）— <变更简述>\`。骨架无从生成（无 module-map / 无 diff）时才按 archive-impact.yaml 的 impact-analyzer 角色规则全手写。

确认完成后，下一步 sync-module-docs 会读 module-impact.md 更新模块卡片文档。`,
      outputHint: 'module-impact.md 终审结果 + 修正摘要',
      optional: false
    },
    {
      name: 'sync-module-docs',
      // conditionalWait（坑 archive-subconfirm-redundant，2026-08-23 实证：requiresWait 硬门强制
      // 三段式 --wait → --continue --answer → --done，与 verify 文档同步阻断门、归档移动前死信
      // 校验、下一步「确认归档 --confirm」四层确认重复，交互碎。改 conditionalWait（brainstorm-auto
      // 同款先例）：常规同步直接写入 + --done（agent 写入动作在 --done 前完成，坑 verify-archive-
      // flow-pitfalls 坑4 的「无机会写入」不回归）；仅异常（needs_review/未映射/标记缺失）才 --wait
      // 请用户裁决。用户确认收敛到「确认归档 --confirm」一处。
      conditionalWait: true,
      repeatableWait: true,
      maxWaitRounds: 3,
      waitReason: '等待用户裁决模块文档同步异常',
      waitOptions: ['确认写入', '跳过同步'],
      prompt: `根据 module-impact.md 同步更新模块索引和卡片文档。

### ⚠️ 核心原则：结构化事实改 _module-map.yaml，语义解释改模块卡片
- \`_module-map.yaml\` 是唯一的结构化索引源（paths/tags/entrypoints/depends_on/used_by/status/needs_review）
- 模块卡片只负责语义说明（定位/契约摘要/关键逻辑/注意事项/人工备注）
- 一个信息只维护一次，不要两边重复

### 操作
1. 读取 \`.sillyspec/changes/<change-name>/module-impact.md\`
2. 如果没有受影响模块（只有 unmapped）→ 提示用户，跳过同步
3. 对每个受影响模块，按影响类型分别更新：

#### 更新 _module-map.yaml 的规则
- **路径变化** → 更新对应模块的 paths
- **依赖变化** → 更新 depends_on / used_by（同时更新反向模块的 used_by / depends_on）
- **导出符号变化** → 更新 entrypoints / main_symbols
- **新增模块** → 添加完整条目
- **模块废弃** → status: deprecated
- **不确定的影响** → needs_review: true, review_reasons 追加原因
- 如果 _module-map.yaml 的 generated_at 已过时，更新为当前时间

#### 更新模块卡片（modules/<module-id>.md）的规则
- **契约语义变化**（新增/删除对外能力） → 更新"契约摘要"
- **关键逻辑变化** → 更新"关键逻辑"
- **边界变化**（模块职责扩大/缩小） → 更新"定位"
- **注意事项变化** → 更新"注意事项"
- **内部实现变化**（不影响对外接口） → 通常不更新卡片
- **人工备注** → 永远保护，不覆盖

#### 人工备注保护
1. 用正则提取 \`<!-- MANUAL_NOTES_START -->\` 到 \`<!-- MANUAL_NOTES_END -->\` 之间的内容
2. 生成新卡片后，原样回填到人工备注区域
3. 如果标记缺失或重复 → 在 _module-map.yaml 中标记 needs_review: true

#### 新建模块卡片模板
一级标题格式 \`# <中文名>（<module-id>）\`——中文名从模块职责提炼 2-8 字，括号内保留 module-id 原样（sillyhub 平台解析识别用，与 scan 生成约定一致）。frontmatter 已带 author/created_at 真值（<git-user>/<now-datetime> 占位符由 CLI 每步替换），照抄即过元数据校验、勿删。
\`\`\`markdown
---
schema_version: 1
doc_type: module-card
module_id: <module-id>
author: <git-user>
created_at: <now-datetime>
---

# <中文名>（<module-id>）

## 定位

## 契约摘要

## 关键逻辑

## 注意事项

## 人工备注

<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->
\`\`\`

4. 展示所有更新内容（diff 摘要），按同步状态分流：
   - **常规**（无 needs_review 影响、无 unmapped 模块、人工备注标记齐全）→ **直接写入** _module-map.yaml 和受影响的模块卡片，diff 摘要写入 --output 后 --done（本步不单独弹确认——用户确认收敛到下一步「确认归档 --confirm」，该步展示同一 diff 摘要）
   - **异常**（含 needs_review 影响项 / unmapped 模块 / 人工备注标记缺失或重复 / 覆盖会丢失手动维护字段）→ 暂停请用户裁决：
     \`sillyspec run archive --wait --reason "等待用户裁决模块文档同步异常" --options "确认写入,跳过同步" --output "diff 摘要 + 异常说明"\`
     用户 --continue --answer "确认写入" 后写入；"跳过同步" 则不写入，提示 "module-impact.md 已保留，可稍后手动同步"
5. 回填 module-impact.md 的"更新结果"表格，区分目标：
   - 目标列写 "\`_module-map.yaml: <module-id>\`" 或 "\`modules/<module-id>.md\`"
6. **同步完成后**，如需刷新 \`_module-map.yaml\` 索引：\`sillyspec modules rebuild --force\`（默认 dry-run 只预览不写；\`--force\` 才覆盖，但会清空 tags/entrypoints/main_symbols/depends_on/used_by 等手动维护字段——与 archive-impact 的「人工备注保护」约束冲突，仅当手动字段已并入骨架或可接受覆盖时用；优先手动更新 dependencies.md / 模块卡片）

### 输出
已更新的文件路径列表 + diff 摘要（异常时附裁决结果）`,
      outputHint: '模块文档更新结果',
      optional: false
    },
    {
      name: 'decision-distill 决策提炼',
      // conditionalWait（同 sync-module-docs 先例）：常规提炼直接写入 + --done；仅异常（rejected
      // 条目缺否决理由/复潮条件 → distillIntoKnowledge 返回 needsWait 非空）才 --wait 请用户裁决
      // （补录后重跑幂等 / 跳过该条）。勿引入 requiresWait 硬门——与下一步「确认归档 --confirm」
      // 重复确认（坑 archive-subconfirm-redundant）。
      conditionalWait: true,
      repeatableWait: true,
      maxWaitRounds: 3,
      waitReason: '等待用户裁决 rejected 决策缺字段',
      waitOptions: ['补录后继续', '跳过该条'],
      prompt: `读取变更 decisions.md，把有实现影响的决策提炼进决策知识库（提炼/幂等/INDEX 路由行本体在 CLI 纯函数 src/decision-distill.js，本步只接线，勿手工改写条目格式）。

### 操作
1. 定位参数：changeDir = \`.sillyspec/changes/<change-name>\`（decisions.md 所在——本步在「确认归档」移动目录之前，仍在原位）；knowledgeRoot = \`.sillyspec/knowledge\`；headHash = \`git rev-parse --short HEAD\`（落条目「最近确认」）
2. 调用纯函数 \`distillIntoKnowledge(changeDir, knowledgeRoot, headHash)\`，按返回的 \`{ written, skipped, needsWait }\` 分流（见第 3 点）：
   - 能解析到 sillyspec 源码/安装位置时（如 sillyspec 仓内 dogfood）直接 import 调用：\`node --input-type=module -e "import { distillIntoKnowledge } from './src/decision-distill.js'; console.log(JSON.stringify(distillIntoKnowledge(changeDir, knowledgeRoot, headHash), null, 2))"\`
   - 解析不到（consumer 仓库无源码，node import 会 ERR_MODULE_NOT_FOUND）→ 按其语义执行：解析 D-xxx@vN 条目；入选规则 = 任意 type 的 status=rejected 留痕 + 五类 type（architecture/compatibility/boundary/definition/process）且 status∈{confirmed,accepted} 提炼 implemented，type=scope 不入选；条目幂等落 \`.sillyspec/knowledge/decisions/<模块域>.md\`（同 ID 同版本重写不重复追加、@vN+1 整段替换旧版并注 supersedes；「模块域」缺失按 impacts 路径与 _module-map.yaml paths 前缀匹配兜底，仍未中归 unmapped）；implemented 条目写「状态：implemented + 锚点：<src 路径:行号，未记录则填"未记录"> + 最近确认：<headHash> + 理由：<一句话>」，rejected 条目写「状态：rejected + 否决理由： + 复潮条件：」；\`knowledge/INDEX.md\` 的 decisions 路由行（\`- <域>|decision|决策 → [decisions/<域>.md](decisions/<域>.md)\`）幂等增删
3. 分流规则：
   - **常规**（needsWait 为空且 written 非空）→ 写入已由函数完成，written 摘要（decisions/<域>.md × D-xxx@vN × append/update/supersede）写入 --output 后直接 --done（本步不单独弹确认——用户确认收敛到下一步「确认归档 --confirm」）
   - **needsWait 非空**（rejected 条目缺否决理由/复潮条件，该条目未写盘、其余条目照常提炼）→ 暂停请用户裁决：
     \`sillyspec run archive --wait --reason "等待用户裁决 rejected 决策缺字段" --options "补录后继续,跳过该条" --output "needsWait 描述 + 已提炼摘要"\`
     - 「补录后继续」→ 按 needsWait 描述在 changes/<change-name>/decisions.md 补齐缺失的否决理由/复潮条件，重跑第 2 步（幂等，重跑安全）
     - 「跳过该条」→ 该条目不入库，--output 注记跳过原因后 --done
   - **零输出**（skipped 非空 = 无 decisions.md / 无入选条目）→ 不创建任何文件、不动 INDEX，--output 注一句 skipped 原因后直接 --done（同 docs-debt 无债零输出原则）
4. 降级：调用或解析异常（模块加载失败 / decisions.md 结构异常抛错）→ warn 记录异常摘要后跳过本步 --done（best-effort，同 agent-session-log 先例），不阻断归档——决策提炼失败不挡归档移动

### 输出
已提炼条目清单（decisions/<域>.md × D-xxx@vN × action）或零输出/跳过/降级原因`,
      outputHint: '决策提炼结果',
      optional: false
    },
    {
      name: '确认归档',
      prompt: `确认归档内容，由 CLI 执行目录移动。

### 操作
1. 展示：变更目录名、包含的文件列表（含 module-impact.md）、生成总结
2. 确保任务清单（tasks.md）所有 task checkbox 都已勾选
3. 让用户确认后，用 \`--confirm\` 完成本步骤：
   \`sillyspec run archive --done --confirm --output "确认归档"\`
4. CLI 会创建 \`.sillyspec/changes/archive/\`，并将变更目录移动到 \`.sillyspec/changes/archive/<原变更名>/\`

### 输出
归档完成 + archive 目录路径`,
      outputHint: '归档确认',
      optional: false
    },
    {
      name: '更新路线图和提交',
      prompt: `更新路线图并暂存变更。

### 操作
1. 如果 \`.sillyspec/ROADMAP.md\` 存在，标记对应 Phase 为已完成
2. \`git add .sillyspec/changes/archive/\` — 暂存归档结果（archive/ 下仅本次归档新增，不会裹挟 changes/ 下其他活跃变更；不要 commit，由用户通过统一提交工具处理）
3. \`git add .sillyspec/docs/<project>/modules/\` — 暂存模块文档更新（如有；精确到本次同步的模块文档，勿 add 整个 .sillyspec/docs/）
4. \`git add .sillyspec/knowledge/decisions/\` — 暂存决策知识库更新（如有；decision-distill 步骤的提炼产物，精确到 decisions 子目录，勿 add 整个 .sillyspec/knowledge/；不要 commit，由用户通过统一提交工具处理）
5. 确认 sillyspec.db 中该变更已不再 active（确认归档步骤由 CLI 调用 unregisterChange）

### 输出
归档完成确认 + 累积规范统计`,
      outputHint: '归档完成',
      optional: false
    }
  ]
}
