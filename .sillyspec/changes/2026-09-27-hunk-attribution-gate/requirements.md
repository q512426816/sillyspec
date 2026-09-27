---
author: flow-machine-draft
created_at: 2026-09-27T05:40:53.732Z
---
# 需求规格（Requirements）— 2026-09-27-hunk-attribution-gate

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 声明面归集：design 文件变更清单与 requirements 测试绑定路径复用既有解析器合并（
Given 测试 相关模块就绪
When 声明面归集：design 文件变更清单与 requirements 测试绑定路径复用既有解析器合并（parseFileChangeList 与 extractR
Then 行为符合本条标准描述

### FR-02: 提交面 hunk 对账：flow done 时逐文件统计 baseline..HEAD 的 hunk
Given 系统就绪
When 提交面 hunk 对账：flow done 时逐文件统计 baseline..HEAD 的 hunk 数，不在声明面的文件列入未归因清单并警告
Then 行为符合本条标准描述

### FR-03: 跨变更竞争检测：其他活跃变更的声明面与提交面相交时，列出竞争文件、对方变更名与 hunk 数（同文件
Given 系统就绪
When 跨变更竞争检测：其他活跃变更的声明面与提交面相交时，列出竞争文件、对方变更名与 hunk 数（同文件无法按行归属，显式暴露）
Then 行为符合本条标准描述

### FR-04: 在途残留信号：提交面文件当前工作树仍有未提交 diff 时警告活跃并发 WIP
Given 系统就绪
When 在途残留信号：提交面文件当前工作树仍有未提交 diff 时警告活跃并发 WIP
Then 行为符合本条标准描述

### FR-05: 分级配置：local.yaml hunk_gate 三档（warn 默认、error、off），非 
Given 系统就绪
When 分级配置：local.yaml hunk_gate 三档（warn 默认、error、off），非 git 环境与异常 fail-soft 降级跳过
Then 行为符合本条标准描述

### FR-06: 单测覆盖：声明面归集、hunk 对账、竞争检测、残留信号、三档分级、fail-soft 降级
Given 系统就绪
When 单测覆盖：声明面归集、hunk 对账、竞争检测、残留信号、三档分级、fail-soft 降级
Then 行为符合本条标准描述

### FR-07: 不改 worktree 机制与既有「提交面夹带嫌疑 advisory」块（并行会话归属代码，保留原样
Given 系统就绪
When 不改 worktree 机制与既有「提交面夹带嫌疑 advisory」块（并行会话归属代码，保留原样，本门独立输出）
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/hunk-attribution-gate.test.mjs「声明面归集：design 清单 + requirements 绑定（NEW: 前缀与反斜杠归一）」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/hunk-attribution-gate.test.mjs「未归因 + 竞争 + 残留三信号全路径」（b.js 未归因断言含 hunk 计数 ≥1）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/hunk-attribution-gate.test.mjs「未归因 + 竞争 + 残留三信号全路径」（c.js 竞争断言 by=['2026-09-27-other']，archive 与本变更排除）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/hunk-attribution-gate.test.mjs「未归因 + 竞争 + 残留三信号全路径」（a.js 残留断言——porcelain XY 双列工作树位 M 命中）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/hunk-attribution-gate.test.mjs「off 关闭与空面降级」「readHunkGate：三档 + 缺席默认 warn + CRLF」「fail-soft：非 git 目录不炸」

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/hunk-attribution-gate.test.mjs 全部 6 用例（node --test 实测 6 pass 0 fail）+ check-syntax 未用导出清零（本变更侧）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：约束对账——git diff 核对 flow.js 仅 2 hunk 31 行新增全属本变更；「提交面夹带嫌疑 advisory」块零改动（git diff 无该区域 hunk）
