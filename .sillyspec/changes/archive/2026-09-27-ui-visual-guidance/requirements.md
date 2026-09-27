---
author: flow-machine-draft
created_at: 2026-09-27T04:26:07.088Z
---
# 需求规格（Requirements）— 2026-09-27-ui-visual-guidance

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: flow start 检测 UI 触达并输出「UI 变更执行须知」
Given flow start 就绪
When --input 文本命中前端页面或 UI 关键词启发式
Then 输出须知段：改前确认视觉基准、边改边渲染对照、证据随手落变更目录 visual-evidence.md、视觉降级须用户裁决留痕

### FR-02: verify 新增「UI 视觉证据」分级探针
Given 变更触及 UI（声明文件面或 input 命中）
When 收口时变更目录缺 visual-evidence.md 证据
Then 默认 ⚠️ 警告（advisory）；local.yaml ui_visual_gate=error 升级阻断、off 关闭

### FR-03: 视觉降级硬规则（不可配置降档）
Given design.md 或 requirements.md 出现「降级」与「视觉、UI、页面、样式」共现声明
When 变更目录无用户裁决留痕（visual-evidence.md 含「用户裁决」段或 decisions 记录）
Then 无论 ui_visual_gate 配置一律 error 阻断（off 除外）

### FR-04: 非 UI 变更零打扰
Given 变更不触及 UI
When flow start 与 verify 收口
Then 须知不注入、探针标「不适用」，既有输出与探针行为零变化

### FR-05: 单测覆盖
Given 本变更交付
When 跑新增测试文件
Then 覆盖检测启发式正反例、探针三档（warn、error、off）、降级硬规则、骨架段落生成

### FR-06: CLI 仓中立
Given sillyspec 服务多仓
When 须知与探针文案生成
Then 不硬编码任何特定仓的路径或命令

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/ui-visual-guidance.test.mjs「detectUiTouch 正例：页面/前端/UI/视觉/组件/tsx」「detectUiTouchInPaths：前端扩展名兜底」「buildUiGuidanceLines：仓中立 + 证据约定与探针同源」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/ui-visual-guidance.test.mjs「UI 触达缺证据：默认 warn / gate=error 升阻断 / off 关闭」「readUiVisualGate：三档 + 缺席默认 warn + CRLF 容错」「renderUiVisualProbeLines：不适用 / warn / error / ok 四形态」

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/ui-visual-guidance.test.mjs「降级硬规则：视觉降级声明无用户裁决留痕 → 无论档位恒 error」「降级硬规则：带用户裁决留痕 → 放行（样式统一级降级案例）」+ 本变更自检实证（visual-evidence.md 补留痕前后 level 变化）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/ui-visual-guidance.test.mjs「detectUiTouch 反例：后端/CLI/文档变更零命中」「非 UI 触达：不适用零打扰」+ renderUiVisualProbeLines undefined 兜底用例

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/ui-visual-guidance.test.mjs 全部 12 用例（node --test 实测 12 pass 0 fail）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/ui-visual-guidance.test.mjs「buildUiGuidanceLines：仓中立 + 证据约定与探针同源」断言无特定仓路径
