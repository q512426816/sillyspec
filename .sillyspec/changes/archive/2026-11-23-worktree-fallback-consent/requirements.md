---
author: flow-machine-draft
created_at: 2026-11-23T02:35:53.977Z
---
# 需求规格（Requirements）— 2026-11-23-worktree-fallback-consent

## 功能需求

### FR-01: git worktree add 失败时 wm.create 不再静默降级：默认 throw，错误信息含原始 git stderr 与处置建议（worktree doctor / 清残留分支 / --allow-in-place 指引）

- 必须：`wm.create()` 在 `git worktree add` 失败（通过 git 版本支持检查与并发赢家重查之后）时，若未获显式同意（见 FR-02），抛出错误并使 execute 启动终止（run/stage.js 既有 catch 打印修复建议后 exit 1）；错误信息必须包含原始 git stderr（或 error.message）与三条处置指引（worktree doctor --fix / 同名遗留分支处置 / --allow-in-place 或 local.yaml worktree.fallback: allow）。禁止静默降级或仅警告后继续。

#### 场景：主路径

- Given 主仓 git 支持 worktree、worktree 目录与同名分支均不存在、无显式同意配置
- When `git worktree add` 因环境原因失败（如权限、超时、非法分支名）
- Then `create()` 抛错（含「不降级」语义与原始 stderr 关键词），无 in-place meta 落盘，主仓 HEAD 与当前分支不变

#### 场景：提示语不再猜测归因

- Given 同上
- When 抛错
- Then 错误文本不再出现「可能是沙箱权限限制」的硬编码归因猜测，归因一律引用真实 stderr

### FR-02: 显式同意（run execute --allow-in-place 或 local.yaml worktree.fallback: allow）时可降级：meta 记 explicit 标记与 fallbackReason 原始错误，且主仓 checkout 专用分支（baseHash 等于当前 HEAD 时），不再停在用户当前分支

- 必须：`create()` 接受 `opts.allowInPlace`，且 `readWorktreePolicy` 读 local.yaml `worktree.fallback`（值 `allow` 才算同意；缺省与非法值＝block）。同意时降级路径为：先 checkout 主仓到专用分支、成功后才写 in-place meta（顺序固定——meta 先落而 checkout 失败会让授权 meta 与用户分支态脱钩，重演坑 execute-in-place-windows-pitfalls 坑1）。meta 必须新增字段 `explicit: true` 与 `fallbackReason`（原始错误文本）。checkout 仅在 `baseHash === 主仓当前 HEAD` 时执行；不等时跳过并警告（不切走用户分支）。checkout 失败必须抛错（fail-closed，不落 meta）。
- 必须：CLI `sillyspec run execute` 接受 `--allow-in-place` flag 并透传到 create（与 --adopt-branch 同款路由）；非 execute 阶段与 `sillyspec worktree create` 顶层命令不接受该 flag（后者要降级只能走 local.yaml 配置）。

#### 场景：主路径

- Given 显式同意生效（flag 或配置）、`git worktree add` 失败、baseHash == 当前 HEAD
- When 走降级
- Then 主仓 `symbolic-ref --short HEAD` 变为 `sillyspec/<change>`；meta.json 含 `mode: 'in-place-fallback'`、`explicit: true`、`fallbackReason`；工作区 dirty 文件原样保留

#### 场景：checkout 失败 fail-closed

- Given 显式同意、`git worktree add` 失败、专用分支无法创建/检出（如分支名非法）
- When 走降级 checkout
- Then 抛错且 meta.json 未落盘（授权不先于隔离态成立）

#### 场景：baseHash ≠ HEAD 跳过 checkout

- Given 显式同意、--base 显式指定且 ≠ 当前 HEAD
- When 走降级
- Then 不切分支、输出警告，其余照常（meta 仍记 explicit 与 fallbackReason）

### FR-03: worktree-guard 的 isInsideRegisteredWorktree 对无 explicit 标记的遗留 in-place meta 不再授权：主仓源码写入与 Bash 命令回到阶段门禁

- 必须：worktree-guard 的注册 worktree 判定遇到 `mode === 'in-place-fallback'` 且 `explicit !== true` 的 meta 时不得返回「在已注册 worktree 内」（不授权）；该形态下主仓源码写入与 Bash 命令走既有阶段门禁（execute 期主工作区默认拦截路径）。`explicit: true` 的 meta 维持既有授权（显式 in-place 模式 wt-commit 等照常可用）。

#### 场景：遗留 meta 排雷

- Given sillyspec.db 有 active execute 变更、`.runtime/worktrees/<c>/meta.json` 为遗留自动降级 meta（mode in-place-fallback、无 explicit）
- When `shouldBlockWrite(<主仓源码路径>)` / `shouldBlock({tool:'Bash'...})`（cwd=主仓根）
- Then 均按未注册处理（写入拦截/命令走阶段门禁），不再整树放行

#### 场景：显式 meta 不受影响

- Given 同上但 meta 含 `explicit: true`
- When 同上
- Then 维持既有放行行为

### FR-04: config-schema 文档化 worktree.fallback（block|allow，缺省 block）

- 必须：config-schema.js 的 worktree 段新增 `worktree.fallback` 键条目（live 状态、readers 标注 readWorktreePolicy），desc 说明语义（worktree add 失败时的处置：allow=显式同意降级 in-place 并切专用分支；缺省 block=fail-closed 报错）、example 给 `allow`。禁止改变既有 `worktree.policy.*` 键语义。

#### 场景：文档化

- Given 消费仓运行 `sillyspec config cat` / `config schema`
- Then 可见 worktree.fallback 键及其语义与缺省值

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/worktree-fallback-consent.test.mjs「fail-closed：add 失败默认抛错不降级（含 stderr 与处置指引）」
FR-02: test/worktree-fallback-consent.test.mjs「policy allow 路由到降级 + checkout 失败 fail-closed 不落 meta」+「opts.allowInPlace 显式 flag 同效路由」
FR-02: test/worktree-fallback-consent.test.mjs「switchMainToWorktreeBranch：新建分支 checkout -b / 既有分支 checkout / baseHash 不等跳过（dirty 文件保留）」
FR-02: test/worktree-policy.test.mjs「worktree.fallback 键：allow / 缺省 block / 非法值 block」
FR-03: test/worktree-guard-execute-guard.test.mjs「遗留 in-place meta（无 explicit）不授权：写入拦截 / Bash 走阶段门禁；explicit:true 维持放行」
FR-04: test/config-schema.test.mjs「worktree.fallback 键条目存在且文档化（live/readers/缺省语义）」
