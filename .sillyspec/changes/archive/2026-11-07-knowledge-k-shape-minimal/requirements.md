---
author: flow-machine-draft
created_at: 2026-11-07T05:00:00Z
---
# 需求规格（Requirements）— 2026-11-07-knowledge-k-shape-minimal

## 功能需求

### FR-01: accept 与 classify 的目标文件白名单扩展：known-issues/patterns/conventions/sillyspec-gotchas/testing-gotchas 五目标（INDEX 段自动追加兼容）
- 必须将 ACCEPT_TARGETS 与 CATEGORY_SECTIONS 扩为五目标（新增 sillyspec-gotchas→SillySpec Gotchas、testing-gotchas→Testing Gotchas）；INDEX 无对应段时 insertRouteLine 既有 EOF 追加语义必须保持兼容（不加段名假设）。

#### 场景：gotcha 归位
- Given：proposed 条目 category: sillyspec-gotchas
- When：knowledge accept --id proposed/<slug>
- Then：追加进 sillyspec-gotchas.md；INDEX 路由行落对应段（无段则 EOF 新建段）

### FR-02: accept 输出新增结构完整度 advisory 键（检测正文含 问题 与 解法或规则 段标题，缺失列 structuralWarnings 不阻断合并）
- accept 输出必须含结构完整度 advisory：正文含「问题」段标题且含「解法|规则|模式|约定」之一 → 无警告；缺「问题」或缺解法类段 → structuralWarnings 列出所缺（advisory 不阻断合并、不影响落盘）。

#### 场景：advisory 两分支
- Given：A 条目四段俱全 / B 条目无「问题」段标题
- When：分别 accept
- Then：A 输出无 structuralWarnings；B 输出 structuralWarnings 含提示且 ok:true 正常合并

### FR-03: SKILL.md 补 K 形态四段模板指引（问题/解法规则/证据/适用边界——供 propose 撰写参照）
- SKILL.md 必须补 K 形态四段模板指引节（问题/解法或规则/证据/适用边界，注明有效知识最小结构与 accept advisory 的对应关系）。

#### 场景：指引可见
- Given：本变更合入后
- When：读 SKILL.md
- Then：含四段模板说明与 structuralWarnings 语义说明

### FR-04: 既有 accept/classify/inbox/digest 测试面全绿 + 新增用例覆盖五目标路由与 advisory 两分支
- 既有测试面必须全绿；新增用例覆盖五目标路由（含新两目标的 category 自动路由与显式 --file）与 advisory 两分支。

#### 场景：回归
- Given：本变更合入后
- When：跑既有 knowledge-classify/knowledge-accept-channel 等面 + 新增用例
- Then：全部通过

## 测试绑定（每条 FR 至少一行）

FR-01: test/knowledge-k-shape-minimal.test.mjs「T1: 五目标路由（含 gotchas 双目标）」
FR-02: test/knowledge-k-shape-minimal.test.mjs「T2: advisory 两分支」
FR-03: test/knowledge-k-shape-minimal.test.mjs「T3: SKILL 四段指引」
FR-04: test/knowledge-k-shape-minimal.test.mjs「T4: 既有面回归」