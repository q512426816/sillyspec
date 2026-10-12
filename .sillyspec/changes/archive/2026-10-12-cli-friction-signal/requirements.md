---
author: flow-machine-draft
created_at: 2026-10-12T13:41:49.756Z
---
# 需求规格（Requirements）— 2026-10-12-cli-friction-signal

## 功能需求

### FR-01: deps 门控阻断输出一次给全（run/gates.js 主仓与跨仓两分支）：depsStatus/depsError 尾部/meta.json 路径三要素齐 + 正规逃生口行（worktree doctor --fix 与 run execute 重供给）+ 明示「勿手改 meta.json（doctor 以实态校正）」——报错即自足，无需二跑定位

- deps 门控阻断输出（run/gates.js 主仓 fail-loud 块与跨仓 crossFailed 循环两处）**必须**一次给全：depsStatus、depsError（尾部截断 ≤200 字符防刷屏）、meta.json 状态文件完整路径三要素齐；**必须**给出正规逃生口行（`worktree doctor --fix` / 重跑 `run execute` 重供给）；**必须**明示「勿手改 meta.json——doctor 以实态校正」。报错信息**禁止**依赖第二次运行才能定位（dogfood 实证：首条阻断只有标题，13 秒后重试才见原因；缺 meta 路径导致 agent 最终两次手改内部 meta.json 过门）。

#### 场景：跨仓阻断自足

Given 跨仓 worktree meta depsStatus=failed、depsError='npm ci failed (…)长文本'；When run execute --done 撞 deps 门；Then stderr 一次含：repo key、workdir、depsStatus、depsError 尾部、meta.json 路径、doctor --fix 逃生口、勿手改警告。

### FR-02: 哨兵拒收文案（flow.js detectFakeCheckCompletion 拒收处）声明证据扫描面：工作区仓 git log baseline..HEAD + change 目录内 review.json；跨仓交付指引一行（跨仓提交不在扫描面，须在本仓提交消息带 task-NN 或产 review.json）

- 哨兵假完成拒收文案**必须**在 token 形态说明后追加一行证据扫描面声明：「工作区仓 git log <baseline>..HEAD 提交消息 + 变更目录内 review.json」；**必须**附跨仓指引一行（跨仓仓的提交不在扫描面——须在工作区仓提交消息带 task-NN 或产 review.json）。其余文案**禁止**变化。

#### 场景：扫描面自释

Given 全勾零证据拒收触发；When 读 stderr；Then 含扫描面声明行与跨仓指引行，且既有 token 形态说明行原样在场。

### FR-03: register-repo 写跨仓标记：registerRepoInLocalYaml 成功后 best-effort 向 <仓根>/.git/sillyspec-crossrepo.json 写 {workspace,key,registeredAt}（.git 内零工作区污染；写失败仅告警不影响注册）；resolveUninitCwdGate block 态读标记，index.js 未初始化门文案追加精确指路（「此仓已登记为工作区 <路径> 的跨仓「<key>」——请回该工作区运行或 --dir 指定」）；无标记时文案与现状逐字一致

- `registerRepoInLocalYaml` 每次成功写 local.yaml 后**必须** best-effort 向 `<仓根>/.git/sillyspec-crossrepo.json` 写 `{workspace, key, registeredAt}`（正斜杠路径；仅当 .git 为目录——linked worktree 的 .git 是文件则跳过）；写失败**必须**仅 stderr 告警不影响注册主流程。`resolveUninitCwdGate` block 态**必须**读该标记（存在且含 workspace 字段时返回 `crossRepo: {workspace, key}`，损坏按无标记）。index.js 未初始化门 block 分支**必须**在 crossRepo 在场时追加精确指路两行（登记事实 + 回工作区运行或 --dir 指定）；无标记时输出**必须**与现状逐字一致。

#### 场景：子仓精确指路

Given 仓 R 已 register-repo（标记在场）且 R 内无 .sillyspec；When 在 R 内跑非豁免命令；Then exit 2 且 stderr 含「已登记为 SillySpec 工作区的跨仓「<key>」」与工作区路径和 --dir 用法。

#### 场景：无标记零变化

Given 无标记的未初始化目录；When 同；Then stderr 与改动前逐字一致（仅既有四行文案）。

### FR-04: 新增单测：deps 阻断输出三要素断言（现有 harness 夹具族）/ 哨兵文案扫描面行 / 标记写入与幂等 / 带标记 uninit 门精确指路 / 无标记零变化

- **必须**新增 test/cli-friction-signal.test.mjs：A) deps 阻断两分支文案源锚断言（三要素+逃生口+勿手改——纯文案面以源锚为判定面，同 input-format-copy 先例）；B) 哨兵拒收文案扫描面行源锚（含既有 token 行原样锚）；C) registerRepoInLocalYaml 写标记与幂等刷新；D) resolveUninitCwdGate 带标记返回 crossRepo；E) CLI 级：带标记子仓跑非豁免命令精确指路 / 无标记零变化。全绿 + 既有 uninit-cwd-gate、local-register、enforce-deps-gate-diagnostic 回归族全绿。

#### 场景：主路径

When `node --test test/cli-friction-signal.test.mjs test/uninit-cwd-gate.test.mjs test/local-register.test.mjs test/enforce-deps-gate-diagnostic.test.mjs`；Then 全部 pass。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/cli-friction-signal.test.mjs「deps 阻断两分支文案一次给全（源锚钉死——同 input-format-copy 文案先例；既有 e2e 夹具走 worktreeGone 分支够不着本文案行，纯文案面以源锚为判定面）」
FR-02: test/cli-friction-signal.test.mjs「哨兵拒收扫描面+跨仓指引两行源锚在场（含既有 token 行原样锚）」
FR-03: test/cli-friction-signal.test.mjs「标记写入幂等 + uninit 门精确指路/无标记零变化（CLI 级）」
FR-04: test/cli-friction-signal.test.mjs「全量用例 + uninit/local-register/deps-diagnostic 回归」
