---
author: flow-machine-draft
created_at: 2026-10-23T13:32:47.476Z
---
# 需求规格（Requirements）— 2026-10-23-push-review-debt

## 功能需求

### FR-01: push-cli 新增「区间含已推送提交拒绝」「merge commit 拒绝」两个真仓守卫用例并绿

- `sillyspec push` 压扁模式必须拒绝「`base..HEAD` 内含被任何 remote-tracking ref 可达提交」的区间，错误信息必须含「已被远端 ref 可达」与拒绝语义；必须拒绝区间含 merge commit 的压扁，错误信息含「merge commit」与替代出路（`--mode none`）。
- 两条守卫必须有真实临时仓集成测试锚（test/push-cli.test.mjs），断言拒绝后 HEAD 与远端零变化。

#### 场景：区间含已推送提交

- Given 本地 c1 已被推到另一远端分支（remote-tracking ref 可达）
- When 执行 `sillyspec push`（c1 落在 `base..HEAD` 内）
- Then 拒绝并提示不 force-push，HEAD/远端不变

#### 场景：区间含 merge commit

- Given 本地区间经 no-ff 合并产生 merge commit
- When 执行 `sillyspec push`
- Then 拒绝并提示 merge commit 与 `--mode none` 出路，HEAD/远端不变

### FR-02: tag 指向压扁区间时计划输出 warning；全无签名提交时不产生签名 warning；签名检测逻辑有纯函数测试锚

- `sillyspec push` 计划必须检测指向压扁区间（`base..HEAD` 内提交）的 tag 并输出 warning（tag 不随改写、需人工 `git tag -f` 的指引）；无此类 tag 时禁止产生该 warning。
- 必须检测区间内带签名的提交（`%G?` 非 N）并输出「将被压扁为无签名提交」warning；区间全为无签名提交时禁止产生签名 warning；签名标记解析必须有纯函数测试锚。

#### 场景：tag 落在压扁区间

- Given 区间内某提交被打 tag
- When 执行 `sillyspec push --dry-run`
- Then 计划 warnings 含 tag 提示，且 HEAD/refs 不变

#### 场景：全无签名

- Given 区间全部为普通无签名提交
- When 执行计划
- Then warnings 不含签名相关条目

### FR-03: pre-push hook 失败时 human 模式实时透传 hook 输出（报错一次给全），--json 模式错误信息含 stderr；git-helper 注释与实现对齐

- human（非 `--json`）模式的 `git push` 必须以 inherit stdio 执行，pre-push hook 输出实时直达终端，失败不再依赖二跑定位；`--json` 模式 push 失败的错误信息必须含 hook 的 stderr 内容。
- `src/git-helper.js` 中「push 用 inherit 透传」注释必须与实现一致。

#### 场景：hook 失败

- Given 临时仓装有 exit 1 的 pre-push hook
- When 执行 `sillyspec push`
- Then ok=false 且错误语义为 push 失败；human 模式 hook 输出已实时可见（inherit），json 模式 error 含 hook stderr

### FR-04: lint 绿、变更面测试绿

- 收口实测 lint 与变更测试面必须全绿；三处清偿不得引入既有测试回归。

#### 场景：验收

- When 跑 `npm run lint` 与变更面测试
- Then 全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/push-cli.test.mjs「守卫：区间含已推送提交拒绝」；test/push-cli.test.mjs「守卫：区间含 merge commit 拒绝」
FR-02: test/push-cli.test.mjs「tag 落压扁区间告警与无签名零误报」；test/push-plan.test.mjs「签名标记解析纯函数」
FR-03: test/push-cli.test.mjs「pre-push hook 失败：human 透传与 json 含 stderr」
FR-04: test/push-cli.test.mjs「守卫：区间含已推送提交拒绝」（套件绿即验收面）
