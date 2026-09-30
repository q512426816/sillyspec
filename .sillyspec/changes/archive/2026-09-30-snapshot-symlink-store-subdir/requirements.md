---
author: flow-machine-draft
created_at: 2026-09-30T08:22:34.672Z
---
# 需求规格（Requirements）— 2026-09-30-snapshot-symlink-store-subdir

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 lockfile
Given 系统就绪
When 子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 lockfile 判据时，detectSymlinkStoreLayout 
Then 行为符合本条标准描述

### FR-02: 根目录判据行为零变化（根命中优先，标签不带 subdir）
Given 系统就绪
When 根目录判据行为零变化（根命中优先，标签不带 subdir）
Then 行为符合本条标准描述

### FR-03: createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返回 null（
Given 系统就绪
When createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返回 null（回退主仓实测），既有调用方（质量扫描/verify 门）零改
Then 行为符合本条标准描述

### FR-04: 非仓目录/无子目录/子目录全空的行为零变化（null）
Given 系统就绪
When 非仓目录/无子目录/子目录全空的行为零变化（null）
Then 行为符合本条标准描述

### FR-05: 全量测试回归绿 + lint 绿
Given 测试 相关模块就绪
When 全量测试回归绿 + lint 绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/gate-snapshot-layout-guard.test.mjs（子目录扩展块：frontend/pnpm-lock.yaml → pnpm(subdir:frontend)；空目录 → null）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/gate-snapshot-layout-guard.test.mjs（子目录扩展块：根 bun.lock 出现后按根报 bun——根优先不遮；既有首块 pnpm/bun/lerna/packageManager 判据回归）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/gate-snapshot-layout-guard.test.mjs（createGateSnapshot pnpm 布局 null 回退既有用例 + 子目录标签走同真值消费路径——if (layoutHit) 同构）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/gate-snapshot-layout-guard.test.mjs（子目录扩展块：node_modules/隐藏目录里 lockfile 不算、普通子目录 docs/ → 仍 null；空目录 → null）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：全量回归是门禁实测（flow done 亲测 deps 子集 17 个 + npm run lint，见 verify-runs/20260930083400/test-result.json）；变更前手动全量 npm test exit 0、lint 绿
