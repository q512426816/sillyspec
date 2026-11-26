---
author: flow-machine-draft
created_at: 2026-11-11T08:09:40.599Z
---
# 需求规格（Requirements）— 2026-11-11-push-shell-token-tolerance

## 功能需求

### FR-01: parsePushArgs 忽略代执行环境残留的 shell 重定向 token（2>&1、>/dev/null、>/dev/null 等）并产生告警

- `parsePushArgs` **必须**在参数解析前识别并忽略 shell 重定向 token（`2>&1`、`1>&2`、`>&2`、`2>/dev/null`、`>/dev/null`、`>nul`、`2>nul` 及裸 `>`/`>>`/`1>`/`2>` 及其目标文件），忽略后按剩余合法参数继续解析；每次忽略**必须**产生一条可读告警（提示代执行环境不解析 shell、建议裸调用），告警随解析结果返回。

#### 场景：末尾带 2>&1

- Given 平台代执行层把 `sillyspec push 2>&1` 的命令串原样拆成 argv
- When CLI 收到 `['2>&1']`
- Then 解析成功、使用默认 by-change 模式，并返回包含 `2>&1` 的告警

#### 场景：重定向夹在合法参数之间

- Given argv 为 `['--dry-run', '2>/dev/null']`
- When 解析
- Then `dryRun=true` 且解析成功

### FR-02: parsePushArgs 遇到管道/链式控制符（|、||、&&、;、&）截断其后参数并产生告警

- `parsePushArgs` **必须**在遇到 `|`、`||`、`&&`、`;`、`&` 时停止解析（等价于 shell 中当前命令参数在控制符处结束），丢弃控制符及其后的全部 token，并产生一条说明「已忽略控制符及其后参数」的告警；控制符之前已解析的合法参数**必须**保持生效。

#### 场景：管道后接 tail

- Given argv 为 `['|', 'tail', '-12']`
- When 解析
- Then 解析成功、参数为默认值，并返回管道截断告警

#### 场景：参数后再接链式命令

- Given argv 为 `['--dry-run', '&&', 'git', 'status']`
- When 解析
- Then `dryRun=true`，`git`/`status` 不被当作位置参数报错

### FR-03: 合法参数组合与现有 fail-closed 行为保持不变

- 现有合法参数组合（`--mode`、`--change`、`--base`、`--remote`、`--branch`、`--dry-run`、`--no-push`、`--undo`、`--json`）的解析结果**必须**与改动前完全一致；不含 shell token 的未知参数与位置参数**必须**继续 fail-closed 报错（不得因新逻辑放宽）。

#### 场景：真正的位置参数仍被拒绝

- Given argv 为 `['file.txt']`
- When 解析
- Then 仍返回 `ok=false` 并报「不接受位置参数: file.txt」

#### 场景：互斥组合仍被拒绝

- Given argv 为 `['--undo', '--mode', 'one', '--change', 'x']`
- When 解析
- Then 仍返回 `ok=false`

### FR-04: human 模式 git push 失败时错误信息包含底层 stderr 详情

- `pushBranch` 在 human（非 `--json`）模式下**必须**捕获 git push 的 stdout/stderr，失败时把底层 stderr 详情合并进错误信息（不再只有 `failed to push some refs` 首行），使调用方与平台 UI 能一次看到真实原因（non-fast-forward、网络错误、hook 失败等）。

#### 场景：pre-push hook 失败

- Given 仓库 pre-push hook 输出 `HOOK-FAIL-SIGNAL` 到 stderr 并以 1 退出
- When 以 human 模式执行 push
- Then 返回的错误信息包含 `HOOK-FAIL-SIGNAL`

#### 场景：远端拒绝推送

- Given 远端分支存在本地没有的新提交导致非快进
- When push
- Then 错误信息包含 git 给出的拒绝原因（`rejected`/`non-fast-forward` 等），而非仅首行兜底文案

### FR-05: 成功与失败均由 CLI 转发捕获的 git 输出到终端

- human 模式下，`pushBranch` **必须**把捕获到的 git stdout/stderr 转发到终端（成功与失败均转发），保持原有终端可见性；`--json` 模式**禁止**向 stdout 输出这些内容（stdout 必须保持纯 JSON）。

#### 场景：json 模式 stdout 纯净

- Given 以 `--json` 执行 push
- When 成功或失败
- Then stdout 只有 JSON 文档，git 原始输出不出现在 stdout

### FR-06: 相关单测与集成测试通过

- 本次改动**必须**新增覆盖 FR-01/FR-02/FR-03 的解析单测与覆盖 FR-04/FR-05 的集成用例，且 `test/push-plan.test.mjs`、`test/push-cli.test.mjs`、`test/push-skill.test.mjs` **必须**全部通过。

#### 场景：测试套件

- Given 改动后的仓
- When 执行 `node --test test/push-plan.test.mjs test/push-cli.test.mjs test/push-skill.test.mjs`
- Then 全部用例通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/push-plan.test.mjs「parsePushArgs：容忍代执行残留的 shell 重定向 token」
FR-02: test/push-plan.test.mjs「parsePushArgs：管道/链式控制符截断其后参数」
FR-03: test/push-plan.test.mjs「parsePushArgs：默认 by-change；one 必须带 --change；未知/互斥 fail-closed」
FR-04: test/push-cli.test.mjs「human 模式 pre-push 失败错误含 hook stderr」
FR-05: test/push-cli.test.mjs「human 模式转发 git 输出、--json stdout 纯净」
FR-06: test/push-plan.test.mjs「parsePushArgs：容忍代执行残留的 shell 重定向 token」
