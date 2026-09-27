---
author: flow-machine-draft
created_at: 2026-09-27T04:26:07.087Z
---
# 提案书（Proposal）— 2026-09-27-ui-visual-guidance

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:334a45fcc163d2f37fc828aec18f8d9e4e5a16e5b8792cf49f42694aa7d7f614:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-ui-visual-guidance 留痕重锚 -->
任务原话转写：背景：平台仓 2026-09-26-core-pages-visual-redesign 实证「视觉保真度全流程零承接」——design 写明三主题截图走查为硬门，verify 时以代码级佐证降级放行、DOM 对照原型类验收全部标 uncovered 移交部署后人工，最终仍 PASS，差距部署后才被肉眼发现。平台仓 2026-09-27-prototype-pipeline 已落「设计期桥梁」（原型即真码编译管线）；本变更在 sillyspec CLI 侧补「过程引导 + 收口痕迹对账」：引导前置到 flow start（开工即告知规程），收口只验证据在场、绝不要求现做，视觉降级无用户裁决留痕则硬拦。
成功标准：
- flow start 检测 --input 触及前端页面/UI（关键词启发式）时输出「UI 变更执行须知」段：改前确认视觉基准（原型/黄金页/现有截图）、边改边渲染对照、证据随手落变更目录 visual-evidence.md、视觉降级须用户裁决留痕
- verify 新增「UI 视觉证据」分级探针：UI 触达变更缺 visual-evidence.md 证据时默认 ⚠️ 警告（advisory），local.yaml ui_visual_gate=error 升级阻断、off 关闭
- 视觉降级硬规则：design.md/requirements.md 声明视觉降级（降级+视觉/UI/页面/样式共现）而变更目录无用户裁决留痕时，无论配置一律 error 阻断
- 非 UI 变更零打扰：须知不注入、探针标不适用，flow start 输出与既有探针行为零变化
- 新增单测覆盖：检测启发式（正反例）/探针三档（warn/error/off）/降级硬规则/骨架段落生成
- CLI 通用性：须知与探针文案仓中立，不硬编码任何特定仓的路径
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:2cc54382218304ebc94d52eff4c377bc95b94bc77e705bca707c80a26c7a269f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-ui-visual-guidance 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. flow start 检测 --input 触及前端页面/UI（关键词启发式）时输出「UI 变更执行须知」段：改前确认视觉基准（原型/黄金页/现有截图）、边改边渲染对照、证据随手落变更目录 visual-evidence.md、视觉降级须用户裁决留痕
2. verify 新增「UI 视觉证据」分级探针：UI 触达变更缺 visual-evidence.md 证据时默认 ⚠️ 警告（advisory），local.yaml ui_visual_gate=error 升级阻断、off 关闭
3. 视觉降级硬规则：design.md/requirements.md 声明视觉降级（降级+视觉/UI/页面/样式共现）而变更目录无用户裁决留痕时，无论配置一律 error 阻断
4. 非 UI 变更零打扰：须知不注入、探针标不适用，flow start 输出与既有探针行为零变化
5. 新增单测覆盖：检测启发式（正反例）/探针三档（warn/error/off）/降级硬规则/骨架段落生成
6. CLI 通用性：须知与探针文案仓中立，不硬编码任何特定仓的路径
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:5ea6eb037ccdd52789793afebca7c8a0cc0422c2e679f52c7550bfce8bd934f6:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-ui-visual-guidance 留痕重锚 -->
1. flow start 检测 --input 触及前端页面/UI（关键词启发式）时输出「UI 变更执行须知」段：改前确认视觉基准（原型/黄金页/现有截图）、边改边渲染对照、证据随手落变更目录 visual-evidence.md、视觉降级须用户裁决留痕
2. verify 新增「UI 视觉证据」分级探针：UI 触达变更缺 visual-evidence.md 证据时默认 ⚠️ 警告（advisory），local.yaml ui_visual_gate=error 升级阻断、off 关闭
3. 视觉降级硬规则：design.md/requirements.md 声明视觉降级（降级+视觉/UI/页面/样式共现）而变更目录无用户裁决留痕时，无论配置一律 error 阻断
4. 非 UI 变更零打扰：须知不注入、探针标不适用，flow start 输出与既有探针行为零变化
5. 新增单测覆盖：检测启发式（正反例）/探针三档（warn/error/off）/降级硬规则/骨架段落生成
6. CLI 通用性：须知与探针文案仓中立，不硬编码任何特定仓的路径
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
