---
author: flow-machine-draft
created_at: 2026-11-11T07:57:44.791Z
---
# 需求规格（Requirements）— 2026-11-11-deploy-skill-clean-snapshot

## 功能需求

### FR-01: deploy SKILL.md ⑥ 步改为 HEAD 临时 worktree 干净快照发布为唯一路径，写明 why 与完整命令序列

- **必须**：⑥ 步的 publish 操作一律经「`git worktree add --detach` HEAD 临时目录 → 快照面 `npm pack --dry-run` 体量核验 → `npm publish` → `git worktree remove`」序列执行，不再直接从主仓工作区 publish；正文须写明 why（npm publish 打包工作区实态，会夹带并行会话在途脏文件与未跟踪残渣——3.34.4 及之前历版实测夹带 ~105 文件）。

#### 场景：主路径

- Given release 提交已推送（HEAD 即发布态）/ When 执行 ⑥ / Then 在临时 worktree 内完成 pack 核验与 publish，主仓工作区脏面（无论归属）不出现在发布物中，用毕 worktree 即删。

### FR-02: 前置检查、版本面、验证门、坑清单四处同步本次实战学习

- **必须**：① 前置检查补 registry dist-tags 现状查询与目标号占用防呆（倒退/重发早停）；③ 版本面补一句版本号可跳位（npm 无连续性要求，实证 3.34.3 跳过）；④ 的 pack 体量核验移至 ⑥ 快照面（主仓 pack 数含残渣不可作基线）；坑清单补两行——「包内容夹带未知文件→publish 打包工作区实态→HEAD 快照发布」「传播窗口可长达 ~10 分钟→渐进 sleep 轮询勿重发」。

#### 场景：主路径

- Given 后续任一会话按 skill 走发布 / When 读到 ①③④⑥ 与坑清单 / Then 无需本轮对话上下文即可得到正确口径（快照基线 ~380 文件、窗口 ~10 分钟渐进轮询、版本可跳位）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档变更（skill 指引文本），无代码行为可测——验收靠内容核对（⑥ 含 worktree 四步序列与 why 段）
FR-02: 不适用：纯文档变更（skill 指引文本），无代码行为可测——验收靠内容核对（①③④⑥+坑清单五处口径齐备）
