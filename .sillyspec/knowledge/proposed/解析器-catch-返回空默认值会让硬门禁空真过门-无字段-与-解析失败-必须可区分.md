---
proposed_at: 2026-09-21T01:27:41.114Z
category: known-issues
status: pending_review
---

# 解析器 catch 返回空默认值会让硬门禁空真过门——「无字段」与「解析失败」必须可区分

## 问题
解析函数在 catch 里返回空数组/空对象等「合法默认值」，下游校验无法区分「真的没有该字段」与「解析失败」：契约硬校验拿空集对账 → 零 consumer 可查 → 空真 pass（假阴性，门禁形同虚设）；渲染层则产出误导文案（卡明明有 acceptance，却因 YAML 坏被渲染成「卡无 acceptance——防御已拦」，而所谓防御的宽收正则根本拦不住这种坏法）。2026-09-20 实证三消费点各自静默吞错：src/stages/plan-postcheck.js 的 parseTaskContracts catch 返回空 → plan 契约门禁空真过门（P0）；src/verify-probes.js 的 parseTaskAcceptance catch 返回 [] → 探针 7 假防御文案。

## 解法
fail-closed + 显式透出解析失败态：
- 入口硬校验：聚合门禁最先运行的可行性步骤（validatePlanFeasibility 步骤 0b）逐卡解析 frontmatter，非法 YAML 即 ERROR（带 文件:行:列 + js-yaml 原始 message + 修复指引），阻断先于一切下游消费。
- 解析函数返回 additive 显式降级键：parseTaskContracts 坏卡返回 provides=[]、expectsFrom={} 之外多带 yamlError 非 null——既有解构式消费方零感知，独立消费方可判读真实态，不再用空数组冒充「无契约字段」。
- 渲染侧三态契约：parseTaskAcceptance 从 数组|null 扩为 {status: no-frontmatter | invalid-yaml | ok, acceptance: 恒为数组, error: 仅 invalid-yaml 非 null}，文案区分「真无字段」与「frontmatter 非法 YAML」，并显式声明「若已过 plan 门仍见此行即门禁失效信号」。

## 证据
- src/stages/plan-postcheck.js（feasibility 步骤 0b 硬校验 :1303-1316；parseTaskContracts yamlError 键）
- src/verify-probes.js（parseTaskAcceptance 三态；探针 7 fmError 渲染）
- test/taskcard-frontmatter-hardgate.test.mjs:90（0b 恰 3 条 error）/ :212（yamlError 双路径）/ :249（三态）/ :268（渲染区分）
- 变更档案 changes/archive/2026-09-20-taskcard-yaml-hardgate/ 的 proposal.md 三症状；提交 3f854037

## 适用条件
任何「解析结果喂给校验/渲染」的链路，尤其多个消费点各自 try/catch 吞错时——每个消费点吞一次，门禁就退化为对坏数据不设防；契约扩展优先 additive 键以保既有消费方零回归。

---
> This is a proposed knowledge entry. Review and merge into manual/ or generated/.