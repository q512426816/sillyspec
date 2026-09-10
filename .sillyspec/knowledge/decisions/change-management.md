---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — change-management

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-905@v1 quicklog 标签切段先严格边界扫描再宽松兜底
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/quicklog.js:493
最近确认：71a7fe6
理由：quicklog 单行四字段（需求：/根因：/方案：/结果：）切段必须两层——真实标签 = 上一标签之后首次出现且前导是串首/空白/句末标点（。；！？）的字样，正文引用标签字样（前导是「/（ 等弱字符）不构成新边界；严格扫描失败才退回宽松顺序扫描，缺标签返回 null 落单行兜底由 --done 契约校验拦截——残余边界（正文引用且前导恰为空白/句末标点）仍可能错位，改写标签语义时勿简化该两层逻辑。

## D-004@v1 : quick 流程纳入——复用 auditQuickCompletion 窗口归属，归属状态表而非三态
状态：implemented
变更：2026-09-10-change-scope-audit
锚点：未记录
最近确认：3f22d6b
理由：用户问「quick 的范围是否也能统计到呢」，评估后纳入。quick 无事前计划（--files 是事后声明），不做三态做归属状态表：已声明（--files）/ 软归属（同模块测试）/ ⚠️ 未声明 / 他者声明（排除面）。窗口归属复用 auditQuickCompletion（baseline 快照/他者退栈/软归属已存在）；随时查看依赖 guard.json 持久化 + locateQuickSessionGuard。quick 提交后窗口已 commit，降级读 QUICKLOG 条目文件行（记录态非实时）。
