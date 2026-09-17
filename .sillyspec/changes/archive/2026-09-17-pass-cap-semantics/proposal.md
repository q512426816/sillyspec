---
author: qinyi
created_at: 2026-09-17 11:53:06
---

# 提案书（Proposal）

## 动机

2026-09-15 EHS 生产会话实证：verify 结论 PASS WITH NOTES 出门时，集成测试未跑、三端联调人工验收、fix.sql 手工执行三个**已知未验证区**全部在场——被 NOTES 语义吸收而非阻断，随后 5 个 P1 逃逸到人工深查与用户实测。「已知未验证区不得静默通过」是本次要建立的核心约束：verify 结论=PASS 必须是「全部验证过」的可信信号，用户拿到 PASS 就不该在逻辑层面撞出问题。

## 关键问题

1. **结论资格无事实面条件**：`requiresEvidence`（stage-contract.js:649）只管「要不要集成证据」，「能不能写 PASS」零校验——handover 在场、db 脚本未执行、FR 部分实现都能与 PASS 并存。
2. **诚实申报无阻断力 + 回执口径漏洞**：Runtime Evidence「不涉及」自声明、probe7 partial 合法填值、prose 移交项三条「如实说没做」的通道全部免检；且 compile+纯单测 log 能混过集成回执四条件（只验形态不验内容层次）。
3. **封顶后的两面钻空未设防**：一刀切「有移交项即拦 PASS」会训练 agent 漏报移交项；不封则 NOTES 洗 PASS——需要 severity 分层让「如实上报零惩罚、blocking 级才封顶」。

## 变更范围

- 新增 `validatePassEligibility`（facts 锚定纯函数 validator，四事实条件封顶）+ risk_level 豁免洞分层 + 回执 sourceTag 口径。
- probe7 partial/uncovered 联动 handover；Runtime Evidence「不涉及」收口 + 降级路径提示。
- handover severity 分层（blocking/advisory + 类型默认映射 + 降级须理由）+ db-script 互锁 + archive Step3 清单注入。
- fix.sql 双门：verify 时点声明面/diff 判定 + apply/archive-confirm 兜底。
- 配套四小修：skip 跨仓档位 / adopt 勾选两层 / probe7 跨仓多根 / design 无段头缺口。
- prompt/清单新增两处条目（角色生产口径实证、菜单 DML 对账）+ 文档镜像 + 60~80 断言。

## 不在范围内（显式清单）

- 不连库实测（information_schema 对账，后续独立决策）
- 不做冒烟/契约探针升门（批次 B/C：commands.smoke、probe8 diff 源与硬门化）
- 不做归档侧移交项闭环对账（批次 E：resolved/豁免/转结构化负债）
- 不新增 CONDITIONAL 结论枚举档；不动 facts schemaVersion；不做 handover 逐行强关联硬门

## 成功标准（可验证）

- 四事实条件任一在场时结论写 PASS → verify gate error（test/pass-eligibility.test.mjs 四态断言）
- 旧配置/未触发条件的变更行为零变化（兼容性测试）
- explicit + 仍 integration-critical 的 NOTES 不再免证据（豁免洞分层断言）
- blocking/advisory 分层判定正确，存量三列表格零迁移兼容
- apply 集 ∩ db/*.sql ⊄ 声明集 → apply 与 archive --confirm 阻断
- 跨仓 review 经 adopt 后 tasks.md 自动勾选生效；skip 不再打回无自配 test 的跨仓
