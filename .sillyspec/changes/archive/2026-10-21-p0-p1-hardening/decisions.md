---
author: flow-machine-draft
created_at: 2026-10-21T14:44:24.881Z
---
# 决策记录（Decisions）— 2026-10-21-p0-p1-hardening

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：① 心跳行污染机器可读输出——若走 stdout，`--json` 消费方 JSON.parse(stdout) 会炸；定案走 stderr（console.error），人类/agent 均可见且 stdout envelope 纯净（pwsh 下 stderr 偶发 NativeCommandError 包装是既有环境噪声，心跳仅 >60s 慢路径出现，可接受）。② 冲突标记正则误报（把文档示例当标记）——限定 stash 面文件集 + 行首 `<{7} `/`={7}$`/`>{7} ` 三形态锚定，误报面收敛到「stash 恢复刚触碰的文件自身含行首标记」，即使误报也只是一次可人工解除的 apply 失败，fail-closed 方向安全。③ anon 自动升级被滥用冒充接管——升级仅限「匿名占位（机器级标识）→ 同主机显式身份」，匿名占位本就只拦他机（R-01 明示局限），升级不弱于既有隔离强度；他人显式/跨机持有不受影响。 试过放弃：① libuv 退出断言崩溃根修——Node on Windows 运行时缺陷（async 句柄关闭竞态），应用层无法根除，降级为 spawn-settle bounded 等待缓解（句柄建立完成后再放行父进程退出）；② known_failures 用 js-yaml 整体重序列化——丢注释，用户文档性受损，放弃，改定向行级手术；③ handoff 原子转移所有权到新 SESSION_ID——与既有「SESSION_ID 是所有权标识非会话实例，交接要求保持不变」设计冲突（handoff.js 头注释与 stage-session ledger 契约），且换 ID 本就是偏离交接块指引的操作，定案为粘贴块内显式预告 --takeover 出路；④ `--continue` 幂等化等 P2 项——不在本变更 P0/P1 范围，未纳入。
