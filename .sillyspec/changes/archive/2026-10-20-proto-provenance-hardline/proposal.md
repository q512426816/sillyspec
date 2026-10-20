---
author: flow-machine-draft
created_at: 2026-10-20T13:43:20.393Z
---
# 提案书（Proposal）— 2026-10-20-proto-provenance-hardline

## 动机

任务原话转写：dsh 会话 sess_a6c2804d 实证（用户裁决：平台仓不应单独做事，一切由工具引导驾驭）：agent 读过真码五要素、自己走过一遍 prototype:build 管线后，视觉稿轨道仍手写 HTML 直接交付（23KB 手写 CSS+截图抄 hex 落变更目录），v2 则自创 dev 路由+SSR 捕获旁门。根因：①「粗选豁免」边界松——供用户决策的对比稿/视觉稿被当粗选；②管线撑不起页面级原型时工具无指引，agent 各仓自谋出路。修法（纯工具侧，任何仓通用）：生成要求钉硬边界——变更产物 prototype-*.html 必须可溯源到源码，三通道：本仓管线编译产物/项目真实运行面渲染捕获产物（dev server 或预览路由渲染真实组件后离线化，捕获脚本可随变更交付）/登记复用既有真码原型；手写 HTML 不得作为变更产物交付，对比稿视觉稿供用户决策即定稿无粗选豁免；重做类变更的现状对照必须真实渲染捕获，禁止手写复刻现状。

成功标准：
- brainstorm 生成要求含溯源硬边界：三通道措辞+手写禁令+对比稿即定稿无豁免+现状对照须捕获
- ui-visual 须知、design-facts 自审清单、gates 软提醒同步该口径
- 新增测试锁文本锚（三通道/手写禁令/对比稿边界/现状捕获）；npm test 全绿、lint 绿、docs/prompt 同步零 miss

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. brainstorm 生成要求含溯源硬边界：三通道措辞+手写禁令+对比稿即定稿无豁免+现状对照须捕获
2. ui-visual 须知、design-facts 自审清单、gates 软提醒同步该口径
3. 新增测试锁文本锚（三通道/手写禁令/对比稿边界/现状捕获）；npm test 全绿、lint 绿、docs/prompt 同步零 miss

## 成功标准（可验证）

1. brainstorm 生成要求含溯源硬边界：三通道措辞+手写禁令+对比稿即定稿无豁免+现状对照须捕获
2. ui-visual 须知、design-facts 自审清单、gates 软提醒同步该口径
3. 新增测试锁文本锚（三通道/手写禁令/对比稿边界/现状捕获）；npm test 全绿、lint 绿、docs/prompt 同步零 miss
