---
author: flow-machine-draft
created_at: 2026-10-12T13:26:06.198Z
---
# 需求规格（Requirements）— 2026-10-12-tick-evidence-multi-anchor

## 功能需求

### FR-01: task tick 新增 --evidence <文本>（自由文本，@file 前缀读文件内容，读取帽 8KB/条目数不限语义不变）：翻格同时把证据追加到 changes/<名>/task-evidence.jsonl（ts/task/evidence/source 四键 JSONL，UTF-8 追加写）；watcher task-done 事件附 evidence 字段（best-effort）；回显一行证据登记提示。无 --evidence 行为与现状逐字一致（零回归）；@file 读取失败 fail-soft 转文本原样登记并告警

- `sillyspec task tick --change <名> --task task-NN [--evidence <文本>]` **必须**支持自由文本证据；`@<路径>` 前缀时读文件内容为证据（读取帽 8KB，超帽截断留痕）。带证据的翻格**必须**向 `changes/<名>/task-evidence.jsonl` 追加一行四键 JSON（ts 毫秒、task 归一 id、evidence 文本、source:'task-tick'）；watcher task-done 事件**必须** best-effort 附 evidence 字段（写失败不阻断翻格）；回显**必须**含一行证据登记提示（含落盘路径）。无 --evidence 路径**必须**与现状逐字一致（零回归）；@file 读取失败**必须** fail-soft（原样登记「@路径」文本并告警，不拒翻格）。证据是自愿补录面：**禁止**把 evidence 存在与否接入任何收口门判据。

#### 场景：三态

Given 在途变更；When 分别 `task tick --evidence "构建 exit 0，日志 /tmp/x.log"` / `--evidence "@/tmp/x.log"`（文件 100B）/ `--evidence "@/tmp/缺失.log"`；Then 前两态 task-evidence.jsonl 各追加一行（文本态原样、@file 态为文件内容），第三态追加行为「@/tmp/缺失.log」文本且 stderr 有告警，三态翻格均成功 exit 0。

### FR-02: review.json 契约 reviewedAgainst 扩展双形态：字符串（既有，7-40 hex，零破坏）或对象 {workspace: sha, repos: {<key>: sha}}——对象形态 workspace 必填 7-40 hex，repos 各值 7-40 hex，仓键开放（local.yaml repos 注册表键空间，不枚举）；validateReviewJson 双形态校验；reviewAnchoredToHead 对象形态取 workspace 锚参与漂移判定（缺 workspace 判 false fail-safe）

- `validateReviewJson` **必须**接受 reviewedAgainst 双形态：字符串（既有语义零破坏）或对象 `{ workspace: <sha>, repos: { <key>: <sha>, … } }`——对象形态 workspace 必填且 7-40 hex，repos 可选、各值 7-40 hex、仓键开放自由（映射 local.yaml repos 注册表键，CLI **禁止**枚举校验仓键集合）；混合坏值（workspace 非 hex / repos 值非 hex / 对象缺 workspace）**必须**进 errors 拒收。`reviewAnchoredToHead` 对象形态**必须**取 workspace 值参与既有双向前缀锚定；workspace 缺失/非法**必须**判 false（fail-safe 宁可多评）。

#### 场景：校验矩阵

Given review.json reviewedAgainst 分别为：合法字符串 sha / 合法对象（workspace+2 repos）/ 对象缺 workspace / 对象 repos 值非 hex；When validateReviewJson；Then 前两态 ok、后两态 errors 各含对应拒收行。

### FR-03: renderReviewerTaskbook 在变更带跨仓面（change-patch.json 含 repos 键）时，产物 schema 的 reviewedAgainst 行印双形态说明（对象形态优先，附各仓 rev-parse HEAD 提示）；单仓变更维持现状逐字一致

- `renderReviewerTaskbook` 在变更目录存在 change-patch.json 且其含 repos 键（跨仓冻结面在场）时，**必须**把产物 schema 的 reviewedAgainst 行替换为双形态说明：对象形态优先（workspace=主仓 HEAD、repos 各键=对应该仓 git rev-parse HEAD），保留字符串形态为兼容回退；**必须**附一行「各仓 rev-parse HEAD 取法」提示。无 change-patch.json 或无 repos 键（单仓变更）时输出**必须**与现状逐字一致。

#### 场景：双态

Given change-patch.json 含 repos:{subgrid,spdemo}；When renderReviewerTaskbook；Then schema 段含对象形态说明与两个仓键。Given 无 change-patch.json；When 同；Then reviewedAgainst 行与现状逐字一致。

### FR-04: 新增单测：evidence 三态（文本/@file/失败 fail-soft）+ 双形态 reviewedAgainst 校验矩阵（合法字符串/合法对象/混合坏值各拒）+ 对象锚定判定 + 任务书跨仓双形态提示在场/单仓零变化 + 既有回归（task-tick/flow-review）

- **必须**新增 test/tick-evidence-multi-anchor.test.mjs 覆盖上述全部场景（CLI 级 spawnSync 断言 exit 码 + task-evidence.jsonl 内容 + validateReviewJson/reviewAnchoredToHead/renderReviewerTaskbook 单元）；既有 test/task-tick.test.mjs 与 test/flow-review.test.mjs **必须**保持全绿。

#### 场景：主路径

When `node --test test/tick-evidence-multi-anchor.test.mjs test/task-tick.test.mjs test/flow-review.test.mjs`；Then 全部 pass。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/tick-evidence-multi-anchor.test.mjs「evidence 三态（文本/@file/读取失败 fail-soft）+ 零回归」
FR-02: test/tick-evidence-multi-anchor.test.mjs「reviewedAgainst 双形态校验矩阵 + 对象锚定判定」
FR-03: test/tick-evidence-multi-anchor.test.mjs「任务书跨仓双形态提示在场 / 单仓零变化」
FR-04: test/tick-evidence-multi-anchor.test.mjs「全量用例 + task-tick/flow-review 回归」
