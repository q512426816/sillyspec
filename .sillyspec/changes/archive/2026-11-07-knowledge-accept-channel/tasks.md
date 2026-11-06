---
author: flow-machine-draft
created_at: 2026-11-06T16:51:35.827Z
---
# 任务注册表（Tasks）— 2026-11-07-knowledge-accept-channel

- [x] task-01: 新增 test/knowledge-accept-channel.test.mjs 七组用例（T1~T7），fixture 用真实 cmdPropose 生成（格式同源），先跑确认红
- [x] task-02: 实现 acceptProposedEntry + cmdKnowledgeAccept（src/knowledge-classify.js，复用 classify 私有件；落盘序先追加后 INDEX 后删源；审计 type=accept）+ stages/knowledge.js 路由挂 case 与 help；T1~T4、T7 转绿（30/30）
- [x] task-03: inbox 补 proposed 待审清单段（json 恒挂键+文本面非空显示）+ digest 补 proposed 积压信号（>0 info、>=6 warn）；T5 转绿
- [x] task-04: SKILL.md proposed 规则指向 accept + 命令表登记；T6 转绿
- [x] task-05: 跑既有 knowledge-classify/inbox/digest/propose-body-file/body-recall/search-positional/tier-denoise/rank-denoise 八面全绿（0 fail）
