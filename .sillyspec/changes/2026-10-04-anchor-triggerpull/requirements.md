---
author: flow-machine-draft
created_at: 2026-10-04T16:37:28.670Z
---
# 需求规格（Requirements）— 2026-10-04-anchor-triggerpull

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: platform-interface-map 的 triggerPull 行号锚刷新为 4234（窗口同时覆盖 HEAD 4232 与工作树 4235），doc-ref-check 93/93 全绿

- platform-interface-map 的 triggerPull 行号锚 MUST 指向 4234（容差窗 [4232,4239] 同时覆盖 HEAD 实态 4232 与并行在途工作树 4235），关键词断言（triggerPull 在窗内）保留不降级

#### 场景：doc-ref-check 全量校验

Given platform-interface-map 刷新后的 93 处行号锚
When doc-ref-check 校验
Then 93/93 全绿（窗口命中且关键词在场）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/doc-ref-check.test.mjs（93 锚全量校验器——刷新后全绿）
