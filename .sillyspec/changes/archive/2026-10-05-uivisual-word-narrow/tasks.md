---
author: flow-machine-draft
created_at: 2026-10-05T06:28:30.810Z
---
# 任务注册表（Tasks）— 2026-10-05-uivisual-word-narrow

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-uivisual-word-narrow --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-uivisual-word-narrow` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: detectUiTouch 词表必须移除后端高频通用词（渲染/组件/样式）；CLI 变更描述含「渲染输出/组件/输出样式」等后端通用语必须零命中；既有正例（页面/前端/UI/视觉/tsx 扩展名）检测能力必须不变
- [x] task-02: flow start 起草的 design.md 模板指引必须含锚行防呆提示（四问/FR 标题锚从模板原样复制勿手打）
- [x] task-03: 单测覆盖：新误伤反例（渲染/组件/样式后端语）至少三条 + 既有正例回归 + 模板文案断言
