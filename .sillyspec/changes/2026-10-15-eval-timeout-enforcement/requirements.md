---
author: flow-machine-draft
created_at: 2026-10-15T15:30:00.000Z
---
# 需求规格（Requirements）— 2026-10-15-eval-timeout-enforcement

## 功能需求

### FR-01: spawnCapture 超时收敛绑定化——杀树同步化 + 宽限强制 settle

- 必须：`eval/lib/util.mjs` 超时触发路径改为：①win32 用 spawnSync 执行 `taskkill /pid <pid> /T /F`（等结果，非 fire-and-forget）；②仍不收敛则以 child.kill 兜底；③随后启动宽限计时（TIMEOUT_GRACE_MS=20000），宽限到期强制 resolve（timedOut=true、输出按已捕获内容），不再无限等待 close。
- 必须：非超时路径（正常退出/错误）行为零变化。
- 禁止：不改 verifyTimeoutMs/quick setup 等其他 timeoutMs 值与其调用方式。

#### 场景：超时上界

- Given：子进程派生「持有 stdout 的孙进程」后进入长睡眠（模拟孤儿树）
- When：spawnCapture timeoutMs=1500
- Then：resolve 上界 ≈ timeoutMs + 宽限（20s）+ 余量，且 timedOut=true；不再等待孙进程自然退出

### FR-02: 回归测试 + lint

- 必须：新增 test/eval-timeout-enforcement.test.mjs：孤儿树形态下 resolve 上界断言（超时未强制时必红——孙进程 60s 睡眠）；正常快进程路径零回归断言（timedOut=false、code=0）。
- 必须：`npm run lint` 通过。

#### 场景：测试锁定

- Given：test/eval-timeout-enforcement.test.mjs
- When：node --test
- Then：全绿

## 测试绑定（每条 FR 至少一行）

FR-01: test/eval-timeout-enforcement.test.mjs「孤儿树超时强制收敛」
FR-02: test/eval-timeout-enforcement.test.mjs「正常路径零回归 / 孤儿树超时强制收敛」（lint 面收口亲测）
