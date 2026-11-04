---
author: flow-machine-draft
created_at: 2026-11-04T00:08:40.461Z
---
# 需求规格（Requirements）— 2026-11-04-archive-baseline-entry

## 功能需求

### FR-01: 归档蒸馏为合格变更机械产出恰好一条叙事基线决策条目

- 必须：distillIntoKnowledge 对满足以下全部条件的变更产出一条 D-000@v1 基线条目（type=process、状态=implemented、字段齐全不被 dispositionOf 落选）：design.md 含非平凡「做法概述」段（剥模板问题行后 ≥50 字）；change-patch.json 交付面（剥 `.sillyspec/` 内部路径）能匹配至少一个模块域；变更 decisions.md 未占用 D-000 号。条目字段：标题=变更标题（flow-state.yaml title，缺省变更名）＋做法概述首句；理由=做法概述整段（保留症状词词面命中）；文件=剥 `.sillyspec/` 后的交付面（cap 20）；锚点=该变更 design.md 的仓相对路径；域=交付面×模块匹配（非 unmapped）。

#### 场景：主路径（事故叙事保全）

- Given 变更含做法概述段（腾讯云宿主冻结 5 分钟叙事）、空壳 decisions.md、交付面含 daemon 模块文件
- When 归档蒸馏
- Then decisions/<daemon 域>.md 新增基线条目：标题含变更标题与首句、理由含冻结叙事、原编号 D-000@v1、锚点指归档 design.md

#### 场景：不合格形态零产出

- Given design 无做法概述段 / 概述过短（<50 字）/ 交付面仅 .sillyspec 内部路径（无可匹配模块）/ decisions.md 已有 D-000 条目
- When 归档蒸馏
- Then 不产出基线，其余蒸馏行为与改动前逐字一致（零回归）

### FR-02: 基线条目幂等且重放不触碰人工存量

- 必须：同变更重复蒸馏基线幂等（同号原位更新不重复追加）；baselineOnly 模式（存量回放用）只写基线——同变更人工条目的「最近确认」等字段零触碰；D-000 被人工占用时跳基线。

#### 场景：幂等重蒸

- When 同一变更蒸馏两次
- Then 基线条目在域文件中恰一段（第二次 action=update），无重复段

#### 场景：baselineOnly 不碰存量

- Given 变更已有人工条目（已蒸馏入库）
- When baselineOnly 蒸馏
- Then 仅新增基线条目，人工条目段落逐字不变

### FR-03: 检索排序中同文件内基线不抢人工条目之前

- 必须：matchByRouting 的 decisionHits 排序中，同文件内原编号 D-000 的基线条目排在人工条目之后（跨文件按既有得分序不变）。

#### 场景：同文件双条目

- Given 同域文件含一条人工条目与一条基线条目，查询两者都命中
- When 检索排序
- Then 人工条目序位先于基线条目

### FR-04: 存量回放走同一代码路径，信号词表为参数

- 必须：回放入口（planBaselineReplay/applyBaselineReplay）复用 distillIntoKnowledge 的 baselineOnly 路径；筛选词表经参数传入（缺省空=全量有概述段者），词表不出现在机制代码任何硬编码处；已含基线的变更幂等跳过。

#### 场景：词表参数化

- When planBaselineReplay 以 signals=['outage'] 跑含英文叙事的归档集
- Then 仅概述含 outage 者入选；换词表结果随之变（机制代码无词表常量）

### FR-05: 事故查询经基线条目命中（反馈场景验收）

- 必须：含冻结事故叙事的变更蒸馏入库后，`matchKnowledge` 以「冻结」查询词面命中该基线条目所在文件（词片回退通道）。

#### 场景：反馈原场景

- Given 基线条目已入库（理由含 宿主冻结/停摆 等症状词）
- When matchKnowledge(dir, '冻结')
- Then matched=true 且命中含基线（此前该叙事检索零命中）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/archive-baseline-entry.test.mjs「T1 合格变更产出基线（字段齐全）/T1b 四种不合格形态零产出」
FR-02: test/archive-baseline-entry.test.mjs「T2 幂等重蒸不重复/T2b baselineOnly 不触碰人工存量」
FR-03: test/archive-baseline-entry.test.mjs「T3 同文件基线排在人工条目后」
FR-04: test/archive-baseline-entry.test.mjs「T4 回放词表参数化+已含基线幂等跳过」
FR-05: test/archive-baseline-entry.test.mjs「T5 查询「冻结」经词片回退命中基线」
