---
author: flow-machine-draft
created_at: 2026-10-05T06:28:30.810Z
---
# 需求规格（Requirements）— 2026-10-05-uivisual-word-narrow

## 功能需求

### FR-01: detectUiTouch 词表必须移除后端高频通用词（渲染/组件/样式）；CLI 变更描述含「渲染输出/组件/输出样式」等后端通用语必须零命中；既有正例（页面/前端/UI/视觉/tsx 扩展名）检测能力必须不变

src/ui-visual.js UI_TOUCH_PATTERNS 必须删去 /渲染/、/组件/、/样式/ 三词；移除后 detectUiTouch 对仅含这三词的后端语境文本必须返回 false，对页面/前端/UI/视觉/界面/布局/原型/截图/主题色/配色及前端扩展名（.tsx/.jsx/.vue/.svelte/.css/.scss/.html）的检测必须与移除前一致。禁止以牺牲既有正例为代价收窄。

#### 场景：CLI 变更描述零误触

- Given: 某 CLI/后端变更的 input 写「聚合函数 + 渲染 + 对应单测」
- When: flow start 起草并检测 UI 触达
- Then: 不渲染「UI 变更执行须知」段；收口探针 12 报不适用（非 UI 触达）

#### 场景：真 UI 变更不回归

- Given: input 含「重排工作区列表页面」「前端样式统一」「重构 UI 组件」「视觉走查为硬门」「修改 src/app/page.tsx」
- When: detectUiTouch 检测
- Then: 均返回 true（与移除前一致）

### FR-02: flow start 起草的 design.md 模板指引必须含锚行防呆提示（四问/FR 标题锚从模板原样复制勿手打）

src/flow-draft.js 起草模板的头注指引必须新增锚行防呆提示：四问问题原文、FR 标题、镜像任务行等锚必须从机器模板原样保留/复制，禁止手打重写（2026-10-05 两度实证：问题行句号被手写成问号，v2 锚对比正确拒收但返工一轮）。

#### 场景：新起草变更可见防呆

- Given: flow start 起草的 design.md 模板
- When: 读取模板头注
- Then: 含「锚」「勿手打」（或同义明确表述）的防呆指引

### FR-03: 单测覆盖：新误伤反例（渲染/组件/样式后端语）至少三条 + 既有正例回归 + 模板文案断言

本变更必须以自动化单测覆盖：detectUiTouch 对「渲染输出」「组件」「输出样式」等后端通用语至少三条新反例（返回 false）；既有五条正例回归不变；flow-draft 模板锚行防呆文案在场断言。

#### 场景：主路径

- Given: test/ui-visual-guidance.test.mjs 与 test/flow-draft.test.mjs
- When: 跑项目测试入口
- Then: 上述断言全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/ui-visual-guidance.test.mjs「反例扩充：渲染输出/组件/输出样式后端通用语零命中＋既有五正例回归」
FR-02: test/flow-draft.test.mjs「模板锚行防呆文案在场断言」
FR-03: test/ui-visual-guidance.test.mjs「正反例同文件收口覆盖（含 flow-draft 断言合计）」
