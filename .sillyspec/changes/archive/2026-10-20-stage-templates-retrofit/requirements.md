---
author: flow-machine-draft
created_at: 2026-10-20T03:13:57.621Z
---
# 需求规格（Requirements）— 2026-10-20-stage-templates-retrofit

## 功能需求

### FR-01: 本变更 design.md 必须引用交付提交 8227bd0a 完整 sha 与交付内容描述（stage-templates.js decisions 模板清单插值正典）

- design.md 必须写明交付提交 8227bd0a 的完整 sha（8227bd0a2a7e806e1e406448b7479d3513b6c7d9）与交付内容：stage-templates.js 四件套 decisions 模板 type/status 清单改插值正典常量（DECISION_TYPES/DECISION_STATUSES），term/premise/risk/unresolved 漏网提示面清除。
- design.md 必须说明本变更为倒推入册性质：交付已在库，冻结面不含该 diff（基线晚于交付），审计链以 design 引用 + git 历史为准。

#### 场景：主路径

Given 本变更归档件
When 审计者读 design.md
Then 能取到完整 sha 并用 git show 8227bd0a 复核交付 diff

### FR-02: test/decision-caliber-unify.test.mjs 用例④的 stage-templates 插值断言在场且全绿（已验证达标的行为）

- 交付行为的客观核验必须以既有测试为凭：test/decision-caliber-unify.test.mjs 用例「④ brainstorm 提示清单同步」内 stage-templates 插值断言（tplTypeInterp/tplStatusInterp=1、旧散值清除）必须真实在场。
- node --test test/decision-caliber-unify.test.mjs 必须 6/6 全绿（收口实测门复核）。

#### 场景：主路径

Given 交付已在库（8227bd0a）
When 收口实测跑该套件
Then 6/6 pass 零 fail

### FR-03: 归档完成后审计链可从本变更档案追溯到交付提交 8227bd0a

- 本变更归档件（design.md + verify-result.md）必须包含交付提交引用，归档提交消息必须尾缀带变更名（防漂移检测失明重演）。

#### 场景：主路径

Given flow done 完成
When 查归档目录
Then design.md 含 sha 引用、归档提交消息含 (2026-10-20-stage-templates-retrofit) 尾缀

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档承诺（design 引用面），验收靠规范与人工——归档件可 grep sha 复核
FR-02: test/decision-caliber-unify.test.mjs「④ brainstorm 提示清单同步」
FR-03: 不适用：归档提交消息与归档件形态验收，无独立测试面（收口协议自身承担）
