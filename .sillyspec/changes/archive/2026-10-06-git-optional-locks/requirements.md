---
author: flow-machine-draft
created_at: 2026-10-06T09:36:18.550Z
---
# 需求规格（Requirements）— 2026-10-06-git-optional-locks

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: git-helper.js 的 safeGit 与 git 两个 exec 点统一注入 GIT_OPTIONAL_LOCKS=0（env 合并语义：与调用方传入 env 展开合并，不裸替换丢 Windows 系统变量）——CLI 自建的全部 git 子进程不再机会性抢 index.lock；写命令（add/commit 等）行为不变

- 必须：safeGit 与 git 的 execFileSync env 统一为 `{ ...(调用方 env || process.env), GIT_OPTIONAL_LOCKS: '0' }`——CLI 自建的 git 子进程（含 gitQuiet 委托链）一律不进行机会性 index 刷新（不抢 index.lock）。
- 必须保持：写命令行为不变——`GIT_OPTIONAL_LOCKS=0` 只禁机会性锁，add/commit 等真写的必需锁不受影响（实验实证：带 0 的 add+commit 正常暂存提交）。
- 禁止：裸替换 env（丢 SystemRoot/USERPROFILE/TEMP 会毁 Windows 子进程）——必须展开合并。

#### 场景：锁窗口消失（实测根因形态）

- Given 仓内 tracked 文件 mtime 被更新（stat 缓存脏，裸 git status 会刷新 index 写回）
- When 经 git-helper（safeGit 或 git）执行 `status --porcelain`
- Then `.git/index` 字节不变（机会性刷新未发生=无锁窗口）；对照组裸 execFileSync git status 会改写 index（机制在场证明）

### FR-02: watcher 等常驻/后台轮询进程经公共入口自动获得该行为（gitQuiet 委托 git），无需逐调用点改造

- 必须：watcher（每 ~3s 轮询 rev-parse/log/status）与 spec-sync 后台等全部经 git-helper 公共入口的调用自动获得非锁行为——修点只在 git-helper 两处 exec，禁止逐调用点散改。
- 禁止：改动绕过 git-helper 的既有本地 exec 点（commit-guard hook / gate-snapshot 等）——它们是一次性读，非常驻轮询源，超出本变更刀口（留待后续按需收编）。

#### 场景：主路径

- Given watcher 轮询循环经 gitQuiet → git
- When 轮询执行 status
- Then 该 status 不再可能持 index.lock（FR-01 的 env 注入对公共入口全覆盖）

### FR-03: 测试覆盖：①经 git-helper 的 status 读调用在 stat 缓存脏场景下不改写 .git/index 字节（锁窗口消失的代理断言）；②带注入 env 的 add 照常暂存成功；③调用方自定义 env（如 baseline checkpoint 的 GIT identity 注入）仍生效不被覆盖

- 必须：新增测试覆盖三条：①git-helper 读调用不改写 index 字节 + 对照组裸调用改写（机制双向证明）；②经 git-helper 的 add 暂存成功（写不受影响）；③调用方传 env（如 GIT_AUTHOR_NAME 注入）仍生效且 GIT_OPTIONAL_LOCKS 不被覆盖调用方显式值以外的语义。全绿后收口。

#### 场景：主路径

- Given 测试运行环境
- When 执行新增测试
- Then 全部断言通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/git-optional-locks.test.mjs「读调用无锁窗口（index 字节不变）+ 写调用照常」
FR-02: test/git-optional-locks.test.mjs「gitQuiet 公共入口链同样无锁窗口」
FR-03: test/git-optional-locks.test.mjs「全量用例（含调用方 env 合并）」
