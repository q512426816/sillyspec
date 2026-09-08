# IR × 五阶段流程优化方案（P3 change 种子稿）

> updated_at: 2026-09-05
> author: qinyi
> 定位：把 archify 借鉴（agent 产出结构化 IR + 机器确定性核验 + 模板渲染，见 `docs/sillyspec/archify-reference-analysis-2026-09-04.md`）从 scan 扩展到头脑风暴/计划/执行/验证/归档全流程的**立项分析**。本文是 change 种子稿——按自家流程 brainstorm → plan 落地，不直接实施。

## 0. 统一原则（先立规矩再谈各阶段）

每个阶段的产物一律分两层：

- **事实层（IR，机器核验）**：结构化表格，每条 = `{结论, ref: path:line 或 module id, token}`。机器逐条核验（复用 `collectInvalidDocRefs` 同款层1+层2）、进 staleRefs 漂移追踪。
- **判断层（散文，人读）**：理由、权衡、风险。散文必须引用事实层条目（`（见 D-03）`式锚点），不重复罗列事实。

已就位的地基（scan 侧已验证）：诊断信封（code/evidence/supportedFixes）、`_facts.md` 机器底稿、ref_exists/staleRefs、frontmatter CLI 盖章、noAI 机械步骤。

## 1. 头脑风暴 brainstorm：设计事实表

- **现状**：module-map 上下文注入（`src/run/prompt.js` 的 buildModuleContextInjection）；design.md 全散文。
- **IR 化**：brainstorm 收尾产出 `design.facts.yaml`——每条 = 设计决定 + 影响模块（module-map id 或 NEW）+ 理由一句话。design.md 由模板渲染骨架（决定清单表）+ agent 填权衡散文。
- **机器核验（新 gate）**：影响模块 id 必须存在于 module-map，未注册的必须显式标 `NEW`——消灭「设计了不存在的模块」这类幻觉；与 scan facts 的依赖清单交叉，引用外部依赖必须真实存在。
- **省 token 点**：brainstorm prompt 注入 `_facts.md`（端点/依赖/规模）替代 agent 现场探索——与 scan 同款机制，直接复用。

## 2. 计划 plan：任务目标文件表

- **现状**：plan.md + tasks.md + plan-postcheck + plan-adopt-waves。
- **IR 化**：task 卡增加结构化字段 `target_files[]`（计划要动的文件）与 `touches_modules[]`。tasks.md 仍人读，`tasks.facts.yaml` 机器消费。
- **机器核验**：plan-postcheck 逐条核验 target_files——存在，或显式 `NEW:` 前缀（新文件）；与 module-map 交叉出影响矩阵（module-impact.js 已有骨架）。
- **省 token 点**：wave 分组建议由 CLI 按 module-map 依赖边预计算（依赖图是机械事实），agent 只做调整确认。

## 3. 执行 execute：做了什么的对账表

- **现状**：worktree 隔离 + per-task review.json（**已经是结构化的**）+ quick-audit + machine-interface 的 execute-evidence。
- **IR 化**（增量最小——review.json 加一个字段）：`touched_files: path:line[]`（实际改动的文件与关键行）。
- **机器对账（核心价值）**：plan 的 target_files vs execute 的 touched_files，机器算三类差集——①声明且做了 ✓；②声明没做（计划落空）；③做了没声明（scope creep）。第③类正是 gates 的 symbol-impact 想抓但抓不全的，文件级对账是廉价近似。git diff 本身就是权威 touched_files 来源（CLI 从 worktree diff 直接取，agent 一个字都不用抄）。

## 4. 验证 verify：可复跑的验证结论表

- **现状**：verify-probes 机械探针 + contract-matrix（**已在消费端点 IR**）+ verify-postcheck + machine-interface 的 verify-test data（status/exitCode 已结构化）。
- **IR 化**：`verify.facts.yaml`——每条 = 验证声明 + 探针命令 + 结果（exit/输出摘要）。verify-result.md 模板渲染。
- **机器核验**：探针命令可由 CLI 复跑抽查（防「声称测过」）——本质是把 archify 的「visual-check 可独立复核」搬到验证域。claims 分级沿用 archify 三层：确定性检查 / 可复跑探针 / 人工判断，永不混同。

## 5. 归档 archive：变更 delta 回灌（archify Delta 的对应物）

- **现状**：归档目录 + module-changelog.js（已有模块级 changelog）。
- **IR 化**：归档时 CLI 从 change 的三个事实表（design/tasks/touched）生成 `delta.facts.yaml`——做了什么、动了哪些模块、端点增删（contract-matrix before/after 已有数据）。这是 archify Delta 的 Before/Delta/After。
- **回灌**：① scan facts 的增量更新依据（下一轮 scan 只刷新 delta 涉及的模块文档——配合 staleRefs 就是精确增量扫描）；② knowledge 自动沉淀候选（带 path:line 的经验条目）。

## 6. 分期建议

- **P3a（最小可行，1 个 change）**：execute 的 touched_files（CLI 从 git diff 取）+ plan 的 target_files 对账 gate——收益最大（scope creep 检出）、改动最小（review.json 加字段 + 一个对账函数）。
- **P3b**：verify 验证结论表 + 探针复跑抽查。
- **P3c**：brainstorm 设计事实表 + design.md 模板渲染。
- **P3d**：archive delta 回灌 + 增量 scan 联动（依赖 P3a/b/c 的表都就位）。
- **横切（任意期可做）**：acceptsFix 机器验证修复建议——给诊断信封的 supportedFixes 加「试跑证明」，放 machine-interface 层通用化。

## 7. 明确不做的事

- 讨论型内容 IR 化（brainstorm 的发散讨论、CONCERNS 的判断、复盘散文）——判断层保持自由散文，只锚事实。
- 全量替换现有 markdown 产物——双层并存，IR 是 markdown 的「可验证投影」而非替代；渲染方向永远是 IR → 模板 → md，不允许反向。
- 跳过自家流程直接实施本文——本文的价值就是把取舍聊清楚，brainstorm 时以本文为输入。

---

> **状态（2026-09-09）**：P3b 经变更 2026-09-08-ir-verify-facts 完成收口（verify-facts v2 证据链）。
>
> **互指（2026-09-08）**：agent 轮次裁剪侧（整段 noAI / 骨架预生成 / 注入 / 判定下沉）见 `docs/sillyspec/round-trip-economics-2026-09-08.md`——本文管 IR 事实层 schema，该文管轮次经济学，两文同为 P3 brainstorm 双输入。另注意：本文 P3a（target_files 对账）与 P3b 的探针锚点部分**已有落地实现**（该文 §2 有现状盘点），brainstorm 时先盘现状防重复设计。
