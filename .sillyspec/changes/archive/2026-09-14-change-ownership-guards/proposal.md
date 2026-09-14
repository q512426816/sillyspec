---
author: qinyi
created_at: 2026-09-14 19:34:00
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机

§65 两实证：并行会话对他人 change 一条龙代劳（apply+commit+cleanup）本会话毫不知情；review 声明放行通道无相交校验放进 11 个外来文件。根因：change 无所有权（CLI 接管类操作不鉴权）、归档完成但交付物未进主仓的悬空态、归因按主仓共享脏窗口。前置 apply 护栏已落地，本变更补 change 级所有权与归因/放行两缺口。

## 关键问题

1. apply/cleanup/archive 任何会话可对任何 change 执行——withMainRepoLock 只串行不鉴权，「代劳」零阻力；
2. 「归档完成但代码在 worktree」悬空态——谁先动 apply 谁接管收尾，两个变更连续踩到；
3. review 声明放行通道成外来文件后门 + 草稿归因吸主仓脏窗口——归因与放行双双失真。

## 变更范围

四护栏（scale=large，详见 design.md）：①owner_session 列（schema v6 四处 bump）+三级会话标识（显式 SILLYSPEC_SESSION_ID/--session>quick=changeName>anon@host 降级）+锁内所有权校验（活跃窗 15min 可配，--takeover 显式接管）；②归档收口（checkOnly 未 apply 面阻断，--skip-apply 留痕跳过）；③放行收紧（allow 面相交过滤，外来声明进违规报告）；④归因切换（worktree 模式取分支 diff，模式源=changes.isolation_mode，终态空源 fail-closed 空集）。

## 不在范围内（显式清单）

- 不做文件级所有权登记/拦裸 git（ROADMAP 维持）
- 不改 sillyhub 平台侧消费（owner 随投影带出，消费另议）
- 归档不自动串联 apply（只拦不代跑）
- 所有权不覆盖只读命令
- 无显式标识时同机并行不设防（明示局限，防线=铁律+归档收口+--takeover 摩擦）

## 成功标准（可验证）

- v5 库升级自动迁移加列幂等；存量 change owner=NULL 无主可操作（零回归）
- 所有权四态：自有放行/他人活跃拒绝（列 owner+最后活跃+--takeover 指引）/窗口外自动接管/--takeover 留痕
- assess 自动 apply 与 quick 轻量归档链同样受校验（旁路全堵）
- worktree 有未 apply 交付面归档阻断；--skip-apply 放行留痕
- review 声明外来文件被剔除进违规报告；allow 面内文件不受影响
- worktree 模式归因零依赖主仓窗口；分支已删终态=空集+注记
- npm test / npm run lint 全绿（真 git 临时仓集成）
