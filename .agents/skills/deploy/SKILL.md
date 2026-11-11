---
name: deploy
description: sillyspec 仓的 npm 发布流程——遗留暂存件归属判别、版本面 bump 与锚点测试同步、验证门、sillyspec push、npm publish 与 202 异步传播核验。用户说「发布/deploy/部署/发版/publish/升版本/发个最小版本/重新发布 npm」时必须使用本 skill；只适用于本仓（sillyspec）的 npm 发布，不适用于消费仓。
---

# sillyspec npm 发布流程

发布 = 五步顺序链：暂存区清障 → 版本面 → 验证门 → 推送 → npm publish。
顺序有依据：暂存区不清 `sillyspec push` 拒跑；锚点测试断言新版本号所以必须先 bump 再跑门；验证回执写进 release 提交信息。

每步动手前先 `export SILLYSPEC_SESSION_ID=<会话标识>`（多会话共享仓的所有权判定依赖它）。

## ① 前置检查

```bash
npm whoami                                    # 未登录→停，让用户处理凭据
git log origin/main..HEAD --oneline           # 未推送面：应只含预期提交
git diff --cached --name-only                 # 暂存区全量读取（禁过滤式核对）
curl -s https://registry.npmjs.org/-/package/sillyspec/dist-tags   # 现状 latest + 目标号防呆
```

dist-tags 防呆：目标号已等于 latest → 已发布过，停（重复发布被 registry 拒）；目标号 < latest → 版本倒退，停并与用户核对。工作区脏面（git status --porcelain）不阻断也不需清理——⑥ 从 HEAD 快照发布，脏面天然绝缘。

## ② 暂存区清障（push 的门）

暂存区非空时 `sillyspec push` 拒跑。逐文件归属判别，再分类处理：

```bash
# 归属判别：暂存 diff 里含哪个变更名就是谁的
git diff --cached -- <file> | grep -c '<change-name>'
```

- **既往归档变更的蒸馏产物滞留**（owning 变更从未立项/未批准）：按用户指示入库——`chore(knowledge)` 提交，显式 pathspec，提交信息写明来源与授权
- **活跃并行会话的在途文件**：默认不动、如实报告让用户拍板；用户说「一并提交」才入库
- SillyHub/multi-agent-platform 等其它项目的域文件同样按归属判别处理，不机械照单全收

## ③ 版本面

**版本号**：用户指定号优先（如「3.34.1 应该是」）；未指定则最小补丁位 +1（3.34.0→3.34.1）。版本号可跳位——npm 无连续性要求，跳过的号视为未占用（实证：3.34.3 未占用直发 3.34.4）。

```bash
npm version <版本号> --no-git-tag-version      # package.json + package-lock 双文件同步
```

**锚点测试同步**（不同步必红）：

- `test/quick-retired.test.mjs` R5 断言 `pkg.version === '<新版本号>'`——精确等于，逐字改
- `test/flow-order-canon.test.mjs` 断言 `> 3.33.1`——推进断言，版本高于该值就不动

**提交**（先例：`chore(release): 3.34.1 版本面——…`，先跑完 ④ 验证门再提交，回执写进信息）：

```bash
git commit -m 'chore(release): <版本号> 版本面——package.json/package-lock <旧>→<新>（用户指定发布号），quick-retired R5 精确锚同步…；lint …绿、锚点套件 …/…绿' -- package.json package-lock.json test/quick-retired.test.mjs
```

⚠️ 提交信息含反引号时用**单引号**包 `-m`——bash 双引号内反引号会被解释成命令替换。

## ④ 验证门（release 提交前跑）

```bash
npm run lint                                                    # check-syntax，~1100+ 文件
node --test test/quick-retired.test.mjs test/flow-order-canon.test.mjs   # 版本锚点 8 例
node --test test/<本次交付相关护栏测试>                          # 变更面护栏
```

pack 体量核验在 ⑥ 快照面做——主仓工作区的 pack 数混着未跟踪残渣（~485），不可作基线；干净快照基线 ~380 文件。

**既有红归属判别**（全量红不阻断发布，但必须留痕）：红的测试若疑似非本次引入，用 stash 法证明：

```bash
git stash push -- <疑似源文件> && node --test <红测试>   # 仍红→与该文件无关（既有红）
git stash pop                                             # 恢复，切勿忘
```

归属结论写进 release 提交信息（先例：「doc-ref-check 既有红为并行会话在途改动，stash 归属判别留痕」）。

## ⑤ 推送

```bash
sillyspec push            # 禁裸 git push / --force / 手工 reset --soft 压扁
```

CLI 可能判定「无需压扁直推」——正常，保留原历史快进。推送输出里的「预存锚点异常 advisory」不阻断。

## ⑥ npm publish（HEAD 干净快照）与 202 异步核验

**publish 一律从 HEAD 临时 worktree 快照发，禁止在主仓工作区直接 `npm publish`。** why：npm publish 打包**工作区实态**而非 HEAD——.npmignore 拦不住未跟踪文件，主仓历次发布（≤3.34.4）都夹带了 ~105 个本地残渣（eval/results/logs、r7-test-env 等），并行会话的在途脏文件也会混入发布物。发布提交已在 ⑤ 推送，HEAD 即发布态，快照路径无前提；主仓工作区（含并行会话脏面）全程不动。⑤ 推送后执行：

```bash
WT="C:/Users/<user>/AppData/Local/Temp/sillyspec-publish-<版本号>"   # 系统临时目录，Git Bash 正斜杠直写即可
git worktree add --detach "$WT" HEAD
cd "$WT"
node -p "require('./package.json').version"    # 确认快照版本号
npm pack --dry-run                             # 体量核验：干净快照基线 ~380 文件
npm publish
cd - && git worktree remove "$WT"              # 用毕即删
```

**关键认知：registry 返回 202 = 异步受理，不是发布失败。** npm 打出 `+ sillyspec@<版本号>` 即受理成功；随后 registry 可能仍 404——那是传播窗口，实测可长达 **~10 分钟**（3.34.2 约 5 分钟、3.34.4/3.34.5 约 10 分钟），期间**禁止重复 publish**，按 sleep 90s→180s→240s 渐进轮询。核验方法（绕过 npm view 的 CDN 缓存，用 curl 直查，dist-tags 翻牌 + 版本端点 200 双确认才算完成）：

```bash
curl -s https://registry.npmjs.org/-/package/sillyspec/dist-tags        # {"latest":"<版本号>"} 翻牌
curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/sillyspec/<版本号>   # 200
```

不放心受理状态时，查 debug 日志确认（而非猜）：

```bash
grep 'PUT 202' "$(ls -t C:/Users/<user>/AppData/Local/npm-cache/_logs/*.log | head -1)"
```

## 坑清单速查

| 症状 | 真相 | 处置 |
|---|---|---|
| `sillyspec push` 报「index 有 N 个已暂存文件」 | 暂存区门，防夹带并行会话文件 | 回 ② 归属判别清障 |
| bump 后锚点套件红 | quick-retired R5 精确断言没同步 | 逐字改成新版本号 |
| publish 后 registry 查不到新版本 | 202 异步传播窗口（可数分钟） | sleep+curl 直查 dist-tags，勿重发 |
| `npm view` 版本滞后 | CDN 缓存 | curl 直查 registry |
| 提交时报 unexpected EOF | 信息里的反引号被 bash 吃了 | `-m` 用单引号包 |
| 全量测试有个别红 | 多会话共享仓常态 | stash 归属判别→既有红留痕不阻断 |
| 包内容夹带未知文件（pack 数 ~480+） | publish 打包工作区实态，未跟踪残渣/并行脏面混入 | 回 ⑥ HEAD 快照发布，基线 ~380 |
| 传播窗口超 5 分钟仍 404 | 窗口实测可长达 ~10 分钟，非失败 | 渐进 sleep 轮询 dist-tags+版本端点，勿重发 |
