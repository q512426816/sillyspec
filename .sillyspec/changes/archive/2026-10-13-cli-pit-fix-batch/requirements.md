---
author: flow-machine-draft
created_at: 2026-10-13T05:12:01.570Z
---
# 需求规格（Requirements）— 2026-10-13-cli-pit-fix-batch

## 功能需求

### FR-01: node --test test/worktree-deps-override.test.mjs 3/3 绿（合法覆写双留痕/缺 reason exit 2/非法值 exit 2/meta 缺失 exit 1）

- `sillyspec worktree deps --change <名> --set <值> --reason "<依据>"` **必须**完成 depsStatus 覆写并在 meta.json 双留痕（depsOverrideNote 含前值与理由 + depsOverrideAt 时间戳）；缺 `--reason` 或 `--set` 值不在 n/a|linked|installed|failed 白名单内**必须** exit 2 且不落盘；meta.json 不存在**必须** exit 1 并指引跨仓 `--spec-dir` 路径。覆写通道**禁止**静默成功——零留痕的手改绕过形态被本命令取代。

#### 场景：主路径

Given seed 的 worktree meta.json（depsStatus=failed）；When `worktree deps --set linked --reason "离线环境主仓 node_modules 已手工链接并实测可用"`；Then exit 0，meta.json depsStatus=linked 且 depsOverrideNote 含「前值 failed」与理由原文、depsOverrideAt 为 ISO 时间戳。

#### 场景：用法门

Given 同上；When 缺 `--reason` 或 `--set magic`；Then exit 2，stderr 含用法行/「非法」文案，meta.json 保持原值。

#### 场景：meta 缺失

Given 变更名无对应 worktree 目录；When `worktree deps --set linked --reason x`；Then exit 1，报错含 meta 绝对路径与 `--spec-dir` 跨仓指引。

### FR-02: sillyspec knowledge --help 输出帮助且零写盘副作用

- `sillyspec knowledge --help`（及 `-h`）**必须**在任何子命令分发前被拦截：输出子命令清单帮助文本并以 JSON 面回显 `help:true`，**禁止**触发默认子命令（尤其 refresh 无参全量重写 generated/ 的副作用写盘）。

#### 场景：主路径

Given knowledge/generated/ 目录现状任意；When `node src/index.js knowledge --help`；Then stdout 含「用法: sillyspec knowledge <子命令>」帮助块，knowledge/ 目录下零文件 mtime 变化（实测 generated/ 目录表前后一致、5 秒窗口零新写文件）。

### FR-03: sillyspec tests --redomain 用法门在位（--from/--to/--by-change/--write），fr-index 降级告警引用该命令

- `sillyspec tests --redomain --from <域> --to <域>` 用法门**必须**维持 --by-change 条目级过滤（预览与落盘同口径）；`src/fr-index.js` 伪域降级告警**必须**在给出建议域时引用该命令的完整用法行（含干跑 `--write` 说明与 `--by-change` 提示）并明示 D-001 迁域不换号铁律（条目 ID 保持原样，**禁止**按目标域接续重编号断 supersede 链）。

#### 场景：主路径

When `node --test test/fr-domain-guard-and-redomain-bychange.test.mjs`；Then ④⑥ 用例零失败（--by-change 混合池只迁命中条目 + 干跑/落盘同口径）。fr-index 告警行由源码渲染面 lint 覆盖（check-syntax 全绿）。

### FR-04: lint 全绿 + flow done 实测门零失败

- 交付面**必须**通过 `npm run lint`（check-syntax 全量：src 182 + test 771 文件语法/内容规则 + 未引用导出 0 hard fail + module-map 覆盖全）；触及 src/test 的改动**必须**通过 flow done 实测门（CLI 亲测零失败，fail-closed）方可收口。

#### 场景：主路径

When `npm run lint`；Then 953 文件检查通过、未引用导出 0 项。When `flow done`；Then 实测门零失败放行收口。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/worktree-deps-override.test.mjs「① 合法覆写：状态翻转 + 双留痕（note 含前值与理由）」
FR-01: test/worktree-deps-override.test.mjs「②③ 用法门：缺 reason / 非法 set 值 → exit 2」
FR-01: test/worktree-deps-override.test.mjs「④ meta 缺失：exit 1 + 跨仓 --spec-dir 指引」
FR-02: 不适用：CLI 交互横切面——以命令回执为证据（帮助输出 + knowledge/ 零写盘实测留痕，任务勾选带证据补录）
FR-03: test/fr-domain-guard-and-redomain-bychange.test.mjs「④ redomain --by-change：混合池按「变更：」分批，只迁命中条目、余条留守」
FR-03: test/fr-domain-guard-and-redomain-bychange.test.mjs「⑥ CLI 预览与落盘同口径：--by-change 干跑只列分批子集（坑 redomain-plan-preview-by-change-ignored）」
FR-04: test/worktree-deps-override.test.mjs「① 合法覆写：状态翻转 + 双留痕（note 含前值与理由）」
