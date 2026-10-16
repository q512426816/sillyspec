---
author: flow-machine-draft
created_at: 2026-10-16T08:43:03.694Z
---
# 决策记录（Decisions）— 2026-10-16-probe7-prefill-noise-fix

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- **最大风险：提升信号（第⑥级）方向从「宁 partial」翻向「宁 covered」**——若 review changedFiles 噪声大（如 rebase/工具重写导致无关测试入 changedFiles），会出现新的假 covered。缓解：lift 仅覆盖「零字面命中」格（有正文命中仍封顶 partial）；≥5 候选不触发 lift（第④级在前）；证据显式带「待人工复核」注记供复核者降级；review.json 缺失时不升格。若实测仍噪，回退开关即删除第⑥级（单点）。 - 试过但放弃：a) 只做「正文命中→partial」不引入测试名判定——不能解决锚点空心，covered 仍来自 docstring 行号；b) 用「测试文件被 diff 触碰」全量提升——会连未归属的改动测试一起升格，过宽；c) FR 池按 acceptance 词过滤收窄——池本身与卡粒度错配（130 文件来自整变更面），过滤后仍可能残留无关文件，不如「代码任务 + >5 交人工」两刀干净；d) 保留 anchors 仅改证据文案——词法层未变，hints.files 仍会把 docstring 命中当承接提示，治标不治本。 - 兼容风险：acceptance-matrix-probe / testpath-anchor 既有断言按旧契约（注释级命中→covered）钉死——属本记录显式判定的缺陷面，测试按新契约改写（非「改测试绕逻辑」，是契约修订）。
